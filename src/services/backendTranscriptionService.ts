import { AUDIO_SAMPLE_RATE, TRANSCRIPTION_WS_URL } from '../config';
import { WebSocketConnectionManager, ConnectionCallbacks } from './webSocketConnectionManager';

// Backend WebSocket service for real-time transcription and translation
export interface AudioChunkMessage {
  type: 'audio_chunk';
  session_id: string;
  chunk_id: number;
  data: string; // base64 encoded audio
  audio_format: string; // e.g., 'webm', 'opus', etc.
}

export interface EndSessionMessage {
  type: 'end_session';
  session_id: string;
}

export interface TranscriptPartialMessage {
  type: 'transcript_partial';
  session_id: string;
  chunk_id: number;
  text: string;
}

export interface TranscriptStableMessage {
  type: 'transcript_stable';
  session_id: string;
  text: string;
  full_text?: string;
  chunk_id?: number;
}

export interface TranslationPartialMessage {
  type: 'translation_partial';
  session_id: string;
  chunk_id: number;
  text: string;
}

export interface TranslationStableMessage {
  type: 'translation_stable';
  session_id: string;
  text: string;
}

export interface ErrorMessage {
  type: 'error';
  session_id: string;
  message: string;
  code?: string;
}

type ServerMessage =
  | TranscriptPartialMessage
  | TranscriptStableMessage
  | TranslationPartialMessage
  | TranslationStableMessage
  | ErrorMessage;

const BACKEND_AUDIO_FORMAT = 'pcm_s16le_16k_mono';

export class BackendTranscriptionService {
  private connectionManager: WebSocketConnectionManager;
  private ws: WebSocket | null = null;
  private sessionId: string;
  private wsUrl: string;
  private chunkIdCounter = 1;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isRecording = false;
  private connectionState = false;
  private partialTranscriptDebounceTimer: NodeJS.Timeout | null = null;
  private memoryMonitoringInterval: ReturnType<typeof setInterval> | null = null;
  private transcriptionStartTime: number = 0;

  // Callbacks
  private onTranscriptPartialCallback:
    | ((text: string, sessionId: string) => void | Promise<void>)
    | null = null;
  private onTranscriptStableCallback:
    | ((text: string, sessionId: string, fullText?: string) => void | Promise<void>)
    | null = null;
  private onTranslationPartialCallback:
    | ((text: string, sessionId: string) => void | Promise<void>)
    | null = null;
  private onTranslationStableCallback:
    | ((text: string, sessionId: string) => void | Promise<void>)
    | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onConnectionCallback: ((connected: boolean) => void) | null = null;

  constructor(sessionId: string, wsUrl: string = TRANSCRIPTION_WS_URL) {
    this.sessionId = sessionId;
    this.wsUrl = wsUrl;
    this.connectionManager = WebSocketConnectionManager.getInstance();
  }

