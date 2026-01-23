import { parentPort } from 'worker_threads';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

type WorkerRequest = {
  id: number;
  type: string;
  payload?: Record<string, unknown>;
};

type WorkerResponse = {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
};

let db: Database | undefined;

const ensureDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const handlers: Record<string, (payload?: Record<string, unknown>) => unknown> = {
  init: (payload) => {
    const dbPath = payload?.dbPath;
    if (typeof dbPath !== 'string') {
      throw new Error('Invalid database path');
    }
    db = new Database(dbPath);
    runMigrations(db);
    return { success: true };
  },
  'create-meeting': (payload) => {
    const name = payload?.name;
    if (typeof name !== 'string') {
      throw new Error('Invalid meeting name');
    }
    const now = new Date().toISOString();
    const stmt = ensureDatabase().prepare(
      'INSERT INTO meetings (name, created_at, updated_at) VALUES (?, ?, ?)'
    );
    const result = stmt.run(name, now, now);
    return { id: result.lastInsertRowid, name, created_at: now, updated_at: now };
  },
  'get-meetings': () => {
    const stmt = ensureDatabase().prepare('SELECT * FROM meetings ORDER BY created_at DESC');
    return stmt.all();
  },
  'get-meeting': (payload) => {
    const id = payload?.id;
    if (typeof id !== 'number') {
      throw new Error('Invalid meeting id');
    }
    const stmt = ensureDatabase().prepare('SELECT * FROM meetings WHERE id = ?');
    return stmt.get(id);
  },
  'save-transcript': (payload) => {
    const meetingId = payload?.meetingId;
    const timestamp = payload?.timestamp;
    const text = payload?.text;
    const translation = payload?.translation;

    if (typeof meetingId !== 'number' || typeof timestamp !== 'string' || typeof text !== 'string') {
      throw new Error('Invalid transcript payload');
    }

    console.log('[IPC/save-transcript] Received request:', {
      meetingId,
      timestamp,
      textLength: text.length,
      hasTranslation: typeof translation === 'string' && translation.length > 0,
      textPreview: text.substring(0, 50) + '...',
    });

    // Fix Issue 3: Use INSERT OR REPLACE to handle translation updates without duplicates
    // This ensures translation updates modify existing rows instead of creating duplicates
    const stmt = ensureDatabase().prepare(`
      INSERT INTO transcripts (meeting_id, timestamp, text, translation)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(meeting_id, timestamp)
      DO UPDATE SET
        text = excluded.text,
        translation = excluded.translation
    `);
    const result = stmt.run(meetingId, timestamp, text, typeof translation === 'string' ? translation : null);

    console.log('[IPC/save-transcript] SQL executed successfully:', {
      lastInsertRowid: result.lastInsertRowid,
    });

    const updateStmt = ensureDatabase().prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), meetingId);

    console.log('[IPC/save-transcript] ✓ Transcript saved successfully');

    return { id: result.lastInsertRowid };
  },
  'get-transcripts': (payload) => {
    const meetingId = payload?.meetingId;
    if (typeof meetingId !== 'number') {
      throw new Error('Invalid meeting id');
    }
    const stmt = ensureDatabase().prepare('SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY id ASC');
    return stmt.all(meetingId);
  },
  'clear-transcripts': (payload) => {
    const meetingId = payload?.meetingId;
    if (typeof meetingId !== 'number') {
      throw new Error('Invalid meeting id');
    }
    const stmt = ensureDatabase().prepare('DELETE FROM transcripts WHERE meeting_id = ?');
    stmt.run(meetingId);

    const updateStmt = ensureDatabase().prepare('UPDATE meetings SET updated_at = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), meetingId);

    return { success: true };
  },
  'delete-meeting': (payload) => {
    const id = payload?.id;
    if (typeof id !== 'number') {
      throw new Error('Invalid meeting id');
    }
    const stmt = ensureDatabase().prepare('DELETE FROM meetings WHERE id = ?');
    stmt.run(id);
    return { success: true };
  },
  'save-meeting-summary': (payload) => {
    const meetingId = payload?.meetingId;
    const summary = payload?.summary;
    const fullTranscript = payload?.fullTranscript;

    if (typeof meetingId !== 'number' || typeof summary !== 'string' || typeof fullTranscript !== 'string') {
      throw new Error('Invalid meeting summary payload');
    }

    const stmt = ensureDatabase().prepare(
      'UPDATE meetings SET summary = ?, full_transcript = ?, updated_at = ? WHERE id = ?'
    );
    stmt.run(summary, fullTranscript, new Date().toISOString(), meetingId);
    return { success: true };
  },
  'get-meeting-summary': (payload) => {
    const meetingId = payload?.meetingId;
    if (typeof meetingId !== 'number') {
      throw new Error('Invalid meeting id');
    }
    const stmt = ensureDatabase().prepare('SELECT summary, full_transcript FROM meetings WHERE id = ?');
    const result = stmt.get(meetingId);
    return result || { summary: null, full_transcript: null };
  },
  close: () => {
    if (db) {
      db.close();
      db = undefined;
    }
    return { success: true };
  },
};

parentPort?.on('message', (message: WorkerRequest) => {
  const handler = handlers[message.type];
  if (!handler) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: `Unknown message type: ${message.type}`,
    } satisfies WorkerResponse);
    return;
  }

  try {
    const result = handler(message.payload);
    parentPort?.postMessage({ id: message.id, ok: true, result } satisfies WorkerResponse);
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse);
  }
});
