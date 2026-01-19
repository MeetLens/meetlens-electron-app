import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioCaptureService } from '../services/audioService';
import { BackendTranscriptionService } from '../services/backendTranscriptionService';
import { WebSocketConnectionManager } from '../services/webSocketConnectionManager';
import type { Meeting, Transcript } from '../types/electron';
import type { ProcessedTranscriptEntry, TranscriptEntry } from '../types/transcript';

interface UseTranscriptionOptions {
  currentMeeting: Meeting | null;
  fetchTranscripts: (meetingId: number) => Promise<Transcript[]>;
  createMeeting: () => Promise<Meeting>;
  saveTranscript: (
    meetingId: number,
    timestamp: string,
    text: string,
    translation?: string
  ) => Promise<void>;
  onGenerateSummary?: (transcripts: TranscriptEntry[]) => void;
}

interface UseTranscriptionResult {
  transcriptsByMeeting: Record<number, TranscriptEntry[]>;
  currentMeetingTranscripts: TranscriptEntry[];
  processedTranscripts: ProcessedTranscriptEntry[];
  partialTranscript: string;
  partialTranslation: string;
  stableTranslation: string;
  isRecording: boolean;
  isConnected: boolean;
  handleStartStop: () => void;
  clearTranscriptsForMeeting: (meetingId: number) => void;
  removeMeetingTranscripts: (meetingId: number) => void;
}

const formatTimestamp = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

const cleanTranscriptText = (text: string): string => {
  return text.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
};

