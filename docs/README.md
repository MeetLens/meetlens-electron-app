# MeetLens Documentation

Welcome to the MeetLens documentation! This guide will help you navigate all available documentation.

## Quick Links

- **[Getting Started](GETTING_STARTED.md)** - Detailed setup, configuration, and first-run guide
- **[Architecture](ARCHITECTURE.md)** - System design, technology stack, and project structure
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[System Audio](SYSTEM_AUDIO.md)** - macOS audio capture setup and limitations
- **[Testing](TESTING.md)** - Testing strategy and commands
- **[Design Language System](DLS.md)** - UI/UX guidelines and component specifications
- **[Tasks](tasks/)** - Task management and tracking by type (Features, Bugs, Refactors, etc.)

## Documentation Overview

### For Getting Started

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Complete setup guide including prerequisites, installation, permissions setup, and first meeting walkthrough |
| [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) | macOS-specific audio capture setup, `getDisplayMedia()` API usage, BlackHole configuration, and app signing requirements |

### For Development

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technology stack, project structure, module organization, data flow diagrams, and audio pipeline architecture |
| [TESTING.md](TESTING.md) | Testing framework (Vitest), test commands, environment setup, and testing best practices |
| [../AGENTS.md](../AGENTS.md) | Repository guidelines for AI agents and developers (coding style, commit conventions, build commands) |

### For Troubleshooting

| Document | Description |
|----------|-------------|
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Comprehensive troubleshooting guide for audio issues, WebSocket connection problems, transcription failures, and build issues |
| [SYSTEM_AUDIO.md](SYSTEM_AUDIO.md) | Specific guidance for macOS audio capture issues, RMS verification, and permission problems |

### For Design & UI

| Document | Description |
|----------|-------------|
| [DLS.md](DLS.md) | Design Language System with color palette, typography rules, spacing system, component specifications, and interaction patterns |

## Documentation Structure

```
meetlens-electron-app/
├── README.md                    # Quick start & overview
├── AGENTS.md                    # Repository guidelines
├── CHANGELOG.md                 # Version history
└── docs/
    ├── README.md               # This file - documentation index
    ├── GETTING_STARTED.md      # Detailed setup guide
    ├── ARCHITECTURE.md         # System architecture
    ├── TROUBLESHOOTING.md      # Troubleshooting guide
    ├── SYSTEM_AUDIO.md         # macOS audio setup
    ├── TESTING.md              # Testing guide
    ├── DLS.md                  # Design system
    └── tasks/                  # Task management and tracking
        ├── feature/            # Feature implementation tasks
        ├── bug/                # Bug fix tasks
        ├── refactor/           # Refactoring tasks
        ├── research/           # Technical research tasks
        └── release/            # Release management tasks
```

## Contributing to Documentation

When updating documentation:

1. **Single source of truth** - Each topic should have one primary document
2. **Cross-reference, don't duplicate** - Link to detailed docs rather than copying content
3. **Keep it current** - Update docs when code changes
4. **Use clear structure** - Follow existing formatting and organization patterns

## Need Help?

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review [GETTING_STARTED.md](GETTING_STARTED.md) for setup questions
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Refer to [../AGENTS.md](../AGENTS.md) for development guidelines
