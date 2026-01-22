# Console Log Reference for Transcript Persistence

This document explains the console log messages you'll see during transcript persistence and what they mean.

## Log Filtering

In the DevTools console, you can filter logs to only show transcript-related messages:

- Filter by `[transcription]` - Shows all transcription-related logs
- Filter by `[translation]` - Shows all translation-related logs
- Filter by `[IPC]` - Shows all IPC (Electron main process) logs

## Complete Flow for a Successful Save

Here's what you should see in the console for a complete successful transcript save:

### 1. Partial Transcript (Real-time preview)

```
[transcription] partial transcript received: {
  text: "Hello world",
  meetingId: 1,
  sessionId: "abc123..."
}
```

**What this means:** The backend sent a partial (not yet finalized) transcript. This is just for live preview in the UI.

**Action taken:** Updates the UI, but does NOT save to database (intentional).

---

### 2. Stable Transcript (Finalized text)

```
[transcription] stable transcript received: {
  text: "Hello world",
  sessionId: "abc123...",
  meetingId: 1,
  fullText: undefined
}
```

**What this means:** The backend has finalized this piece of text and it's ready to be saved.

**Action taken:** Prepares to save to database.

---

### 3. Database Save Initiated

```
[transcription] Attempting to save stable transcript to database: {
  meetingId: 1,
  timestamp: "14:23:45",
  textLength: 11,
  hasTranslation: false,
  textPreview: "Hello world..."
}
```

**What this means:** The frontend is calling the IPC to save the transcript.

**Action taken:** Sends IPC message to main process.

---

### 4. IPC Handler Receives Request

```
[IPC/save-transcript] Received request: {
  meetingId: 1,
  timestamp: "14:23:45",
  textLength: 11,
  hasTranslation: false,
  textPreview: "Hello world..."
}
```

**What this means:** The main process received the save request.

**Action taken:** Executes SQL query.

---

### 5. SQL Execution Success

```
[IPC/save-transcript] SQL executed successfully: {
  lastInsertRowid: 42,
  changes: 1
}
```

**What this means:**
- `lastInsertRowid: 42` - The transcript was inserted with ID 42 (or updated existing row)
- `changes: 1` - One row was affected

**Action taken:** Transcript is now in the database.

---

### 6. IPC Confirmation

```
[IPC/save-transcript] ✓ Transcript saved successfully
```

**What this means:** The IPC handler completed successfully.

**Action taken:** Returns success to frontend.

---

### 7. Frontend Confirmation

```
[transcription] ✓ Successfully saved stable transcript to database: {
  meetingId: 1,
  timestamp: "14:23:45"
}
```

**What this means:** The frontend received confirmation from the IPC handler.

**Action taken:** Marks the session as persisted to prevent duplicates.

---

## Translation Save Flow

When a translation is received, you'll see additional logs:

### 1. Partial Translation (Real-time preview)

```
[translation] partial translation received: {
  translation: "Hola mundo",
  meetingId: 1,
  sessionId: "abc123..."
}
```

**What this means:** Live translation preview from backend.

**Action taken:** Updates UI only, does NOT save to database.

---

### 2. Stable Translation (Finalized)

```
[translation] stable translation received: {
  translation: "Hola mundo",
  meetingId: 1,
  sessionId: "abc123..."
}
```

**What this means:** Translation is finalized and ready to save.

**Action taken:** Prepares to update the existing transcript with translation.

---

### 3. Translation Save Initiated

```
[translation] Attempting to save translation update to database: {
  meetingId: 1,
  timestamp: "14:23:45",
  translationLength: 10,
  translationPreview: "Hola mundo..."
}
```

**What this means:** Frontend is calling IPC to update the transcript with translation.

**Action taken:** Sends IPC message with UPSERT (updates existing row).

---

### 4. Translation Save Success

```
[IPC/save-transcript] Received request: { ... }
[IPC/save-transcript] SQL executed successfully: { lastInsertRowid: 42, changes: 1 }
[IPC/save-transcript] ✓ Transcript saved successfully
[translation] ✓ Successfully saved translation to database: {
  meetingId: 1,
  timestamp: "14:23:45"
}
```

**What this means:** The translation was added to the existing transcript row (UPSERT updated it).

**Action taken:** Database now has the translation.

---

## Error Patterns

### Error: Save Failed in Frontend

```
[transcription] ✗ Failed to persist stable transcript: {
  meetingId: 1,
  timestamp: "14:23:45",
  error: "IPC handler threw error",
  stack: "Error: ..."
}
```

**What this means:** The IPC handler returned an error.

**Check:**
1. Look for corresponding `[IPC/save-transcript] ✗ Database error:` log
2. Check database schema (run `scripts/check-database.sh`)
3. Check database file permissions

---

### Error: Database Constraint Failed

```
[IPC/save-transcript] ✗ Database error: {
  error: "UNIQUE constraint failed: transcripts.meeting_id, transcripts.timestamp",
  code: "SQLITE_CONSTRAINT",
  stack: "..."
}
```

**What this means:** The database has a unique index on `(meeting_id, timestamp)` but the `ON CONFLICT` clause isn't working.

**Fix:** This should not happen with the current code. If it does:
1. Check the SQL in `electron/main.ts` has the `ON CONFLICT` clause
2. Delete and rebuild the database

---

### Error: Database File Locked

```
[IPC/save-transcript] ✗ Database error: {
  error: "database is locked",
  code: "SQLITE_BUSY",
  stack: "..."
}
```

**What this means:** Another process is using the database, or the database is corrupted.

**Fix:**
1. Close all instances of the app
2. Run `scripts/check-database.sh` to verify integrity
3. If corrupted, delete and rebuild the database

---

### Error: No IPC Logs Appear

**Symptoms:** You see `[transcription]` logs but no `[IPC/save-transcript]` logs.

**What this means:** The IPC message is not reaching the main process.

**Check:**
1. Verify `window.electronAPI.saveTranscript` exists:
   ```javascript
   console.log(typeof window.electronAPI.saveTranscript); // should be "function"
   ```
2. Check for errors in the Electron main process console (separate from DevTools)
3. Restart the app

---

## Testing the Flow

You can manually test persistence by opening the DevTools console and running:

```javascript
// Test save
await window.electronAPI.saveTranscript(
  1, // meetingId (must exist)
  "12:34:56", // timestamp
  "Test transcript", // text
  "Test translation" // translation (optional)
);

// Verify it was saved
const transcripts = await window.electronAPI.getTranscripts(1);
console.log(transcripts);
```

This should show:
```
[IPC/save-transcript] Received request: { meetingId: 1, timestamp: "12:34:56", ... }
[IPC/save-transcript] SQL executed successfully: { lastInsertRowid: ..., changes: 1 }
[IPC/save-transcript] ✓ Transcript saved successfully
```

Then the `getTranscripts` call should return your test transcript.

---

## Normal Recording Session Logs

During a typical 30-second recording session, you should see approximately:

- 5-10 `[transcription] partial transcript received:` (real-time updates)
- 2-5 `[transcription] stable transcript received:` (finalized chunks)
- 2-5 complete save flows (`Attempting to save` → `IPC received` → `SQL executed` → `Successfully saved`)
- If translation is enabled: 5-10 partial translations + 2-5 stable translations

All stable transcripts and translations should have corresponding successful save confirmations.

---

## Silence Warnings (Normal)

You may see logs like:

```
[transcription] Skipping transcript - only noise markers
```

**What this means:** The backend sent a transcript that only contains noise markers like `(silence)` or `(...)`.

**Action taken:** Ignored (intentional). These are not saved to the database.

This is normal and expected during pauses in speech.
