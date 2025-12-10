import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Renderer entry: src/main.tsx
// Electron main entry: electron/main.ts
// Preload file: electron/preload.ts
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setupTests.ts',
    globals: true,
  },
});
