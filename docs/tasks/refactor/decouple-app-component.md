# Decouple App Component

## Problem Description
`App.tsx` has evolved into a "God Component," exceeding 800 lines of code. It manages low-level audio orchestration, WebSocket lifecycle, complex transcription state, database synchronization, and multiple UI sections (Sidebar, TopBar, Transcript List, Summary). This violates the Single Responsibility Principle and makes the codebase difficult to maintain and test.

## Proposed Changes
- **Extract Business Logic:**
  - Create a `useTranscription` hook to handle audio capture, WebSocket connection, and transcript accumulation.
  - Create a `useMeetings` hook to manage meeting CRUD operations and database interactions.
- **Extract UI Components:**
  - Create a dedicated `TranscriptList` component to handle the rendering and auto-scrolling of transcript bubbles.
  - Move complex inline styles to CSS modules or a structured styling solution.
- **Improve State Management:**
  - Reduce the number of `useState` calls in `App.tsx` by grouping related state into hooks or using `useReducer` for complex state transitions.

## Technical Details
- **Files to Refactor:** `src/App.tsx`
- **New Files:** 
  - `src/hooks/useTranscription.ts`
  - `src/hooks/useMeetings.ts`
  - `src/components/TranscriptList.tsx`

## Priority
🟠 High - Major blocker for maintainability and scalability.

## Status
Pending

## Acceptance Criteria
- [ ] `App.tsx` is reduced to under 300 lines of code.
- [ ] No regression in core functionality (meeting creation, recording, transcription, summary).
- [ ] Unit tests for `App.tsx` still pass or are updated to reflect the new structure.
- [ ] New hooks have their own unit tests.
- [ ] Clear separation between UI concerns and business logic.
