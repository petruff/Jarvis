# Decision Log

## [2026-02-19] Adoption of Electron AAOS Electron AAOS v4.0
**Context:** The user requested a "sovereign intelligence" orchestration layer.
**Decision:** We implemented the JARVIS.md protocol, converting the workspace into a multi-agent Electron AAOS.
**Reasoning:** To provide a structured, file-based communication protocol that persists across sessions, enabling "Chief of Staff" level autonomy.

## [2026-02-19] Voice Locking
**Context:** Jarvis was using inconsistent voices.
**Decision:** Hardcoded ElevenLabs Voice ID `cydNMBtVvlgLGYp5M3ZB`.
**Reasoning:** Consistent brand identity for the AI interface.

## [2026-02-19] Dynamic Dashboarding
**Context:** The UI only showed hardcoded agents.
**Decision:** Updated `SquadDashboard.tsx` to iterate over the `agents` state object.
**Reasoning:** To ensure new/specialist agents are visible to the user without code changes.
