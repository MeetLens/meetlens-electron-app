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
  translationLanguage: string;
}

interface UseTranscriptionResult {
  transcriptsByMeeting: Record<number, TranscriptEntry[]>;
  currentMeetingTranscripts: TranscriptEntry[];
  processedTranscripts: ProcessedTranscriptEntry[];
  partialTranscript: string;
  partialTranslation: string;
  stableTranslation: string;
  activeSessionId: string | null;
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
  translationLanguage,
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
  const sessionTimestampRef = useRef<Record<string, string>>({});
  // Fix Issue 1: Track latest stable transcript per session to avoid race condition
  const latestStableTranscriptRef = useRef<Record<string, { text: string; timestamp: string }>>({});
  const latestTranslationBySessionRef = useRef<Record<string, string>>({});
  // Fix Issue 2: Track which sessions have been persisted to prevent duplicate writes
  const persistedSessionsRef = useRef<Set<string>>(new Set());

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
      id: `db:${transcript.id}`,
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
        const sessionTimestamp = sessionTimestampRef.current[sessionId] || formatTimestamp();
        sessionTimestampRef.current[sessionId] = sessionTimestamp;
        const baseEntry: TranscriptEntry = {
          id: `session:${sessionId}`,
          timestamp: sessionTimestamp,
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

    // Use a consistent per-session timestamp for persistence updates
    const sessionTimestamp =
      sessionTimestampRef.current[sessionId] || formatTimestamp();
    sessionTimestampRef.current[sessionId] = sessionTimestamp;

    const previousText = fullText
      ? ''
      : latestStableTranscriptRef.current[sessionId]?.text || '';
    const nextText = fullText
      ? cleanedText
      : [previousText, cleanedText].filter(Boolean).join(' ').trim();
    const translationForSave = latestTranslationBySessionRef.current[sessionId];
    const normalizedTranslation = translationForSave?.trim()
      ? translationForSave.trim()
      : undefined;

    upsertTranscriptEntry(recordingMeetingId, sessionId, (entry) => ({
      ...entry,
      text: nextText,
      sessionId,
      timestamp: sessionTimestamp,
    }));

    resetTranscriptPreview();

    // Immediately persist to database (fire-and-forget to prevent data loss on crash)
    if (nextText) {
      // Fix Issue 1: Store latest stable transcript in ref for translation handler
      latestStableTranscriptRef.current[sessionId] = {
        text: nextText,
        timestamp: sessionTimestamp,
      };

      console.log('[transcription] Attempting to save stable transcript to database:', {
        meetingId: recordingMeetingId,
        timestamp: sessionTimestamp,
        textLength: nextText.length,
        hasTranslation: !!normalizedTranslation,
        textPreview: nextText.substring(0, 50) + '...',
      });

      // Fix Issue 2: Mark session as persisted after saving
      saveTranscript(
        recordingMeetingId,
        sessionTimestamp,
        nextText,
        normalizedTranslation
      ).then(() => {
        console.log('[transcription] ✓ Successfully saved stable transcript to database:', {
          meetingId: recordingMeetingId,
          timestamp: sessionTimestamp,
        });
        persistedSessionsRef.current.add(sessionId);
      }).catch((error) => {
        console.error('[transcription] ✗ Failed to persist stable transcript:', {
          meetingId: recordingMeetingId,
          timestamp: sessionTimestamp,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      });
    }
  }, [resetTranscriptPreview, upsertTranscriptEntry, saveTranscript]);

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
    const nextTranslation = [stableTranslationRef.current, trimmedTranslation]
      .filter(Boolean)
      .join(' ')
      .trim();

    stableTranslationRef.current = nextTranslation;
    latestTranslationBySessionRef.current[sessionId] = nextTranslation;
    setStableTranslation(nextTranslation);

    partialTranslationRef.current = '';
    setPartialTranslation('');

    updateTranscriptTranslationForSession(
      recordingMeetingId,
      sessionId,
      nextTranslation
    );

    // Fix Issue 1: Read from latestStableTranscriptRef instead of state to avoid race condition
    // Immediately persist the updated translation to database
    const latestTranscript = latestStableTranscriptRef.current[sessionId];

    if (latestTranscript?.text) {
      console.log('[translation] Attempting to save translation update to database:', {
        meetingId: recordingMeetingId,
        timestamp: latestTranscript.timestamp,
        translationLength: nextTranslation.length,
        translationPreview: nextTranslation.substring(0, 50) + '...',
      });

      saveTranscript(
        recordingMeetingId,
        latestTranscript.timestamp,
        latestTranscript.text,
        nextTranslation
      ).then(() => {
        console.log('[translation] ✓ Successfully saved translation to database:', {
          meetingId: recordingMeetingId,
          timestamp: latestTranscript.timestamp,
        });
      }).catch((error) => {
        console.error('[translation] ✗ Failed to persist translation:', {
          meetingId: recordingMeetingId,
          timestamp: latestTranscript.timestamp,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      });
    }
  }, [updateTranscriptTranslationForSession, saveTranscript]);

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

    // NOTE: Individual transcripts are now persisted immediately in handleTranscriptStableWithMeeting
    // and handleTranslationStableWithMeeting to prevent data loss on crashes.
    // This section only handles final session cleanup and summary generation.

    if (recordingMeetingId && sessionId) {
      const sessionTranscripts = transcriptsByMeeting[recordingMeetingId] || [];
      const sessionBubble = sessionTranscripts.find((entry) => entry.sessionId === sessionId);

      // Fix Issue 2: Check if session has already been persisted to prevent duplicate writes
      const hasUnsavedPartialTranscript =
        partialTranscriptRef.current &&
        (!sessionBubble?.text || sessionBubble.text.trim().length === 0) &&
        !persistedSessionsRef.current.has(sessionId);

      if (hasUnsavedPartialTranscript) {
        const normalizedTranscriptText = partialTranscriptRef.current.trim();
        const translationToPersist = (
          sessionBubble?.translation ||
          stableTranslationRef.current ||
          partialTranslationRef.current
        )?.trim() || undefined;
        const timestampForSave =
          sessionTimestampRef.current[sessionId] || formatTimestamp();
        sessionTimestampRef.current[sessionId] = timestampForSave;

        console.log(
          '[transcription] Saving final partial transcript to database:',
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

        // Fix Issue 2: Mark session as persisted after saving
        persistedSessionsRef.current.add(sessionId);
      }
    }

    setIsRecording(false);
    setIsConnected(false);

    resetTranscriptPreview();
    resetTranslationState();

    // Fix Issue 1 & 2: Clean up session tracking refs
    if (sessionId) {
      delete latestStableTranscriptRef.current[sessionId];
      persistedSessionsRef.current.delete(sessionId);
      delete sessionTimestampRef.current[sessionId];
      delete latestTranslationBySessionRef.current[sessionId];
    }

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
    sessionTimestampRef.current[newSessionId] = formatTimestamp();
    recordingMeetingIdRef.current = activeMeeting?.id ?? null;
    resetTranscriptPreview();
    resetTranslationState();

    try {
      audioServiceRef.current = new AudioCaptureService();

      backendTranscriptionServiceRef.current = new BackendTranscriptionService(
        newSessionId,
        translationLanguage
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
    translationLanguage,
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
      return {
        ...entry,
        index,
      };
    });
  }, [currentMeetingTranscripts]);

  const activeSessionId = useMemo(
    () => (isRecording ? currentSessionIdRef.current : null),
    [isRecording]
  );

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
    activeSessionId,
    isRecording,
    isConnected,
    handleStartStop,
    clearTranscriptsForMeeting,
    removeMeetingTranscripts,
  };
}

export default useTranscription;