  /**
   * Connect to backend WebSocket using connection manager
   */
  async connect(
    onTranscriptPartial: (text: string, sessionId: string) => void | Promise<void>,
    onTranscriptStable: (
      text: string,
      sessionId: string,
      fullText?: string
    ) => void | Promise<void>,
    onTranslationPartial: (text: string, sessionId: string) => void | Promise<void>,
    onTranslationStable: (text: string, sessionId: string) => void | Promise<void>,
    onConnection: (connected: boolean) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    try {
      // Store callbacks
      this.onTranscriptPartialCallback = onTranscriptPartial;
      this.onTranscriptStableCallback = onTranscriptStable;
      this.onTranslationPartialCallback = onTranslationPartial;
      this.onTranslationStableCallback = onTranslationStable;
      this.onConnectionCallback = onConnection;
      this.onErrorCallback = onError;

      // Define connection callbacks for the manager
      const connectionCallbacks: ConnectionCallbacks = {
        onMessage: (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('Failed to parse server message:', error);
          }
        },
        onError: (event) => {
          console.error('WebSocket error:', event);
          this.connectionState = false;
          if (this.onErrorCallback) {
            this.onErrorCallback('WebSocket connection error');
          }
          if (this.onConnectionCallback) {
            this.onConnectionCallback(false);
          }
        },
        onClose: (event) => {
          console.log('Backend WebSocket disconnected');
          this.connectionState = false;
          if (this.onConnectionCallback) {
            this.onConnectionCallback(false);
          }
        },
        onOpen: (event) => {
          console.log('Backend WebSocket connected');
          this.connectionState = true;
          if (this.onConnectionCallback) {
            this.onConnectionCallback(true);
          }
        },
      };

      // Acquire connection from manager
      this.ws = await this.connectionManager.acquireConnection(
        this.sessionId,
        connectionCallbacks,
        this.wsUrl
      );

      return true;
    } catch (error) {
      console.error('Failed to acquire WebSocket connection:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      if (this.onConnectionCallback) {
        this.onConnectionCallback(false);
      }
      throw error;
    }
  }

  /**
   * Handle incoming messages from backend
   */
  private handleServerMessage(message: ServerMessage) {
    if (message.session_id !== this.sessionId) {
      console.warn(
        '[BackendTranscription] Ignoring message for different session',
        message.session_id,
        'current:',
        this.sessionId
      );
      return;
    }

    console.log('📥 Received message:', message.type, message);

    switch (message.type) {
      case 'transcript_partial':
        // Show partial transcripts since backend might not send stable ones
        console.log('🔄 Partial transcript:', message.text);
        // Only update if text has changed to avoid unnecessary re-renders
        if (this.onTranscriptPartialCallback && message.text && message.text.trim()) {
          // Debounce partial transcript updates to reduce UI flickering (150ms)
          if (this.partialTranscriptDebounceTimer) {
            clearTimeout(this.partialTranscriptDebounceTimer);
          }
          this.partialTranscriptDebounceTimer = setTimeout(() => {
            this.onTranscriptPartialCallback!(message.text, message.session_id);
            this.partialTranscriptDebounceTimer = null;
          }, 150);
        }
        break;

      case 'transcript_stable':
        // Send stable transcripts to UI immediately (bypass debouncing)
        console.log('✅ Stable transcript:', message.text || message.full_text);

        // Clear any pending debounced partial transcript update
        if (this.partialTranscriptDebounceTimer) {
          clearTimeout(this.partialTranscriptDebounceTimer);
          this.partialTranscriptDebounceTimer = null;
        }

        if (
          this.onTranscriptStableCallback &&
          (message.text?.trim() || message.full_text?.trim())
        ) {
          this.onTranscriptStableCallback(
            message.text || '',
            message.session_id,
            message.full_text
          );
        } else {
          console.warn('⚠️ No transcript callback or empty text');
        }
        break;

      case 'translation_partial':
        // Unstable translation preview - replace current partial
        console.log('🌐 Translation partial:', message.text);
        if (this.onTranslationPartialCallback && message.text && message.text.trim()) {
          this.onTranslationPartialCallback(message.text, message.session_id);
        } else {
          console.warn('⚠️ No translation partial callback or empty text');
        }
        break;

      case 'translation_stable':
        // Stable translation segment - append to history
        console.log('🌐 Translation stable:', message.text);
        if (this.onTranslationStableCallback && message.text && message.text.trim()) {
          this.onTranslationStableCallback(message.text, message.session_id);
        } else {
          console.warn('⚠️ No translation stable callback or empty text');
        }
        break;

      case 'error':
        console.error('❌ Server error:', message.message, message.code);
        if (this.onErrorCallback) {
          this.onErrorCallback(message.message);
        }
        break;

      default:
        console.warn('❓ Unknown message type:', message);
    }
  }

  /**
   * Set up audio processing to capture and send PCM audio chunks
   */
  async setupMediaRecorder(stream: MediaStream) {
    try {
      // Reset chunk counter at the start of each recording session
      this.chunkIdCounter = 1;

      // Use default device sample rate; resample in JS to 16 kHz before sending
      this.audioContext = new AudioContext();
      console.log('[BackendTranscription] AudioContext created with state:', this.audioContext.state);
      const source = this.audioContext.createMediaStreamSource(stream);
      const incomingTrack = stream.getAudioTracks()[0];
      if (incomingTrack) {
        console.log('[BackendTranscription] Incoming track settings:', incomingTrack.getSettings());
      }
      console.log(
        '[BackendTranscription] AudioContext sampleRate:',
        this.audioContext.sampleRate
      );
      console.log('[BackendTranscription] Declared backend audio_format:', BACKEND_AUDIO_FORMAT);
      // Mark recording early so we can attempt resumes on state change
      this.isRecording = true;
      this.startMemoryMonitoring();
      this.audioContext.onstatechange = () => {
        const state = this.audioContext?.state;
        console.log('[BackendTranscription] AudioContext state changed:', state);
        if (state === 'suspended' && this.isRecording && this.audioContext) {
          this.audioContext
            .resume()
            .then(() => console.log('[BackendTranscription] AudioContext resumed after suspension'))
            .catch((err) =>
              console.warn('[BackendTranscription] Failed to resume AudioContext:', err)
            );
        }
      };

      // Load AudioWorklet for stable processing
      await this.audioContext.audioWorklet.addModule(
        new URL('../worklets/pcm-worklet.js', import.meta.url)
      );

      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-worklet', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          targetSampleRate: AUDIO_SAMPLE_RATE,
          chunkLength: 4096,
        },
      });

      this.workletNode.onprocessorerror = (err) => {
        console.error('[BackendTranscription] AudioWorklet processor error:', err);
      };

      let processedChunks = 0;
      this.workletNode.port.onmessage = (event) => {
        const data = event.data;
        if (!data || data.type !== 'chunk') {
          return;
        }
        if (this.ws?.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          const base64 = this.arrayBufferToBase64(data.pcm);
          const message: AudioChunkMessage = {
            type: 'audio_chunk',
            session_id: this.sessionId,
            chunk_id: this.chunkIdCounter++,
            data: base64,
            audio_format: BACKEND_AUDIO_FORMAT,
          };

          this.ws.send(JSON.stringify(message));
          processedChunks += 1;
          if (processedChunks <= 3 || processedChunks % 50 === 0) {
            console.log(
              '[BackendTranscription] Sent chunk',
              message.chunk_id,
              'size:',
              base64.length,
              'ws state:',
              this.ws.readyState,
              'rms:',
              (data.rms || 0).toFixed(4),
              'peak:',
              (data.peak || 0).toFixed(4)
            );
          }
        } catch (error) {
          console.error('Error sending audio chunk from worklet:', error);
        }
      };

      // Connect the audio graph without routing to hardware output to avoid device errors
      source.connect(this.workletNode);
      const nullDestination = this.audioContext.createMediaStreamDestination();
      this.workletNode.connect(nullDestination);

      console.log('Audio processing started for backend WebSocket (PCM 16kHz mono, AudioWorklet)');
    } catch (error) {
      console.error('Failed to set up audio processing:', error);
      throw error;
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Disconnect and clean up, waiting for final messages from backend
   */
  async disconnect() {
    try {
      // Clear any pending debounced updates
      if (this.partialTranscriptDebounceTimer) {
        clearTimeout(this.partialTranscriptDebounceTimer);
        this.partialTranscriptDebounceTimer = null;
      }

      console.log('[BackendTranscription] Starting resource cleanup');

      // Stop memory monitoring
      this.stopMemoryMonitoring();

      // Stop audio processing
      if (this.audioContext) {
        if (this.workletNode) {
          try {
            this.workletNode.port.onmessage = null;
            this.workletNode.disconnect();
            console.log('[BackendTranscription] Worklet node disconnected');
          } catch (err) {
            console.warn('[BackendTranscription] Failed to disconnect worklet node:', err);
          }
          this.workletNode = null;
        }

        if (this.audioContext.state !== 'closed') {
          try {
            await this.audioContext.close();
            console.log('[BackendTranscription] AudioContext closed');
          } catch (err) {
            console.warn('[BackendTranscription] Failed to close AudioContext:', err);
          }
        }
        this.audioContext = null;
        this.isRecording = false;
      }

      // Send end_session message and wait for final messages
      if (this.ws?.readyState === WebSocket.OPEN) {
        const message: EndSessionMessage = {
          type: 'end_session',
          session_id: this.sessionId,
        };
        this.ws.send(JSON.stringify(message));

        // Wait for final messages from backend (up to 1 second)
        // The backend may send final transcript_stable messages with buffer_unstable content
        console.log('[BackendTranscription] Waiting for final messages from backend...');
        await new Promise<void>((resolve) => {
          let messageReceived = false;
          const timeout = setTimeout(() => {
            if (!messageReceived) {
              console.log('[BackendTranscription] Timeout waiting for final messages, proceeding with disconnect');
              resolve();
            }
          }, 1000);

        // Listen for final messages
        const currentWs = this.ws;
        if (currentWs) {
          const originalOnMessage = currentWs.onmessage;
          currentWs.onmessage = (event) => {
            try {
              const message: ServerMessage = JSON.parse(event.data as string);
              if (message.type === 'transcript_stable' || message.type === 'error') {
                console.log('[BackendTranscription] Received final message:', message.type);
                messageReceived = true;
                clearTimeout(timeout);
                // Restore original handler and call it
                currentWs.onmessage = originalOnMessage;
                if (originalOnMessage) {
                  originalOnMessage.call(currentWs, event);
                }
                resolve();
              } else if (originalOnMessage) {
                // Call original handler for other messages
                originalOnMessage.call(currentWs, event);
              }
            } catch (error) {
              console.warn('[BackendTranscription] Error parsing final message:', error);
              if (originalOnMessage) {
                originalOnMessage.call(currentWs, event);
              }
            }
          };
        }
        });
      }

      // Release connection back to pool (keep warm for potential reuse)
      this.connectionManager.releaseConnection(this.sessionId, true);
      this.ws = null;
      this.connectionState = false;

      console.log('[BackendTranscription] Backend WebSocket disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState && this.connectionManager.isConnectionHealthy(this.sessionId);
  }

  private logMemoryUsage(context: string) {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (mem.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      console.log(`[BackendTranscription] ${context} - Memory: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);
    }
  }

  private startMemoryMonitoring() {
    this.transcriptionStartTime = performance.now();
    this.logMemoryUsage('Transcription started');

    // Monitor memory usage every 30 seconds during transcription
    this.memoryMonitoringInterval = setInterval(() => {
      const elapsedMinutes = ((performance.now() - this.transcriptionStartTime) / 1000 / 60).toFixed(1);
      this.logMemoryUsage(`Transcription ${elapsedMinutes}min`);
    }, 30000);
  }

  private stopMemoryMonitoring() {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
      const totalMinutes = ((performance.now() - this.transcriptionStartTime) / 1000 / 60).toFixed(1);
      this.logMemoryUsage(`Transcription ended (${totalMinutes}min total)`);
    }
  }
}
