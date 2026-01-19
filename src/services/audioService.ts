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
  private workletNodes: AudioWorkletNode[] = [];
  private memoryMonitoringInterval: ReturnType<typeof setInterval> | null = null;
  private recordingStartTime: number = 0;

  private getOrCreateAudioContext(): AudioContext {
    // Reuse existing AudioContext if it's in a good state
    if (this.audioContext && this.audioContext.state !== 'closed') {
      console.log('[AudioCapture] Reusing existing AudioContext');
      return this.audioContext;
    }

    // Create new AudioContext - browsers typically allow ~6 concurrent contexts
    console.log('[AudioCapture] Creating new AudioContext');
    this.audioContext = new AudioContext();
    return this.audioContext;
  }

  async startCapture(
    onDataAvailable: (audioData: Blob) => void,
    onError?: (error: Error) => void
  ): Promise<boolean> {
    try {
      // Request screen recording permission on macOS
      if (window.electronAPI?.checkScreenPermission) {
        const hasPermission = await window.electronAPI.checkScreenPermission();
        if (!hasPermission) {
          throw new Error('Screen recording permission denied. Please grant permission in System Settings > Privacy & Security > Screen Recording');
        }
        console.log('✓ Screen recording permission granted');
      }

      // Get or create AudioContext with reuse logic to avoid browser limits
      this.audioContext = this.getOrCreateAudioContext();
      console.log(
        '[AudioCapture] AudioContext created with state:',
        this.audioContext.state,
        'sampleRate:',
        this.audioContext.sampleRate
      );
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
        const micTrack = this.micStream.getAudioTracks()[0];
        if (micTrack) {
          console.log('[AudioCapture] Microphone track settings:', micTrack.getSettings());
        }
      } catch (err) {
        console.warn('Microphone access denied or not available:', err);
      }

      // Try to capture system audio using desktopCapturer
      await this.captureSystemAudio();

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
      const mixedTrack = this.destination.stream.getAudioTracks()[0];
      if (mixedTrack) {
        console.log('[AudioCapture] Mixed track settings:', mixedTrack.getSettings());
      }

      this.mediaRecorder = new MediaRecorder(this.destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      console.log(
        '[AudioCapture] Destination tracks:',
        this.destination.stream.getAudioTracks().map((t) => t.label || t.id)
      );

      // Track state changes for debugging device issues
      this.audioContext.onstatechange = () => {
        const state = this.audioContext?.state;
        console.log('[AudioCapture] AudioContext state changed:', state);
        if (state === 'suspended' && this.isRecording && this.audioContext) {
          this.audioContext
            .resume()
            .then(() => console.log('[AudioCapture] AudioContext resumed after suspension'))
            .catch((err) => console.warn('[AudioCapture] Failed to resume AudioContext:', err));
        }
      };

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

      // Start tracking active apps and memory usage periodically
      this.startAppTracking();
      this.startMemoryMonitoring();

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

  private async captureSystemAudio() {
    try {
      // IMPORTANT: Use getDisplayMedia() API for macOS loopback audio
      // 
      // Why not getUserMedia() with chromeMediaSource: 'desktop'?
      // - That legacy API creates an audio track but with NO actual audio data on macOS
      // - Results in RMS: 0.0000, peak: 0.0000 (silent track)
      // - Does not trigger Electron's setDisplayMediaRequestHandler
      //
      // getDisplayMedia() properly triggers the handler in electron/main.ts which
      // returns audio: 'loopback', enabling actual system audio capture.
      // This works in dev mode (Electron.app is signed) but requires signing for production.
      //
      // See SYSTEM_AUDIO_README.md and TROUBLESHOOTING.md for details.
      const systemStreamRaw = await navigator.mediaDevices.getDisplayMedia({
        audio: true, // Request loopback audio (triggers Electron handler)
        video: {
          width: 1,
          height: 1,
        },
      } as MediaStreamConstraints);

      // Extract only audio tracks
      const audioTracks = systemStreamRaw.getAudioTracks();
      console.log('Raw system stream audio tracks:', audioTracks.length);

      if (audioTracks.length > 0) {
        this.systemStream = new MediaStream(audioTracks);
        console.log('✓ System audio captured successfully');
        const systemTrack = audioTracks[0];
        if (systemTrack) {
          console.log('[AudioCapture] System track settings:', systemTrack.getSettings());
        }
      } else {
        console.warn('No audio tracks in system stream - Desktop audio may not be available');
      }

      // Stop video tracks as we only need audio
      systemStreamRaw.getVideoTracks().forEach((track) => track.stop());
      
      // Still get sources for app tracking
      const sources = await window.electronAPI.getAudioSources();
      sources.forEach((source: any) => {
        if (!source.name.includes('Screen') && !source.name.includes('Entire') && !source.name.includes('Bildschirm')) {
          this.activeApps.push({
            name: source.name,
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.warn('System audio capture failed:', err);
      console.log('Falling back to microphone-only mode');
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
    console.log('[AudioCapture] Starting resource cleanup');

    // Stop memory monitoring
    this.stopMemoryMonitoring();

    // Clear app tracking interval
    if (this.appTrackingInterval) {
      clearInterval(this.appTrackingInterval);
      this.appTrackingInterval = null;
    }

    // Stop and clean up MediaRecorder
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('[AudioCapture] Error stopping MediaRecorder:', err);
      }
      this.mediaRecorder = null;
    }

    // Clean up worklet nodes
    this.workletNodes.forEach(node => {
      try {
        node.port.onmessage = null;
        node.disconnect();
      } catch (err) {
        console.warn('[AudioCapture] Error disconnecting worklet node:', err);
      }
    });
    this.workletNodes = [];

    // Stop system audio tracks
    if (this.systemStream) {
      try {
        this.systemStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            console.warn('[AudioCapture] Error stopping system track:', err);
          }
        });
      } catch (err) {
        console.warn('[AudioCapture] Error cleaning system stream:', err);
      }
      this.systemStream = null;
    }

    // Stop microphone tracks
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            console.warn('[AudioCapture] Error stopping mic track:', err);
          }
        });
      } catch (err) {
        console.warn('[AudioCapture] Error cleaning mic stream:', err);
      }
      this.micStream = null;
    }

    // Clean up destination node
    if (this.destination) {
      try {
        this.destination.disconnect();
      } catch (err) {
        console.warn('[AudioCapture] Error disconnecting destination:', err);
      }
      this.destination = null;
    }

    // Close AudioContext - but don't null it out immediately in case it can be reused
    // AudioContexts can be expensive to create, so we'll keep a reference but mark as closed
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
        console.log('[AudioCapture] AudioContext closed');
      } catch (err) {
        console.warn('[AudioCapture] Error closing AudioContext:', err);
      }
    }

    this.combinedStream = null;
    console.log('[AudioCapture] Resource cleanup completed');
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

  private logMemoryUsage(context: string) {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (mem.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      console.log(`[AudioCapture] ${context} - Memory: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);
    }
  }

  private startMemoryMonitoring() {
    this.recordingStartTime = performance.now();
    this.logMemoryUsage('Recording started');

    // Monitor memory usage every 30 seconds during recording
    this.memoryMonitoringInterval = setInterval(() => {
      const elapsedMinutes = ((performance.now() - this.recordingStartTime) / 1000 / 60).toFixed(1);
      this.logMemoryUsage(`Recording ${elapsedMinutes}min`);
    }, 30000);
  }

  private stopMemoryMonitoring() {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
      const totalMinutes = ((performance.now() - this.recordingStartTime) / 1000 / 60).toFixed(1);
      this.logMemoryUsage(`Recording ended (${totalMinutes}min total)`);
    }
  }
}
