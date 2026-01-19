# Feature: Multilingual Translation and Summary Support

## Status
- **Priority**: High
- **Status**: Pending
- **Category**: Feature
- **Complexity**: Medium

## Problem Statement
The current language selection in the `TopBar` is largely cosmetic. Real-time translations are hardcoded to English-to-Turkish on the backend, and the AI summary generation only supports context for English and Turkish, defaulting to `null` for all other languages.

## Goals
- [ ] Enable real-time translation to any language selected in the UI dropdown.
- [ ] Pass the selected translation language to the backend during the WebSocket session.
- [ ] Ensure the AI Summary service utilizes the selected language for all supported codes.

## Implementation Plan

### 1. WebSocket Protocol Update
- Modify the WebSocket connection initialization to include a `target_lang` parameter.
- Update `BackendTranscriptionService.ts` to accept and send the `selectedLanguage` from the frontend.

### 2. Frontend Changes (`meetlens-electron-app`)
- Update `App.tsx` to pass the `selectedLanguage` when initializing the `BackendTranscriptionService`.
- Update `handleStartStop` or the `startRecording` flow to ensure the latest language setting is used.
- Expand the `languageParam` logic in `generateMeetingSummary` to support all codes defined in `TopBar.tsx` (not just `en` and `tr`).

### 3. Backend Changes (`meetlens-backend`)
- **WebSocket Endpoint (`websocket.py`)**: 
    - Extract `target_lang` from the initial message or connection params.
    - Pass this `target_lang` to the `translate_segment` calls.
- **Translation Service (`translation_service.py`)**:
    - Ensure `translate_segment` correctly handles the dynamic `target_lang` instead of relying on `DEFAULT_TARGET_LANG`.
- **Summary Service (`summary_service.py`)**:
    - Ensure the prompt generation handles all ISO language codes provided by the frontend.

## Verification Plan
- Start a meeting, select "Spanish" in Settings, and verify transcripts are translated to Spanish.
- Select "French," start a meeting, and verify translations switch to French.
- Generate an AI Summary for a meeting where "German" was selected and verify the summary prompt context is correct.
