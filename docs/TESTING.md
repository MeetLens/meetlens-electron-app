# Testing

This project uses **Vitest** with **React Testing Library** for unit tests.

- **Environments**: Renderer tests run in `jsdom`, while Electron `main`/`preload` code is tested with the Node environment.
- **Electron APIs**: Native Electron APIs are mocked during unit tests so they can run without launching a browser window.
- **Commands**:
  - `npm test` runs the full test suite once.
  - `npm run test:watch` runs the suite in watch mode for rapid iteration.

For more details on the overall architecture and how tests fit into the development workflow, see [ARCHITECTURE.md](ARCHITECTURE.md).
