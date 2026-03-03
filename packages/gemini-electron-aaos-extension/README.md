# Electron AAOS Gemini CLI Extension

Brings Electron AAOS Electron AAOS multi-agent orchestration to Gemini CLI.

## Installation

```bash
gemini extensions install github.com/electron-aaos/electron-aaos-core/packages/gemini-electron-aaos-extension
```

Or manually copy to `~/.gemini/extensions/electron-aaos/`

## Features

### Agents
Access all Electron AAOS agents via `@agent-name`:
- `@dev` - Developer (Dex)
- `@architect` - Architect (Aria)
- `@qa` - QA Engineer (Quinn)
- `@pm` - Product Manager (Morgan)
- `@devops` - DevOps (Gage)
- And more...

### Commands
- `/electron-aaos-status` - Show system status
- `/electron-aaos-agents` - List available agents
- `/electron-aaos-validate` - Validate installation

### Hooks
Automatic integration with Electron AAOS memory and security:
- Session context loading
- Gotchas and patterns injection
- Security validation (blocks secrets)
- Audit logging

## Requirements

- Gemini CLI v0.26.0+
- Electron AAOS Core installed (`npx electron-aaos-core install`)
- Node.js 18+

## Cross-CLI Compatibility

Electron AAOS skills work identically in both Claude Code and Gemini CLI. Same agents, same commands, same format.

## License

MIT
