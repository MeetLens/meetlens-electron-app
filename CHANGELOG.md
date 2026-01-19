# Changelog

All notable changes to MeetLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-XX

### Added
- **Real-time Transcription** - Live meeting transcription powered by backend AI
- **Multi-language Support** - Real-time translation via DeepL integration for 12+ languages
- **Meeting Management** - Create, view, and manage meeting sessions
- **Local Database** - SQLite-based storage for meetings and transcripts
- **Cross-Platform Support** - Available for macOS, Windows, and Linux
- **Cross-Architecture Support** - Universal builds for Intel (x64) and Apple Silicon (arm64)
- Microphone audio capture with permission handling
- Meeting database with SQLite
- Real-time transcription via WebSocket backend
- DeepL and Google Translate integration
- Meeting summary generation

### Platform Support

#### macOS (Tested ✅)
- Intel Macs (x64): `MeetLens-1.0.0.dmg`
- Apple Silicon (arm64): `MeetLens-1.0.0-arm64.dmg`

#### Windows (⚠️ UNTESTED)
- Windows x64 Installer: `MeetLens-1.0.0-x64.exe`
- Windows x86 Installer: `MeetLens-1.0.0-ia32.exe`
- Windows x64 Portable: `MeetLens-1.0.0-x64.exe` (portable version)

#### Linux (⚠️ UNTESTED)
- Linux x64 AppImage: `MeetLens-1.0.0-x64.AppImage`
- Linux arm64 AppImage: `MeetLens-1.0.0-arm64.AppImage`
- Debian x64: `MeetLens-1.0.0-x64.deb`
- Debian arm64: `MeetLens-1.0.0-arm64.deb`

### Known Issues

#### System Audio Capture (macOS)
**⚠️ Important:** System audio capture does NOT work in this unsigned macOS build due to macOS Sequoia security restrictions.

**Current behavior:**
- ✅ Microphone audio - Works perfectly
- ❌ System audio (loopback) - Blocked by macOS in packaged app
- ✅ Dev mode - Both microphone and system audio work

**Solutions:**
1. **Sign the app** (requires Apple Developer account $99/year)
2. **Install BlackHole virtual audio device** (free) - [Download](https://existential.audio/blackhole/)
3. **Use microphone-only mode** (current default)

For detailed information, see [docs/SYSTEM_AUDIO.md](docs/SYSTEM_AUDIO.md)

#### Platform Testing
- **Windows and Linux builds are completely untested** and may have bugs or not work at all
- macOS is the only tested platform
- First launch on macOS may require allowing the app in System Settings > Privacy & Security

### Installation Notes

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed installation instructions for your platform.

### Technical Details

- Built with Electron, React, and TypeScript
- Uses Web Audio API for audio capture and mixing
- SQLite for local data storage
- WebSocket for real-time transcription
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete technical documentation

### Troubleshooting

For common issues and solutions, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## Version History Format

This changelog follows the format:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

[1.0.0]: https://github.com/MeetLens/meetlens-electron-app/releases/tag/v1.0.0
