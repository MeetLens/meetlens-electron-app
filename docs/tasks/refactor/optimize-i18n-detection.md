# Optimize i18n Detection

## Problem Description
The `i18next-browser-languagedetector` configuration in `src/i18n/config.ts` currently checks several web-specific locations for language preference, such as `querystring`, `cookie`, `subdomain`, and `path`. These are irrelevant for a local Electron application and add unnecessary overhead during initialization.

## Proposed Changes
- Simplify the `detection.order` in `src/i18n/config.ts` to only include `localStorage` and `navigator`.
- Remove `cookie`, `sessionStorage`, `htmlTag`, `path`, and `subdomain` from the detection logic.
- Ensure that the application language is consistently loaded from and saved to `localStorage`.

## Technical Details
- **File to Update:** `src/i18n/config.ts`
- **Current Config:**
  ```javascript
  order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain']
  ```

## Priority
🟢 Low - Minor optimization and code cleanup.

## Status
Pending

## Acceptance Criteria
- [ ] Language detection only relies on `localStorage` (for user preference) and `navigator` (for system default).
- [ ] No regressions in language switching functionality.
- [ ] The app correctly detects the system language on first launch.
- [ ] The app correctly remembers the user's manual language choice after a restart.
