# System Audio Capture on macOS

## Current Status

**System audio capture is NOT working in the packaged unsigned app on macOS Sequoia (15.1+)**

This is a macOS security limitation, not a bug in the application.

## Why System Audio Doesn't Work

macOS Sequoia has strict security requirements for apps that want to capture system audio:

1. **Unsigned apps are blocked** - macOS blocks `getDisplayMedia()` API calls from unsigned applications
2. **Screen Recording permission is not enough** - Even with Screen Recording permission granted, unsigned apps cannot capture loopback audio
3. **Electron's handlers are bypassed** - The `setDisplayMediaRequestHandler` never gets called because macOS blocks the request before it reaches Electron

## Current Behavior

- ✅ **Microphone audio** - Works perfectly
- ❌ **System audio (loopback)** - Blocked by macOS in packaged app
- ✅ **Dev mode** - Both microphone and system audio work (because Electron.app is signed by Electron team)

## Common Issue: Silent Desktop Audio (Zero Audio Samples)

### Symptoms
- Audio track appears "live" but RMS/peak values are 0.0000
- Console shows: `Sent chunk X size: XXXXX ws state: 1 rms: 0.0000 peak: 0.0000`
- No transcription appears despite audio playing on desktop

### Root Cause
The app was using the **legacy Chrome `getUserMedia()` API with `chromeMediaSource: 'desktop'`**, which does **NOT** provide loopback audio on macOS. This creates an audio track that appears valid but contains only silence.

### Solution (Fixed in January 2026)
Changed to use the **modern `getDisplayMedia()` API**:

```javascript
// ❌ OLD (doesn't work for loopback audio on macOS)
const constraints = {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
    },
  },
};
const stream = await navigator.mediaDevices.getUserMedia(constraints);

// ✅ NEW (works with Electron's loopback audio handler)
const stream = await navigator.mediaDevices.getDisplayMedia({
  audio: true,  // Triggers setDisplayMediaRequestHandler with audio: 'loopback'
  video: { width: 1, height: 1 },
});
```

### Why This Works
1. `getDisplayMedia()` triggers Electron's `setDisplayMediaRequestHandler` in `main.ts`
2. The handler returns `audio: 'loopback'` which provides actual system audio
3. This leverages macOS's loopback audio feature enabled by the `MacLoopbackAudioForScreenShare` flag

### How to Verify the Fix
1. Start recording and play desktop audio
2. Check console logs for audio levels:
   - **Broken**: `rms: 0.0000 peak: 0.0000` (all zeros)
   - **Working**: `rms: 0.0096 peak: 0.0248` (non-zero values)
3. Transcription should appear within 2-3 seconds

### Code Location
- **Audio capture**: `src/services/audioService.ts` → `captureSystemAudio()`
- **Electron handler**: `electron/main.ts` → `configureDisplayMediaHandling()`
- **Feature flag**: `electron/main.ts` line 17 → `MacLoopbackAudioForScreenShare`

## Solutions

### Option 1: Sign the App (Recommended for Production)

Sign the app with an Apple Developer certificate:

1. Enroll in Apple Developer Program ($99/year)
2. Create a Developer ID Application certificate
3. Update `electron-builder.json`:
   ```json
   {
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)",
       "hardenedRuntime": true,
       "entitlements": "build/entitlements.mac.plist"
     }
   }
   ```
4. Rebuild: `npm run package`

### Option 2: Use BlackHole Virtual Audio Device

Install [BlackHole](https://existential.audio/blackhole/) to route system audio:

1. Download and install BlackHole (free, open-source)
2. Configure macOS Audio MIDI Setup:
   - Create a Multi-Output Device
   - Add BlackHole and your speakers
   - Set as default output
3. In MeetLens, select BlackHole as audio input
4. System audio will now be captured through BlackHole

### Option 3: Accept Microphone-Only Mode

For testing or personal use, the app works with microphone audio only:
- Participants' voices will be transcribed
- Your own voice will be transcribed
- Application audio (e.g., YouTube, Spotify) won't be captured

## Technical Details

The app attempts to use:
1. `navigator.mediaDevices.getDisplayMedia()` with `audio: true`
2. Electron's `setDisplayMediaRequestHandler` with `audio: 'loopback'`
3. macOS loopback audio feature flag: `MacLoopbackAudioForScreenShare`

All of these work in development mode but are blocked for unsigned packaged apps on macOS Sequoia.

## Verification

To verify system audio is working:
1. Start a recording
2. Play some music or video
3. Check the audio RMS values in console:
   - **Microphone only**: RMS ~0.001-0.01 (quiet)
   - **System audio working**: RMS ~0.05-0.2 (louder, varies with content)

## References

- [Electron desktopCapturer docs](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [BlackHole Audio Driver](https://existential.audio/blackhole/)
