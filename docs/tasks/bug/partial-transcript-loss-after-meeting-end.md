# Partial Transcript Loss After Meeting End

## Problem Description
After a meeting ends, partial or incomplete transcripts are not being re-processed or checked again. The system directly closes the meeting session, resulting in loss of transcript data that may have been partially captured but not fully processed.

## Expected Behavior
Users should be able to:
- Have all partial transcripts re-processed after meeting completion
- Recover any transcript data that was captured but not fully saved
- See complete transcript information even if processing was interrupted

## Current Behavior
- Partial transcripts are abandoned when meeting ends
- No re-processing or validation of incomplete transcript data
- Data loss occurs for transcripts that were in progress during meeting termination
- Users lose access to potentially valuable meeting content

## Technical Details
- Location: Meeting closure handling and transcript processing pipeline
- Trigger: Meeting end event/session termination
- Impact: Loss of meeting transcript data, incomplete meeting records

## Relevant Components
- **`BackendTranscriptionService`** (`src/services/backendTranscriptionService.ts`)
  - Manages WebSocket connection to transcription backend
  - Handles `transcript_partial` and `transcript_stable` messages
  - Contains `disconnect()` method that sends `end_session` message
- **`App.tsx`** (`src/App.tsx`)
  - Main component managing recording lifecycle
  - Contains `stopRecording()` function that handles meeting termination
  - Implements transcript saving logic in `stopRecording()` method (lines 499-571)
  - Uses `upsertTranscriptEntry()` and `saveTranscript()` for persistence
- **Transcript Saving Logic**
  - Checks for partial transcripts using `partialTranscriptRef.current`
  - Validates transcript content before saving (lines 502-540 in `stopRecording()`)
  - Handles both stable and partial transcript data during shutdown

## Priority
High - Data loss issue affecting meeting content preservation

## Status
Open

## Acceptance Criteria
- [ ] Partial transcripts are re-processed after meeting completion
- [ ] Incomplete transcript data is recovered and saved
- [ ] No transcript data loss occurs during meeting termination
- [ ] Complete transcript available to users after meeting ends
- [ ] Error handling for transcript processing interruptions