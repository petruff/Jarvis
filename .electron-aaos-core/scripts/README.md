# Electron AAOS Scripts - Legacy Directory

> **Note**: This directory now contains only legacy/migration scripts and a few active utilities.
> Most scripts have been migrated to the modular structure (Story 6.16).

## Current Structure

Scripts are now organized by domain across three locations:

| Location | Purpose |
|----------|---------|
| `.electron-aaos-core/core/` | Core framework modules (elicitation, session) |
| `.electron-aaos-core/development/scripts/` | Development scripts (greeting, workflow, hooks) |
| `.electron-aaos-core/infrastructure/scripts/` | Infrastructure scripts (git config, validators) |
| `.electron-aaos-core/scripts/` (this directory) | Legacy utilities and migration scripts |

## Scripts in This Directory

### Active Scripts

| Script | Description |
|--------|-------------|
| `session-context-loader.js` | Loads session context for agents |
| `command-execution-hook.js` | Hook for command execution |
| `test-template-system.js` | Internal test utility for templates |

### Migration Scripts

| Script | Description |
|--------|-------------|
| `batch-migrate-*.ps1` | Batch migration utilities |
| `migrate-framework-docs.sh` | Documentation migration script |
| `validate-phase1.ps1` | Phase 1 validation script |

## Script Path Mapping

If you're looking for a script that was previously here, use this mapping:

```text
OLD PATH                                      NEW PATH
-----------------------------------------     ------------------------------------------
.electron-aaos-core/scripts/context-detector.js      → .electron-aaos-core/core/session/context-detector.js
.electron-aaos-core/scripts/elicitation-engine.js    → .electron-aaos-core/core/elicitation/elicitation-engine.js
.electron-aaos-core/scripts/elicitation-session-manager.js → .electron-aaos-core/core/elicitation/session-manager.js
.electron-aaos-core/scripts/greeting-builder.js      → .electron-aaos-core/development/scripts/greeting-builder.js
.electron-aaos-core/scripts/workflow-navigator.js    → .electron-aaos-core/development/scripts/workflow-navigator.js
.electron-aaos-core/scripts/agent-exit-hooks.js      → .electron-aaos-core/development/scripts/agent-exit-hooks.js
.electron-aaos-core/scripts/git-config-detector.js   → .electron-aaos-core/infrastructure/scripts/git-config-detector.js
.electron-aaos-core/scripts/project-status-loader.js → .electron-aaos-core/infrastructure/scripts/project-status-loader.js
.electron-aaos-core/scripts/electron-aaos-validator.js        → .electron-aaos-core/infrastructure/scripts/electron-aaos-validator.js
.electron-aaos-core/scripts/tool-resolver.js         → .electron-aaos-core/infrastructure/scripts/tool-resolver.js
.electron-aaos-core/scripts/output-formatter.js      → .electron-aaos-core/infrastructure/scripts/output-formatter.js
```

## Configuration

The `scriptsLocation` in `core-config.yaml` now uses a modular structure:

```yaml
scriptsLocation:
  core: .electron-aaos-core/core
  development: .electron-aaos-core/development/scripts
  infrastructure: .electron-aaos-core/infrastructure/scripts
  legacy: .electron-aaos-core/scripts  # This directory
```

## Usage Examples

### Loading Core Scripts

```javascript
// Elicitation Engine (from core)
const ElicitationEngine = require('./.electron-aaos-core/core/elicitation/elicitation-engine');

// Context Detector (from core)
const ContextDetector = require('./.electron-aaos-core/core/session/context-detector');
```

### Loading Development Scripts

```javascript
// Greeting Builder
const GreetingBuilder = require('./.electron-aaos-core/development/scripts/greeting-builder');

// Workflow Navigator
const WorkflowNavigator = require('./.electron-aaos-core/development/scripts/workflow-navigator');
```

### Loading Infrastructure Scripts

```javascript
// Project Status Loader
const { loadProjectStatus } = require('./.electron-aaos-core/infrastructure/scripts/project-status-loader');

// Git Config Detector
const GitConfigDetector = require('./.electron-aaos-core/infrastructure/scripts/git-config-detector');
```

### Loading Legacy Scripts (this directory)

```javascript
// Session Context Loader
const sessionLoader = require('./.electron-aaos-core/scripts/session-context-loader');
```

## Related Documentation

- [Core Config](../core-config.yaml) - scriptsLocation configuration
- [Core Module](../core/README.md) - Core framework modules
- [Development Scripts](../development/scripts/README.md) - Development utilities
- [Infrastructure Scripts](../infrastructure/scripts/README.md) - Infrastructure utilities

## Migration History

| Date | Story | Change |
|------|-------|--------|
| 2025-12-18 | 6.16 | Deleted deprecated scripts, updated documentation |
| 2025-01-15 | 2.2 | Initial script reorganization to modular structure |

---

**Last updated:** 2025-12-18 - Story 6.16 Scripts Path Consolidation