function useTranscription({
  currentMeeting,
  fetchTranscripts,
  createMeeting,
  saveTranscript,
  onGenerateSummary,
}: UseTranscriptionOptions): UseTranscriptionResult {
  const { t } = useTranslation();
  const [transcriptsByMeeting, setTranscriptsByMeeting] =
    useState<Record<number, TranscriptEntry[]>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stableTranslation, setStableTranslation] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');

  const audioServiceRef = useRef<AudioCaptureService | null>(null);
  const backendTranscriptionServiceRef = useRef<BackendTranscriptionService | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const recordingMeetingIdRef = useRef<number | null>(null);
  const currentMeetingRef = useRef<Meeting | null>(null);
  const stableTranslationRef = useRef('');
  const partialTranslationRef = useRef('');
  const partialTranscriptRef = useRef('');

  useEffect(() => {
    currentMeetingRef.current = currentMeeting;
  }, [currentMeeting]);

  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const connectionManager = WebSocketConnectionManager.getInstance();
      connectionManager.performHealthCheck();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(healthCheckInterval);
      const connectionManager = WebSocketConnectionManager.getInstance();
      connectionManager.cleanup();
    };
  }, []);

  const loadTranscripts = useCallback(async (meetingId: number) => {
    const loadedTranscripts = await fetchTranscripts(meetingId);
    const formatted = loadedTranscripts.map((transcript) => ({
      timestamp: transcript.timestamp,
      text: transcript.text,
      translation: transcript.translation || undefined,
    }));

    setTranscriptsByMeeting((prev) => {
      const activeSessionId = currentSessionIdRef.current;
      const shouldPreserveActiveSession =
        recordingMeetingIdRef.current === meetingId && !!activeSessionId;
      const existing = prev[meetingId] || [];
      const activeSessionEntries = shouldPreserveActiveSession
        ? existing.filter((entry) => entry.sessionId === activeSessionId)
        : [];
      const next = activeSessionEntries.length > 0
        ? [...formatted, ...activeSessionEntries]
        : formatted;

      return {
        ...prev,
        [meetingId]: next,
      };
    });
  }, [fetchTranscripts]);

  useEffect(() => {
    if (currentMeeting) {
      loadTranscripts(currentMeeting.id);
    }
  }, [currentMeeting, loadTranscripts]);

  const upsertTranscriptEntry = useCallback((
    meetingId: number,
    sessionId: string,
    updater: (entry: TranscriptEntry) => TranscriptEntry
  ) => {
    setTranscriptsByMeeting((prev) => {
      const meetingTranscripts = prev[meetingId] || [];
      const existingIndex = meetingTranscripts.findIndex((entry) => entry.sessionId === sessionId);

      if (existingIndex === -1) {
        const baseEntry: TranscriptEntry = {
          timestamp: formatTimestamp(),
          text: '',
          translation: undefined,
          sessionId,
        };
        return {
          ...prev,
          [meetingId]: [...meetingTranscripts, updater(baseEntry)],
        };
      }

      const updatedEntry = updater(meetingTranscripts[existingIndex]);
      const next = [...meetingTranscripts];
      next[existingIndex] = updatedEntry;
      return {
        ...prev,
        [meetingId]: next,
      };
    });
  }, []);

  const updateTranscriptTranslationForSession = useCallback((
    meetingId: number,
    sessionId: string,
    translationText: string
  ) => {
    const trimmed = translationText.trim();
    if (!trimmed) {
      return;
    }

    upsertTranscriptEntry(meetingId, sessionId, (entry) => ({
      ...entry,
      translation: trimmed,
      sessionId,
    }));
  }, [upsertTranscriptEntry]);

  const resetTranscriptPreview = useCallback(() => {
    partialTranscriptRef.current = '';
    setPartialTranscript('');
  }, []);

  const resetTranslationState = useCallback(() => {
    stableTranslationRef.current = '';
    partialTranslationRef.current = '';
    setStableTranslation('');
    setPartialTranslation('');
  }, []);

  const handleTranscriptPartialWithMeeting = useCallback((
    text: string,
    sessionId: string
  ) => {
    console.log('[transcription] partial transcript received:', {
      text,
      meetingId: currentMeetingRef.current?.id,
      sessionId,
    });

    const recordingMeetingId = recordingMeetingIdRef.current;
    if (!recordingMeetingId || !text || text.trim().length === 0) {
      console.log('[transcription] Skipping transcript - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('[transcription] Skipping transcript - session mismatch');
      return;
    }

    const cleanedText = cleanTranscriptText(text);
    if (!cleanedText) {
      console.log('[transcription] Skipping transcript - only noise markers');
      return;
    }

    partialTranscriptRef.current = cleanedText;
    setPartialTranscript(cleanedText);

    upsertTranscriptEntry(recordingMeetingId, sessionId, (entry) => ({
      ...entry,
      sessionId,
    }));
  }, [upsertTranscriptEntry]);

  const handleTranscriptStableWithMeeting = useCallback(async (
    text: string,
    sessionId: string,
    fullText?: string
  ) => {
    console.log('[transcription] stable transcript received:', {
      text,
      sessionId,
      meetingId: currentMeetingRef.current?.id,
      fullText,
    });

    const recordingMeetingId = recordingMeetingIdRef.current;
    if (!recordingMeetingId) {
      console.log('[transcription] Skipping stable transcript - invalid meeting');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('[transcription] Skipping stable transcript - session mismatch');
      return;
    }

    const baseText = fullText && fullText.trim() ? fullText : text;
    if (!baseText || baseText.trim().length === 0) {
      console.log('[transcription] Skipping stable transcript - invalid data');
      return;
    }
    const cleanedText = cleanTranscriptText(baseText);
    if (!cleanedText) {
      console.log('[transcription] Skipping stable transcript - only noise markers');
      resetTranscriptPreview();
      return;
    }

    upsertTranscriptEntry(recordingMeetingId, sessionId, (entry) => {
      const nextText = fullText
        ? cleanedText
        : [entry.text, cleanedText].filter(Boolean).join(' ').trim();

      return {
        ...entry,
        text: nextText,
        translation: entry.translation,
        sessionId,
      };
    });

    resetTranscriptPreview();
  }, [resetTranscriptPreview, upsertTranscriptEntry]);

  const handleTranslationPartialWithMeeting = useCallback((
    translation: string,
    sessionId: string
  ) => {
    console.log('[translation] partial translation received:', {
      translation,
      meetingId: currentMeetingRef.current?.id,
      sessionId,
    });

    const recordingMeetingId = recordingMeetingIdRef.current;
    if (!recordingMeetingId || !translation || translation.trim().length === 0) {
      console.log('[translation] Skipping partial translation - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('[translation] Skipping partial translation - session mismatch');
      return;
    }

    const trimmedTranslation = translation.trim();
    partialTranslationRef.current = trimmedTranslation;
    setPartialTranslation(trimmedTranslation);

    upsertTranscriptEntry(recordingMeetingId, sessionId, (entry) => ({
      ...entry,
      sessionId,
    }));
  }, [upsertTranscriptEntry]);

  const handleTranslationStableWithMeeting = useCallback((
    translation: string,
    sessionId: string
  ) => {
    console.log('[translation] stable translation received:', {
      translation,
      meetingId: currentMeetingRef.current?.id,
      sessionId,
    });

    const recordingMeetingId = recordingMeetingIdRef.current;
    if (!recordingMeetingId || !translation || translation.trim().length === 0) {
      console.log('[translation] Skipping stable translation - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('[translation] Skipping stable translation - session mismatch');
      return;
    }

    const trimmedTranslation = translation.trim();

    setStableTranslation((prev) => {
      const next = [prev, trimmedTranslation].filter(Boolean).join(' ').trim();
      stableTranslationRef.current = next;
      return next;
    });

    partialTranslationRef.current = '';
    setPartialTranslation('');

    updateTranscriptTranslationForSession(
      recordingMeetingId,
      sessionId,
      stableTranslationRef.current
    );
  }, [updateTranscriptTranslationForSession]);

  const stopRecording = useCallback(async () => {
    const sessionId = currentSessionIdRef.current;
    const recordingMeetingId = recordingMeetingIdRef.current;

    if (audioServiceRef.current) {
      audioServiceRef.current.stopCapture();
      audioServiceRef.current = null;
    }

    if (backendTranscriptionServiceRef.current) {
      await backendTranscriptionServiceRef.current.disconnect();
      backendTranscriptionServiceRef.current = null;
    }

    if (recordingMeetingId && sessionId) {
      const sessionTranscripts = transcriptsByMeeting[recordingMeetingId] || [];
      const sessionBubble = sessionTranscripts.find((entry) => entry.sessionId === sessionId);
      const transcriptText =
        sessionBubble?.text && sessionBubble.text.trim().length > 0
          ? sessionBubble.text
          : partialTranscriptRef.current;
      const normalizedTranscriptText = transcriptText?.trim();

      const translationSource = sessionBubble?.translation || stableTranslationRef.current;
      const combinedTranslation =
        translationSource && translationSource.trim().length > 0
          ? translationSource
          : partialTranslationRef.current;
      const translationToPersist = combinedTranslation?.trim() || undefined;
      const timestampForSave = sessionBubble?.timestamp || formatTimestamp();

      if (normalizedTranscriptText) {
        console.log(
          '[transcription] Saving session transcript to database:',
          normalizedTranscriptText.substring(0, 50) + '...'
        );
        upsertTranscriptEntry(recordingMeetingId, sessionId, (entry) => ({
          ...entry,
          text: normalizedTranscriptText,
          translation: translationToPersist || entry.translation,
          sessionId,
          timestamp: timestampForSave,
        }));

        await saveTranscript(
          recordingMeetingId,
          timestampForSave,
          normalizedTranscriptText,
          translationToPersist
        );
      }
    }

    setIsRecording(false);
    setIsConnected(false);

    resetTranscriptPreview();
    resetTranslationState();

    currentSessionIdRef.current = null;
    recordingMeetingIdRef.current = null;

    const currentTranscripts = currentMeeting
      ? transcriptsByMeeting[currentMeeting.id] || []
      : [];

    if (onGenerateSummary && currentMeeting && currentTranscripts.length > 0) {
      setTimeout(() => {
        if (window.confirm(t('summary.end_confirm'))) {
          onGenerateSummary(currentTranscripts);
        }
      }, 500);
    }
  }, [
    currentMeeting,
    onGenerateSummary,
    resetTranscriptPreview,
    resetTranslationState,
    saveTranscript,
    t,
    transcriptsByMeeting,
    upsertTranscriptEntry,
  ]);

  const startRecording = useCallback(async () => {
    let activeMeeting = currentMeetingRef.current ?? currentMeeting;
    if (!activeMeeting) {
      const createdMeeting = await createMeeting();
      if (!createdMeeting) {
        throw new Error('Failed to create meeting');
      }
      activeMeeting = createdMeeting;
      setTranscriptsByMeeting((prev) => ({
        ...prev,
        [createdMeeting.id]: [],
      }));
    }

    const newSessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    currentSessionIdRef.current = newSessionId;
    recordingMeetingIdRef.current = activeMeeting?.id ?? null;
    resetTranscriptPreview();
    resetTranslationState();

    try {
      audioServiceRef.current = new AudioCaptureService();

      backendTranscriptionServiceRef.current = new BackendTranscriptionService(
        newSessionId
      );

      const connected = await backendTranscriptionServiceRef.current.connect(
        (text: string, sessionId: string) =>
          handleTranscriptPartialWithMeeting(text, sessionId),
        (text: string, sessionId: string, fullText?: string) =>
          handleTranscriptStableWithMeeting(text, sessionId, fullText),
        (translation: string, sessionId: string) =>
          handleTranslationPartialWithMeeting(translation, sessionId),
        (translation: string, sessionId: string) =>
          handleTranslationStableWithMeeting(translation, sessionId),
        setIsConnected,
        (error) => {
          console.error('Backend transcription error:', error);
          alert(t('common.error_connecting_backend', { error }));
          stopRecording();
        }
      );

      if (!connected) {
        alert(t('common.failed_to_connect_backend'));
        return;
      }

      const started = await audioServiceRef.current.startCapture(
        (_audioBlob) => {
          // Audio data is handled by MediaRecorder in the transcription service
        },
        async (error) => {
          console.error('Audio capture error:', error);

          const errorMessage = error.message || 'Unknown error';
          const openSettings = window.confirm(
            t('summary.audio_error_title', { error: errorMessage }) + '\n\n' +
            t('summary.audio_error_message')
          );

          if (openSettings && window.electronAPI?.openScreenRecordingSettings) {
            await window.electronAPI.openScreenRecordingSettings();
          }

          stopRecording();
        }
      );

      if (started) {
        const stream = audioServiceRef.current.getAudioStream();
        if (stream && backendTranscriptionServiceRef.current) {
          backendTranscriptionServiceRef.current.setupMediaRecorder(stream);
        }
        setIsRecording(true);
      } else {
        alert(t('common.failed_to_start_audio'));
        if (backendTranscriptionServiceRef.current) {
          backendTranscriptionServiceRef.current.disconnect();
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(
        t('common.failed_to_start_recording', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
      stopRecording();
    }
  }, [
    createMeeting,
    currentMeeting,
    handleTranscriptPartialWithMeeting,
    handleTranscriptStableWithMeeting,
    handleTranslationPartialWithMeeting,
    handleTranslationStableWithMeeting,
    resetTranscriptPreview,
    resetTranslationState,
    stopRecording,
    t,
  ]);

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const currentMeetingTranscripts = useMemo(() => {
    if (!currentMeeting) {
      return [];
    }
    return transcriptsByMeeting[currentMeeting.id] || [];
  }, [currentMeeting, transcriptsByMeeting]);

  const processedTranscripts = useMemo(() => {
    return currentMeetingTranscripts.map((entry, index) => {
      const isActiveSessionBubble =
        isRecording && entry.sessionId === currentSessionIdRef.current;
      const showTranslation =
        Boolean(entry.translation) ||
        (isActiveSessionBubble && Boolean(stableTranslation || partialTranslation));

      return {
        ...entry,
        isActiveSessionBubble,
        showTranslation,
        index,
      };
    });
  }, [currentMeetingTranscripts, isRecording, partialTranslation, stableTranslation]);

  const clearTranscriptsForMeeting = useCallback((meetingId: number) => {
    setTranscriptsByMeeting((prev) => ({
      ...prev,
      [meetingId]: [],
    }));
  }, []);

  const removeMeetingTranscripts = useCallback((meetingId: number) => {
    setTranscriptsByMeeting((prev) => {
      const next = { ...prev };
      delete next[meetingId];
      return next;
    });
  }, []);

  return {
    transcriptsByMeeting,
    currentMeetingTranscripts,
    processedTranscripts,
    partialTranscript,
    partialTranslation,
    stableTranslation,
    isRecording,
    isConnected,
    handleStartStop,
    clearTranscriptsForMeeting,
    removeMeetingTranscripts,
  };
}

export default useTranscription;
