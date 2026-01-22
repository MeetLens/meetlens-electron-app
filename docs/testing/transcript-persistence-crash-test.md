# Transcript Persistence Crash Test Guide

This guide helps verify that the transcript persistence fix works correctly and prevents data loss during application crashes.

## Overview

The transcript persistence system now saves stable transcripts to the SQLite database immediately as they arrive, rather than waiting until the recording stops. This ensures that data is preserved even if the application crashes or is force-killed during a meeting.

## Section 1: Pre-Test Setup

### 1.1 Build and Run the Application

From the `meetlens-electron-app` directory:

```bash
# Install dependencies (if not already installed)
npm install

# Run in development mode
npm run dev
```

The application will:
- Build the Electron main process
- Start the Vite dev server (http://localhost:5173)
- Open the Electron window with DevTools

**Expected output:**
- Terminal shows "vite dev server running"
- Electron window opens with the MeetLens interface
- DevTools console is visible (right side of window)

### 1.2 Locate the SQLite Database

The database file is created in Electron's userData directory:

**macOS:**
```bash
# Print the database path
ls -la ~/Library/Application\ Support/meetlens/meetlens.db

# Or use SQLite CLI directly
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db
```

**Windows:**
```powershell
# PowerShell
dir $env:APPDATA\meetlens\meetlens.db

# Or use SQLite CLI
sqlite3 %APPDATA%\meetlens\meetlens.db
```

**Linux:**
```bash
ls -la ~/.config/meetlens/meetlens.db

# Or use SQLite CLI
sqlite3 ~/.config/meetlens/meetlens.db
```

**Expected output:**
- File exists and has non-zero size
- If file doesn't exist, it will be created on first app launch

### 1.3 Verify Database Schema

Open the database and check the schema:

```bash
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db
```

```sql
.schema

-- Expected output:
-- CREATE TABLE meetings (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   name TEXT NOT NULL,
--   created_at TEXT NOT NULL,
--   updated_at TEXT NOT NULL,
--   summary TEXT,
--   full_transcript TEXT
-- );
--
-- CREATE TABLE transcripts (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   meeting_id INTEGER NOT NULL,
--   timestamp TEXT NOT NULL,
--   text TEXT NOT NULL,
--   translation TEXT,
--   FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
-- );
```

**Exit SQLite:** Type `.exit` or press Ctrl+D

---

## Section 2: Basic Persistence Test

This test verifies that transcripts are saved to the database in real-time during recording.

### 2.1 Start a Recording

1. Click the "New Meeting" button in the left sidebar
2. Confirm the meeting is created (name appears like "Meeting - HH:MM:SS")
3. Click the red "Start Recording" button in the top bar
4. Grant microphone/screen recording permissions if prompted

**Expected behavior:**
- Button changes to "Stop Recording" (white text)
- Recording status indicator appears (red dot or similar)

### 2.2 Speak Test Sentences

Speak clearly into your microphone (or play audio if using system audio capture):

```
Test sentence one: Hello, this is a transcript persistence test.
[Wait 2-3 seconds for stable transcript]

Test sentence two: I am verifying that transcripts are saved immediately.
[Wait 2-3 seconds]

Test sentence three: This should persist to the database in real-time.
[Wait 2-3 seconds]
```

**Expected behavior:**
- Partial transcripts appear in gray text (real-time)
- Stable transcripts appear in black text with timestamp
- Console logs show: `[transcription] stable transcript received`

### 2.3 Check Database Immediately (Do NOT Stop Recording)

**CRITICAL:** Do not click "Stop Recording" yet. Open a new terminal window:

```bash
# macOS/Linux
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db "SELECT id, name FROM meetings ORDER BY id DESC LIMIT 1;"

# Expected output: Your current meeting ID and name
```

Now check for transcripts:

```bash
# Replace 123 with your meeting ID from above
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db "SELECT id, timestamp, text FROM transcripts WHERE meeting_id = 123;"

# Expected output: All stable transcripts spoken so far
# Example:
# 1|14:35:12|Hello, this is a transcript persistence test.
# 2|14:35:18|I am verifying that transcripts are saved immediately.
# 3|14:35:24|This should persist to the database in real-time.
```

**Success criteria:**
- Database contains transcripts even though recording is still active
- Transcript text matches what was spoken
- Timestamps are in HH:MM:SS format
- Each stable transcript has its own row

### 2.4 Stop Recording Normally

1. Click "Stop Recording" button
2. Verify all transcripts still appear in the UI
3. Confirm meeting updated_at timestamp is current

---

## Section 3: Crash Scenario Test

This is the critical test to verify data persistence during unexpected crashes.

### 3.1 Start a New Recording Session

1. Create a new meeting or select an existing one
2. Click "Start Recording"
3. Wait for recording to start successfully

### 3.2 Speak Multiple Sentences

Speak at least 5-7 distinct sentences with pauses between them:

```
Sentence 1: Testing crash scenario persistence.
[Wait 3 seconds]

Sentence 2: This data should survive a force kill.
[Wait 3 seconds]

Sentence 3: The database should contain all stable transcripts.
[Wait 3 seconds]

Sentence 4: Even if the application crashes unexpectedly.
[Wait 3 seconds]

Sentence 5: Real-time persistence is critical for data safety.
[Wait 3 seconds]
```

**Important:** Wait for each sentence to appear as a stable (black text) transcript in the UI.

### 3.3 Note the Meeting ID

Check the console logs or sidebar to identify the current meeting ID. You'll need this after the crash.

**Console log example:**
```
[transcription] stable transcript received: { meetingId: 42, ... }
```

Or check the database before crashing:
```bash
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db "SELECT id, name FROM meetings ORDER BY id DESC LIMIT 1;"
```

### 3.4 Force Kill the Application

**Do NOT click "Stop Recording"** - simulate a crash instead:

**macOS (Activity Monitor):**
1. Open Activity Monitor (Cmd+Space, type "Activity Monitor")
2. Find "Electron" or "MeetLens" process
3. Select it and click the "X" button in the toolbar
4. Choose "Force Quit"

**macOS (Terminal):**
```bash
# Find the Electron process
ps aux | grep -i electron | grep -v grep

# Force kill by PID (replace 12345 with actual PID)
kill -9 12345
```

**Windows (Task Manager):**
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Electron" or "MeetLens" in Processes tab
3. Right-click → "End Task"

**Linux:**
```bash
# Find and kill Electron process
pkill -9 electron
```

### 3.5 Verify Data Persistence

**Before restarting the app**, check the database directly:

```bash
# macOS/Linux - Replace 42 with your meeting ID
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db

SELECT * FROM meetings WHERE id = 42;
SELECT id, timestamp, text FROM transcripts WHERE meeting_id = 42 ORDER BY id ASC;

.exit
```

**Expected results:**
- Meeting record exists with created_at and updated_at timestamps
- All stable transcripts spoken before the crash are present
- Transcripts are in chronological order
- No partial (unstable) transcripts are saved

### 3.6 Restart and Verify in UI

1. Restart the application: `npm run dev`
2. Look at the sidebar - your meeting should be listed
3. Click on the meeting to load it
4. Verify all transcripts from before the crash are displayed

**Success criteria:**
- Zero data loss for stable transcripts
- Meeting summary (if generated) is preserved
- UI correctly loads persisted transcripts from database

---

## Section 4: Translation Persistence Test

This test verifies that translations are also persisted immediately.

### 4.1 Enable Translation

1. Create or select a meeting
2. In the top bar, find the "Translation" dropdown
3. Select a target language (e.g., "Turkish" or "Spanish")
4. Verify the selected language is displayed

### 4.2 Start Recording with Translation

1. Click "Start Recording"
2. Speak in the source language (or ensure audio is in source language)

**Example (English → Turkish):**
```
Hello, this is a translation test.
[Wait for stable transcript and translation]

The translation should be saved to the database.
[Wait for stable transcript and translation]
```

**Expected behavior:**
- Original transcript appears in black text
- Translation appears below in blue/colored text
- Console shows: `[translation] stable translation received`

### 4.3 Verify Translation in Database

While recording is still active:

```bash
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db

-- Replace 123 with your meeting ID
SELECT
  id,
  timestamp,
  SUBSTR(text, 1, 40) as text_preview,
  SUBSTR(translation, 1, 40) as translation_preview
FROM transcripts
WHERE meeting_id = 123
ORDER BY id ASC;

.exit
```

**Expected output:**
```
1|14:42:15|Hello, this is a translation test|Merhaba, bu bir çeviri testidir
2|14:42:22|The translation should be saved|Çeviri veritabanına kaydedilmeli
```

### 4.4 Crash Test with Translation

1. Continue recording with translation enabled
2. Speak 3-4 more sentences
3. Force kill the app (see Section 3.4)
4. Verify database contains both text and translation columns
5. Restart app and verify translations appear in UI

**Success criteria:**
- Both original text and translation are persisted
- Translations survive application crashes
- UI correctly renders both text and translation after restart

---

## Section 5: Performance Verification

This test ensures that immediate persistence doesn't block or slow down the transcription pipeline.

### 5.1 Monitor Console for Errors

During a recording session:

1. Open DevTools Console (F12 or Cmd+Option+I)
2. Filter logs to show errors: Click "Default levels" → uncheck "Verbose", "Info"
3. Start recording and speak continuously

**What to look for:**
- No database-related errors in console
- No "Failed to persist stable transcript" errors
- Log messages appear promptly without delays

### 5.2 Check Audio Processing Performance

In the DevTools Console, look for performance logs:

```
[transcription] stable transcript received: { ... }
[translation] stable translation received: { ... }
```

**Performance indicators:**
- Timestamps between consecutive logs should be consistent (1-3 seconds for typical speech)
- No large gaps (> 10 seconds) between transcripts
- Audio stream remains active (check for disconnect messages)

### 5.3 Verify UI Responsiveness

During recording:

1. Click around the UI (sidebar, top bar)
2. Scroll the transcript panel
3. Change translation language mid-recording
4. Generate a summary (if available)

**Success criteria:**
- UI remains responsive (no freezing)
- Transcript panel scrolls smoothly
- Actions complete within 1-2 seconds
- No "Application Not Responding" dialogs

### 5.4 Check for Database Lock Issues

Run a long recording session (3-5 minutes) with continuous speech:

**Monitor for:**
- No "database is locked" errors in console
- No SQLite SQLITE_BUSY errors
- Transcripts continue to be saved throughout the session

**Advanced: Monitor database writes**

In a separate terminal:

```bash
# macOS/Linux - Monitor database file changes
watch -n 2 "sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db 'SELECT COUNT(*) FROM transcripts;'"

# Expected: Count increases as you speak
```

---

## Section 6: Database Inspection Commands

### 6.1 Connect to Database

```bash
# macOS/Linux
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db

# Windows (PowerShell)
sqlite3 $env:APPDATA\meetlens\meetlens.db
```

### 6.2 List All Meetings

```sql
-- Show all meetings with basic info
SELECT
  id,
  name,
  created_at,
  updated_at,
  (SELECT COUNT(*) FROM transcripts WHERE meeting_id = meetings.id) as transcript_count
FROM meetings
ORDER BY created_at DESC;
```

**Example output:**
```
42|Meeting - 14:35:12|2025-01-22T14:35:12.000Z|2025-01-22T14:37:45.000Z|15
41|Meeting - 10:15:30|2025-01-22T10:15:30.000Z|2025-01-22T10:22:10.000Z|8
```

### 6.3 Show Transcripts for a Specific Meeting

```sql
-- Replace 42 with your meeting ID
SELECT
  id,
  timestamp,
  text,
  CASE WHEN translation IS NOT NULL THEN 'Yes' ELSE 'No' END as has_translation
FROM transcripts
WHERE meeting_id = 42
ORDER BY id ASC;
```

### 6.4 Count Transcripts Per Meeting

```sql
-- Aggregate view of all meetings
SELECT
  m.id,
  m.name,
  COUNT(t.id) as transcript_count,
  SUM(CASE WHEN t.translation IS NOT NULL THEN 1 ELSE 0 END) as translated_count
FROM meetings m
LEFT JOIN transcripts t ON m.id = t.meeting_id
GROUP BY m.id
ORDER BY m.created_at DESC;
```

### 6.5 Find Recent Transcripts (Last Hour)

```sql
-- Show transcripts from the last hour across all meetings
SELECT
  m.name as meeting_name,
  t.timestamp,
  SUBSTR(t.text, 1, 50) || '...' as preview
FROM transcripts t
JOIN meetings m ON t.meeting_id = m.id
WHERE m.created_at >= datetime('now', '-1 hour')
ORDER BY m.created_at DESC, t.id ASC;
```

### 6.6 Check for Orphaned Transcripts

```sql
-- Verify foreign key integrity (should return 0 rows)
SELECT t.*
FROM transcripts t
LEFT JOIN meetings m ON t.meeting_id = m.id
WHERE m.id IS NULL;
```

### 6.7 Inspect Longest Transcripts

```sql
-- Find transcripts with most text (potential issues with chunking)
SELECT
  id,
  meeting_id,
  timestamp,
  LENGTH(text) as text_length,
  SUBSTR(text, 1, 60) || '...' as preview
FROM transcripts
ORDER BY text_length DESC
LIMIT 10;
```

### 6.8 Delete Test Data

```sql
-- Clean up test meetings (BE CAREFUL!)
-- First, check what will be deleted:
SELECT id, name, created_at FROM meetings WHERE name LIKE 'Meeting%';

-- Then delete (transcripts are cascade deleted):
DELETE FROM meetings WHERE name LIKE 'Meeting%';

-- Verify deletion:
SELECT COUNT(*) FROM meetings;
SELECT COUNT(*) FROM transcripts;
```

### 6.9 Exit SQLite CLI

```sql
.exit
```

Or press `Ctrl+D` (Linux/macOS) or `Ctrl+Z` then Enter (Windows)

---

## Expected Outcomes Summary

### Critical Success Criteria

1. **Real-time Persistence**: Stable transcripts appear in database within 1-2 seconds of being spoken
2. **Crash Resilience**: Force-killing the app loses zero stable transcripts
3. **Translation Support**: Both text and translation are persisted immediately
4. **Non-blocking**: Database writes don't freeze the UI or audio pipeline
5. **Data Integrity**: Foreign key constraints are respected, no orphaned records

### Performance Benchmarks

- **Transcript latency**: < 3 seconds from speech to database
- **UI responsiveness**: No freezing during heavy transcription
- **Database writes**: No "locked" errors during concurrent operations
- **Memory stability**: No memory leaks over 10+ minute sessions

### Common Issues and Debugging

**Problem**: No transcripts in database during recording

**Possible causes:**
- Database file permissions issue
- IPC handler not registered
- saveTranscript function not being called

**Debug steps:**
```bash
# Check if saveTranscript is being called
# Look for console logs: [transcription] stable transcript received

# Verify IPC handler exists
# Check electron/main.ts line ~233 for ipcMain.handle('save-transcript', ...)

# Check database file permissions
ls -la ~/Library/Application\ Support/meetlens/meetlens.db
# Should be readable/writable by your user
```

**Problem**: Transcripts disappear after crash

**Possible causes:**
- saveTranscript is async but not awaited (check for .catch())
- Database connection closed prematurely
- Transcripts only saved at stopRecording()

**Debug steps:**
- Check useTranscription.ts line ~274: verify immediate persistence is enabled
- Ensure fire-and-forget pattern with .catch() is present
- Verify not wrapped in a transaction that requires explicit commit

**Problem**: "Database is locked" errors

**Possible causes:**
- Multiple writes happening simultaneously
- Long-running read query blocking writes
- SQLite busy timeout too low

**Debug steps:**
```bash
# Check for concurrent access
sqlite3 ~/Library/Application\ Support/meetlens/meetlens.db "PRAGMA busy_timeout;"
# Should return a reasonable timeout (e.g., 5000ms)

# Check for long-running queries in code
# SQLite should handle concurrent reads, but writes are serialized
```

---

## Conclusion

This guide provides comprehensive testing for the transcript persistence fix. Following all sections ensures that:

- Transcripts are saved immediately (Section 2)
- Data survives application crashes (Section 3)
- Translations are persisted correctly (Section 4)
- Performance remains excellent (Section 5)
- Database can be inspected for verification (Section 6)

For any issues or questions, refer to:
- `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/docs/TROUBLESHOOTING.md`
- `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/docs/ARCHITECTURE.md`
- GitHub Issues: [meetlens repository issues page]

**Testing completed successfully if:**
- All sections pass without errors
- No data loss during force-kill scenarios
- Database integrity maintained throughout
- Performance meets benchmarks
