import { useState, useEffect, useRef } from 'react';
import { Meeting, Transcript } from './types/electron';
import { AudioCaptureService } from './services/audioService';
import { TranslationService } from './services/translationService';
import { BackendSummaryService, type SummaryResponse } from './services/backendSummaryService';
import { BackendTranscriptionService } from './services/backendTranscriptionService';
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
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [deeplApiKey, setDeeplApiKey] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [structuredSummary, setStructuredSummary] = useState<SummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [stableTranslation, setStableTranslation] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');

  const audioServiceRef = useRef<AudioCaptureService | null>(null);
  const translationServiceRef = useRef<TranslationService | null>(null);
  const backendSummaryServiceRef = useRef<BackendSummaryService | null>(null);
  const backendTranscriptionServiceRef = useRef<BackendTranscriptionService | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const stableTranslationRef = useRef('');
  const partialTranslationRef = useRef('');

  useEffect(() => {
    loadMeetings();
    loadApiKeys();
  }, []);

  useEffect(() => {
    if (currentMeeting) {
      loadTranscripts(currentMeeting.id);
      loadMeetingSummary(currentMeeting.id);
    }
  }, [currentMeeting]);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (transcriptContainerRef.current && transcripts.length > 0) {
      const container = transcriptContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts]);

  const loadApiKeys = () => {
    const savedElevenLabsKey = localStorage.getItem('elevenLabsApiKey');
    const savedDeeplKey = localStorage.getItem('deeplApiKey');

    if (savedElevenLabsKey) setElevenLabsApiKey(savedElevenLabsKey);
    if (savedDeeplKey) setDeeplApiKey(savedDeeplKey);

    // Load from environment variables as fallback
    const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const envDeeplKey = import.meta.env.VITE_DEEPL_API_KEY;

    if (!savedElevenLabsKey && envElevenLabsKey) setElevenLabsApiKey(envElevenLabsKey);
    if (!savedDeeplKey && envDeeplKey) setDeeplApiKey(envDeeplKey);
  };

  const saveApiKeys = (elevenLabsKey: string, deeplKey: string) => {
    localStorage.setItem('elevenLabsApiKey', elevenLabsKey);
    localStorage.setItem('deeplApiKey', deeplKey);
    setElevenLabsApiKey(elevenLabsKey);
    setDeeplApiKey(deeplKey);
  };

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

  const createNewMeeting = async () => {
    const now = new Date();
    const name = `Meeting ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const meeting = await window.electronAPI.createMeeting(name);
    setMeetings([meeting, ...meetings]);
    setCurrentMeeting(meeting);
    setTranscripts([]);
    setMeetingSummary('');
    setStructuredSummary(null);
  };

  const selectMeeting = (meeting: Meeting) => {
    setCurrentMeeting(meeting);
  };

  const deleteMeeting = async (meetingId: number) => {
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
  };

  const clearTranscripts = async () => {
    if (!currentMeeting) return;

    await window.electronAPI.clearTranscripts(currentMeeting.id);
    setTranscripts([]);
    setMeetingSummary('');
    setStructuredSummary(null);
  };

  const formatTimestamp = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const updateLatestTranscriptTranslation = (translationText: string) => {
    setTranscripts((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const lastIndex = prev.length - 1;
      const updatedEntry = {
        ...prev[lastIndex],
        translation: translationText.trim(),
      };

      return [...prev.slice(0, lastIndex), updatedEntry];
    });
  };

  const resetTranslationState = () => {
    stableTranslationRef.current = '';
    partialTranslationRef.current = '';
    setStableTranslation('');
    setPartialTranslation('');
  };

  const handleTranscriptWithMeeting = async (text: string, meeting: Meeting) => {
    console.log('🎤 handleTranscriptWithMeeting called:', { text, meetingId: meeting?.id });

    if (!meeting || !text || text.trim().length === 0) {
      console.log('⚠️ Skipping transcript - invalid data');
      return;
    }

    // Remove noise markers in parentheses like (music), (silence), (upbeat music), etc.
    const cleanedText = text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    if (!cleanedText) {
      console.log('⚠️ Skipping transcript - only noise markers');
      return; // Skip if only noise markers
    }

    console.log('✅ Processing transcript:', cleanedText, 'for meeting:', meeting.id);

    const timestamp = formatTimestamp();
    let translation: string | undefined;

    // Translate using DeepL if API key is available and language is not English
    if (deeplApiKey && selectedLanguage !== 'en') {
      if (!translationServiceRef.current) {
        translationServiceRef.current = new TranslationService(deeplApiKey, selectedLanguage);
      }
      translationServiceRef.current.setTargetLanguage(selectedLanguage);
      try {
        console.log('🌐 Translating with DeepL:', cleanedText.substring(0, 50) + '...');
        translation = await translationServiceRef.current.translate(cleanedText);
        console.log('✅ Translation received from DeepL:', translation?.substring(0, 50) + '...');
      } catch (err) {
        console.error('❌ Translation failed:', err);
      }
    }

    // Parent-Child Hierarchy:
    // - Parent: Meeting Session (container for all audio bubbles)
    // - Child: Audio Bubble (each Start/Stop creates a new bubble)
    // 
    // Within one recording session: REPLACE text (backend sends cumulative transcripts)
    // Each new Start/Stop recording: CREATE new Audio Bubble (stacked like chat messages)
    const sessionId = currentSessionIdRef.current;

    setTranscripts((prev) => {
      // Find the bubble for this session by sessionId
      const existingBubbleIndex = prev.findIndex((entry) => entry.sessionId === sessionId);

      if (existingBubbleIndex !== -1) {
        // Same recording session: REPLACE text (backend sends cumulative)
        console.log('📝 Replacing text in Audio Bubble for session:', sessionId);
        const updated = [...prev];
        updated[existingBubbleIndex] = {
          ...updated[existingBubbleIndex],
          text: cleanedText, // REPLACE with latest cumulative text
          translation: translation || updated[existingBubbleIndex].translation,
        };
        return updated;
      } else if (isRecording && prev.length > 0) {
        // Recording active but no session match - update the LAST bubble
        // This handles cases where meeting was switched during recording
        console.log('📝 Updating last bubble (recording active, no session match)');
        const updated = [...prev];
        const lastIndex = prev.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          text: cleanedText,
          translation: translation || updated[lastIndex].translation,
          sessionId: sessionId // Tag it with current session
        };
        return updated;
      } else {
        // New recording session: CREATE new Audio Bubble
        console.log('📝 Creating new Audio Bubble for session:', sessionId);
        return [...prev, { timestamp, text: cleanedText, translation, sessionId }];
      }
    });

    // Note: We don't save each partial transcript here anymore
    // The final combined text will be saved at stopRecording
  };

  const handleTranslationPartialWithMeeting = (translation: string, meeting: Meeting) => {
    console.log('🌐 handleTranslationPartialWithMeeting called:', { translation, meetingId: meeting?.id });

    if (!meeting || !translation || translation.trim().length === 0) {
      console.log('⚠️ Skipping partial translation - invalid data');
      return;
    }

    partialTranslationRef.current = translation;
    setPartialTranslation(translation);

    const combined = [stableTranslationRef.current, translation].filter(Boolean).join(' ').trim();
    updateLatestTranscriptTranslation(combined);
  };

  const handleTranslationStableWithMeeting = (translation: string, meeting: Meeting) => {
    console.log('🌐 handleTranslationStableWithMeeting called:', { translation, meetingId: meeting?.id });

    if (!meeting || !translation || translation.trim().length === 0) {
      console.log('⚠️ Skipping stable translation - invalid data');
      return;
    }

    setStableTranslation((prev) => {
      const next = [prev, translation].filter(Boolean).join(' ').trim();
      stableTranslationRef.current = next;
      return next;
    });

    partialTranslationRef.current = '';
    setPartialTranslation('');

    updateLatestTranscriptTranslation(
      [stableTranslationRef.current, partialTranslationRef.current].filter(Boolean).join(' ').trim()
    );
  };

  const generateMeetingSummary = async () => {
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
  };

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
    currentSessionIdRef.current = `session-${Date.now()}`;
    resetTranslationState();

    try {
      // Initialize audio capture service
      audioServiceRef.current = new AudioCaptureService();

      // Initialize backend transcription service
      backendTranscriptionServiceRef.current = new BackendTranscriptionService(
        activeMeeting.id.toString()
        // Uses default production WebSocket URL
      );

      // Connect to backend WebSocket
      const connected = await backendTranscriptionServiceRef.current.connect(
        // Transcript callback
        (text: string) => handleTranscriptWithMeeting(text, activeMeeting!),
        // Translation partial callback
        (translation: string) => handleTranslationPartialWithMeeting(translation, activeMeeting!),
        // Translation stable callback
        (translation: string) => handleTranslationStableWithMeeting(translation, activeMeeting!),
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
        (error) => {
          console.error('Audio capture error:', error);
          alert('Error capturing audio. Please check your microphone permissions.');
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

    // Save the current session's transcript to database BEFORE stopping
    if (currentMeeting && sessionId) {
      // Find the bubble for this session
      const sessionBubble = transcripts.find((t) => t.sessionId === sessionId);
      if (sessionBubble && sessionBubble.text) {
        console.log('💾 Saving session transcript to database:', sessionBubble.text.substring(0, 50) + '...');
        const combinedTranslation = [stableTranslationRef.current, partialTranslationRef.current]
          .filter(Boolean)
          .join(' ')
          .trim();
        const translationToPersist = sessionBubble.translation || combinedTranslation || undefined;

        if (!sessionBubble.translation && translationToPersist) {
          updateLatestTranscriptTranslation(translationToPersist);
        }

        await window.electronAPI.saveTranscript(
          currentMeeting.id,
          sessionBubble.timestamp,
          sessionBubble.text,
          translationToPersist
        );
      }
    }

    // Stop audio capture
    if (audioServiceRef.current) {
      audioServiceRef.current.stopCapture();
      audioServiceRef.current = null;
    }

    // Disconnect backend transcription service
    if (backendTranscriptionServiceRef.current) {
      await backendTranscriptionServiceRef.current.disconnect();
      backendTranscriptionServiceRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);

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

  return (
    <div className="app-container">
      <TopBar
        isRecording={isRecording}
        isConnected={isConnected}
        onStartStop={isRecording ? stopRecording : startRecording}
        elevenLabsApiKey={elevenLabsApiKey}
        deeplApiKey={deeplApiKey}
        selectedLanguage={selectedLanguage}
        onSaveApiKeys={saveApiKeys}
        onLanguageChange={setSelectedLanguage}
      />

      <div className="main-content">
        <Sidebar
          meetings={meetings}
          currentMeeting={currentMeeting}
          onSelectMeeting={selectMeeting}
          onNewMeeting={createNewMeeting}
          onDeleteMeeting={deleteMeeting}
        />

        <div className="center-panel">
          <div className="panel-header">
            <h2 className="panel-title">Live Transcript</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="record-button start"
                onClick={generateMeetingSummary}
                disabled={!transcripts.length || isGeneratingSummary}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  opacity: !transcripts.length || isGeneratingSummary ? 0.5 : 1,
                  cursor: !transcripts.length || isGeneratingSummary ? 'not-allowed' : 'pointer',
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
            {transcripts.length === 0 ? (
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
                {transcripts.map((entry, index) => (
                  <div
                    key={(entry as any).sessionId || index}
                    className="transcript-entry"
                    style={{
                      animation: index === transcripts.length - 1 ? 'slideIn 0.3s ease-out' : 'none'
                    }}
                  >
                    <div className="transcript-timestamp">{entry.timestamp}</div>
                    <div className="transcript-text">{entry.text}</div>
                    {entry.translation && (
                      <div className="transcript-translation" style={{
                        marginTop: '8px',
                        color: '#10a37f',
                        fontSize: '13px'
                      }}>
                        {isRecording && index === transcripts.length - 1 ? (
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
                ))}
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

        <SummaryPanel
          summary={meetingSummary}
          structuredSummary={structuredSummary}
          isGenerating={isGeneratingSummary}
          onGenerate={generateMeetingSummary}
          hasTranscripts={transcripts.length > 0}
        />
      </div>
    </div>
  );
}

export default App;
