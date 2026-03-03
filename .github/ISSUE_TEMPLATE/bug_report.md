---
name: Bug report
about: Create a report to help us improve Electron AAOS-FullStack
title: '[BUG] '
labels: ['bug', 'needs-triage']
assignees: ''

---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 📦 Package Information
Which Electron AAOS-FullStack package is affected?
- [ ] @electron-aaos/electron-aaos-core/workspace
- [ ] @electron-aaos/electron-aaos-core/core
- [ ] @electron-aaos/electron-aaos-core/memory
- [ ] @electron-aaos/electron-aaos-core/security
- [ ] @electron-aaos/electron-aaos-core/performance
- [ ] @electron-aaos/electron-aaos-core/telemetry

**Version:** (e.g., 4.31.0)

## 🔄 Steps to Reproduce
Steps to reproduce the behavior:
1. Install package '...'
2. Run command '...'
3. Call function '...'
4. See error

## 💥 Expected Behavior
A clear and concise description of what you expected to happen.

## 📱 Actual Behavior
A clear and concise description of what actually happened.

## 📋 Code Example
```javascript
// Minimal code example that reproduces the issue
const { Electron AAOS } = require('@electron-aaos/electron-aaos-core/workspace');

const electron-aaos = new Electron AAOS();
// ... rest of your code
```

## 📄 Error Output
```
Paste any error messages or stack traces here
```

## 🖥️ Environment
**System Information:**
- OS: [e.g., Windows 11, Ubuntu 22.04, macOS 14]
- Node.js version: [e.g., 20.11.0]
- NPM version: [e.g., 10.2.4]
- Package manager: [npm/yarn/pnpm]

**Electron AAOS Configuration:**
```javascript
// Your Electron AAOS configuration (remove sensitive data)
const config = {
  // ...
};
```

## 📊 Health Check Output
If possible, run `electron-aaos.healthCheck()` and paste the output:
```javascript
// Health check results
```

## 🔍 Additional Context
Add any other context about the problem here.

## 🎯 Priority
How critical is this bug for your use case?
- [ ] Critical - Blocking production use
- [ ] High - Significant impact on functionality
- [ ] Medium - Minor impact, workaround available
- [ ] Low - Enhancement or nice-to-have fix

## ✅ Checklist
- [ ] I have searched existing issues to avoid duplicates
- [ ] I have provided all requested information
- [ ] I have tested with the latest version
- [ ] I can consistently reproduce this issue
