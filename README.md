# MeetLens

A desktop meeting transcription application with real-time translation capabilities.

## Features

- **Real-time Transcription** - Capture system audio and microphone input simultaneously
- **Live Translation** - Instant translation with DeepL support
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

## Basic Usage

1. **Create a Meeting** - Click the + button in the sidebar
2. **Select Language** - Choose your target language for translation in Settings
3. **Start Recording** - Click "Start Meeting" to begin transcription and translation
4. **Stop Recording** - Click "Stop Meeting" when done
5. **AI Summary** - Generate a structured summary of your meeting with one click

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

Support for multiple languages including Turkish, English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, and more.

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
- Ensure backend services are reachable
- Check internet connection

### Translation Not Working
- Ensure target language is correctly selected in Settings
- Verify internet connection

For more help, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Contributing

See [AGENTS.md](AGENTS.md) for repository guidelines, coding style, and development practices.

## License

MIT
