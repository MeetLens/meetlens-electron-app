import { AUDIO_SAMPLE_RATE } from '../config';

export interface ActiveApp {
  name: string;
  timestamp: string;
}

export class AudioCaptureService {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private systemStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private isRecording = false;
  private combinedStream: MediaStream | null = null;
  private activeApps: ActiveApp[] = [];
  private appTrackingInterval: ReturnType<typeof setInterval> | null = null;

  async startCapture(
    onDataAvailable: (audioData: Blob) => void,
    onError?: (error: Error) => void
  ): Promise<boolean> {
    try {
      // Use higher sample rate for better quality
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      this.activeApps = [];

      // Capture microphone
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: AUDIO_SAMPLE_RATE,
          },
        });
        console.log('✓ Microphone captured successfully');
      } catch (err) {
        console.warn('Microphone access denied or not available:', err);
      }

      // Try to capture system audio using desktopCapturer
      const sources = await window.electronAPI.getAudioSources();
      console.log('Available audio sources:', sources.length);

      if (sources.length > 0) {
        // Use the first available source (usually "Entire Screen" or primary screen)
        const primarySource = sources.find(s => s.name.includes('Entire Screen') || s.name.includes('Screen 1')) || sources[0];
        console.log('Using audio source:', primarySource.name);

        // Track active apps from sources
        sources.forEach(source => {
          if (!source.name.includes('Screen') && !source.name.includes('Entire')) {
            this.activeApps.push({
              name: source.name,
              timestamp: new Date().toISOString()
            });
          }
        });

        const systemAudioConstraints: any = {
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: primarySource.id,
            },
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: primarySource.id,
              maxWidth: 1,
              maxHeight: 1,
            },
          },
        };

        try {
          const systemStreamRaw = await navigator.mediaDevices.getUserMedia(
            systemAudioConstraints as MediaStreamConstraints
          );

          // Extract only audio tracks
          const audioTracks = systemStreamRaw.getAudioTracks();
          console.log('Raw system stream audio tracks:', audioTracks.length);

          if (audioTracks.length > 0) {
            this.systemStream = new MediaStream(audioTracks);
            console.log('✓ System audio captured successfully');
          } else {
            console.warn('No audio tracks in system stream - Windows may need virtual audio cable');
          }

          // Stop video tracks as we only need audio
          systemStreamRaw.getVideoTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn('System audio capture failed:', err);
        }
      } else {
        console.warn('No desktop capture sources available');
      }

      this.destination = this.audioContext.createMediaStreamDestination();

      // Mix system audio with higher gain for clarity
      if (this.systemStream) {
        const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
        const systemGain = this.audioContext.createGain();
        systemGain.gain.value = 1.2; // Boost desktop audio slightly
        systemSource.connect(systemGain);
        systemGain.connect(this.destination);
        console.log('✓ System audio connected to mixer (gain: 1.2)');
      }

      // Mix microphone with lower gain to prevent overlap
      if (this.micStream) {
        const micSource = this.audioContext.createMediaStreamSource(this.micStream);
        const micGain = this.audioContext.createGain();
        micGain.gain.value = 1.5; // Slightly lower mic to balance
        micSource.connect(micGain);
        micGain.connect(this.destination);
        console.log('✓ Microphone connected to mixer (gain: 0.8)');
      }

      if (!this.systemStream && !this.micStream) {
        throw new Error('No audio sources available. Check microphone permissions and system audio settings.');
      }

      console.log('Total audio tracks in mixed stream:', this.destination.stream.getAudioTracks().length);

      this.mediaRecorder = new MediaRecorder(this.destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        if (onError) {
          onError(new Error('MediaRecorder error'));
        }
      };

      // Store the combined stream for external MediaRecorder use
      this.combinedStream = this.destination.stream;

      this.mediaRecorder.start(250);
      this.isRecording = true;

      // Start tracking active apps periodically
      this.startAppTracking();

      return true;
    } catch (error) {
      console.error('Error starting audio capture:', error);
      if (onError) {
        onError(error as Error);
      }
      this.cleanup();
      return false;
    }
  }

  private startAppTracking() {
    // Track apps every 30 seconds during recording
    this.appTrackingInterval = setInterval(async () => {
      try {
        const sources = await window.electronAPI.getAudioSources();
        sources.forEach(source => {
          if (!source.name.includes('Screen') && !source.name.includes('Entire')) {
            // Only add if not already tracked
            if (!this.activeApps.some(app => app.name === source.name)) {
              this.activeApps.push({
                name: source.name,
                timestamp: new Date().toISOString()
              });
              console.log('📱 New app detected:', source.name);
            }
          }
        });
      } catch (err) {
        console.warn('App tracking update failed:', err);
      }
    }, 30000);
  }

  stopCapture() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.appTrackingInterval) {
      clearInterval(this.appTrackingInterval);
      this.appTrackingInterval = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach((track) => track.stop());
      this.systemStream = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.destination = null;
    this.mediaRecorder = null;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getAudioStream(): MediaStream | null {
    return this.combinedStream;
  }

  getActiveApps(): ActiveApp[] {
    return this.activeApps;
  }
}
