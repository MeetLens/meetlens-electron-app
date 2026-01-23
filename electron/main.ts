import {
  app,
  BrowserWindow,
  session,
  desktopCapturer,
  ipcMain,
  systemPreferences,
  type IpcMainInvokeEvent,
} from 'electron';
import path from 'path';
import { Worker } from 'worker_threads';

let mainWindow: BrowserWindow | null = null;
let databaseWorker: DatabaseWorker | null = null;

export type DatabaseWorker = {
  request: <T = unknown>(type: string, payload?: Record<string, unknown>) => Promise<T>;
  close: () => Promise<void>;
};

// CRITICAL: Enable macOS loopback audio for screen share
// This flag allows getDisplayMedia() to capture system audio on macOS.
// Without this flag, only microphone audio would be available.
// Works in dev mode (Electron.app is signed) but requires app signing for production.
app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare');

export async function createDatabaseWorker(): Promise<DatabaseWorker> {
  const dbPath = path.join(app.getPath('userData'), 'meetlens.db');
  const worker = new Worker(path.join(__dirname, 'database.worker.js'));
  let nextRequestId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  const request = <T = unknown>(type: string, payload?: Record<string, unknown>) => {
    const id = nextRequestId++;

    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      worker.postMessage({ id, type, payload });
    });
  };

  worker.on('message', (message: { id: number; ok: boolean; result?: unknown; error?: string }) => {
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    if (message.ok) {
      entry.resolve(message.result);
    } else {
      entry.reject(new Error(message.error || 'Database worker error'));
    }
  });

  worker.on('error', (error) => {
    pending.forEach(({ reject }) => reject(error));
    pending.clear();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      const error = new Error(`Database worker stopped with exit code ${code}`);
      pending.forEach(({ reject }) => reject(error));
      pending.clear();
    }
  });

  await request('init', { dbPath });

  return {
    request,
    close: async () => {
      try {
        await request('close');
      } finally {
        await worker.terminate();
      }
    },
  };
}

export function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 16, y: 20 },
        }
      : {}),
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function configureDisplayMediaHandling() {
  // Auto-approve media/display capture to simplify UX
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // CRITICAL: This handler provides loopback audio for macOS system audio capture
  // When renderer calls getDisplayMedia({ audio: true }), this handler is triggered
  // and returns audio: 'loopback' which enables actual system audio capture.
  //
  // Without this, the audio track would be created but contain only silence.
  // This works with the MacLoopbackAudioForScreenShare flag set on line 17.
  //
  // See SYSTEM_AUDIO_README.md and TROUBLESHOOTING.md for details.
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      console.log('[Main] Display media request handler called');
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      console.log('[Main] Found', sources.length, 'capture sources');

      // Prefer primary screen; fall back to first
      const screenSource =
        sources.find((source) => source.name === 'Entire Screen' || source.name === 'Screen 1') ||
        sources[0];

      console.log('[Main] Selected source:', screenSource?.name, 'with loopback audio');

      callback({
        video: screenSource,
        audio: 'loopback', // This enables system audio capture on macOS
      });
    } catch (error) {
      console.error('[Main] Error handling display media request:', error);
      callback({ video: undefined, audio: undefined });
    }
  });
}

export function registerIpcHandlers(database: DatabaseWorker) {
  // Open System Settings for screen recording permission
  ipcMain.handle('open-screen-recording-settings', async () => {
    if (process.platform === 'darwin') {
      const { shell } = require('electron');
      // Open Privacy & Security > Screen Recording in System Settings
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      return true;
    }
    return false;
  });

  // Check screen recording permission on macOS
  ipcMain.handle('check-screen-permission', async () => {
    if (process.platform === 'darwin') {
      // On macOS, we need to actually try to access desktopCapturer to trigger permission
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        console.log('[Main] Screen recording permission check: found', sources.length, 'sources');
        return sources.length > 0;
      } catch (error) {
        console.error('[Main] Screen recording permission denied:', error);
        return false;
      }
    }
    return true; // Non-macOS platforms
  });

  // Get screen source ID for use with getUserMedia
  ipcMain.handle('get-screen-source-id', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      console.log('[Main] get-screen-source-id: found', sources.length, 'sources');

      // Return the primary screen source
      const primarySource = sources.find(
        source => source.name === 'Entire Screen' || source.name === 'Screen 1' || source.name.includes('Bildschirm')
      ) || sources[0];

      if (primarySource) {
        console.log('[Main] Returning source ID:', primarySource.id, 'for', primarySource.name);
        return { id: primarySource.id, name: primarySource.name };
      }

      return null;
    } catch (error) {
      console.error('[Main] Error getting screen source:', error);
      return null;
    }
  });

  ipcMain.handle('get-audio-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        fetchWindowIcons: true,
        thumbnailSize: { width: 150, height: 150 }
      });
      console.log('Desktop capturer found', sources.length, 'sources');
      return sources;
    } catch (error) {
      console.error('Error getting audio sources:', error);
      return [];
    }
  });

  ipcMain.handle('create-meeting', async (_event: IpcMainInvokeEvent, name: string) => {
    return database.request('create-meeting', { name });
  });

  ipcMain.handle('get-meetings', async () => {
    return database.request('get-meetings');
  });

  ipcMain.handle('get-meeting', async (_event: IpcMainInvokeEvent, id: number) => {
    return database.request('get-meeting', { id });
  });

  ipcMain.handle('save-transcript', async (
    _event: IpcMainInvokeEvent,
    meetingId: number,
    timestamp: string,
    text: string,
    translation?: string,
  ) => {
    return database.request('save-transcript', {
      meetingId,
      timestamp,
      text,
      translation,
    });
  });

  ipcMain.handle('get-transcripts', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    return database.request('get-transcripts', { meetingId });
  });

  ipcMain.handle('clear-transcripts', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    return database.request('clear-transcripts', { meetingId });
  });

  ipcMain.handle('delete-meeting', async (_event: IpcMainInvokeEvent, id: number) => {
    return database.request('delete-meeting', { id });
  });

  ipcMain.handle(
    'save-meeting-summary',
    async (
      _event: IpcMainInvokeEvent,
      meetingId: number,
      summary: string,
      fullTranscript: string,
    ) => {
      return database.request('save-meeting-summary', {
        meetingId,
        summary,
        fullTranscript,
      });
    },
  );

  ipcMain.handle('get-meeting-summary', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    return database.request('get-meeting-summary', { meetingId });
  });
}

async function bootstrap() {
  databaseWorker = await createDatabaseWorker();
  registerIpcHandlers(databaseWorker);
  configureDisplayMediaHandling();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.whenReady().then(() => {
    void bootstrap();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (databaseWorker) {
        void databaseWorker.close();
        databaseWorker = null;
      }
      app.quit();
    }
  });
}
