# Transcript Cross-Contamination Between Spaces

## Problem Description
After a meeting starts, when users navigate between different meeting spaces in the sidebar, transcripts from the active meeting are incorrectly being added to other spaces as if the meeting exists in those spaces too. There appears to be no proper tracking of which meeting is the source/active meeting, causing transcript data to contaminate other spaces.

## Expected Behavior
Users should be able to:
- Switch between meeting spaces without affecting transcript flow
- Have transcripts only added to the currently active meeting space
- Maintain clear separation of transcript data between different meetings

## Current Behavior
- Transcripts from active meeting are added to other spaces when switching between them
- No source meeting context tracking during navigation
- Transcript data gets mixed between different meeting spaces
- Users see transcripts appearing in wrong meeting contexts

## Technical Details
- Location: Meeting state management and transcript routing logic
- Trigger: Switching between meeting spaces in sidebar during active meeting
- Impact: Data integrity issues, confusing user experience, transcript data pollution

## Relevant Components
- **`Sidebar`** (`src/components/Sidebar.tsx`)
  - Displays list of meeting spaces with "Your Spaces" title
  - Handles user clicks to switch between meeting spaces via `onSelectMeeting`
  - Calls `setCurrentMeeting(meeting)` to update active space
- **`TranscriptPanel`** (`src/components/TranscriptPanel.tsx`)
  - Displays live transcripts for current meeting
  - Receives `transcripts` array and `isRecording` state as props
  - Shows transcript entries with timestamps and handles auto-scrolling
- **`App.tsx`** (`src/App.tsx`)
  - Manages `currentMeeting` state tracking active meeting space
  - Contains transcript routing callbacks:
    - `handleTranscriptPartialWithMeeting()`
    - `handleTranscriptStableWithMeeting()`
    - `handleTranslationPartialWithMeeting()`
    - `handleTranslationStableWithMeeting()`
  - Uses `currentSessionIdRef.current` for session validation
- **`BackendTranscriptionService`** (`src/services/backendTranscriptionService.ts`)
  - Manages WebSocket connection to transcription backend
  - Validates session IDs in `handleServerMessage()` method
  - Routes transcript messages to UI callbacks

## Priority
High - Data integrity issue affecting meeting content accuracy

## Status
Open

## Acceptance Criteria
- [ ] Transcripts only appear in the correct active meeting space
- [ ] Switching between spaces doesn't affect transcript routing
- [ ] Proper meeting context tracking during navigation
- [ ] No cross-contamination of transcript data between spaces
- [ ] Clear separation maintained between different meeting transcripts