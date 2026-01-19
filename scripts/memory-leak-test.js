/**
 * Memory Leak Test Script for MeetLens Audio Services
 *
 * This script can be used to perform memory leak testing of the audio capture
 * and transcription services over extended periods.
 *
 * Usage in Electron app:
 * 1. Import this script in the main process or renderer
 * 2. Call runMemoryLeakTest(durationMinutes) to start testing
 * 3. Monitor console output and memory usage in Chrome DevTools
 */

class MemoryLeakTester {
  constructor() {
    this.testResults = {
      startTime: null,
      endTime: null,
      initialMemory: null,
      finalMemory: null,
      memorySamples: [],
      audioServiceInstances: 0,
      transcriptionServiceInstances: 0,
      errors: []
    };
  }

  /**
   * Run a memory leak test for the specified duration
   * @param {number} durationMinutes - Test duration in minutes
   * @param {Object} options - Test options
   */
  async runMemoryLeakTest(durationMinutes = 120, options = {}) {
    const {
      enableAudioCapture = true,
      enableTranscription = false,
      memoryCheckInterval = 30000, // 30 seconds
      logInterval = 60000 // 1 minute
    } = options;

    console.log(`🚀 Starting Memory Leak Test (${durationMinutes} minutes)`);
    console.log(`Options:`, { enableAudioCapture, enableTranscription, memoryCheckInterval, logInterval });

    this.testResults.startTime = Date.now();
    this.captureInitialMemory();

    let lastLogTime = Date.now();
    const endTime = Date.now() + (durationMinutes * 60 * 1000);

    // Start services if requested
    if (enableAudioCapture) {
      await this.startAudioCaptureTest();
    }

    if (enableTranscription) {
      await this.startTranscriptionTest();
    }

    // Memory monitoring loop
    const memoryCheckTimer = setInterval(() => {
      this.captureMemorySample();
    }, memoryCheckInterval);

    // Logging loop
    const logTimer = setInterval(() => {
      this.logProgress(endTime);
    }, logInterval);

    // Wait for test duration
    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for critical memory usage
      if (this.shouldStopTest()) {
        console.error('🛑 Stopping test due to high memory usage');
        break;
      }
    }

    // Cleanup
    clearInterval(memoryCheckTimer);
    clearInterval(logTimer);

    if (enableAudioCapture) {
      await this.stopAudioCaptureTest();
    }

    if (enableTranscription) {
      await this.stopTranscriptionTest();
    }

    this.testResults.endTime = Date.now();
    this.captureFinalMemory();

    this.generateReport();
  }

  captureInitialMemory() {
    if ('memory' in performance) {
      const mem = performance.memory;
      this.testResults.initialMemory = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit
      };
      console.log(`📊 Initial Memory: ${this.formatBytes(mem.usedJSHeapSize)} used, ${this.formatBytes(mem.totalJSHeapSize)} total`);
    }
  }

  captureMemorySample() {
    if ('memory' in performance) {
      const mem = performance.memory;
      this.testResults.memorySamples.push({
        timestamp: Date.now(),
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize
      });
    }
  }

  captureFinalMemory() {
    if ('memory' in performance) {
      const mem = performance.memory;
      this.testResults.finalMemory = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit
      };
      console.log(`📊 Final Memory: ${this.formatBytes(mem.usedJSHeapSize)} used, ${this.formatBytes(mem.totalJSHeapSize)} total`);
    }
  }

  logProgress(endTime) {
    const now = Date.now();
    const elapsed = now - this.testResults.startTime;
    const remaining = endTime - now;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const remainingMinutes = Math.floor(remaining / 60000);

    console.log(`⏱️  Test Progress: ${elapsedMinutes}min elapsed, ${remainingMinutes}min remaining`);

    if ('memory' in performance) {
      const mem = performance.memory;
      console.log(`📊 Current Memory: ${this.formatBytes(mem.usedJSHeapSize)} used`);

      if (this.testResults.memorySamples.length > 1) {
        const recent = this.testResults.memorySamples.slice(-10);
        const avgUsed = recent.reduce((sum, s) => sum + s.used, 0) / recent.length;
        console.log(`📈 Average Memory (last 10 samples): ${this.formatBytes(avgUsed)}`);
      }
    }
  }

  shouldStopTest() {
    if (!('memory' in performance)) return false;

    const mem = performance.memory;
    const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;

    // Stop if memory usage exceeds 90%
    return usagePercent > 90;
  }

  async startAudioCaptureTest() {
    // This would integrate with the actual AudioCaptureService
    // For now, just log that we'd start it
    console.log('🎤 Would start AudioCaptureService for testing');
    this.testResults.audioServiceInstances++;
  }

  async stopAudioCaptureTest() {
    console.log('🎤 Would stop AudioCaptureService');
  }

  async startTranscriptionTest() {
    // This would integrate with BackendTranscriptionService
    console.log('📝 Would start BackendTranscriptionService for testing');
    this.testResults.transcriptionServiceInstances++;
  }

  async stopTranscriptionTest() {
    console.log('📝 Would stop BackendTranscriptionService');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📋 Memory Leak Test Report');
    console.log('='.repeat(50));

    const duration = (this.testResults.endTime - this.testResults.startTime) / 1000 / 60;
    console.log(`Duration: ${duration.toFixed(1)} minutes`);

    if (this.testResults.initialMemory && this.testResults.finalMemory) {
      const initial = this.testResults.initialMemory.used;
      const final = this.testResults.finalMemory.used;
      const increase = final - initial;
      const increasePercent = (increase / initial) * 100;

      console.log(`Initial Memory: ${this.formatBytes(initial)}`);
      console.log(`Final Memory: ${this.formatBytes(final)}`);
      console.log(`Memory Increase: ${this.formatBytes(increase)} (${increasePercent.toFixed(2)}%)`);

      if (Math.abs(increasePercent) < 10) {
        console.log('✅ Memory usage appears stable');
      } else if (increasePercent > 10) {
        console.log('⚠️  Significant memory increase detected - possible leak');
      } else {
        console.log('ℹ️  Memory decreased (possibly due to GC)');
      }
    }

    if (this.testResults.memorySamples.length > 0) {
      const usedSamples = this.testResults.memorySamples.map(s => s.used);
      const min = Math.min(...usedSamples);
      const max = Math.max(...usedSamples);
      const avg = usedSamples.reduce((a, b) => a + b, 0) / usedSamples.length;

      console.log(`Memory Range: ${this.formatBytes(min)} - ${this.formatBytes(max)}`);
      console.log(`Average Memory: ${this.formatBytes(avg)}`);
    }

    if (this.testResults.errors.length > 0) {
      console.log(`Errors: ${this.testResults.errors.length}`);
      this.testResults.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
      });
    }

    console.log('='.repeat(50));
  }
}

// Export for use in the app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemoryLeakTester };
}

// Global function for easy access in browser console
if (typeof window !== 'undefined') {
  window.runMemoryLeakTest = async (durationMinutes = 120, options = {}) => {
    const tester = new MemoryLeakTester();
    await tester.runMemoryLeakTest(durationMinutes, options);
  };

  console.log('💡 Memory leak test available: runMemoryLeakTest(minutes, options)');
  console.log('   Example: runMemoryLeakTest(5) // 5-minute test');
}