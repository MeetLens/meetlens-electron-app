import { useState, useEffect, useRef, useMemo, useCallback, Profiler } from 'react';
import { Meeting, Transcript } from './types/electron';
import { AudioCaptureService } from './services/audioService';
import { BackendSummaryService, type SummaryResponse } from './services/backendSummaryService';
import { BackendTranscriptionService } from './services/backendTranscriptionService';
import { WebSocketConnectionManager } from './services/webSocketConnectionManager';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import SummaryPanel from './components/SummaryPanel';

interface TranscriptEntry {
  timestamp: string;
  text: string;
  translation?: string;
  sessionId?: string | null;
}

function App() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('tr');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [structuredSummary, setStructuredSummary] = useState<SummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [stableTranslation, setStableTranslation] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');

  const audioServiceRef = useRef<AudioCaptureService | null>(null);
  const backendSummaryServiceRef = useRef<BackendSummaryService | null>(null);
  const backendTranscriptionServiceRef = useRef<BackendTranscriptionService | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const stableTranslationRef = useRef('');
  const partialTranslationRef = useRef('');
  const partialTranscriptRef = useRef('');

  useEffect(() => {
    loadMeetings();

    // Periodic health check for WebSocket connections
    const healthCheckInterval = setInterval(() => {
      const connectionManager = WebSocketConnectionManager.getInstance();
      connectionManager.performHealthCheck();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup WebSocket connections on component unmount
    return () => {
      clearInterval(healthCheckInterval);
      const connectionManager = WebSocketConnectionManager.getInstance();
      connectionManager.cleanup();
    };
  }, []);

  useEffect(() => {
    if (currentMeeting) {
      loadTranscripts(currentMeeting.id);
      loadMeetingSummary(currentMeeting.id);
    }
  }, [currentMeeting]);


  const loadMeetings = async () => {
    const loadedMeetings = await window.electronAPI.getMeetings();
    setMeetings(loadedMeetings);

    if (loadedMeetings.length > 0 && !currentMeeting) {
      setCurrentMeeting(loadedMeetings[0]);
    }
  };

  const loadTranscripts = async (meetingId: number) => {
    const loadedTranscripts = await window.electronAPI.getTranscripts(meetingId);

    if (loadedTranscripts.length === 0) {
      setTranscripts([]);
      return;
    }

    // Each saved record = one recording session = one bubble
    const formatted = loadedTranscripts.map((t: Transcript) => ({
      timestamp: t.timestamp,
      text: t.text,
      translation: t.translation || undefined,
    }));

    setTranscripts(formatted);
  };

  const loadMeetingSummary = async (meetingId: number) => {
    const result = await window.electronAPI.getMeetingSummary(meetingId);
    setMeetingSummary(result.summary || '');
    setStructuredSummary(null);
  };

  const createNewMeeting = useCallback(async () => {
    const now = new Date();
    const name = `Meeting ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const meeting = await window.electronAPI.createMeeting(name);
    setMeetings([meeting, ...meetings]);
    setCurrentMeeting(meeting);
    setTranscripts([]);
    setMeetingSummary('');
    setStructuredSummary(null);
  }, [meetings]);

  const selectMeeting = useCallback((meeting: Meeting) => {
    setCurrentMeeting(meeting);
  }, []);

  const deleteMeeting = useCallback(async (meetingId: number) => {
    await window.electronAPI.deleteMeeting(meetingId);
    await loadMeetings();

    // If deleted meeting was current, select first available or null
    if (currentMeeting?.id === meetingId) {
      const updatedMeetings = meetings.filter(m => m.id !== meetingId);
      setCurrentMeeting(updatedMeetings.length > 0 ? updatedMeetings[0] : null);
      setTranscripts([]);
      setMeetingSummary('');
      setStructuredSummary(null);
    }
  }, [currentMeeting, meetings]);

  const clearTranscripts = useCallback(async () => {
    if (!currentMeeting) return;

    await window.electronAPI.clearTranscripts(currentMeeting.id);
    setTranscripts([]);
    setMeetingSummary('');
    setStructuredSummary(null);
  }, [currentMeeting]);

  const formatTimestamp = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const cleanTranscriptText = (text: string): string => {
    return text.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const upsertTranscriptEntry = (
    sessionId: string,
    updater: (entry: TranscriptEntry) => TranscriptEntry
  ) => {
    setTranscripts((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.sessionId === sessionId);

      if (existingIndex === -1) {
        const baseEntry: TranscriptEntry = {
          timestamp: formatTimestamp(),
          text: '',
          translation: undefined,
          sessionId,
        };
        return [...prev, updater(baseEntry)];
      }

      const updatedEntry = updater(prev[existingIndex]);
      const next = [...prev];
      next[existingIndex] = updatedEntry;
      return next;
    });
  };

  const updateTranscriptTranslationForSession = (sessionId: string, translationText: string) => {
    const trimmed = translationText.trim();
    if (!trimmed) {
      return;
    }

    upsertTranscriptEntry(sessionId, (entry) => ({
      ...entry,
      translation: trimmed,
      sessionId,
    }));
  };

  const resetTranscriptPreview = () => {
    partialTranscriptRef.current = '';
    setPartialTranscript('');
  };

  const resetTranslationState = () => {
    stableTranslationRef.current = '';
    partialTranslationRef.current = '';
    setStableTranslation('');
    setPartialTranslation('');
  };

  const handleTranscriptPartialWithMeeting = (
    text: string,
    sessionId: string,
    meeting: Meeting
  ) => {
    console.log('🎤 handleTranscriptPartialWithMeeting called:', {
      text,
      meetingId: meeting?.id,
      sessionId,
    });

    if (!meeting || !text || text.trim().length === 0) {
      console.log('⚠️ Skipping transcript - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('⚠️ Skipping transcript - session mismatch');
      return;
    }

    const cleanedText = cleanTranscriptText(text);
    if (!cleanedText) {
      console.log('⚠️ Skipping transcript - only noise markers');
      return;
    }

    partialTranscriptRef.current = cleanedText;
    setPartialTranscript(cleanedText);

    upsertTranscriptEntry(sessionId, (entry) => ({
      ...entry,
      sessionId,
    }));
  };

  const handleTranscriptStableWithMeeting = async (
    text: string,
    sessionId: string,
    meeting: Meeting,
    fullText?: string
  ) => {
    console.log('🎤 handleTranscriptStableWithMeeting called:', {
      text,
      sessionId,
      meetingId: meeting?.id,
      fullText,
    });

    if (!meeting) {
      console.log('⚠️ Skipping stable transcript - invalid meeting');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('⚠️ Skipping stable transcript - session mismatch');
      return;
    }

    const baseText = fullText && fullText.trim() ? fullText : text;
    if (!baseText || baseText.trim().length === 0) {
      console.log('⚠️ Skipping stable transcript - invalid data');
      return;
    }
    const cleanedText = cleanTranscriptText(baseText);
    if (!cleanedText) {
      console.log('⚠️ Skipping stable transcript - only noise markers');
      resetTranscriptPreview();
      return;
    }

    upsertTranscriptEntry(sessionId, (entry) => {
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
  };

  const handleTranslationPartialWithMeeting = (
    translation: string,
    sessionId: string,
    meeting: Meeting
  ) => {
    console.log('🌐 handleTranslationPartialWithMeeting called:', {
      translation,
      meetingId: meeting?.id,
      sessionId,
    });

    if (!meeting || !translation || translation.trim().length === 0) {
      console.log('⚠️ Skipping partial translation - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('⚠️ Skipping partial translation - session mismatch');
      return;
    }

    const trimmedTranslation = translation.trim();
    partialTranslationRef.current = trimmedTranslation;
    setPartialTranslation(trimmedTranslation);

    // Ensure there is a bubble to attach translations to
    upsertTranscriptEntry(sessionId, (entry) => ({
      ...entry,
      sessionId,
    }));
  };

  const handleTranslationStableWithMeeting = (
    translation: string,
    sessionId: string,
    meeting: Meeting
  ) => {
    console.log('🌐 handleTranslationStableWithMeeting called:', {
      translation,
      meetingId: meeting?.id,
      sessionId,
    });

    if (!meeting || !translation || translation.trim().length === 0) {
      console.log('⚠️ Skipping stable translation - invalid data');
      return;
    }

    if (sessionId !== currentSessionIdRef.current) {
      console.log('⚠️ Skipping stable translation - session mismatch');
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

    updateTranscriptTranslationForSession(sessionId, stableTranslationRef.current);
  };

  const generateMeetingSummary = useCallback(async () => {
    if (!currentMeeting) {
      alert('No meeting selected');
      return;
    }

    if (transcripts.length === 0) {
      alert('No transcripts available to summarize');
      return;
    }

    setIsGeneratingSummary(true);

    try {
      // Combine all transcripts
      const fullTranscript = transcripts.map(t => t.text).join(' ');

      // Initialize backend service if not already done
      if (!backendSummaryServiceRef.current) {
        backendSummaryServiceRef.current = new BackendSummaryService();
      }

      // Determine language parameter
      const languageParam = selectedLanguage === 'tr' ? 'tr' : selectedLanguage === 'en' ? 'en' : null;

      // Call backend API
      const summaryResponse = await backendSummaryServiceRef.current.generateSummary(
        currentMeeting.id.toString(),
        fullTranscript,
        languageParam
      );

      // Store structured summary
      // Format for display and backward compatibility
      const formattedSummary = backendSummaryServiceRef.current.formatSummaryForDisplay(summaryResponse);
      setMeetingSummary(formattedSummary);
      setStructuredSummary(summaryResponse);

      // Save summary to database
      await window.electronAPI.saveMeetingSummary(currentMeeting.id, formattedSummary, fullTranscript);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [currentMeeting, transcripts, selectedLanguage]);

  const startRecording = async () => {
    // Ensure we have a meeting before starting
    let activeMeeting = currentMeeting;
    if (!activeMeeting) {
      const now = new Date();
      const name = `Meeting ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      activeMeeting = await window.electronAPI.createMeeting(name);
      setMeetings([activeMeeting, ...meetings]);
      setCurrentMeeting(activeMeeting);
      setTranscripts([]);
      setMeetingSummary('');
    }

    // Generate a new session ID for this recording session
    const newSessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    currentSessionIdRef.current = newSessionId;
    resetTranscriptPreview();
    resetTranslationState();

    try {
      // Initialize audio capture service
      audioServiceRef.current = new AudioCaptureService();

      // Initialize backend transcription service
      backendTranscriptionServiceRef.current = new BackendTranscriptionService(
        newSessionId
        // Uses default production WebSocket URL
      );

      // Connect to backend WebSocket
      const connected = await backendTranscriptionServiceRef.current.connect(
        // Transcript callback
        (text: string, sessionId: string) =>
          handleTranscriptPartialWithMeeting(text, sessionId, activeMeeting!),
        // Transcript stable callback
        (text: string, sessionId: string, fullText?: string) =>
          handleTranscriptStableWithMeeting(text, sessionId, activeMeeting!, fullText),
        // Translation partial callback
        (translation: string, sessionId: string) =>
          handleTranslationPartialWithMeeting(translation, sessionId, activeMeeting!),
        // Translation stable callback
        (translation: string, sessionId: string) =>
          handleTranslationStableWithMeeting(translation, sessionId, activeMeeting!),
        // Connection status callback
        setIsConnected,
        // Error callback
        (error) => {
          console.error('Backend transcription error:', error);
          alert(`Error connecting to backend: ${error}`);
          stopRecording();
        }
      );

      if (!connected) {
        alert('Failed to connect to backend transcription service');
        return;
      }

      // Start audio capture
      const started = await audioServiceRef.current.startCapture(
        (_audioBlob) => {
          // Audio data is handled by MediaRecorder in the transcription service
        },
        async (error) => {
          console.error('Audio capture error:', error);

          // Show helpful error message with option to open settings
          const errorMessage = error.message || 'Unknown error';
          const openSettings = window.confirm(
            `Error capturing audio: ${errorMessage}\n\n` +
            `MeetLens needs Screen Recording permission to capture system audio.\n\n` +
            `Click OK to open System Settings, then:\n` +
            `1. Enable MeetLens in "Screen Recording"\n` +
            `2. Restart MeetLens\n\n` +
            `Click Cancel to continue with microphone-only mode.`
          );

          if (openSettings && window.electronAPI?.openScreenRecordingSettings) {
            await window.electronAPI.openScreenRecordingSettings();
          }

          stopRecording();
        }
      );

      if (started) {
        // Get the audio stream and set up MediaRecorder in transcription service
        const stream = audioServiceRef.current.getAudioStream();
        if (stream && backendTranscriptionServiceRef.current) {
          backendTranscriptionServiceRef.current.setupMediaRecorder(stream);
        }
        setIsRecording(true);
      } else {
        alert('Failed to start audio capture');
        if (backendTranscriptionServiceRef.current) {
          backendTranscriptionServiceRef.current.disconnect();
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopRecording();
    }
  };

  const stopRecording = async () => {
    const sessionId = currentSessionIdRef.current;

    // Stop audio capture first
    if (audioServiceRef.current) {
      audioServiceRef.current.stopCapture();
      audioServiceRef.current = null;
    }

    // Disconnect backend transcription service (waits for final messages)
    if (backendTranscriptionServiceRef.current) {
      await backendTranscriptionServiceRef.current.disconnect();
      backendTranscriptionServiceRef.current = null;
    }

    // Save the session's transcript to database AFTER disconnect (to include any final messages)
    if (currentMeeting && sessionId) {
      // Find the bubble for this session
      const sessionBubble = transcripts.find((t) => t.sessionId === sessionId);
      const transcriptText =
        (sessionBubble?.text && sessionBubble.text.trim().length > 0)
          ? sessionBubble.text
          : partialTranscriptRef.current;
      const normalizedTranscriptText = transcriptText?.trim();

      if (sessionBubble && normalizedTranscriptText) {
        console.log(
          '💾 Saving session transcript to database:',
          normalizedTranscriptText.substring(0, 50) + '...'
        );
        const translationSource = sessionBubble.translation || stableTranslationRef.current;
        const combinedTranslation =
          translationSource && translationSource.trim().length > 0
            ? translationSource
            : partialTranslationRef.current;
        const translationToPersist = combinedTranslation?.trim() || undefined;
        const timestampForSave = sessionBubble.timestamp || formatTimestamp();

        upsertTranscriptEntry(sessionId, (entry) => ({
          ...entry,
          text: normalizedTranscriptText,
          translation: translationToPersist || entry.translation,
          sessionId,
          timestamp: timestampForSave,
        }));

        await window.electronAPI.saveTranscript(
          currentMeeting.id,
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

    // Clear session ID
    currentSessionIdRef.current = null;

    // Auto-generate summary when meeting ends
    if (currentMeeting && transcripts.length > 0) {
      setTimeout(() => {
        if (window.confirm('Meeting ended. Would you like to generate a summary?')) {
          generateMeetingSummary();
        }
      }, 500);
    }
  };

  // Memoized callback for start/stop recording
  const handleStartStop = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording]);

  // Memoize transcript processing to avoid re-computation on every render
  const processedTranscripts = useMemo(() => {
    return transcripts.map((entry, index) => {
      const isActiveSessionBubble =
        isRecording && entry.sessionId === currentSessionIdRef.current;
      const showTranslation =
        entry.translation ||
        (isActiveSessionBubble && (stableTranslation || partialTranslation));

      return {
        ...entry,
        isActiveSessionBubble,
        showTranslation,
        index,
      };
    });
  }, [transcripts, isRecording, stableTranslation, partialTranslation]);

  // Performance profiling callback for React DevTools
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (actualDuration > 16.67) { // Log renders that exceed 60fps threshold
      console.log(`🔄 ${id} [${phase}]: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
    }
  };

  return (
    <div className="app-container">
      <Profiler id="TopBar" onRender={onRenderCallback}>
        <TopBar
          isRecording={isRecording}
          isConnected={isConnected}
          onStartStop={handleStartStop}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
        />
      </Profiler>

      <div className="main-content">
        <Profiler id="Sidebar" onRender={onRenderCallback}>
          <Sidebar
            meetings={meetings}
            currentMeeting={currentMeeting}
            onSelectMeeting={selectMeeting}
            onNewMeeting={createNewMeeting}
            onDeleteMeeting={deleteMeeting}
          />
        </Profiler>

        <Profiler id="CenterPanel" onRender={onRenderCallback}>
          <div className="center-panel">
            <div className="panel-header">
              <h2 className="panel-title">Live Transcript</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="record-button start"
                  onClick={generateMeetingSummary}
                  disabled={!processedTranscripts.length || isGeneratingSummary}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    opacity: !processedTranscripts.length || isGeneratingSummary ? 0.5 : 1,
                    cursor: !processedTranscripts.length || isGeneratingSummary ? 'not-allowed' : 'pointer',
                    borderRadius: '8px',
                  }}
                >
                  {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                </button>
                <button className="clear-button" onClick={clearTranscripts}>
                  Clear
                </button>
              </div>
            </div>

            <div className="transcript-container" ref={transcriptContainerRef}>
            {processedTranscripts.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className="empty-text">
                  {isRecording ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          background: '#10a37f',
                          borderRadius: '50%',
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                        <div style={{
                          width: '8px',
                          height: '8px',
                          background: '#10a37f',
                          borderRadius: '50%',
                          animation: 'pulse 1.5s ease-in-out 0.2s infinite'
                        }} />
                        <div style={{
                          width: '8px',
                          height: '8px',
                          background: '#10a37f',
                          borderRadius: '50%',
                          animation: 'pulse 1.5s ease-in-out 0.4s infinite'
                        }} />
                      </div>
                      <span>Listening for speech...</span>
                    </div>
                  ) : (
                    'Click "Start Meeting" to begin transcription'
                  )}
                </div>
              </div>
            ) : (
              <>
                {processedTranscripts.map((entry) => {
                  return (
                    <div
                      key={(entry as any).sessionId || entry.index}
                      className="transcript-entry"
                      style={{
                        animation: entry.index === processedTranscripts.length - 1 ? 'slideIn 0.3s ease-out' : 'none'
                      }}
                    >
                      <div className="transcript-timestamp">{entry.timestamp}</div>
                      <div className="transcript-text">
                        {entry.text}
                        {entry.isActiveSessionBubble && partialTranscript && (
                          <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>
                            {entry.text ? ' ' : ''}
                            {partialTranscript}
                          </span>
                        )}
                      </div>
                      {entry.showTranslation && (
                        <div className="transcript-translation" style={{
                          marginTop: '8px',
                          color: '#10a37f',
                          fontSize: '13px'
                        }}>
                          {entry.isActiveSessionBubble ? (
                            <>
                              {(stableTranslation || (!partialTranslation && entry.translation)) && (
                                <span style={{ color: '#111111', fontStyle: 'normal' }}>
                                  {stableTranslation || entry.translation}
                                </span>
                              )}
                              {partialTranslation && (
                                <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>
                                  {stableTranslation ? ' ' : ''}
                                  {partialTranslation}
                                </span>
                              )}
                            </>
                          ) : (
                            entry.translation
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isRecording && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    opacity: 0.5,
                    fontSize: '12px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: '#10a37f',
                      borderRadius: '50%',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <span>Listening...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </Profiler>

        <Profiler id="SummaryPanel" onRender={onRenderCallback}>
          <SummaryPanel
            summary={meetingSummary}
            structuredSummary={structuredSummary}
            isGenerating={isGeneratingSummary}
            onGenerate={generateMeetingSummary}
            hasTranscripts={processedTranscripts.length > 0}
          />
        </Profiler>
      </div>
    </div>
  );
}

export default App;
