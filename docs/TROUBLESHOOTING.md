# MeetLens Troubleshooting Guide

## Audio Issues

### Issue: No Desktop Audio Captured (Silent Audio / Zero RMS)

**Symptoms:**
- Recording starts successfully
- Microphone audio works (if speaking)
- Desktop audio (music, videos, apps) is not captured
- Console shows: `rms: 0.0000 peak: 0.0000` in audio chunk logs
- No transcription appears when playing desktop audio

**Diagnosis:**

1. **Check console logs** for audio levels:
   ```
   [BackendTranscription] Sent chunk 50 size: 10924 ws state: 1 rms: 0.0000 peak: 0.0000
   ```
   - If RMS and peak are **always 0.0000** → Desktop audio is not being captured
   - If RMS shows values like **0.0096** → Desktop audio is working

2. **Check the capture method** in `src/services/audioService.ts`:
   ```javascript
   // Look for this in captureSystemAudio():
   const stream = await navigator.mediaDevices.getDisplayMedia({
     audio: true,
     video: { width: 1, height: 1 }
   });
   ```

**Root Cause:**

The legacy Chrome API (`getUserMedia` with `chromeMediaSource: 'desktop'`) does NOT provide loopback audio on macOS. It creates an audio track that appears "live" but contains only silence.

**Solution:**

Use the modern `getDisplayMedia()` API which triggers Electron's loopback audio handler:

```javascript
// ❌ WRONG - Creates silent audio track
const constraints = {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
    },
  },
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
      maxWidth: 1,
      maxHeight: 1,
    },
  },
};
const stream = await navigator.mediaDevices.getUserMedia(constraints);

// ✅ CORRECT - Provides real loopback audio
const stream = await navigator.mediaDevices.getDisplayMedia({
  audio: true,  // Request loopback audio
  video: {
    width: 1,
    height: 1,
  },
});
```

**Why This Works:**
1. `getDisplayMedia()` triggers `setDisplayMediaRequestHandler` in `electron/main.ts`
2. The handler returns `{ video: screenSource, audio: 'loopback' }`
3. This leverages the `MacLoopbackAudioForScreenShare` feature flag
4. macOS provides actual system audio through the loopback device

**Verification Steps:**

1. Apply the fix in `src/services/audioService.ts`
2. Restart the app completely
3. Start recording
4. Play some desktop audio (YouTube, Spotify, etc.)
5. Check console logs - should show non-zero RMS values:
   ```
   [BackendTranscription] Sent chunk 50 size: 10924 ws state: 1 rms: 0.0096 peak: 0.0248
   ```
6. Transcription should appear within 2-3 seconds

**Related Files:**
- `src/services/audioService.ts` - Audio capture implementation
- `electron/main.ts` - Electron main process with loopback handler
- [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) - macOS system audio documentation

**Additional Notes:**
- This only works in **dev mode** or **signed apps** on macOS
- Unsigned packaged apps are blocked by macOS security
- See [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) for packaging/signing requirements

---

### Issue: "Screen recording permission denied"

**Symptoms:**
- Error message about screen recording permission
- App doesn't start recording
- macOS System Settings doesn't show permission prompt

**Solution:**

1. Open **System Settings** → **Privacy & Security** → **Screen Recording**
2. Enable permission for your terminal app (if running `npm run dev`)
3. Or enable for **Electron** (if running dev mode)
4. Or enable for **MeetLens** (if running packaged app)
5. Restart the app after granting permission

**Important:** 
- You may need to completely quit and restart the app
- Sometimes you need to restart your terminal as well

For more details, see [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md).

---

### Issue: WebSocket connection failed

**Symptoms:**
- Console shows: `WebSocket connection error`
- No transcription appears
- Backend connection indicator shows red/disconnected

**Diagnosis:**

Check the WebSocket URL in console logs:
```
[BackendTranscription] Connecting to: ws://localhost:8000/transcribe
```

**Solutions:**

1. **Backend not running:**
   ```bash
   cd meetlens-backend
   uvicorn main:app --reload
   ```

2. **Wrong backend URL:**
   - Check `src/config.ts` for `TRANSCRIPTION_WS_URL`
   - Should match your backend WebSocket endpoint
   - For local: `ws://localhost:8000/transcribe`
   - For production: `wss://your-domain.com/transcribe`

3. **Backend crash/error:**
   - Check backend terminal for Python errors
   - Ensure all requirements are installed: `pip install -r requirements.txt`
   - Check if port 8000 is already in use

---

### Issue: No transcription appearing

**Symptoms:**
- Audio is being captured (non-zero RMS values)
- WebSocket is connected
- But no text appears in the UI

**Diagnosis:**

1. Check backend logs for errors
2. Check browser console for WebSocket messages:
   ```
   📥 Received message: transcript_partial {...}
   ```

**Common Causes:**

1. **Backend Whisper not configured:**
   - Check backend has OpenAI API key or local Whisper setup
   - See backend documentation for configuration

2. **Audio format mismatch:**
   - Backend expects: `pcm_s16le_16k_mono`
   - Check console for: `Declared backend audio_format: pcm_s16le_16k_mono`
   - See [ARCHITECTURE.md](ARCHITECTURE.md) for audio format details

3. **Network/firewall blocking WebSocket:**
   - Try accessing backend directly: `http://localhost:8000/docs`
   - Check browser network tab for WebSocket traffic

---

## Build Issues

### Issue: Build fails on macOS

**Solution:**

Ensure you have required dependencies:
```bash
npm install
npm run build
```

If signing fails, update `electron-builder.json` to skip signing for local builds.

For more build configuration details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Getting Help

1. Check console logs in DevTools (View → Toggle Developer Tools)
2. Check backend logs in terminal
3. Review documentation:
   - [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) - Audio capture on macOS
   - [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and configuration
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
   - [../README.md](../README.md) - Quick start guide

---

## Debug Mode

To enable verbose logging:

1. Open DevTools Console (View → Toggle Developer Tools)
2. Look for logs prefixed with:
   - `[AudioCapture]` - Audio capture service
   - `[BackendTranscription]` - WebSocket transcription
   - `[Main]` - Electron main process

3. Check audio levels in real-time:
   - RMS values should be > 0.001 when audio is playing
   - Peak values should vary based on audio volume

For understanding the audio pipeline, see [ARCHITECTURE.md](ARCHITECTURE.md).
