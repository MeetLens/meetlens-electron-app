# MeetLens

A desktop meeting transcription application with real-time translation.

## Features

- **Real-time Transcription**: Capture system audio and microphone input simultaneously
- **Live Translation**: Translate transcripts to 12+ languages in real-time
- **Meeting Management**: Save and review past meetings with timestamps
- **Audio Mixing**: Combine system audio and microphone using Web Audio API
- **SQLite Storage**: Persistent storage of meetings and transcripts
- **ElevenLabs Integration**: High-quality speech-to-text transcription
- **Translation Support**: Google Translate and DeepL integration

## Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

This will automatically build the Electron main process via the postinstall script.

### Running the Application

**Development Mode (Recommended):**

Simply run:
```bash
npm run dev
```

This single command will:
- Build the Electron main process
- Start Vite dev server on http://localhost:5173
- Wait for Vite to be ready
- Launch Electron automatically

The app will open with DevTools enabled for debugging.

### Production Build

```bash
npm run build
npm start
```

## API Keys Required

### ElevenLabs API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Get your API key from the dashboard
3. Enter it in Settings within the app

### Translation API Key

**Option 1: Google Translate**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Cloud Translation API
3. Create credentials (API key)
4. Enter it in Settings

**Option 2: DeepL**
1. Sign up at [DeepL](https://www.deepl.com/pro-api)
2. Get your API key
3. Enter it in Settings and check "Use DeepL"

## Usage

1. **Configure API Keys**: Click the Settings button and enter your API keys
2. **Create a Meeting**: Click the + button in the sidebar
3. **Start Recording**: Click "Start Meeting" to begin transcription
4. **Select Language**: Choose your target language for translation
5. **Stop Recording**: Click "Stop Meeting" when done
6. **Review Meetings**: Click on past meetings in the sidebar to view transcripts

## Audio Permissions

The app requires:
- Microphone access
- System audio capture (via Electron's desktopCapturer)

Grant these permissions when prompted for full functionality.

## Supported Languages

- Turkish
- English
- Spanish
- French
- German
- Italian
- Portuguese
- Russian
- Japanese
- Korean
- Chinese
- Arabic

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **better-sqlite3**: Local database
- **Web Audio API**: Audio capture and mixing
- **ElevenLabs**: Speech-to-text transcription
- **Google Translate / DeepL**: Real-time translation

## Project Structure

```
meetlens/
├── electron/          # Electron main process
│   ├── main.ts       # Main process entry
│   └── preload.ts    # Preload script for IPC
├── src/              # React application
│   ├── components/   # React components
│   ├── services/     # Audio, transcription, translation services
│   ├── types/        # TypeScript type definitions
│   ├── App.tsx       # Main App component
│   ├── main.tsx      # React entry point
│   └── index.css     # Global styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Troubleshooting

### No Audio Captured
- Ensure microphone permissions are granted
- Check system audio source selection
- Try restarting the application

### Transcription Not Working
- Verify ElevenLabs API key is correct
- Check internet connection
- Look for connection status indicator

### Translation Not Working
- Verify translation API key is correct
- Ensure selected language is supported
- Check API quota limits

## License

MIT
