# Troubleshooting: Transcript Persistence Not Working

This guide helps diagnose and fix issues when transcripts are not being saved to the database.

## Quick Diagnosis Steps

Follow these steps in order to identify the issue:

### 1. Check Browser Console Logs

Open the Electron app DevTools (if in development mode, it opens automatically) and look for these log messages:

**Expected log flow for a successful save:**

```
[transcription] stable transcript received: { text: "...", sessionId: "...", meetingId: ... }
[transcription] Attempting to save stable transcript to database: { meetingId: ..., timestamp: "...", ... }
[IPC/save-transcript] Received request: { meetingId: ..., timestamp: "...", ... }
[IPC/save-transcript] SQL executed successfully: { lastInsertRowid: ..., changes: ... }
[IPC/save-transcript] ✓ Transcript saved successfully
[transcription] ✓ Successfully saved stable transcript to database: { meetingId: ..., timestamp: "..." }
```

### 2. Common Issues and Solutions

#### Issue A: No logs appearing at all

**Symptoms:**
- No `[transcription]` or `[IPC/save-transcript]` logs in console
- Backend connection is working

**Likely cause:** The `saveTranscript` function is not being called or there's a connection issue with the backend.

**Solution:**
1. Check that `window.electronAPI.saveTranscript` is available in the console:
   ```javascript
   console.log(typeof window.electronAPI.saveTranscript); // should be "function"
   ```
2. Verify backend is sending stable transcripts (check backend logs)
3. Restart the Electron app

---

#### Issue B: Logs show "Failed to persist" errors

**Symptoms:**
```
[transcription] ✗ Failed to persist stable transcript: { error: "...", ... }
```

**Likely cause:** Database error or IPC communication failure.

**Solution:**

1. **Check for database schema issues:**
   The database needs a unique index on `(meeting_id, timestamp)`. This was added in a recent update.

2. **Delete and rebuild the database:**
   ```bash
   # On macOS:
   rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

   # On Linux:
   rm ~/.config/meetlens-electron-app/meetlens.db

   # On Windows:
   # Delete: %APPDATA%\meetlens-electron-app\meetlens.db
   ```

   Then restart the app. The database will be recreated with the correct schema.

3. **Check IPC logs for more details:**
   Look for `[IPC/save-transcript] ✗ Database error:` in the console to see the exact error.

---

#### Issue C: SQL execution fails with "UNIQUE constraint failed"

**Symptoms:**
```
[IPC/save-transcript] ✗ Database error: { error: "UNIQUE constraint failed: ...", ... }
```

**Likely cause:** The unique index exists, but the `ON CONFLICT` clause is not working correctly.

**Solution:**

This should not happen with the current code, but if it does:

1. Verify the SQL statement in `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/electron/main.ts` includes:
   ```sql
   ON CONFLICT(meeting_id, timestamp)
   DO UPDATE SET
     text = excluded.text,
     translation = excluded.translation
   ```

2. Delete and rebuild the database (see Issue B solution)

---

#### Issue D: Transcripts appear in UI but not persisted after app restart

**Symptoms:**
- Transcripts show during recording
- After closing and reopening the app, transcripts are gone
- Console shows successful save logs

**Likely cause:** Race condition or database write not completing before app closes.

**Solution:**

1. **Check that you're not force-closing the app during recording.**
   Always stop recording before closing the app.

2. **Verify database location:**
   ```javascript
   // In DevTools console:
   window.electronAPI.getAppPath?.('userData')
   ```

   Check if `meetlens.db` exists at that path and has a non-zero size.

3. **Test database integrity:**
   ```bash
   sqlite3 ~/Library/Application\ Support/meetlens-electron-app/meetlens.db "SELECT COUNT(*) FROM transcripts;"
   ```

---

### 3. Advanced Debugging

If issues persist, enable more detailed logging:

1. **Add breakpoint in IPC handler:**

   In `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/electron/main.ts`, add a breakpoint at line 243 (start of `save-transcript` handler).

2. **Inspect database directly:**
   ```bash
   sqlite3 ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
   ```

   Then run:
   ```sql
   -- Check schema
   .schema transcripts

   -- Check indexes
   SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='transcripts';

   -- Check data
   SELECT COUNT(*) FROM transcripts;
   SELECT * FROM transcripts ORDER BY id DESC LIMIT 5;
   ```

3. **Verify unique index exists:**
   ```sql
   SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_transcripts_meeting_timestamp';
   ```

   Expected output:
   ```sql
   CREATE UNIQUE INDEX idx_transcripts_meeting_timestamp ON transcripts(meeting_id, timestamp)
   ```

---

## Backend Connection Verification

The persistence code only runs when the backend sends stable transcripts. Verify backend is working:

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"ok"}
   ```

2. **Check WebSocket connection:**
   Look for these logs in the browser console:
   ```
   [WebSocket] Connected to ws://localhost:8000/ws/transcribe/<session_id>
   ```

3. **Verify backend is sending stable transcripts:**
   Check backend logs for:
   ```
   [Backend] Sending stable transcript: ...
   ```

---

## Database File Locations

The database file is located at:

- **macOS:** `~/Library/Application Support/meetlens-electron-app/meetlens.db`
- **Linux:** `~/.config/meetlens-electron-app/meetlens.db`
- **Windows:** `%APPDATA%\meetlens-electron-app\meetlens.db`

You can safely delete this file to reset the database. All meetings and transcripts will be lost.

---

## Expected Database Schema

The `transcripts` table should have this schema:

```sql
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_transcripts_meeting_timestamp
ON transcripts(meeting_id, timestamp);
```

The unique index is critical for the `ON CONFLICT` clause to work correctly.

---

## Still Not Working?

If you've followed all steps and transcripts still aren't persisting:

1. **Capture full logs:**
   - Open DevTools console
   - Start recording
   - Speak a few sentences
   - Stop recording
   - Copy all console logs (filter by `[transcription]` and `[IPC]`)

2. **Check database state:**
   ```bash
   sqlite3 ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
   ```

   Run:
   ```sql
   .schema
   SELECT * FROM meetings;
   SELECT * FROM transcripts;
   ```

3. **Provide debug information:**
   - Operating system and version
   - Electron app version
   - Backend version (check `meetlens-backend/main.py` for version info)
   - Console logs from step 1
   - Database output from step 2

---

## Quick Reset (Nuclear Option)

If all else fails, completely reset the app:

```bash
# 1. Stop the app

# 2. Delete database
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

# 3. Clear npm cache and reinstall (in meetlens-electron-app directory)
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
rm -rf node_modules dist
npm install

# 4. Rebuild
npm run build

# 5. Start fresh
npm run dev
```

This will give you a completely clean slate.
