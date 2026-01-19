# Transcript Auto-Scroll Prevention

## Problem Description
After a meeting starts, users cannot scroll up to review previous transcript content because new transcript events continuously arrive and automatically scroll the view down. This prevents users from accessing historical transcript information during active meetings.

## Expected Behavior
Users should be able to:
- Scroll up to view previous transcript entries
- Have the auto-scroll behavior pause when user manually scrolls
- Resume auto-scroll when reaching the bottom of the transcript

## Current Behavior
- Auto-scroll is always active when new transcript events arrive
- Users cannot access previous transcript content during meetings
- No mechanism to pause/resume auto-scroll based on user interaction

## Technical Details
- Location: Transcript component in the renderer
- Trigger: New transcript events from WebSocket/real-time updates
- Impact: Poor user experience during long meetings

## Relevant Components
- **`TranscriptPanel`** (`src/components/TranscriptPanel.tsx`)
  - Contains `transcript-container` div with `ref={containerRef}`
  - Implements auto-scroll logic in `useEffect` hook (lines 18-22)
  - Uses `containerRef.current.scrollTop = containerRef.current.scrollHeight` for auto-scroll
- **`App.tsx`** (`src/App.tsx`)
  - Manages transcript state and passes to `TranscriptPanel`
  - Contains auto-scroll logic in separate `useEffect` (lines 51-57)
  - Updates transcript array triggering re-renders and scroll events

## Priority
High - Core functionality issue affecting meeting usability

## Status
Resolved

## Acceptance Criteria
- [x] User can scroll up without auto-scroll interfering
- [x] Auto-scroll resumes when user scrolls back to bottom
- [x] Visual indicator shows when auto-scroll is paused/active
- [x] No performance impact on transcript rendering