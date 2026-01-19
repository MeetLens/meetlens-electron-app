# WebSocket Connection Pooling

## Problem Description
The application currently creates a new WebSocket connection for every recording session. If a user starts and stops recording frequently, it leads to multiple connection handshakes and potential resource leaks if not cleaned up perfectly.

## Expected Behavior
- Efficient management of WebSocket connections to the transcription backend.
- Reuse of connections where possible or faster teardown/setup.
- Robust handling of connection state across multiple sessions.

## Current Behavior
- New `BackendTranscriptionService` and WebSocket are created on every `startRecording`.
- Disconnect handles teardown but doesn't implement reuse.

## Technical Details
- Location: `src/services/backendTranscriptionService.ts`, `src/App.tsx`
- Trigger: `startRecording` and `stopRecording` calls.
- Impact: Increased latency for starting recordings, higher server load.

## Relevant Components
- **`BackendTranscriptionService`**
- **`App.tsx`**

## Priority
Low - Optimization for frequent session starts/stops.

## Status
Completed

## Acceptance Criteria
- [x] Implement a connection manager or singleton pattern for the transcription service.
- [x] Add support for "warm" connections that can be quickly repurposed.
- [x] Improve error recovery and reconnection logic.
- [x] Monitor connection count and ensure no leaks occur over long usage.

## Implementation Details
- Created `WebSocketConnectionManager` singleton class to handle connection pooling
- Modified `BackendTranscriptionService` to use the connection manager instead of creating new WebSocket connections
- Implemented "warm" connections that stay open and can be quickly repurposed for new sessions
- Added automatic reconnection logic with exponential backoff for failed connections
- Added connection health monitoring and leak detection with periodic health checks
- Updated `App.tsx` to include proper cleanup of connections on component unmount
- Added connection pool diagnostics and monitoring capabilities
