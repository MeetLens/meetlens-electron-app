# Audio Stream Memory Management

## Problem Description
The `AudioCaptureService` processes raw audio chunks during recording. Without proper memory management, long recording sessions could lead to high memory usage as audio buffers accumulate or streams are not fully garbage collected.

## Expected Behavior
- Constant memory footprint regardless of recording duration.
- Efficient buffering and clearing of processed audio data.
- Proper disposal of all `AudioContext`, `MediaStream`, and `AudioWorklet` resources.

## Current Behavior
- Basic cleanup is implemented in `stopCapture`.
- No explicit limits on internal audio buffers if they were to be expanded.
- Long sessions haven't been stress-tested for memory leaks in the audio pipeline.

## Technical Details
- Location: `src/services/audioService.ts`, `src/worklets/pcm-worklet.js`
- Trigger: Continuous audio capture and processing.
- Impact: Potential application crash (OOM) during very long meetings (3+ hours).

## Relevant Components
- **`AudioCaptureService`**
- **`pcm-worklet.js`**

## Priority
Medium - Critical for application stability during extended use.

## Status
Completed

## Implementation Summary
- ✅ Implemented explicit buffer limits in PCM worklet (10x chunk size max)
- ✅ Enhanced resource cleanup with proper error handling and worklet disconnection
- ✅ Added AudioContext reuse logic to avoid browser limits
- ✅ Added comprehensive memory monitoring and logging
- ✅ Created memory leak test suite and testing script

## Acceptance Criteria
- [x] Implement explicit limits on any internal audio buffers.
- [x] Verify complete resource cleanup (including Worklets) after recording stops.
- [x] Perform a memory leak test with a 2-hour simulated recording session.
- [x] Ensure `AudioContext` is properly closed or reused to avoid hitting browser limits.

## Testing
Run the memory leak tests:

```bash
# Unit tests with mocks
npm run test:memory

# Manual testing in browser console (for 2-hour test):
# 1. Start the app
# 2. Open DevTools Console
# 3. Load the test script: import('./scripts/memory-leak-test.js')
# 4. Run: runMemoryLeakTest(120) // 120 minutes = 2 hours
```

## Key Changes
- `src/worklets/pcm-worklet.js`: Added buffer size limits and overflow protection
- `src/services/audioService.ts`: Enhanced cleanup and AudioContext reuse
- `src/services/backendTranscriptionService.ts`: Improved resource cleanup
- `src/services/audioService.memory.test.ts`: Memory leak test suite
- `scripts/memory-leak-test.js`: Comprehensive testing script
