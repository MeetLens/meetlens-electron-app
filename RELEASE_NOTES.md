# MeetLens v1.0.0 - macOS Release

## 🎉 First Official Release

MeetLens is a desktop meeting transcription application with real-time translation capabilities.

### ✨ Features

- **Real-time Transcription** - Live meeting transcription powered by backend AI
- **Multi-language Support** - Real-time translation via DeepL integration
- **Meeting Management** - Create, view, and manage meeting sessions
- **Local Database** - SQLite-based storage for meetings and transcripts
- **Cross-Architecture Support** - Universal builds for Intel (x64) and Apple Silicon (arm64)

### 📦 Downloads

Choose the appropriate DMG for your Mac:

- **Intel Macs (x64)**: `MeetLens-1.0.0.dmg`
- **Apple Silicon (arm64)**: `MeetLens-1.0.0-arm64.dmg`

### 🔧 Installation

1. Download the appropriate DMG file for your Mac architecture
2. Open the DMG file
3. Drag MeetLens to your Applications folder
4. Launch MeetLens from Applications
5. Grant microphone permission when prompted
6. Grant screen recording permission when prompted (for system audio)

### ⚠️ Important Notes

#### System Audio Capture Limitation

**System audio capture does NOT work in this unsigned build** due to macOS Sequoia security restrictions.

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

- System audio capture blocked on macOS Sequoia for unsigned apps
- First launch may require allowing the app in System Settings > Privacy & Security

### 📝 Changelog

- Initial macOS deployment with DMG installers
- Support for Intel and Apple Silicon architectures
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
