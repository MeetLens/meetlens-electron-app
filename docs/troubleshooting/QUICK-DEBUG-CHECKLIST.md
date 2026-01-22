# Quick Debug Checklist: Transcript Persistence

Use this checklist to quickly diagnose transcript persistence issues.

## Step 1: Open DevTools Console

In development mode, DevTools opens automatically. Look at the Console tab.

## Step 2: Start Recording and Speak

Start a recording and speak a few sentences. Wait 5-10 seconds.

## Step 3: Check Console Logs

Filter the console by `[transcription]` or `[IPC]`.

### What You Should See (Success):

```
✓ [transcription] stable transcript received: { ... }
✓ [transcription] Attempting to save stable transcript to database: { ... }
✓ [IPC/save-transcript] Received request: { ... }
✓ [IPC/save-transcript] SQL executed successfully: { lastInsertRowid: ..., changes: 1 }
✓ [IPC/save-transcript] ✓ Transcript saved successfully
✓ [transcription] ✓ Successfully saved stable transcript to database: { ... }
```

If you see all of these with checkmarks (✓), persistence is working correctly.

---

## Step 4: Identify the Issue

### Issue A: No logs at all

**No `[transcription]` or `[IPC]` logs appear:**

1. Check backend connection:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"ok"}`

2. Look for WebSocket connection logs:
   ```
   [WebSocket] Connected to ws://localhost:8000/...
   ```

3. Check backend logs to see if it's sending transcripts

**Fix:** Ensure backend is running and reachable.

---

### Issue B: Partial logs only

**You see `[transcription] partial transcript received:` but no `stable transcript`:**

**Fix:** This is normal during active speech. Wait a few seconds for the backend to finalize the transcript.

---

### Issue C: Stable received but no save attempt

**You see:**
```
✓ [transcription] stable transcript received: { ... }
```

**But NOT:**
```
[transcription] Attempting to save stable transcript to database: { ... }
```

**Fix:** This indicates a code issue. Check:
1. Is `saveTranscript` defined in the component?
2. Is there an error before the save attempt?

---

### Issue D: Save attempt but no IPC received

**You see:**
```
✓ [transcription] Attempting to save stable transcript to database: { ... }
```

**But NOT:**
```
[IPC/save-transcript] Received request: { ... }
```

**Fix:**
1. Check that `window.electronAPI.saveTranscript` exists:
   ```javascript
   console.log(typeof window.electronAPI.saveTranscript); // should be "function"
   ```
2. Restart the app

---

### Issue E: IPC received but SQL failed

**You see:**
```
✓ [IPC/save-transcript] Received request: { ... }
✗ [IPC/save-transcript] ✗ Database error: { error: "...", ... }
```

**Common errors:**

1. **"UNIQUE constraint failed"**
   - Missing `ON CONFLICT` clause in SQL
   - **Fix:** Delete database and restart app

2. **"database is locked"**
   - Database file is locked by another process
   - **Fix:** Close all app instances and restart

3. **"no such table: transcripts"**
   - Database schema not initialized
   - **Fix:** Delete database and restart app

**Quick fix for all database errors:**
```bash
# macOS:
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

# Then restart the app
```

---

### Issue F: SQL succeeded but no frontend confirmation

**You see:**
```
✓ [IPC/save-transcript] SQL executed successfully: { ... }
✓ [IPC/save-transcript] ✓ Transcript saved successfully
```

**But NOT:**
```
[transcription] ✓ Successfully saved stable transcript to database: { ... }
```

**Fix:** This indicates the IPC response didn't reach the frontend. Rare issue. Restart the app.

---

### Issue G: All logs show success but data not persisting

**You see all success logs, but after restarting the app, transcripts are gone.**

**Fix:**
1. Check database file exists and has non-zero size:
   ```bash
   ls -lh ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
   ```

2. Run integrity check:
   ```bash
   ./scripts/check-database.sh
   ```

3. Manually check database:
   ```bash
   sqlite3 ~/Library/Application\ Support/meetlens-electron-app/meetlens.db "SELECT COUNT(*) FROM transcripts;"
   ```

If count is 0, there's a database write issue. Check file permissions.

---

## Step 5: Run Database Integrity Check

```bash
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
./scripts/check-database.sh
```

This will:
- Check if database exists
- Verify schema is correct
- Check if unique index exists
- Show data statistics

---

## Step 6: Manual Test

Test persistence manually in DevTools console:

```javascript
// Create a test meeting if needed
const meeting = await window.electronAPI.createMeeting("Test Meeting");
console.log("Created meeting:", meeting);

// Save a test transcript
await window.electronAPI.saveTranscript(
  meeting.id,
  "12:34:56",
  "Test transcript text",
  "Test translation"
);

// Verify it was saved
const transcripts = await window.electronAPI.getTranscripts(meeting.id);
console.log("Saved transcripts:", transcripts);
```

You should see:
```
Created meeting: { id: 1, name: "Test Meeting", ... }
[IPC/save-transcript] Received request: { ... }
[IPC/save-transcript] SQL executed successfully: { ... }
[IPC/save-transcript] ✓ Transcript saved successfully
Saved transcripts: [{ id: 1, meeting_id: 1, timestamp: "12:34:56", text: "Test transcript text", ... }]
```

If this works but real transcripts don't save, the issue is in the transcription flow, not the database.

---

## Common Solutions

### Nuclear Option: Complete Reset

If nothing else works:

```bash
# 1. Stop the app

# 2. Delete database
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

# 3. Clear and reinstall
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
rm -rf node_modules dist
npm install
npm run build

# 4. Start fresh
npm run dev
```

---

## Still Not Working?

See the full troubleshooting guides:
- [Transcript Persistence Not Working](./transcript-persistence-not-working.md)
- [Console Log Reference](./console-log-reference.md)

Or run the database integrity checker:
```bash
./scripts/check-database.sh
```
