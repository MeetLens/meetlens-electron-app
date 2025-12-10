import { AUDIO_SAMPLE_RATE, TRANSCRIPTION_WS_URL } from '../config';

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
  chunk_id: string;
  text: string;
}

export interface TranscriptStableMessage {
  type: 'transcript_stable';
  session_id: string;
  text: string;
}

export interface TranslationMessage {
  type: 'translation';
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
  | TranslationMessage
  | ErrorMessage;

const BACKEND_AUDIO_FORMAT = 'pcm_s16le_16k_mono';

export class BackendTranscriptionService {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private wsUrl: string;
  private chunkIdCounter = 0;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isRecording = false;

  // Callbacks
  private onTranscriptCallback: ((text: string) => void) | null = null;
  private onTranslationCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onConnectionCallback: ((connected: boolean) => void) | null = null;

  constructor(sessionId: string, wsUrl: string = TRANSCRIPTION_WS_URL) {
    this.sessionId = sessionId;
    this.wsUrl = wsUrl;
  }

  /**
   * Connect to backend WebSocket and set up message handlers
   */
  async connect(
    onTranscript: (text: string) => void,
    onTranslation: (text: string) => void,
    onConnection: (connected: boolean) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.onTranscriptCallback = onTranscript;
        this.onTranslationCallback = onTranslation;
        this.onConnectionCallback = onConnection;
        this.onErrorCallback = onError;

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('Backend WebSocket connected');
          if (this.onConnectionCallback) {
            this.onConnectionCallback(true);
          }
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('Failed to parse server message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.onErrorCallback) {
            this.onErrorCallback('WebSocket connection error');
          }
          if (this.onConnectionCallback) {
            this.onConnectionCallback(false);
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Backend WebSocket disconnected');
          if (this.onConnectionCallback) {
            this.onConnectionCallback(false);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from backend
   */
  private handleServerMessage(message: ServerMessage) {
    console.log('📥 Received message:', message.type, message);

    switch (message.type) {
      case 'transcript_partial':
        // Show partial transcripts since backend might not send stable ones
        console.log('🔄 Partial transcript:', message.text);
        // Only update if text has changed to avoid unnecessary re-renders
        if (this.onTranscriptCallback && message.text && message.text.trim()) {
          this.onTranscriptCallback(message.text);
        }
        break;

      case 'transcript_stable':
        // Send stable transcripts to UI
        console.log('✅ Stable transcript:', message.text);
        if (this.onTranscriptCallback && message.text && message.text.trim()) {
          this.onTranscriptCallback(message.text);
        } else {
          console.warn('⚠️ No transcript callback or empty text');
        }
        break;

      case 'translation':
        // Translation received - send to UI
        console.log('🌐 Translation:', message.text);
        if (this.onTranslationCallback && message.text && message.text.trim()) {
          this.onTranslationCallback(message.text);
        } else {
          console.warn('⚠️ No translation callback or empty text');
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
   * Disconnect and clean up
   */
  async disconnect() {
    try {
      // Stop audio processing
      if (this.audioContext) {
        if (this.workletNode) {
          try {
            this.workletNode.port.onmessage = null;
            this.workletNode.disconnect();
          } catch (err) {
            console.warn('[BackendTranscription] Failed to disconnect worklet node:', err);
          }
          this.workletNode = null;
        }
        await this.audioContext.close();
        this.audioContext = null;
        this.isRecording = false;
      }

      // Send end_session message
      if (this.ws?.readyState === WebSocket.OPEN) {
        const message: EndSessionMessage = {
          type: 'end_session',
          session_id: this.sessionId,
        };
        this.ws.send(JSON.stringify(message));

        // Wait a bit for the message to be sent
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Close WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      console.log('Backend WebSocket disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
