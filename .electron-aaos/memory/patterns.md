# Learned Patterns & Optimizations

## Operational
- **Agent Delegation:** When delegating to `runAgentLoop`, always ensure `write_file` capability is explicitly checked, as agents default to read-only.
- **Voice Latency:** Long responses delay TTS. Keep Jarvis responses to 1-2 sentences.

## Technical
- **Puppeteer/News:** Bing scraping is brittle. Need to migrate to a proper News API or RSS aggregator.
- **Socket.IO:** Ensure the `squad/update` event payload aligns with the `SquadDashboard` interface (`status`, `task` vs `currentTask`).
