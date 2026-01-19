# Cleanup Stale IPC and Preload Definitions

## Problem Description
The `translate-text` IPC channel is defined in `preload.ts` and referenced in tests, but it has been removed from the Electron `main.ts` file as per `DECISION_LOGS.md`. This indicates that the codebase has "dead" API paths and potentially misleading tests.

## Proposed Changes
- Remove the `translateText` method from the `contextBridge` in `electron/preload.ts`.
- Remove the `translate-text` IPC handler from any remaining locations in `electron/main.ts` (if any missed).
- Update `electron/main.test.ts` and `electron/preload.test.ts` to reflect the removal of this channel.
- Ensure that the frontend is correctly using the backend WebSocket service for translation instead of trying to invoke IPC.

## Technical Details
- **Files to Update:**
  - `electron/preload.ts`
  - `electron/preload.test.ts`
  - `electron/main.test.ts`
  - `src/services/translationService.ts` (Check for any leftover usage)

## Priority
🟠 High - Cleanup of technical debt and ensuring test accuracy.

## Status
Pending

## Acceptance Criteria
- [ ] No mention of `translate-text` or `translateText` in `preload.ts`.
- [ ] All Electron-related tests pass after the removal.
- [ ] No references to the old IPC translation method remain in the renderer process.
- [ ] `DECISION_LOGS.md` is updated if necessary to reflect the completion of this cleanup.
