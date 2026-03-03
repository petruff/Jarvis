# JARVIS EVOLUTION — MASTER IMPLEMENTATION PROMPT
## Objective: Make JARVIS Superior to Both OpenClaw + AIOS Synkra Combined
### Target Agent: @antigravity / @dev + @architect
**Date:** 2026-02-26

---

## 1. COMPLETE COMPETITIVE ANALYSIS

### 1.1 What OpenClaw Is

OpenClaw is a local-first personal AI assistant that operates via a WebSocket Gateway (ws://localhost:18789) as a single control plane. It routes messages from 13+ messaging platforms (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage/BlueBubbles, Teams, Matrix, Zalo, WebChat) to isolated agent sessions. Key differentiators:

- **Canvas/A2UI**: Agent-driven visual workspace (push/reset/eval/snapshot) rendered on desktop + mobile
- **Voice Wake + Talk Mode**: Always-on passive wake word detection + continuous voice overlay
- **Device Nodes**: iOS/Android/macOS companion apps that expose native device capabilities (camera, screen recording, location, notifications) to the agent
- **ClawHub**: Auto-discovery skill registry — agents search and install skills dynamically
- **Multi-channel Unified Inbox**: 13+ channels all routed through one agent runtime
- **DM Pairing Security**: Unknown senders get a pairing code before any message is processed
- **Session Tools**: `sessions_list`, `sessions_history`, `sessions_send` for cross-channel agent coordination
- **Group Isolation**: Each group/channel gets its own isolated session context

### 1.2 What AIOS Synkra Is

AIOS Synkra is a self-modifying AI development framework using Agentic Agile. It orchestrates agents across the full software development lifecycle. Key differentiators:

- **ADE (Autonomous Development Engine)**: 7-epic system — Worktree Manager, Migration, Spec Pipeline, 13-step Execution Engine with self-critique, Recovery System, 10-phase QA Evolution, Memory Layer
- **Two-Phase Agentic Planning**: Analyst + PM + Architect collaborate to produce PRD and Architecture docs BEFORE development starts
- **Story-Driven Development**: SM transforms plans into hyperdetailed story files with embedded context, task checkboxes, implementation guidance
- **Pre/Post Tool Hooks**: Agent lifecycle events (pre-tool, post-tool, session events) bound to IDE capabilities
- **Worktree Manager**: Git branch isolation for each feature/task
- **Constitution with Principles**: CLI First → Observability Second → UI Third (formally enforced)
- **Formal Recovery System**: Automatic failure recovery with state persistence
- **Multi-IDE**: Claude Code, Cursor, Codex, Gemini CLI, AntiGravity all configured
- **10-phase QA Evolution**: Structured review beyond simple pass/fail

### 1.3 What JARVIS Already Has (SUPERIORITY INVENTORY)

JARVIS is ALREADY ahead of both on these dimensions:

| Capability | JARVIS Status | OpenClaw | AIOS |
|-----------|--------------|----------|------|
| MetaBrain DAG Planner | ✅ Full | ❌ None | ❌ Partial |
| DNA Auto-Mutation (nightly) | ✅ Full | ❌ None | ❌ None |
| Genesis Engine (dynamic agents) | ✅ Full | ❌ None | ❌ None |
| Confidence Engine (risk/approval) | ✅ Full | ❌ None | ❌ None |
| OODA Consciousness Loop (5min) | ✅ Full | ❌ None | ❌ None |
| 5-module Nightly Learning Cycle | ✅ Full | ❌ None | ❌ None |
| Sentinel Cybersecurity Squad | ✅ Full | ❌ None | ❌ None |
| Episodic Memory (LanceDB vector) | ✅ Full | ❌ None | ❌ Partial |
| Semantic Memory (Goals/OKRs) | ✅ Full | ❌ None | ❌ None |
| Redis Streams Agent Bus | ✅ Full | ❌ None | ❌ None |
| Advanced RAG Mid-Thought | ✅ Full | ❌ None | ❌ None |
| Trust Tier Tool Registry | ✅ Full | ❌ None | ❌ None |
| Desktop Native Automation | ✅ Full | ✅ Partial | ❌ None |
| Vision AI (screenshot analysis) | ✅ Full | ✅ Partial | ❌ None |
| Quality Gate (75/100 retry) | ✅ Full | ❌ None | ✅ Partial |
| Morning Briefing + Telegram UX | ✅ Full | ❌ None | ❌ None |
| Multi-LLM Provider Routing | ✅ Full | ✅ Partial | ❌ None |
| Agent DNA (5-layer persona) | ✅ Full | ❌ None | ❌ Partial |
| Squad-to-Squad Message Bus | ✅ Full | ❌ None | ❌ None |
| Skill Loader (SKILL.md) | ✅ Full | ✅ Similar | ✅ Similar |

### 1.4 GAPS: What JARVIS Is MISSING

**From OpenClaw — Critical Gaps:**
1. ❌ **Multi-Channel Expansion**: Slack, Discord, Google Chat, Signal, iMessage, Teams, Matrix, WebChat
2. ❌ **Canvas/A2UI System**: Agent-driven visual workspace with JS eval, push/reset/snapshot
3. ❌ **Voice Wake**: Passive always-on wake word detection
4. ❌ **Talk Mode**: Continuous voice conversation overlay (PTT + continuous mode)
5. ❌ **ClawHub-style Skill Registry**: Dynamic skill auto-discovery + installation
6. ❌ **Webhook Receivers**: Inbound webhook automation endpoints
7. ❌ **Gmail/Email Integration**: Email reading, Pub/Sub triggers, auto-response
8. ❌ **Group Session Isolation**: Per-group conversation context separation
9. ❌ **DM Pairing Security**: Approval-code system for unknown senders
10. ❌ **Session Inter-Agent Tools**: `sessions_list`, `sessions_send` to coordinate across channels
11. ❌ **Device Pairing API**: Formal device node registration + capability advertisement

**From AIOS — Critical Gaps:**
12. ❌ **Worktree Manager**: Git worktree isolation for autonomous code tasks
13. ❌ **Spec Pipeline**: Requirements → PRD → Architecture docs BEFORE coding
14. ❌ **13-step Self-Critique Execution Loop**: Formal checkpoint system inside agent.ts
15. ❌ **Failure Recovery System**: Auto-retry with state checkpoint for crashed missions
16. ❌ **10-phase QA Evolution**: Structured quality review beyond 75/100 gate
17. ❌ **Pre/Post Tool Hooks**: `onBeforeTool`, `onAfterTool`, `onSessionStart`, `onSessionEnd` lifecycle events in agent loop
18. ❌ **Story File Checkbox Tracking**: JARVIS has tasks but not formal story file annotation
19. ❌ **Two-Phase Planning Gate**: Force PRD + Architecture review BEFORE any forge/dev execution on complex missions
20. ❌ **Persistent Pattern Memory**: Cross-mission pattern learning stored for future iterations

---

## 2. MASTER IMPLEMENTATION PROMPT (FOR ANTIGRAVITY)

Below is the exact implementation specification. Execute ALL of these as a cohesive upgrade to JARVIS, making it the definitive superplatform that surpasses both OpenClaw and AIOS.

---

```
SYSTEM: You are @dev (Dex) operating inside JARVIS Platform.
You are implementing JARVIS EVOLUTION v6.0 — the definitive upgrade that combines and surpasses both OpenClaw and AIOS Synkra.

BASE PATH: C:\Users\ppetr\OneDrive\Desktop\Jarvis-Platform\
BACKEND: packages/jarvis-backend/src/
GATEWAY: jarvis-gateway/src/
UI: jarvis-ui/src/

ARCHITECTURE RULE: CLI First. Every feature must work 100% via API before any UI.
NO INVENTION: Implement exactly what is specified below. No additional abstractions.

═══════════════════════════════════════════════════════════
PHASE A — MULTI-CHANNEL EXPANSION (from OpenClaw)
═══════════════════════════════════════════════════════════

[A1] packages/jarvis-backend/src/channels/slack.ts
Create Slack channel integration using @slack/bolt.
- Bot token + signing secret from config
- Listen for app_mention events (group mode) and direct_message events
- Route to CommandHandler exactly like Telegram/WhatsApp
- Reply with text + optional voice audio (base64)
- Support /status, /new, /reset slash commands in Slack
- Config keys: jarvis.slack_bot_token, jarvis.slack_signing_secret
- Register in index.ts startup sequence

[A2] packages/jarvis-backend/src/channels/discord.ts
Create Discord channel integration using discord.js.
- Bot token from config
- Listen for messageCreate events (DMs + guild mentions)
- Guild mode: only respond when @bot mentioned OR in designated channel
- Route to CommandHandler
- Embed-style responses (Discord rich embeds for squad results)
- Config keys: jarvis.discord_bot_token, jarvis.discord_guild_id

[A3] packages/jarvis-backend/src/channels/email.ts
Create Email/Gmail integration.
- Use Nodemailer (SMTP) for sending + IMAP/Gmail API for receiving
- Poll inbox every 5 minutes for messages from allowlisted senders
- Route email body as mission to CommandHandler
- Reply via email with mission result
- Support for email-triggered webhooks (Gmail Pub/Sub via push endpoint)
- Config keys: jarvis.gmail_user, jarvis.gmail_app_password, jarvis.email_allowlist

[A4] packages/jarvis-backend/src/channels/webchat.ts
Create HTTP-served WebChat channel.
- Serve a minimal real-time chat interface at /webchat
- WebSocket-based message exchange (Socket.IO namespace /webchat)
- Route to CommandHandler
- Display squad streaming output in real-time (token by token)
- Support voice input/output via browser MediaRecorder API
- Show agent avatars and squad indicators

[A5] packages/jarvis-backend/src/channels/webhook.ts
Create Inbound Webhook receiver.
- Register dynamic webhook endpoints: POST /webhooks/:webhookId
- Each webhook maps to a trigger mission template (stored in .jarvis/webhooks.json)
- Validate HMAC signatures for security
- Webhook payload injected as context into mission
- Support GitHub webhooks (push, PR, issue), Stripe events, generic POST
- Admin endpoints: POST /api/webhooks/register, DELETE /api/webhooks/:id, GET /api/webhooks

[A6] packages/jarvis-backend/src/sessions/sessionManager.ts
Create unified session manager for multi-channel coordination.
- Sessions indexed by channelId + userId combination
- Each session stores: conversationHistory, lastActivity, activeMissions, preferences
- Session isolation: groups get separate session from DMs
- Session tools for cross-channel agent use:
  - query_session(channelId): get session state
  - list_sessions(): all active sessions
  - send_to_channel(channelId, message): dispatch message to any channel
- Add session tools to INTERNAL_MEMORY_TOOLS in agent.ts
- Persist session state to .jarvis/sessions/ directory

[A7] packages/jarvis-backend/src/security/pairingManager.ts
Create DM pairing security system.
- Unknown senders get a 6-digit pairing code sent back
- Message is quarantined (not processed) until code confirmed
- Confirmation: user sends the pairing code back
- After confirmation: sender added to runtime allowlist for session
- Admin override: POST /api/pairing/approve/:senderId
- Config: jarvis.require_pairing (boolean, default true for new contacts)
- Store approved pairs in .jarvis/approved-pairs.json

═══════════════════════════════════════════════════════════
PHASE B — CANVAS/A2UI WORKSPACE (from OpenClaw)
═══════════════════════════════════════════════════════════

[B1] packages/jarvis-backend/src/canvas/canvasEngine.ts
Create Canvas engine — agent-driven dynamic UI workspace.
- Canvas state: { html: string, js: string, css: string, snapshot?: string }
- Operations:
  - canvas_push(html, css?, js?): replace canvas content
  - canvas_reset(): clear canvas to blank state
  - canvas_eval(jsCode): evaluate JS expression in canvas context
  - canvas_snapshot(): capture current visual state as base64 PNG
  - canvas_append(html): append content to existing canvas
- State persisted to .jarvis/canvas-state.json
- Broadcast updates via Socket.IO event 'canvas/update'
- Add canvas tools to INTERNAL_MEMORY_TOOLS in agent.ts

[B2] jarvis-ui/src/components/Canvas.tsx
Create Canvas UI component.
- Render canvas content in an iframe sandbox
- Subscribe to 'canvas/update' Socket.IO events
- Auto-refresh when canvas state changes
- Screenshot button (calls canvas_snapshot)
- Reset button
- Full-screen toggle
- Shown as tab in main dashboard next to Kanban
- Mobile-responsive layout

[B3] jarvis-ui/src/components/CanvasToolbar.tsx
Canvas toolbar with quick actions.
- Push HTML template (select from presets: blank, dashboard, report, form)
- Eval JS directly from toolbar
- Copy canvas URL for sharing
- Embed mode toggle (hides toolbar for clean presentation)

═══════════════════════════════════════════════════════════
PHASE C — VOICE EVOLUTION (from OpenClaw)
═══════════════════════════════════════════════════════════

[C1] packages/jarvis-backend/src/voice/wakeDetector.ts
Create Voice Wake system.
- Passive wake word detection: "Hey JARVIS" or "JARVIS"
- Use @picovoice/porcupine-node for on-device wake word detection (no cloud)
- On wake: play activation tone + open microphone for command
- Command timeout: 10 seconds of silence = auto-close mic
- Forward captured audio to existing STT pipeline (OpenAI Whisper)
- Socket.IO events: 'voice/wake_detected', 'voice/listening', 'voice/processing'
- Config: jarvis.wake_word_enabled (boolean), jarvis.wake_word_sensitivity (0.0-1.0)
- Fallback: if porcupine unavailable, use keyword polling via mic input

[C2] packages/jarvis-backend/src/voice/talkMode.ts
Create Talk Mode — continuous voice conversation.
- When enabled: after each TTS response, automatically re-open microphone
- User speaks → STT → mission → TTS → re-open mic (loop)
- 3 seconds silence = end of utterance
- Visual indicator: 'voice/talk_mode_active' Socket.IO event
- Exit: say "stop" / "exit" / "nevermind" OR click UI button
- Mode toggle: POST /api/voice/talk-mode/start, POST /api/voice/talk-mode/stop
- Integrate with existing voice.ts + whatsapp.ts STT pipeline

[C3] jarvis-ui/src/components/VoiceControl.tsx
Voice control panel in UI.
- Microphone button with animated pulse when listening
- Wake word status indicator (ON/OFF toggle)
- Talk Mode toggle button
- Audio waveform visualizer (Web Audio API)
- PTT (Push-to-Talk) keyboard shortcut: Space when focused
- Last transcript display

═══════════════════════════════════════════════════════════
PHASE D — JARVIS HUB (Skill Registry) (from OpenClaw ClawHub)
═══════════════════════════════════════════════════════════

[D1] packages/jarvis-backend/src/hub/jarvisHub.ts
Create JarvisHub — dynamic skill registry with auto-discovery.
- Registry index: .jarvis/hub/registry.json (list of available skills with metadata)
- Remote fetch: GET https://raw.githubusercontent.com/[your-repo]/jarvis-skills/main/index.json
- Auto-install skill: download SKILL.md to ~/.antigravity-skills/ OR local skills/
- Agent can search skills at reasoning time using search_skills(query) tool
- Agent can install skills: install_skill(skillId) tool
- Both tools added to INTERNAL_MEMORY_TOOLS in agent.ts
- CLI commands: npx electron-aaos-core hub:list, hub:install <id>, hub:search <query>
- Config: jarvis.hub_enabled, jarvis.hub_registry_url
- Admin API: GET /api/hub/skills, POST /api/hub/install/:skillId

[D2] packages/jarvis-backend/src/hub/skillDiscovery.ts
Auto-discovery engine.
- At agent loop init: analyze mission prompt, suggest relevant skills
- Call hub to search for skills matching mission keywords
- Auto-inject relevant skill content into system prompt (like SkillLoader but dynamic)
- Cache discovery results in .jarvis/hub/cache.json with 24h TTL

═══════════════════════════════════════════════════════════
PHASE E — AUTONOMOUS DEVELOPMENT ENGINE (from AIOS ADE)
═══════════════════════════════════════════════════════════

[E1] packages/jarvis-backend/src/ade/worktreeManager.ts
Create Git Worktree Manager — branch isolation for code tasks.
- When Forge squad executes a coding mission, create a git worktree:
  - git worktree add .jarvis/worktrees/<missionId> -b ade/<missionId>
- Agent executes code changes inside the worktree (isolated from main)
- On success: create PR or merge (configurable via confidence engine)
- On failure: delete worktree, no main branch contamination
- Expose as tool: create_worktree(missionId), commit_worktree(missionId, message), merge_worktree(missionId), delete_worktree(missionId)
- Add to INTERNAL_MEMORY_TOOLS for forge squad only
- Config: jarvis.ade_worktrees_enabled (boolean)

[E2] packages/jarvis-backend/src/ade/specPipeline.ts
Create Two-Phase Planning Gate — Spec Pipeline.
- For missions where squadId = 'forge' AND complexity > threshold:
  1. Phase 1 (SPEC): Route mission first to Oracle squad → generate PRD document
  2. Phase 2 (ARCH): Route PRD to Produto squad → generate Architecture doc
  3. Phase 3 (APPROVE): Display PRD + Architecture to founder via Telegram/UI for approval
  4. Phase 4 (BUILD): Only after approval, route to Forge with full spec context injected
- Threshold: mission prompt contains keywords like 'build', 'implement', 'create', 'develop' + estimated complexity from MetaBrain
- Store spec in .jarvis/specs/<missionId>/{prd.md, architecture.md}
- Approvals: POST /api/specs/:missionId/approve, POST /api/specs/:missionId/reject
- Inject spec context as prefix in forge squad execution prompt

[E3] packages/jarvis-backend/src/ade/selfCritiqueLoop.ts
Create 13-Step Self-Critique Execution Loop.
Inject into agent.ts runAgentLoop() — JARVIS's existing agent loop — the following checkpoints:
Step 1: PARSE — understand mission, identify expected deliverable type
Step 2: RECALL — call recall_memory to check past similar missions
Step 3: PLAN — outline approach in scratchpad (not output)
Step 4: SPEC_CHECK — if spec file exists for this mission, verify alignment
Step 5: CONTEXT_INJECT — call query_goals() for strategic alignment
Step 6: EXECUTE — run primary LLM call with full context
Step 7: SELF_REVIEW — agent reviews own output: "Is this complete? Are there gaps?"
Step 8: GAP_ANALYSIS — identify what's missing vs. mission requirements
Step 9: ENHANCEMENT — if gaps found, run second LLM call to fill gaps
Step 10: QUALITY_CHECK — compute quality score (1-100) using existing QualityGate
Step 11: RETRY_OR_PASS — if score < 75, retry from step 6 with gap analysis injected
Step 12: FILE_DELIVERY — extract and save any code/files to workspace
Step 13: MEMORY_WRITE — write episode to episodic memory with quality score
Implementation: wrap existing runAgentLoop in selfCritiqueLoop.ts middleware that intercepts after each LLM response and applies the checkpoint logic.

[E4] packages/jarvis-backend/src/ade/recoverySystem.ts
Create Mission Recovery System.
- Checkpoint state saved to .jarvis/recovery/<missionId>.json at each step
- On system restart: scan recovery dir for incomplete missions
- Resume from last checkpoint instead of restarting from zero
- Checkpoint includes: { missionId, step, partialResult, context, attempts }
- Max retries per mission: 3 (configurable)
- After max retries: escalate to founder via Telegram + mark FAILED
- Recovery sweep on startup: index.ts calls recoverySystem.resumeIncomplete() after init
- API: GET /api/recovery/pending, POST /api/recovery/:id/resume, POST /api/recovery/:id/abandon

[E5] packages/jarvis-backend/src/ade/qaEvolution.ts
Create 10-Phase QA Evolution (enhance existing QualityGate).
Current QualityGate: single score threshold. Replace with 10 phases:
Phase 1: COMPLETENESS — does output address all requirements?
Phase 2: ACCURACY — factual/technical correctness check
Phase 3: CONSISTENCY — internal consistency (no contradictions)
Phase 4: STYLE — matches JARVIS voice/persona DNA
Phase 5: SECURITY — SENTINEL-style scan for vulnerabilities (for code output)
Phase 6: PERFORMANCE — for code: identify obvious performance anti-patterns
Phase 7: TESTABILITY — for code: is it testable? Are edge cases handled?
Phase 8: DOCUMENTATION — for code: are key functions documented?
Phase 9: FOUNDER_ALIGNMENT — does output align with company goals/OKRs?
Phase 10: FINAL_SCORE — weighted composite (Completeness*30%, Accuracy*25%, rest*5% each)
Each phase returns a 0-100 score. Final weighted score replaces current quality score.
Phases 5-8 only run for Forge/Nexus squad output.
Implement as qaEvolution.evaluate(output, missionContext, squadId) → QAReport.
Integrate into orchestrator.ts at the quality gate checkpoint.

[E6] packages/jarvis-backend/src/ade/hookSystem.ts
Create Agent Lifecycle Hook System (from AIOS pre/post tool hooks).
Implement hook registration and firing:

export type HookType =
  | 'onSessionStart'    // Before first agent call in a mission
  | 'onBeforeTool'      // Before each MCP/internal tool call
  | 'onAfterTool'       // After each tool call (with result)
  | 'onBeforeLLM'       // Before each LLM call
  | 'onAfterLLM'        // After each LLM call (with response)
  | 'onMissionComplete' // When mission reaches DONE state
  | 'onMissionFailed'   // When mission fails/aborts
  | 'onQualityFail'     // When quality gate fails
  | 'onMemoryWrite'     // When episode written to episodic memory

Built-in hooks to register:
- onBeforeTool('*'): log tool call to telemetry, apply trust tier check
- onAfterTool('*'): log result, update mission context
- onMissionComplete('*'): trigger agentBus publish, update episodic memory
- onMissionFailed('*'): trigger recovery system, notify Telegram
- onQualityFail('*'): log to error archaeology, trigger retry
- onBeforeLLM('forge'): check if worktree is active, inject spec context

Hook registration API:
  hookSystem.register(hookType, squadFilter, handler)
  hookSystem.fire(hookType, context)

Integrate hookSystem.fire() into agent.ts at each relevant checkpoint.

═══════════════════════════════════════════════════════════
PHASE F — PATTERN MEMORY (from AIOS Memory Layer)
═══════════════════════════════════════════════════════════

[F1] packages/jarvis-backend/src/memory/patternMemory.ts
Create Persistent Pattern Memory.
- Extracts recurring patterns from episodic memory after each mission
- Pattern types: successful_approach, common_failure, optimization, tool_sequence
- Stored in SQLite (semantic.ts db): CREATE TABLE patterns (id, type, description, squad, frequency, lastSeen, examples)
- After each mission completion: analyze result with LLM to extract patterns
- Pattern injection: at agent prompt construction, inject top-3 relevant patterns
- Pattern decay: patterns not seen in 30 days drop in priority score
- API: GET /api/patterns, POST /api/patterns/extract (force extraction)
- New internal tool: recall_patterns(query, squad?) → top patterns for this type of mission

═══════════════════════════════════════════════════════════
PHASE G — UI EVOLUTION
═══════════════════════════════════════════════════════════

[G1] jarvis-ui/src/components/ChannelSelector.tsx
Multi-channel status panel.
- Show each channel (WhatsApp, Telegram, Slack, Discord, Email, WebChat) with online/offline badge
- Active message count per channel
- Click to open session list for that channel
- Quick send: compose window to send a message to any connected channel

[G2] jarvis-ui/src/components/MissionTimeline.tsx
Replace current OutputStream with a structured Mission Timeline.
- Vertical timeline of steps: SPEC → PLAN → EXECUTE → QUALITY → DELIVER
- Each step shows: elapsed time, agent responsible, tool calls made
- Expandable step detail (shows full LLM input/output)
- Color coding: green=done, yellow=in_progress, red=failed, gray=pending
- Show self-critique loop checkpoints inline

[G3] jarvis-ui/src/components/PatternInsights.tsx
Pattern Memory visualization panel.
- Top patterns discovered from episodic memory
- Pattern frequency chart (recharts bar chart)
- Per-squad pattern breakdown
- Ability to manually bookmark/pin a pattern
- "What JARVIS learned this week" summary section

[G4] jarvis-ui/src/components/ADEPanel.tsx
Autonomous Development Engine control panel.
- Active worktrees list (branch, mission, status)
- Pending spec approvals (PRD + Architecture preview)
- QA Evolution scores breakdown (10 phases shown as gauge chart)
- Approve/Reject buttons for specs and worktree merges
- Recovery queue (failed missions that can be resumed)

═══════════════════════════════════════════════════════════
PHASE H — CONFIGURATION EXPANSION
═══════════════════════════════════════════════════════════

[H1] Add all new config keys to packages/jarvis-backend/src/config/loader.ts:

channels:
  slack_bot_token: string | null
  slack_signing_secret: string | null
  discord_bot_token: string | null
  discord_guild_id: string | null
  gmail_user: string | null
  gmail_app_password: string | null
  email_allowlist: string[]
  webchat_enabled: boolean (default: true)
  webchat_port: number (default: 3001)

security:
  require_pairing: boolean (default: true)
  pairing_code_ttl_minutes: number (default: 30)
  webhook_hmac_secret: string | null

voice:
  wake_word_enabled: boolean (default: false)
  wake_word_sensitivity: number (default: 0.5)
  talk_mode_silence_ms: number (default: 3000)

ade:
  worktrees_enabled: boolean (default: false)
  spec_pipeline_enabled: boolean (default: true)
  spec_complexity_threshold: number (default: 0.6)
  self_critique_enabled: boolean (default: true)
  recovery_max_retries: number (default: 3)
  qa_evolution_enabled: boolean (default: true)

hub:
  enabled: boolean (default: true)
  registry_url: string (default: null, uses local only)
  auto_discover: boolean (default: true)

canvas:
  enabled: boolean (default: true)

[H2] Update .env.example with all new config keys and documentation comments.

═══════════════════════════════════════════════════════════
PHASE I — API ENDPOINTS SUMMARY (ALL NEW)
═══════════════════════════════════════════════════════════

Add to packages/jarvis-backend/src/index.ts:

# Multi-Channel
POST /api/channels/slack/send
POST /api/channels/discord/send
POST /api/channels/email/send
GET  /api/channels/status

# Sessions
GET  /api/sessions
GET  /api/sessions/:channelId
POST /api/sessions/:channelId/reset
POST /api/sessions/send

# Security
GET  /api/pairing/pending
POST /api/pairing/approve/:senderId
POST /api/webhooks/register
DELETE /api/webhooks/:id
GET  /api/webhooks

# Canvas
GET  /api/canvas/state
POST /api/canvas/push
POST /api/canvas/reset
POST /api/canvas/eval
GET  /api/canvas/snapshot

# ADE
GET  /api/specs
GET  /api/specs/:missionId
POST /api/specs/:missionId/approve
POST /api/specs/:missionId/reject
GET  /api/worktrees
POST /api/worktrees/:missionId/merge
POST /api/worktrees/:missionId/delete
GET  /api/recovery/pending
POST /api/recovery/:id/resume
POST /api/recovery/:id/abandon
GET  /api/qa/report/:missionId

# Hub
GET  /api/hub/skills
POST /api/hub/install/:skillId
GET  /api/hub/search?q=<query>

# Voice
POST /api/voice/wake/enable
POST /api/voice/wake/disable
POST /api/voice/talk-mode/start
POST /api/voice/talk-mode/stop

# Patterns
GET  /api/patterns
GET  /api/patterns/:squad
POST /api/patterns/extract

═══════════════════════════════════════════════════════════
PHASE J — NEW INTERNAL TOOLS (agent.ts additions)
═══════════════════════════════════════════════════════════

Add to INTERNAL_MEMORY_TOOLS array in agent.ts:

1. search_skills(query) — search JarvisHub for relevant skills
2. install_skill(skillId) — install a skill from hub
3. recall_patterns(query, squad?) — get recurring patterns from pattern memory
4. send_to_channel(channelId, message) — send message to any connected channel
5. list_sessions() — list all active sessions across channels
6. canvas_push(html, css?, js?) — update canvas workspace
7. canvas_eval(jsCode) — evaluate JS in canvas context
8. canvas_snapshot() — capture canvas as image
9. create_worktree(missionId) — git worktree for code isolation (forge only)
10. commit_worktree(missionId, message) — commit changes in worktree
11. merge_worktree(missionId) — merge worktree to main (requires confidence check)
12. query_patterns(query) — find relevant learned patterns for current mission
13. register_webhook(path, template) — create a new inbound webhook endpoint
14. read_email(limit?) — read recent emails from allowlisted senders
15. send_email(to, subject, body) — send email via configured SMTP

═══════════════════════════════════════════════════════════
PHASE K — DEPENDENCY ADDITIONS (package.json)
═══════════════════════════════════════════════════════════

packages/jarvis-backend/package.json — add:
"@slack/bolt": "^3.x"
"discord.js": "^14.x"
"nodemailer": "^6.x"
"imap-simple": "^5.x"
"node-cron": "already exists"
"simple-git": "^3.x"        (for worktree manager)
"@picovoice/porcupine-node": "^3.x"  (wake word — optional, graceful fallback)
"ws": "^8.x"                (for webchat WebSocket server)

═══════════════════════════════════════════════════════════
IMPLEMENTATION ORDER (PRIORITY SEQUENCE)
═══════════════════════════════════════════════════════════

SPRINT 1 (Week 1) — Core ADE upgrades that make JARVIS immediately smarter:
  1. E3 — 13-Step Self-Critique Loop (enhances every mission)
  2. E4 — Recovery System (prevents mission data loss)
  3. E6 — Hook System (enables observability of all agent actions)
  4. E5 — 10-Phase QA Evolution (better quality for all squads)
  5. F1 — Pattern Memory (cross-mission learning)

SPRINT 2 (Week 2) — Channel Expansion:
  6. A1 — Slack integration
  7. A2 — Discord integration
  8. A3 — Email/Gmail integration
  9. A4 — WebChat UI
  10. A5 — Webhook receivers
  11. A6 — Session Manager
  12. A7 — DM Pairing Security

SPRINT 3 (Week 3) — ADE Dev Pipeline:
  13. E1 — Worktree Manager
  14. E2 — Spec Pipeline (Two-Phase Planning)
  15. D1 — JarvisHub skill registry
  16. D2 — Skill Auto-Discovery

SPRINT 4 (Week 4) — Canvas + Voice:
  17. B1 — Canvas Engine
  18. B2 — Canvas UI Component
  19. C1 — Voice Wake
  20. C2 — Talk Mode
  21. C3 — Voice Control UI

SPRINT 5 (Week 5) — UI + Config:
  22. G1 — Channel Selector
  23. G2 — Mission Timeline
  24. G3 — Pattern Insights
  25. G4 — ADE Panel
  26. H1 — Config expansion
  27. H2 — .env.example update

═══════════════════════════════════════════════════════════
QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════

For EVERY file created:
- Full TypeScript with no `any` types
- Error handling with try/catch + logger.error()
- Graceful degradation if external service unavailable
- Config-gated (can be disabled without breaking rest of system)
- Export singleton instances where appropriate
- Add to startup sequence in index.ts (wrapped in try/catch)
- Socket.IO events documented in comments
- API endpoints return { success: boolean, data?: any, error?: string }

═══════════════════════════════════════════════════════════
END OF IMPLEMENTATION SPEC
═══════════════════════════════════════════════════════════
```

---

## 3. CAPABILITY COMPARISON SCORECARD (Post-Implementation)

After implementing all phases above, JARVIS will score:

| Dimension | OpenClaw | AIOS | JARVIS Current | JARVIS v6.0 |
|-----------|---------|------|----------------|-------------|
| **Multi-Channel** | 10/10 | 3/10 | 4/10 | **9/10** |
| **Autonomous AI** | 3/10 | 6/10 | 9/10 | **10/10** |
| **Memory Systems** | 2/10 | 4/10 | 9/10 | **10/10** |
| **Voice** | 8/10 | 1/10 | 5/10 | **9/10** |
| **Dev Automation** | 2/10 | 9/10 | 6/10 | **10/10** |
| **Quality Gates** | 2/10 | 8/10 | 7/10 | **10/10** |
| **Security** | 8/10 | 4/10 | 7/10 | **9/10** |
| **Visual Canvas** | 9/10 | 1/10 | 1/10 | **8/10** |
| **Agent DNA** | 2/10 | 5/10 | 10/10 | **10/10** |
| **Self-Evolution** | 1/10 | 4/10 | 10/10 | **10/10** |
| **Skill Registry** | 9/10 | 6/10 | 5/10 | **9/10** |
| **Deployment** | 8/10 | 5/10 | 6/10 | **8/10** |
| **TOTAL** | **57/120** | **56/120** | **79/120** | **112/120** |

JARVIS v6.0 will achieve **112/120** vs OpenClaw's **57** and AIOS's **56** — making JARVIS **~2x superior** to either system individually, and surpassing the combined best-of-breed across all categories.

---

## 4. KEY ARCHITECTURAL DECISIONS

### Why JARVIS beats both after this upgrade:

1. **JARVIS has DNA-based agents** — OpenClaw and AIOS both use flat system prompts. JARVIS's 5-layer DNA (Voice, Mental Models, Constraints, Obsession, Blindspot) creates genuinely differentiated agents that behave like specific people (Torvalds, Feynman, Ogilvy, etc.)

2. **JARVIS has self-evolution** — Neither OpenClaw nor AIOS can modify their own agent DNA at runtime. JARVIS's Genesis Engine + DNA Mutation + Nightly Learning creates a genuinely self-improving system.

3. **JARVIS has a consciousness** — The 6-phase OODA loop every 5 minutes means JARVIS proactively identifies problems and opportunities without being asked. Neither competitor has anything like this.

4. **JARVIS's memory is multi-layered** — Episodic (LanceDB vector), Semantic (SQLite goals/OKRs), Hybrid (knowledge base ChromaDB) + now Pattern Memory. OpenClaw has no memory. AIOS has minimal file-based context.

5. **JARVIS's MetaBrain DAG** — Full dependency-aware task decomposition with parallel execution, crash recovery, and re-planning on failure. Neither competitor has this.

6. **After Sprint 1-5**: JARVIS adds multi-channel reach (OpenClaw's strength), ADE code isolation (AIOS's strength), while keeping ALL of its unique capabilities that neither competitor has.

---

*Generated by JARVIS Platform Research Engine — 2026-02-26*
*Reference: github.com/openclaw/openclaw | github.com/SynkraAI/aios-core*
