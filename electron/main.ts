import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | undefined;

export function createDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'meetlens.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      summary TEXT,
      full_transcript TEXT
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      text TEXT NOT NULL,
      translation TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add summary and full_transcript columns if they don't exist
  try {
    db.exec('ALTER TABLE meetings ADD COLUMN summary TEXT');
  } catch (error: any) {
    // Column already exists, ignore
    if (!error.message.includes('duplicate column name')) {
      console.error('Error adding summary column:', error);
    }
  }

  try {
    db.exec('ALTER TABLE meetings ADD COLUMN full_transcript TEXT');
  } catch (error: any) {
    // Column already exists, ignore
    if (!error.message.includes('duplicate column name')) {
      console.error('Error adding full_transcript column:', error);
    }
  }

  return db;
}

export function createWindow() {
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
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function registerIpcHandlers(database: Database.Database) {
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

  ipcMain.handle('create-meeting', async (event, name: string) => {
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

  ipcMain.handle('get-meeting', async (event, id: number) => {
    const stmt = database.prepare('SELECT * FROM meetings WHERE id = ?');
    return stmt.get(id);
  });

  ipcMain.handle('save-transcript', async (event, meetingId: number, timestamp: string, text: string, translation?: string) => {
    const stmt = database.prepare(
      'INSERT INTO transcripts (meeting_id, timestamp, text, translation) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(meetingId, timestamp, text, translation || null);

    const updateStmt = database.prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), meetingId);

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('get-transcripts', async (event, meetingId: number) => {
    const stmt = database.prepare('SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY id ASC');
    return stmt.all(meetingId);
  });

  ipcMain.handle('clear-transcripts', async (event, meetingId: number) => {
    const stmt = database.prepare('DELETE FROM transcripts WHERE meeting_id = ?');
    stmt.run(meetingId);

    const updateStmt = database.prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), meetingId);

    return { success: true };
  });

  ipcMain.handle('delete-meeting', async (event, id: number) => {
    const stmt = database.prepare('DELETE FROM meetings WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  ipcMain.handle('save-meeting-summary', async (event, meetingId: number, summary: string, fullTranscript: string) => {
    const stmt = database.prepare('UPDATE meetings SET summary = ?, full_transcript = ?, updated_at = ? WHERE id = ?');
    stmt.run(summary, fullTranscript, new Date().toISOString(), meetingId);
    return { success: true };
  });

  ipcMain.handle('get-meeting-summary', async (event, meetingId: number) => {
    const stmt = database.prepare('SELECT summary, full_transcript FROM meetings WHERE id = ?');
    const result = stmt.get(meetingId);
    return result || { summary: null, full_transcript: null };
  });

  ipcMain.handle('translate-text', async (event, text: string, targetLang: string, apiKey: string) => {
    try {
      const url = 'https://api-free.deepl.com/v2/translate';

      const params = new URLSearchParams({
        auth_key: apiKey,
        text: text,
        target_lang: targetLang.toUpperCase(),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.translations[0].text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  });
}

function bootstrap() {
  const database = createDatabase();
  registerIpcHandlers(database);
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
