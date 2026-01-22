# Debugging Summary: Transcript Persistence

This document summarizes the debugging enhancements added to help diagnose transcript persistence issues.

## What Was Added

### 1. Enhanced Logging in Frontend (`src/hooks/useTranscription.ts`)

**Added detailed logging for stable transcripts:**
- Before attempting to save
- Success confirmation with details
- Error logging with full stack traces

**Added detailed logging for translations:**
- Before attempting to save translation updates
- Success confirmation
- Error logging with full details

**Key log points:**
- Lines 285-310: Stable transcript save logging
- Lines 373-395: Translation update logging

### 2. Enhanced Logging in IPC Handler (`electron/main.ts`)

**Added detailed logging for the `save-transcript` IPC handler:**
- Request received with parameters
- SQL execution results
- Success/error status with details

**Key log points:**
- Lines 243-279: Complete save-transcript handler with logging

### 3. Troubleshooting Documentation

**Created comprehensive guides:**

1. **[transcript-persistence-not-working.md](./transcript-persistence-not-working.md)**
   - Complete troubleshooting guide
   - Step-by-step diagnosis
   - Common issues and solutions
   - Database schema verification
   - Backend connection checks

2. **[console-log-reference.md](./console-log-reference.md)**
   - Complete reference of all log messages
   - What each log means
   - Expected flow for successful saves
   - Error pattern explanations
   - Manual testing procedures

3. **[QUICK-DEBUG-CHECKLIST.md](./QUICK-DEBUG-CHECKLIST.md)**
   - Quick reference checklist
   - Step-by-step debugging process
   - Common issues with immediate fixes
   - Manual test procedures

### 4. Database Integrity Checker (`scripts/check-database.sh`)

**Automated database verification script:**
- Checks database file exists
- Verifies schema correctness
- Checks for required unique index
- Shows data statistics
- Identifies orphaned records
- Provides actionable recommendations

**Usage:**
```bash
./scripts/check-database.sh
```

### 5. Updated README

Added reference to transcript persistence troubleshooting in the main README.

---

## How to Use These Tools

### For the User (Developer Testing)

1. **Start the app in dev mode:**
   ```bash
   npm run dev
   ```

2. **Open DevTools console** (opens automatically in dev mode)

3. **Start recording and speak** for 5-10 seconds

4. **Filter console logs:**
   - Type `[transcription]` in the filter box to see only transcript-related logs
   - Type `[IPC]` to see only IPC handler logs

5. **Check for the expected flow:**
   ```
   [transcription] stable transcript received
   [transcription] Attempting to save stable transcript to database
   [IPC/save-transcript] Received request
   [IPC/save-transcript] SQL executed successfully
   [IPC/save-transcript] ✓ Transcript saved successfully
   [transcription] ✓ Successfully saved stable transcript to database
   ```

6. **If errors appear:**
   - Check the error details in the logs
   - Run `./scripts/check-database.sh` to verify database integrity
   - Consult [QUICK-DEBUG-CHECKLIST.md](./QUICK-DEBUG-CHECKLIST.md)

### For Database Issues

1. **Run the integrity checker:**
   ```bash
   ./scripts/check-database.sh
   ```

2. **If schema is incorrect:**
   ```bash
   # Delete the database (macOS)
   rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

   # Restart the app - database will be recreated
   npm run dev
   ```

3. **Manually inspect database:**
   ```bash
   sqlite3 ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
   ```

   Then run:
   ```sql
   .schema transcripts
   SELECT * FROM transcripts ORDER BY id DESC LIMIT 10;
   ```

---

## Log Message Reference

### Success Indicators

Look for these checkmarks (✓) in the logs:

```
✓ [IPC/save-transcript] ✓ Transcript saved successfully
✓ [transcription] ✓ Successfully saved stable transcript to database
✓ [translation] ✓ Successfully saved translation to database
```

### Error Indicators

Look for these X marks (✗):

```
✗ [transcription] ✗ Failed to persist stable transcript
✗ [translation] ✗ Failed to persist translation
✗ [IPC/save-transcript] ✗ Database error
```

---

## Common Issues and Quick Fixes

### Issue: No logs at all
**Fix:** Backend not connected. Check `curl http://localhost:8000/health`

### Issue: Database error in IPC logs
**Fix:** Delete database and restart:
```bash
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
npm run dev
```

### Issue: SQL succeeds but data not persisting
**Fix:** Run integrity checker:
```bash
./scripts/check-database.sh
```

---

## Files Modified

1. `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/src/hooks/useTranscription.ts`
   - Added detailed logging before/after `saveTranscript` calls
   - Lines 285-310, 373-395

2. `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/electron/main.ts`
   - Enhanced `save-transcript` IPC handler with logging
   - Lines 243-279

3. `/Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app/README.md`
   - Added reference to transcript persistence troubleshooting

4. **New files created:**
   - `docs/troubleshooting/transcript-persistence-not-working.md`
   - `docs/troubleshooting/console-log-reference.md`
   - `docs/troubleshooting/QUICK-DEBUG-CHECKLIST.md`
   - `docs/troubleshooting/DEBUGGING-SUMMARY.md` (this file)
   - `scripts/check-database.sh`

---

## Next Steps for the User

1. **Build and run the app:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Test recording and check console logs**

3. **If issues persist:**
   - Follow [QUICK-DEBUG-CHECKLIST.md](./QUICK-DEBUG-CHECKLIST.md)
   - Run `./scripts/check-database.sh`
   - Consult [transcript-persistence-not-working.md](./transcript-persistence-not-working.md)

4. **Report the issue with:**
   - Console logs (filtered by `[transcription]` and `[IPC]`)
   - Output from `./scripts/check-database.sh`
   - Operating system and version

---

## Technical Details

### Why the Unique Index is Critical

The `save-transcript` IPC handler uses an `UPSERT` pattern:

```sql
INSERT INTO transcripts (meeting_id, timestamp, text, translation)
VALUES (?, ?, ?, ?)
ON CONFLICT(meeting_id, timestamp)
DO UPDATE SET
  text = excluded.text,
  translation = excluded.translation
```

The `ON CONFLICT` clause requires a unique index on `(meeting_id, timestamp)`.

**Without this index:**
- The `ON CONFLICT` clause has no effect
- Translation updates create duplicate rows
- Persistence may fail with constraint errors

**The database integrity checker verifies this index exists.**

### Database Schema

**Expected schema:**

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

**Old databases (created before the unique index was added) will not have the index.**

**Solution:** Delete and recreate the database.

---

## Logging Format

All logs follow this format:

```
[category] message: { structured_data }
```

**Categories:**
- `[transcription]` - Frontend transcription logic
- `[translation]` - Frontend translation logic
- `[IPC/save-transcript]` - Main process IPC handler

**Status indicators:**
- `✓` - Success
- `✗` - Error
- No symbol - Informational

**Structured data:**
- All logs include relevant context (meetingId, timestamp, text length, etc.)
- Error logs include stack traces

---

## Performance Impact

The added logging has minimal performance impact:

- Logs are only generated when transcripts are received (2-5 times per 30-second recording)
- Structured data is lazily evaluated
- No synchronous operations added
- No additional database queries

The logging can be disabled by removing the `console.log` statements if needed.
