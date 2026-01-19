# MeetLens

A desktop meeting transcription application with real-time translation capabilities.

## Features

- **Real-time Transcription** - Capture system audio and microphone input simultaneously
- **Live Translation** - Translate transcripts to 12+ languages in real-time
- **Meeting Management** - Save and review past meetings with timestamps
- **SQLite Storage** - Persistent storage of meetings and transcripts
- **Cross-Platform** - Available for macOS, Windows, and Linux

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

```bash
npm install
```

This will automatically build the Electron main process.

### Running the Application

**Development Mode:**

```bash
npm run dev
```

This single command will build the main process, start the Vite dev server, and launch Electron automatically.

**Production Build:**

```bash
npm run build
npm start
```

## API Keys Required

### ElevenLabs (Required)
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Get your API key
3. Enter it in Settings within the app

### Translation API (Optional)
Choose either:
- **Google Translate** - Get API key from [Google Cloud Console](https://console.cloud.google.com)
- **DeepL** - Get API key from [DeepL](https://www.deepl.com/pro-api)

## Basic Usage

1. **Configure API Keys** - Click Settings and enter your API keys
2. **Create a Meeting** - Click the + button in the sidebar
3. **Start Recording** - Click "Start Meeting" to begin transcription
4. **Select Language** - Choose your target language for translation
5. **Stop Recording** - Click "Stop Meeting" when done

## Audio Permissions

Grant these permissions when prompted:
- **Microphone access** - Required for all platforms
- **Screen Recording** (macOS only) - Required for system audio capture

**macOS Note:** System audio capture has limitations on unsigned builds. See [docs/SYSTEM_AUDIO.md](docs/SYSTEM_AUDIO.md) for details.

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Detailed setup and configuration guide
- **[Architecture](docs/ARCHITECTURE.md)** - Technical documentation and system design
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[System Audio](docs/SYSTEM_AUDIO.md)** - macOS audio capture setup
- **[Testing](docs/TESTING.md)** - Testing guide and commands
- **[Design System](docs/DLS.md)** - UI/UX guidelines
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## Supported Languages

Turkish, English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic

## Technology Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **better-sqlite3** - Local database
- **Web Audio API** - Audio capture and mixing

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete technical details.

## Development

### Commands

```bash
npm run dev          # Development mode
npm run build        # Production build
npm test             # Run tests
npm run test:watch   # Watch mode
npm run package      # Create installers
```

### Project Structure

```
meetlens-electron-app/
├── electron/          # Electron main process
├── src/               # React application
│   ├── components/    # UI components
│   ├── services/      # Business logic
│   └── worklets/      # Audio processing
├── docs/              # Documentation
└── dist/              # Build output
```

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Troubleshooting

### No Audio Captured
- Check microphone permissions
- Verify system audio source selection
- See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### Transcription Not Working
- Verify ElevenLabs API key
- Check internet connection
- Ensure backend is running (if using local backend)

### Translation Not Working
- Verify translation API key
- Check API quota limits

For more help, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Contributing

See [AGENTS.md](AGENTS.md) for repository guidelines, coding style, and development practices.

## License

MIT
