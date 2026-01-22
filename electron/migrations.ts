import type Database from 'better-sqlite3';

type Migration = {
  version: number;
  name: string;
  up: (db: Database) => void;
};

const addColumnIfMissing = (
  db: Database,
  table: string,
  column: string,
  definition: string,
) => {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  const hasColumn = columns.some((entry) => entry.name === column);

  if (hasColumn) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create base tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS meetings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
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
    },
  },
  {
    version: 2,
    name: 'add transcripts unique index',
    up: (db) => {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transcripts_meeting_timestamp
        ON transcripts(meeting_id, timestamp)
      `);
    },
  },
  {
    version: 3,
    name: 'add meeting summary columns',
    up: (db) => {
      addColumnIfMissing(db, 'meetings', 'summary', 'TEXT');
      addColumnIfMissing(db, 'meetings', 'full_transcript', 'TEXT');
    },
  },
];

export function runMigrations(db: Database) {
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  const pending = ordered.filter((migration) => migration.version > currentVersion);

  if (pending.length === 0) {
    return;
  }

  const applyMigrations = db.transaction(() => {
    for (const migration of pending) {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    }
  });

  applyMigrations();
}
