# React Rendering Optimization

## Problem Description
The application experiences frequent re-renders of the main `App` component and its children whenever new transcripts or partials arrive via WebSocket. This can lead to UI lag and high CPU usage during long meetings with rapid transcription.

## Expected Behavior
- UI remains responsive even during high-frequency transcription updates.
- Re-renders are limited to only the components that actually need to update.
- Expensive computations (like formatting transcripts) are memoized.

## Current Behavior
- Every transcript update triggers a full re-render of the `App` component.
- Transcript entries are processed on every render.
- Large transcript arrays cause performance degradation in the renderer process.

## Technical Details
- Location: `src/App.tsx`, `src/components/TranscriptPanel.tsx`
- Trigger: `handleTranscriptPartialWithMeeting`, `handleTranscriptStableWithMeeting`
- Impact: Increased CPU usage, potential UI stuttering during active meetings.

## Relevant Components
- **`App.tsx`**
- **`TranscriptPanel.tsx`**
- **`SummaryPanel.tsx`**

## Priority
Medium - Important for long-term stability and responsiveness.

## Status
Completed

## Acceptance Criteria
- [ ] Implement `useMemo` for transcript processing in `App.tsx`.
- [ ] Use `React.memo` for static or infrequently changing components like `Sidebar` and `TopBar`.
- [ ] Optimize state updates to avoid unnecessary parent re-renders when only a child needs updating.
- [ ] Performance profiling shows a reduction in render time and frequency.
