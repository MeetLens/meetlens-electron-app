# Reliable Transcript Persistence

## Problem Description
Currently, transcripts are primarily kept in React state during a meeting and are only persisted to the SQLite database when the `stopRecording` function is called. If the application crashes, the system restarts, or the process is killed during a long meeting, all transcription data for that session will be lost.

## Expected Behavior
- Transcripts should be persisted to the database as soon as they are finalized (stable).
- Real-time "fire-and-forget" persistence should ensure that even if the app crashes, the meeting history up to the last stable segment is preserved.
- The UI should still display the transcripts from the database if the meeting is resumed or viewed later.

## Current Behavior
- Transcripts are saved only at the end of the recording session in `App.tsx`.
- Crash during meeting results in 100% data loss for that session.
- `handleTranscriptStableWithMeeting` only updates React state.

## Technical Details
- **Location:** `src/App.tsx`
- **Functions:** `handleTranscriptStableWithMeeting`, `stopRecording`
- **Service:** `window.electronAPI.saveTranscript`

## Priority
🔴 Critical - High risk of data loss for users.

## Status
Pending

## Acceptance Criteria
- [ ] Stable transcripts are saved to the database immediately upon receipt in `handleTranscriptStableWithMeeting`.
- [ ] The `stopRecording` function only handles session cleanup and final sync, not the primary saving of the entire transcript.
- [ ] Database updates are asynchronous and do not block the UI or audio processing.
- [ ] Verify that a simulated crash (e.g., force closing the app) during a meeting preserves the transcripts received up to that point.
