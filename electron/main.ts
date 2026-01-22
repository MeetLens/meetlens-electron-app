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
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

let mainWindow: BrowserWindow | null = null;
let db: Database | undefined;

// CRITICAL: Enable macOS loopback audio for screen share
// This flag allows getDisplayMedia() to capture system audio on macOS.
// Without this flag, only microphone audio would be available.
// Works in dev mode (Electron.app is signed) but requires app signing for production.
app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare');

export function createDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'meetlens.db');
  db = new Database(dbPath);
  runMigrations(db);

  return db;
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

export function registerIpcHandlers(database: Database) {
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
    const now = new Date().toISOString();
    const stmt = database.prepare(
      'INSERT INTO meetings (name, created_at, updated_at) VALUES (?, ?, ?)'
    );
    const result = stmt.run(name, now, now);
    return { id: result.lastInsertRowid, name, created_at: now, updated_at: now };
  });

  ipcMain.handle('get-meetings', async () => {
    const stmt = database.prepare('SELECT * FROM meetings ORDER BY created_at DESC');
    return stmt.all();
  });

  ipcMain.handle('get-meeting', async (_event: IpcMainInvokeEvent, id: number) => {
    const stmt = database.prepare('SELECT * FROM meetings WHERE id = ?');
    return stmt.get(id);
  });

  ipcMain.handle('save-transcript', async (
    _event: IpcMainInvokeEvent,
    meetingId: number,
    timestamp: string,
    text: string,
    translation?: string,
  ) => {
    console.log('[IPC/save-transcript] Received request:', {
      meetingId,
      timestamp,
      textLength: text.length,
      hasTranslation: !!translation,
      textPreview: text.substring(0, 50) + '...',
    });

    try {
      // Fix Issue 3: Use INSERT OR REPLACE to handle translation updates without duplicates
      // This ensures translation updates modify existing rows instead of creating duplicates
      const stmt = database.prepare(`
        INSERT INTO transcripts (meeting_id, timestamp, text, translation)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(meeting_id, timestamp)
        DO UPDATE SET
          text = excluded.text,
          translation = excluded.translation
      `);
      const result = stmt.run(meetingId, timestamp, text, translation || null);

      console.log('[IPC/save-transcript] SQL executed successfully:', {
        lastInsertRowid: result.lastInsertRowid,
      });

      const updateStmt = database.prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
      updateStmt.run(new Date().toISOString(), meetingId);

      console.log('[IPC/save-transcript] ✓ Transcript saved successfully');

      return { id: result.lastInsertRowid };
    } catch (error: any) {
      console.error('[IPC/save-transcript] ✗ Database error:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw error;
    }
  });

  ipcMain.handle('get-transcripts', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    const stmt = database.prepare('SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY id ASC');
    return stmt.all(meetingId);
  });

  ipcMain.handle('clear-transcripts', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    const stmt = database.prepare('DELETE FROM transcripts WHERE meeting_id = ?');
    stmt.run(meetingId);

    const updateStmt = database.prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), meetingId);

    return { success: true };
  });

  ipcMain.handle('delete-meeting', async (_event: IpcMainInvokeEvent, id: number) => {
    const stmt = database.prepare('DELETE FROM meetings WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  ipcMain.handle(
    'save-meeting-summary',
    async (
      _event: IpcMainInvokeEvent,
      meetingId: number,
      summary: string,
      fullTranscript: string,
    ) => {
    const stmt = database.prepare('UPDATE meetings SET summary = ?, full_transcript = ?, updated_at = ? WHERE id = ?');
    stmt.run(summary, fullTranscript, new Date().toISOString(), meetingId);
    return { success: true };
  });

  ipcMain.handle('get-meeting-summary', async (_event: IpcMainInvokeEvent, meetingId: number) => {
    const stmt = database.prepare('SELECT summary, full_transcript FROM meetings WHERE id = ?');
    const result = stmt.get(meetingId);
    return result || { summary: null, full_transcript: null };
  });
}

function bootstrap() {
  const database = createDatabase();
  registerIpcHandlers(database);
  configureDisplayMediaHandling();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.whenReady().then(bootstrap);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      db?.close();
      app.quit();
    }
  });
}
