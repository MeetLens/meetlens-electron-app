# MeetLens v1.0.0 - Multi-Platform Release

## 🎉 First Official Release

MeetLens is a desktop meeting transcription application with real-time translation capabilities.

### ✨ Features

- **Real-time Transcription** - Live meeting transcription powered by backend AI
- **Multi-language Support** - Real-time translation via DeepL integration
- **Meeting Management** - Create, view, and manage meeting sessions
- **Local Database** - SQLite-based storage for meetings and transcripts
- **Cross-Platform Support** - Available for macOS, Windows, and Linux
- **Cross-Architecture Support** - Universal builds for Intel (x64) and Apple Silicon (arm64)

### 📦 Downloads

#### macOS (Tested ✅)

Choose the appropriate DMG for your Mac:
- **Intel Macs (x64)**: `MeetLens-1.0.0.dmg`
- **Apple Silicon (arm64)**: `MeetLens-1.0.0-arm64.dmg`

#### Windows (⚠️ **UNTESTED**)

**WARNING: Windows builds are provided but have NOT been tested. Use at your own risk.**

- **Windows x64 Installer**: `MeetLens-1.0.0-x64.exe`
- **Windows x86 Installer**: `MeetLens-1.0.0-ia32.exe`
- **Windows x64 Portable**: `MeetLens-1.0.0-x64.exe` (portable version)

#### Linux (⚠️ **UNTESTED**)

**WARNING: Linux builds are provided but have NOT been tested. Use at your own risk.**

- **Linux x64 AppImage**: `MeetLens-1.0.0-x64.AppImage`
- **Linux arm64 AppImage**: `MeetLens-1.0.0-arm64.AppImage`
- **Debian x64**: `MeetLens-1.0.0-x64.deb`
- **Debian arm64**: `MeetLens-1.0.0-arm64.deb`

### 🔧 Installation

#### macOS
1. Download the appropriate DMG file for your Mac architecture
2. Open the DMG file
3. Drag MeetLens to your Applications folder
4. Launch MeetLens from Applications
5. Grant microphone permission when prompted
6. Grant screen recording permission when prompted (for system audio)

#### Windows
1. Download the installer (`.exe`) or portable version
2. Run the installer and follow the prompts
3. Grant microphone permission when prompted

#### Linux
1. Download the AppImage or `.deb` file
2. For AppImage: Make executable (`chmod +x MeetLens-*.AppImage`) and run
3. For Debian: Install with `sudo dpkg -i MeetLens-*.deb`
4. Grant microphone permission when prompted

### ⚠️ Important Notes

#### Windows and Linux Builds (UNTESTED)

**WARNING:** Windows and Linux builds are **completely untested** and provided as-is. They may not work correctly or at all. macOS is the only tested platform.

If you encounter issues on Windows or Linux, please report them in [GitHub Issues](https://github.com/MeetLens/meetlens-electron-app/issues).

#### System Audio Capture Limitation (macOS)

**System audio capture does NOT work in this unsigned macOS build** due to macOS Sequoia security restrictions.

**Current behavior:**
- ✅ Microphone audio - Works perfectly
- ❌ System audio (loopback) - Blocked by macOS in packaged app
- ✅ Dev mode - Both microphone and system audio work

**Solutions:**

1. **Sign the app** (requires Apple Developer account $99/year)
2. **Install BlackHole virtual audio device** (free)
   - Download from [existential.audio/blackhole](https://existential.audio/blackhole/)
   - Configure Audio MIDI Setup to route system audio
3. **Use microphone-only mode** (current default)

For detailed information, see [SYSTEM_AUDIO_README.md](https://github.com/MeetLens/meetlens-electron-app/blob/main/SYSTEM_AUDIO_README.md)

### 🐛 Known Issues

- **Windows/Linux**: Completely untested, may have bugs or not work at all
- **macOS**: System audio capture blocked on macOS Sequoia for unsigned apps
- **macOS**: First launch may require allowing the app in System Settings > Privacy & Security

### 📝 Changelog

- Initial multi-platform deployment
- macOS DMG installers (tested)
- Windows NSIS installers and portable builds (untested)
- Linux AppImage and Debian packages (untested)
- Support for Intel (x64) and Apple Silicon (arm64) architectures
- Microphone audio capture with permission handling
- Meeting database with SQLite
- Real-time transcription via WebSocket backend
- DeepL translation integration
- Meeting summary generation

### 🙏 Acknowledgments

Built with Electron, React, and TypeScript.

---

**Full documentation:** [GitHub Repository](https://github.com/MeetLens/meetlens-electron-app)

**Report issues:** [GitHub Issues](https://github.com/MeetLens/meetlens-electron-app/issues)
