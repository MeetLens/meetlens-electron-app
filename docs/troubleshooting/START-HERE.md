# Transcript Persistence Debugging - START HERE

If your transcripts are not being saved to the database, follow these steps in order.

## Step 1: Rebuild the App

The persistence code was recently updated. Make sure you have the latest build:

```bash
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
npm run build
```

## Step 2: Delete the Old Database

The database schema was updated to support UPSERT operations. Old databases need to be recreated:

```bash
# macOS:
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db

# Linux:
rm ~/.config/meetlens-electron-app/meetlens.db

# Windows:
# Delete: %APPDATA%\meetlens-electron-app\meetlens.db
```

**Don't worry** - The database will be automatically recreated with the correct schema when you start the app.

## Step 3: Start the App

```bash
npm run dev
```

The DevTools console will open automatically.

## Step 4: Test Recording

1. **Create a new meeting** (click the + button)
2. **Start recording**
3. **Speak for 10-15 seconds**
4. **Stop recording**

## Step 5: Check the Console

In the DevTools console, filter by typing: `[transcription]`

### You Should See This (Success):

```
[transcription] stable transcript received: { text: "your speech", ... }
[transcription] Attempting to save stable transcript to database: { meetingId: 1, timestamp: "...", ... }
[IPC/save-transcript] Received request: { meetingId: 1, ... }
[IPC/save-transcript] SQL executed successfully: { lastInsertRowid: 1, changes: 1 }
[IPC/save-transcript] ✓ Transcript saved successfully
[transcription] ✓ Successfully saved stable transcript to database: { ... }
```

**If you see all of these, it's working!**

### You See Errors (✗):

Go to **Step 6** below.

### You See Nothing:

Check backend connection:
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

If not, start the backend:
```bash
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-backend
source .venv/bin/activate  # or activate your virtual environment
fastapi dev main.py
```

Then try recording again.

## Step 6: Run Database Integrity Check

```bash
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
./scripts/check-database.sh
```

Look for:
```
✓ Database file exists
✓ Database integrity: OK
✓ meetings table exists
✓ transcripts table exists
✓ idx_transcripts_meeting_timestamp index exists
```

**If any item has a ✗ (X mark):**

Delete the database and restart (see Step 2).

## Step 7: Verify Data Persisted

After recording, close the app completely and restart it:

```bash
npm run dev
```

1. **Click on your meeting in the sidebar**
2. **Check if transcripts are still there**

**If transcripts are gone:**

Open the console and run:
```javascript
const transcripts = await window.electronAPI.getTranscripts(1); // Use your meeting ID
console.log(transcripts);
```

If this returns an empty array, the data was not saved.

Go to [QUICK-DEBUG-CHECKLIST.md](./QUICK-DEBUG-CHECKLIST.md) for detailed debugging.

## Common Quick Fixes

### Fix 1: Complete Reset

```bash
# Stop the app
# Delete everything
rm ~/Library/Application\ Support/meetlens-electron-app/meetlens.db
cd /Users/askincekim/Documents/Projects/meetlens/meetlens-electron-app
rm -rf node_modules dist
npm install
npm run build
npm run dev
```

### Fix 2: Manual Database Test

In DevTools console:
```javascript
// Create test meeting
const meeting = await window.electronAPI.createMeeting("Test");

// Save test transcript
await window.electronAPI.saveTranscript(meeting.id, "12:34:56", "Test text", "Test translation");

// Verify
const transcripts = await window.electronAPI.getTranscripts(meeting.id);
console.log(transcripts); // Should show the test transcript
```

If this works but real transcripts don't save, the issue is in the recording flow, not the database.

### Fix 3: Check Backend is Sending Data

In the backend terminal, you should see:
```
[Backend] Sending stable transcript: ...
```

If not, the backend isn't sending transcripts. Check backend logs for errors.

## Still Not Working?

Go through these guides in order:

1. **[QUICK-DEBUG-CHECKLIST.md](./QUICK-DEBUG-CHECKLIST.md)** - Step-by-step debugging
2. **[console-log-reference.md](./console-log-reference.md)** - Understand the logs
3. **[transcript-persistence-not-working.md](./transcript-persistence-not-working.md)** - Complete guide

## Need More Help?

When reporting the issue, provide:

1. **Console logs:**
   - Filter by `[transcription]` and copy all logs
   - Filter by `[IPC]` and copy all logs

2. **Database check output:**
   ```bash
   ./scripts/check-database.sh
   ```

3. **Environment:**
   - Operating system and version
   - Node.js version: `node --version`
   - Did you delete the old database? (Yes/No)

4. **Manual test result:**
   ```javascript
   // Run in console and copy the output
   const meeting = await window.electronAPI.createMeeting("Test");
   await window.electronAPI.saveTranscript(meeting.id, "12:34:56", "Test", "Test");
   const transcripts = await window.electronAPI.getTranscripts(meeting.id);
   console.log(transcripts);
   ```

With this information, the issue can be diagnosed quickly.
