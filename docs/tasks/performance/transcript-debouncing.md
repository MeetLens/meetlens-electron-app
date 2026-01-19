# Transcript Debouncing

## Problem Description
Real-time partial transcripts from the backend can arrive at a very high frequency (multiple times per second). Updating the UI for every single partial message causes excessive DOM updates and re-renders.

## Expected Behavior
- Partial transcript updates should be debounced or throttled to provide a smooth visual experience.
- Stable transcripts should still be processed immediately to ensure data integrity.
- Reduction in the number of state updates in the renderer process.

## Current Behavior
- Every `transcript_partial` message triggers an immediate state update in `App.tsx`.
- High frequency of updates causes the transcript view to flicker or jump rapidly.

## Technical Details
- Location: `src/services/backendTranscriptionService.ts`, `src/App.tsx`
- Trigger: `transcript_partial` messages from WebSocket.
- Impact: High UI thread load, suboptimal reading experience for users.

## Relevant Components
- **`BackendTranscriptionService`**
- **`App.tsx`**

## Priority
Medium - Improves UX and reduces CPU load.

## Status
Completed

## Acceptance Criteria
- [ ] Implement a debouncing or throttling mechanism for partial transcripts (e.g., 100-200ms).
- [ ] Ensure the last partial update is always shown before a stable update arrives.
- [ ] Verify that stable transcripts are not delayed by the debouncing logic.
- [ ] Smoother visual appearance of live transcription.
