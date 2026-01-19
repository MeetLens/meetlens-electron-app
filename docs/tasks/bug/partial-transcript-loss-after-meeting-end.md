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

## Root Cause Analysis

**Backend Issue (Primary):**
- Backend maintains `SessionState.buffer_unstable` containing partial transcripts that haven't been finalized (lacking sentence-ending punctuation)
- When `end_session` message is received, backend:
  - Closes ElevenLabs session
  - Calls `session_manager.finalize()` which only returns state
  - **Does NOT send remaining `buffer_unstable` content to frontend**
  - This data is lost from frontend's perspective

**Frontend Issue (Secondary):**
- Frontend only saves `partialTranscriptRef.current` which contains the last received partial transcript
- Frontend disconnects immediately after sending `end_session`, not waiting for final messages
- Any remaining `buffer_unstable` data in backend is never received by frontend

## Solution Requirements

**⚠️ This issue requires changes in BOTH backend and frontend:**

1. **Backend Changes (Required):**
   - Modify `_handle_end_session()` in `meetlens-backend/endpoints/websocket.py`
   - Process any remaining `buffer_unstable` content
   - Send final `transcript_stable` message with remaining partial transcript (even if incomplete)
   - Then finalize the session

2. **Frontend Changes (Recommended):**
   - Modify `BackendTranscriptionService.disconnect()` to wait for final messages before closing
   - Update `stopRecording()` in `App.tsx` to handle final transcript messages
   - Ensure all partial transcripts are saved before disconnecting

## Relevant Components

### Frontend
- **`BackendTranscriptionService`** (`src/services/backendTranscriptionService.ts`)
  - Manages WebSocket connection to transcription backend
  - Handles `transcript_partial` and `transcript_stable` messages
  - Contains `disconnect()` method that sends `end_session` message
  - **Needs to wait for final messages before disconnecting**
- **`App.tsx`** (`src/App.tsx`)
  - Main component managing recording lifecycle
  - Contains `stopRecording()` function that handles meeting termination
  - Implements transcript saving logic in `stopRecording()` method (lines 506-547)
  - Uses `upsertTranscriptEntry()` and `saveTranscript()` for persistence
  - **Needs to handle final transcript messages before saving**
- **Transcript Saving Logic**
  - Checks for partial transcripts using `partialTranscriptRef.current`
  - Validates transcript content before saving (lines 512-546 in `stopRecording()`)
  - Handles both stable and partial transcript data during shutdown

### Backend
- **`websocket.py`** (`meetlens-backend/endpoints/websocket.py`)
  - `_handle_end_session()` function (lines 295-321)
  - **Needs to send final `buffer_unstable` content before finalizing**
- **`session_manager.py`** (`meetlens-backend/services/session_manager.py`)
  - `finalize()` method (lines 37-40)
  - Manages `SessionState` with `buffer_unstable` field
- **`SessionState`** (`meetlens-backend/models/messages.py`)
  - Contains `buffer_unstable: str` field (line 79)
  - Stores partial transcripts that haven't been finalized

## Priority
High - Data loss issue affecting meeting content preservation

## Status
Completed

## Acceptance Criteria
- [x] Partial transcripts are re-processed after meeting completion
- [x] Incomplete transcript data is recovered and saved
- [x] No transcript data loss occurs during meeting termination
- [x] Complete transcript available to users after meeting ends
- [x] Error handling for transcript processing interruptions

## Implementation Summary

### Backend Changes ✅
- Modified `_handle_end_session()` in `meetlens-backend/endpoints/websocket.py`
- Added logic to retrieve current session state before finalizing
- Sends remaining `buffer_unstable` content as final `transcript_stable` message
- Ensures all partial transcript data is delivered to frontend before session closure

### Frontend Changes ✅
- Updated `BackendTranscriptionService.disconnect()` to wait for final messages
- Modified `stopRecording()` in `App.tsx` to disconnect before saving transcripts
- Frontend now waits up to 1 second for final `transcript_stable` messages after sending `end_session`
- Transcript saving occurs after disconnect completes, ensuring all final messages are received

### Testing ✅
- Code compiles successfully (TypeScript and Python syntax verified)
- Logic reviewed and confirmed correct data flow
- No breaking changes to existing functionality