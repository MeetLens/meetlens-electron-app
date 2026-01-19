# Getting Started with MeetLens

This guide will walk you through setting up MeetLens from installation to your first meeting transcription.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18 or higher** - [Download here](https://nodejs.org/)
- **npm, yarn, or pnpm** - Comes with Node.js
- **macOS, Windows, or Linux** - Cross-platform support
- **Microphone** - Required for audio capture
- **Internet connection** - For transcription and translation APIs

## Installation

### 1. Install Dependencies

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd meetlens-electron-app
npm install
```

The `postinstall` script will automatically build the Electron main process.

### 2. Run the Application

**Development Mode (Recommended for first-time setup):**

```bash
npm run dev
```

This single command will:
- Build the Electron main process
- Start Vite dev server on `http://localhost:5173`
- Wait for Vite to be ready
- Launch Electron automatically with DevTools enabled

**Production Build:**

```bash
npm run build
npm start
```

## Initial Configuration

### System Permissions

On first launch, you'll need to grant permissions:

#### All Platforms
- **Microphone Access** - Required for capturing your voice
  - Grant when prompted by the operating system

#### macOS Only
- **Screen Recording Permission** - Required for system audio capture
  - Open **System Settings** → **Privacy & Security** → **Screen Recording**
  - Enable permission for your terminal app (in dev mode) or MeetLens (packaged app)
  - **Important:** System audio capture has limitations on macOS. See [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) for details.

#### Windows
- Microphone permissions are handled via Windows Privacy Settings
- No additional screen recording permission needed

#### Linux
- Permissions vary by distribution and desktop environment
- Grant microphone access when prompted

### API Configuration

MeetLens uses pre-configured backend services for transcription and translation. No individual API keys (ElevenLabs, DeepL, etc.) are required to be entered by the user. 

1. **Transcription**: Automatically handled by the production backend.
2. **Translation**: Handled by the backend via DeepL.

## Your First Meeting

### 1. Create a New Meeting

1. Click the **+** button in the sidebar
2. The meeting will be created and saved to the local SQLite database

### 2. Configure Translation (Optional)

1. Open **Settings** from the Top Bar
2. Select your target language from the dropdown
3. Click **Save Settings**

### 3. Start Recording

1. Click **Start Meeting** button
2. Grant microphone permission if prompted
3. On macOS, grant screen recording permission if prompted
4. The app will begin capturing:
   - Microphone audio (your voice)
   - System audio (desktop applications) - *see note below*

### 4. During the Meeting

- **View transcript** - Real-time transcription appears in the main panel
- **View translation** - Translated text appears below original (if language selected)
- **AI Summary** - Click the "AI Summary" button at any time to generate a summary
- **Monitor status** - Connection status is shown in the top right

### 5. End the Meeting

1. Click **Stop Meeting** button
2. Confirmation dialog for summary will appear
3. Transcript is automatically saved to the local database

### 6. Review Past Meetings

1. Click on any meeting in the sidebar
2. View complete transcript with timestamps
3. Read translated versions and AI-generated summaries
4. Manage meeting history from the sidebar (delete, select)

## Important Notes

### System Audio Capture (macOS)

**⚠️ Limitation:** System audio capture does NOT work in unsigned macOS builds due to macOS Sequoia security restrictions.

**What this means:**
- ✅ Microphone audio works perfectly
- ❌ Desktop audio (YouTube, Spotify, other apps) is blocked in packaged apps
- ✅ Both work in development mode

**Solutions:**

1. **For Development:** Run `npm run dev` - system audio works in dev mode
2. **For Production:** 
   - Sign the app with Apple Developer certificate ($99/year)
   - Install [BlackHole](https://existential.audio/blackhole/) virtual audio device (free)
   - Use microphone-only mode

See [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) for detailed setup instructions.

### Backend Connection

MeetLens connects to a production backend for real-time services:

1. **WebSocket**: Used for streaming audio and receiving transcripts/translations
2. **HTTP API**: Used for generating meeting summaries
3. **Status**: Monitor the "Connected" indicator in the top bar

## Supported Languages

MeetLens supports real-time translation to multiple languages including Turkish, English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, and others.

## Troubleshooting First Run

### No audio is captured
- Check microphone permissions in system settings
- Verify correct audio input device is selected
- Try restarting the application

### Transcription not working
- Check internet connection
- Look for error messages in console (Dev mode: View → Toggle Developer Tools)
- Ensure backend services are reachable

### Translation not working
- Ensure target language is selected in settings
- Check internet connection

### macOS: Screen recording permission issues
- Fully quit the application
- Remove app from Screen Recording permissions
- Re-add the app
- Restart terminal (in dev mode)
- Relaunch the application

For more troubleshooting help, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Next Steps

- **Explore Features:** Try different languages, review meeting summaries
- **Check Audio Quality:** Monitor RMS values in console to verify audio levels
- **Read Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- **Contribute:** Check [../AGENTS.md](../AGENTS.md) for development guidelines
- **Report Issues:** Use GitHub Issues for bug reports and feature requests

## Additional Resources

- **Main README:** [../README.md](../README.md) - Quick start overview
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- **System Audio:** [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) - macOS audio setup
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) - Technical documentation
- **Testing:** [TESTING.md](TESTING.md) - Running tests
