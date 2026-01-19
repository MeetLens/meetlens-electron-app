# MeetLens Decision Logs

This document tracks major architectural and design decisions made during the development of MeetLens.

## [2026-01-19] Backend-Centric API Key Management

### Context
Previously, MeetLens required users to enter their own API keys (ElevenLabs, DeepL, etc.) in the application settings. These keys were stored in `localStorage` and sent with requests from the frontend or main process.

### Decision
Move all API key management and sensitive service integrations to the backend. The desktop application will no longer require or allow users to enter their own API keys.

### Rationales
1. **Security**: Storing API keys in the client (even in `localStorage`) is less secure than keeping them in a controlled backend environment.
2. **User Experience**: Users shouldn't have to manage multiple API keys and accounts to use the application. A "plug and play" experience is preferred.
3. **Control**: Centralizing service calls on the backend allows for better monitoring, rate limiting, and the ability to switch providers without updating the client.

### Consequences
- Removed ElevenLabs and DeepL API key input fields from `TopBar.tsx`.
- Removed API key state and persistence logic from `App.tsx`.
- Removed `TranslationService.ts` and its direct DeepL API calls from the renderer.
- Removed `translate-text` IPC handler from the Electron main process.
- All real-time translation is now received via the WebSocket transcription service.

---

## [2026-01-19] DeepL as Sole Translation Provider

### Context
The application previously aimed to support multiple translation providers, including Google Translate and DeepL.

### Decision
Standardize on DeepL as the sole translation provider for the application.

### Rationales
1. **Quality**: DeepL generally provides higher quality translations for technical and conversational meeting contexts.
2. **Simplification**: Reducing the number of supported providers simplifies the codebase and testing surface.

### Consequences
- Removed mentions of Google Translate from documentation and code.
- Standardized internal translation logic to expect DeepL-compatible responses (via backend).

---

## [2026-01-19] Alignment of Documentation with Source Code

### Context
There were several mismatches between the `README.md`, `ARCHITECTURE.md`, and the actual implementation (SQLite schema, backend URLs, audio pipeline).

### Decision
Update all documentation to reflect the current state of the "real code" as the source of truth.

### Key Corrections
- **SQLite Schema**: Updated `ARCHITECTURE.md` to match the actual `meetings` and `transcripts` tables in `main.ts`.
- **Backend Architecture**: Documented the production WebSocket and HTTP backend services instead of local-only alternatives.
- **Language Count**: Removed specific counts of supported languages to allow for flexible backend-driven updates.
- **Features**: Updated the features list to accurately reflect current capabilities (Real-time PCM streaming, AI Summaries via backend).
