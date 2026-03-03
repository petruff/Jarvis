# JARVIS: Product Requirements Document (PRD)

## Product Overview
**Name:** JARVIS (Agentic Operating System)  
**Type:** Autonomous Multi-Agent AI Platform & Mobile Gateway  
**Objective:** Provide a sovereign, autonomous AI environment that monitors its own health, orchestrates specialized agent squads to solve complex tasks, and interacts seamlessly via mobile communication channels (WhatsApp/Telegram).

## Background & Vision
Current AI agents are typically reactive and siloed. JARVIS is designed to be **proactive** and **unified**. It doesn't just wait for prompts; its "Consciousness Loop" periodically assesses system state, identifies optimizations, and tasks its own squads. It is built for founders and high-level operators who need a "system that thinks for them."

## Goals & Success Metrics
*   **Autonomy:** Achieve >90% success rate in autonomous self-optimization tasks (circuit breaker management, log cleanup).
*   **Specialization:** Effectively route 100% of complex missions to the correct specialized squad (Forge, Oracle, etc.).
*   **Responsiveness:** Mobile gateway responses under 5 seconds for simple queries.
*   **Reliability:** 99.9% uptime for the consciousness loop monitoring.

## User Personas
### 1. The Founder ("Petruff")
*   **Needs:** High-leverage execution. Needs to be able to send a vague strategy via WhatsApp and have a squad of experts deconstruct and execute it.
*   **Pain Points:** Decision fatigue, managing multiple technical and marketing streams.

### 2. The System Operator
*   **Needs:** Deep observability. Needs to see *why* an agent made a decision and ensure quality gates are passing.
*   **Pain Points:** AI hallucinations, runaway costs, lack of persistence.

## Product Scope & Features

### Core Functional Requirements
| ID | Feature | Description | Priority |
|---|---|---|---|
| **F1** | **Multi-Channel Gateway** | Unified entry point for WhatsApp and Telegram with session persistence. | High |
| **F2** | **Consciousness Loop** | Autonomous background process that "ticks" every X minutes to orient and act. | High |
| **F3** | **Mission Orchestrator** | Coordinates multi-agent flows, handling state transitions and data passing. | High |
| **F4** | **Squad Ecosystem** | 6 specialized squads (Oracle, Forge, Mercury, Atlas, Vault, Nexus). | High |
| **F5** | **Quality Gate** | LLM-based validation system that scores outputs and requests revisions. | High |
| **F6** | **Episodic Memory** | Large-scale storage of past interactions to provide project-wide context. | High |
| **F7** | **Circuit Breaker** | Safety layer to prevent API loops and cost overruns (Daily limit: 5k calls). | High |
| **F8** | **Mission Control UI** | Real-time web dashboard for manual intervention and squad status. | Medium |

## Non-Functional Requirements
*   **Security:** AES-256 encryption at rest; OWNER_PHONE verification for WhatsApp.
*   **Observability:** Structured logging into `.jarvis/logs` and `.jarvis/tasks/`.
*   **Scalability:** Support for 10+ concurrent agent squads via asynchronous processing.
*   **Sovereignty:** All data kept locally in `packages/jarvis-backend/data`.

---

# JARVIS: Technical Specifications

## High-Level Architecture
JARVIS is split into two primary packages managing distinct concerns:
1.  **`jarvis-gateway`**: The "Sensor Cluster." Handles I/O via WhatsApp/Telegram and bridges messages to the backend.
2.  **`jarvis-backend`**: The "Cerebral Cortex." Handles logic, memory, routing, and agent execution.

## 1. Backend Core Services

### Mission Orchestrator (`orchestrator.ts`)
The central engine that receives a "Prompt" and manages the lifecycle:
*   **Input:** User Mission.
*   **Routing:** Consults `SquadRouter`.
*   **Execution:** Spawns a `SquadRunner`.
*   **Validation:** Passes result through `QualityGate`.
*   **History:** Commits to `EpisodicMemory`.

### Squad Router (`squadRouter.ts`)
A keyword-based and LLM-assisted classifier that maps tasks to one of 7 squads:
1.  **ORACLE (🔍):** Research & Intelligence (Tesla, Feynman, Munger, Shannon).
2.  **FORGE (⚡):** Engineering & Product (Torvalds, Bezos, Thompson, Carmack).
3.  **MERCURY (🚀):** Growth & Conversion (Schwartz, Godin, Abraham, Ogilvy).
4.  **ATLAS (🗺️):** Strategy & Operations (Sun-Tzu, Drucker, Grove, Deming).
5.  **VAULT (💰):** Finance & Risk (Buffett, Graham, Dalio, Taleb).
6.  **NEXUS (🤖):** AI & Frontier (Turing, LeCun, Karpathy, Wolfram).
7.  **CONSCIOUSNESS (👁️):** Self-monitoring (Sentinel).

### Quality Gate (`quality/gate.ts`)
Intercepts squad outputs and evaluates them on:
*   **COMPLETENESS:** Covers all mission aspects?
*   **ACCURACY:** Factual grounding?
*   **ACTIONABILITY:** Can the founder act on this immediately?
*   *Behavior:* Returns a score 0-100. If <75, triggers a revision retry with specific feedback.

### Consciousness Loop (`consciousness/loop.ts`)
An autonomous state machine that runs on a cron schedule:
1.  **Orient:** Reads recent history and system logs.
2.  **Assess:** Identifies gaps or opportunities.
3.  **Decide:** Generates a new "Self-Mission."
4.  **Act:** Queues the mission for a squad to execute.

## 2. Data Strategy & Storage
*   **Persistent Task Queue:** Individual tasks stored as JSON in `.jarvis/tasks/` for fault tolerance.
*   **Episodic Memory:** File-based storage of chronological events in `data/episodic`.
*   **Relational Storage:** `jarvis.db` (SQLite) for structured user and squad metadata.
*   **Vector Storage:** Hybrid search indices for rapid context retrieval.

## 3. Technology Stack
*   **Runtime:** Node.js (v20+)
*   **Frameworks:** Fastify, Socket.io
*   **Communication:** 
    *   WhatsApp: `whatsapp-web.js`
    *   Telegram: `node-telegram-bot-api`
*   **AI Models:** 
    *   Primary: OpenAI (GPT-4o)
    *   Economical: DeepSeek-V3
*   **Process Management:** PM2 for gateway and backend stability.

## 4. Safety & Security
*   **Circuit Breaker:** Logic in `rateLimiter.ts` that provides a "trip-wire" if API calls spike.
*   **Admin Bridge:** PENDING_APPROVAL status for autonomous tasks with high risk scores.
*   **Environment Isolation:** Secrets managed via `.env` with validated schema.

## 5. Development Roadmap
*   **Phase 1:** Core Gateway & Basic Routing (Completed).
*   **Phase 2:** Memory Integration & Squad Persona Build (Completed).
*   **Phase 3:** Consciousness Loop & Quality Gates (Current).
*   **Phase 4:** Real-time Dashboard & External API Connectors (Upcoming).
*   **Phase 5:** Multi-instance coordination & decentralized data storage (Future).
