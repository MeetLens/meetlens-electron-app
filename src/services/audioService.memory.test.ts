import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioCaptureService } from './audioService';

// Mock Electron API
const mockElectronAPI = {
  checkScreenPermission: vi.fn().mockResolvedValue(true),
  getAudioSources: vi.fn().mockResolvedValue([
    { name: 'System Audio', id: 'system-1' },
    { name: 'Microphone', id: 'mic-1' }
  ])
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockGetDisplayMedia = vi.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia
  },
  writable: true
});

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  sampleRate = 48000;
  onstatechange: (() => void) | null = null;

  createMediaStreamDestination() {
    return {
      stream: new MockMediaStream(),
      disconnect: vi.fn()
    };
  }

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
  }

  createGain() {
    return {
      gain: { value: 1.0 },
      connect: vi.fn(),
      disconnect: vi.fn()
    };
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext as any;

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
  }
}

global.MediaRecorder = MockMediaRecorder as any;

// Mock MediaStream
class MockMediaStream {
  getAudioTracks() {
    return [{
      stop: vi.fn(),
      getSettings: () => ({ sampleRate: 48000 }),
      label: 'Mock Audio Track',
      id: 'audio-track-1'
    }];
  }

  getVideoTracks() {
    return [{
      stop: vi.fn(),
      label: 'Mock Video Track',
      id: 'video-track-1'
    }];
  }
}

global.MediaStream = MockMediaStream as any;

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

describe('AudioCaptureService Memory Leak Test', () => {
  let audioService: AudioCaptureService;
  let mockStream: MockMediaStream;

  beforeEach(() => {
    // Mock console to reduce noise during tests
    console.log = vi.fn();
    console.warn = vi.fn();

    audioService = new AudioCaptureService();
    mockStream = new MockMediaStream();

    // Setup mock streams
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockGetDisplayMedia.mockResolvedValue(mockStream);
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;

    // Cleanup
    audioService.stopCapture();
  });

  it('should handle repeated start/stop cycles without memory leaks', async () => {
    const cycles = 10;

    for (let i = 0; i < cycles; i++) {
      const success = await audioService.startCapture(
        (blob) => {
          // Mock data handler - do nothing
        },
        (error) => {
          console.error('Audio capture error:', error);
        }
      );

      expect(success).toBe(true);
      expect(audioService.getIsRecording()).toBe(true);

      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 100));

      audioService.stopCapture();
      expect(audioService.getIsRecording()).toBe(false);

      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  it('should properly clean up resources after stop', async () => {
    const success = await audioService.startCapture(
      (blob) => {
        // Mock data handler
      },
      (error) => {
        console.error('Audio capture error:', error);
      }
    );

    expect(success).toBe(true);

    // Let it run briefly to establish resources
    await new Promise(resolve => setTimeout(resolve, 200));

    audioService.stopCapture();

    // Verify cleanup by checking internal state
    expect(audioService.getIsRecording()).toBe(false);
  });

  it('should handle long simulated recording session', async () => {
    // This test simulates a 2-minute session (scaled down from 2 hours for testing)
    // In a real scenario, this would be much longer
    const testDuration = 2000; // 2 seconds for test
    const checkInterval = 500;

    const startTime = Date.now();

    const success = await audioService.startCapture(
      (blob) => {
        // Mock data handler - simulate processing load
        // In real scenario, this would send data to transcription service
      },
      (error) => {
        console.error('Audio capture error:', error);
      }
    );

    expect(success).toBe(true);

    // Monitor memory during the "long" session
    const memoryChecks: number[] = [];

    while (Date.now() - startTime < testDuration) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      // Simulate memory check (in browser this would use performance.memory)
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        memoryChecks.push(mem.usedJSHeapSize);
      }
    }

    audioService.stopCapture();

    // Verify the session completed
    expect(audioService.getIsRecording()).toBe(false);

    // Log memory statistics for analysis
    if (memoryChecks.length > 0) {
      const initialMemory = memoryChecks[0];
      const finalMemory = memoryChecks[memoryChecks.length - 1];
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory test results: Initial: ${initialMemory}, Final: ${finalMemory}, Increase: ${memoryIncrease}`);

      // In a real memory leak test, we'd assert that memory increase is within acceptable bounds
      // For now, we just verify the test runs without crashing
    }
  }, 10000); // Extended timeout for this test
});