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

export class BackendTranscriptionService {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private wsUrl: string;
  private chunkIdCounter = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
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
      // Create AudioContext with 16kHz sample rate (required by backend)
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      const source = this.audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessorNode for audio processing
      // Using 4096 buffer size for ~250ms chunks at 16kHz
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          try {
            // Get audio data from channel 0 (mono)
            const audioData = event.inputBuffer.getChannelData(0);

            // Convert Float32Array to Int16Array (PCM S16LE)
            const pcmData = this.floatTo16BitPCM(audioData);

            // Convert to base64
            const base64 = this.arrayBufferToBase64(pcmData.buffer);

            // Send audio chunk to backend
            const message: AudioChunkMessage = {
              type: 'audio_chunk',
              session_id: this.sessionId,
              chunk_id: this.chunkIdCounter++,
              data: base64,
              audio_format: 'pcm_s16le_16k_mono',
            };

            this.ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error sending audio chunk:', error);
          }
        }
      };

      // Connect the audio graph
      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Audio processing started for backend WebSocket (PCM 16kHz mono)');
    } catch (error) {
      console.error('Failed to set up audio processing:', error);
      throw error;
    }
  }

  /**
   * Convert Float32Array audio samples to 16-bit PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp the value between -1 and 1
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
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
        await this.audioContext.close();
        this.audioContext = null;
        this.isRecording = false;
      }

      // Stop MediaRecorder (fallback)
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
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
