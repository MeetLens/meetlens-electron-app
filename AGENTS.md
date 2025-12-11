# Repository Guidelines

## Project Structure & Module Organization
- `electron/`: main process entry (`main.ts`), preload/IPC surface (`preload.ts`), with Node-based tests (`*.test.ts`).
- `src/`: React renderer; UI in `components/`, domain logic in `services/` (audio capture, translation, backend calls), shared types in `types/`, worklets in `worklets/`, app entry at `main.tsx` and styling in `index.css`.
- `src/App.test.tsx` and `electron/*.test.ts` cover renderer and main; `src/test/setupTests.ts` configures RTL/Vitest. Built assets live in `dist/` (generated).

## Build, Test, and Development Commands
- `npm run dev`: build main process, start Vite at 5173, and launch Electron with live reload.
- `npm run dev:renderer` / `npm run dev:electron`: run renderer or main process dev targets individually.
- `npm run build`: produce production bundles (`vite build` + `tsc -p tsconfig.main.json` to `dist/`).
- `npm start`: run the packaged app from `dist/main.js`.
- `npm test` / `npm run test:watch` / `npm run test:ui`: Vitest suite once, watch mode, or UI runner.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer functional React components with hooks.
- Use 2-space indentation, single quotes, and semicolons as in existing files.
- Components in `PascalCase.tsx`, hooks/utilities in `camelCase.ts`, tests as `*.test.ts(x)`.
- Keep Electron-only APIs isolated to `electron/` and expose renderer-safe surfaces via `preload.ts`.

## Testing Guidelines
- Vitest + React Testing Library; renderer tests run in `jsdom`, main/preload in Node.
- Place new tests beside implementations; reuse `src/test/setupTests.ts` for common config.
- Mock Electron, network, and audio surfaces; keep deterministic data and fast suites.

## Commit & Pull Request Guidelines
- Git history favors concise, imperative subjects (merge commits include PR numbers); follow suit and link issues/PR IDs.
- Keep PRs scoped; include what changed, why, screenshots for UI tweaks, and steps to verify.
- Ensure `npm test` passes and builds succeed before requesting review.

## Configuration & Security Tips
- Avoid editing `dist/`; regenerate via builds. Keep API keys stored via app settings or env vars, not in source.
