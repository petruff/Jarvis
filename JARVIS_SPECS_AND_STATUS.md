# JARVIS OS: Master Specification & Status Report

This document serves as the single source of truth for the JARVIS AI Operating System. It outlines the current state of development, what has been implemented, what features and tools are available, the external software stack, and the critical missing pieces required to achieve a fully autonomous, multi-agent system.

---

## 1. System Overview & Core Identity

JARVIS (Just A Rather Very Intelligent System) is a multimodal, autonomous, multi-agent operating system designed to act as the cognitive infrastructure for your company. It is not a standard chatbot; it is a workforce.

*   **Workforce**: 42 specialized agents organized into 9 distinct squads (Oracle, Forge, Mercury, Atlas, Vault, Board, Produto, Revenue, Nexus).
*   **Operating Principle**: Execute, don't suggest. Provide high-leverage output, challenge assumptions, and operate autonomously in the background.
*   **Architecture**: A distributed cluster of microservices (Backend, Web Gateway, and React UI) orchestrated around a central memory and mission engine.

---

## 2. What We Have Implemented So Far (Phase 1 Complete)

We have successfully laid the Foundation and established the "Truth Layer" (Phase 1). The system is stable, stateful, and capable of basic parallel execution.

### ✅ Core Systems Online:
1.  **System 1: Episodic Memory (Qdrant Cloud)**
    *   **Status:** Fully operational.
    *   **Function:** Every mission prompt, result, and metadata (score, duration) is embedded (using OpenAI `text-embedding-3-small` - 1536 dim) and stored as a vector. Used to recall past context to avoid repeating mistakes.
2.  **System 2: Semantic Memory & Goal State (Neo4j)**
    *   **Status:** Fully operational.
    *   **Function:** Extracts facts, active goals (Horizon, OKR, Sprint, Daily), metrics, and lessons from missions. Injects these automatically into the system prompt so JARVIS always knows your current priorities.
3.  **System 3: Quality Gate**
    *   **Status:** Fully operational.
    *   **Function:** An internal critic that evaluates agent outputs before showing them to you. Vague or poor responses are blocked, scores are assigned, and agents are forced to retry if the quality is below the threshold (75/100).
4.  **System 4: Multi-Language Auto-Detection**
    *   **Status:** Fully operational.
    *   **Function:** Detects if the user speaks English, Portuguese, or Spanish and dynamically adjusts the entire squad's output to match the user's language natively.
5.  **System 5: Consciousness Loop**
    *   **Status:** Fully operational.
    *   **Function:** A background cron job that wakes up every 6 hours to Orient, Assess, Decide, and Act. It monitors global goal health and recent mission friction, allowing JARVIS to proactively start a mission without you asking.
6.  **System 6: Morning Briefing Engine**
    *   **Status:** Fully operational.
    *   **Function:** Generates a daily 5-section brief (Metrics, Goals, Deep Work Focus, Autonomous Tasks, Quote) and sends it directly to your Telegram at 8:00 AM. Includes interactive approval buttons for queued tasks.

### ✅ Interface & Routing:
*   **Intelligent Squad Router**: Intercepts free-text prompts, calculates semantic confidence, and routes the mission to the correct specialized squad automatically.
*   **Parallel Execution**: The orchestrator triggers multiple specialized agents within a squad to process a mission concurrently.

---

## 3. What is Missing to Be Fully Agentic & Operational (Phase 2 Roadmap)

While JARVIS is powerful, it currently operates mostly as an advanced "Prompt Engine." The agents generate high-quality text based on their personas, but they cannot yet *take action* autonomously within their environment.

To achieve a true "Real Multi-Agent Bus" where agents are fully operational, the following must be implemented:

### ❌ 1. The Redis Streams Agent Bus (True Inter-Agent Communication)
*   **Current State:** Agents execute in a simple `Promise.all` pool and return text. They don't talk to each other.
*   **Missing:** We need to replace the local fastify orchestrator with **Redis Streams**. This allows an agent (e.g., *Ogilvy*) to finish a copywriting task, publish it to a stream, and have another agent (e.g., *Torvalds*) pick it up to implement it into a landing page.

### ❌ 2. ReAct (Reasoning and Acting) Tool-Use Loops
*   **Current State:** Agents receive a prompt and stream a text response. They cannot use tools dynamically.
*   **Missing:** Agents need to be upgraded to use the **OpenAI/Anthropic Tool Calling API**. Before answering, an agent should be able to:
    *   Search the web for real-time data.
    *   Read specific files from the filesystem.
    *   Trigger the `Playwright MCP` to open a browser and scrape a competitor.
    *   *Act* on the environment, observe the result, and *then* formulate the final response.

### ❌ 3. Advanced RAG (Retrieval-Augmented Generation) in the Agent Loop
*   **Current State:** Episodic and Semantic memory are injected at the *Orchestrator* level before the mission starts.
*   **Missing:** Agents themselves need the ability to query Qdrant and Neo4j *mid-thought* using tools, pulling in exact context only when they realize they need it, rather than overflowing the initial prompt context window.

### ❌ 4. Robust Error Handling & Sandboxing
*   **Current State:** If an AI model hallucinates a bad command, it might fail silently or return garbage text.
*   **Missing:** A "Sentinel" validation layer that runs generated code in a secure sandbox (Docker/VM) or strictly validates tool parameters before execution to prevent system compromise.

---

## 4. Tools and Features Currently Available

*   **Web Dashboard (Command Center)**: A React-based Kanban board to visualize Queued, In Progress, Pending Approval, and Done tasks. Also features an interactive Organogram of all agents.
*   **WhatsApp Integration (`baileys`)**: Full bidirectional communication. JARVIS can receive text and audio, authenticate users against an allowed list, and respond.
*   **Telegram Integration**: Used primarily for Morning Briefings, interactive task approvals (inline keyboards), and alerts.
*   **Voice System (ElevenLabs)**: Supports both Speech-to-Text (transcribing voice notes) and Text-to-Speech (JARVIS speaking back to you). Features dynamic language switching for voices.
*   **Playwright MCP (Drafted)**: A local server capable of opening browsers, navigating pages, clicking elements, and taking screenshots (Currently built but requires Phase 2 tool-calling to be used by agents).
*   **Filesystem Task Queue**: State is managed via local `.json` files in `.jarvis/tasks/` ensuring tasks persist across server reboots.
*   **System Telemetry**: Real-time monitoring of active missions, queued tasks, and total processed requests.

---

## 5. External Software & Tech Stack

### Core Infrastructure
*   **Node.js / TypeScript**: The primary language and runtime for all packages.
*   **Fastify**: The high-performance HTTP server running the backend.
*   **PM2**: The process manager keeping the Backend, Gateway, and UI alive and automatically restarting them on failure.
*   **Socket.io**: Powers real-time bidirectional communication between the UI, Backend, and Gateway.

### Memory & State
*   **Qdrant Cloud**: Vector database used for Episodic Memory (storing and retrieving past mission vectors).
*   **Neo4j**: Graph database used for Semantic Memory (storing Goals, Metrics, Lessons, and relationships).
*   **Redis**: Message broker and caching layer (Installed locally, designated for Phase 2 Agent Streams).

### AI & Language Models
*   **DeepSeek (via OpenRouter/Native API)**: The default LLM used for heavy reasoning and agent text generation.
*   **Google Gemini / Kimi**: Configured as fallback/alternative LLMs in the routing stack.
*   **OpenAI API**: Exclusively used for `text-embedding-3-small` to generate 1536-dimensional vectors for Qdrant.
*   **ElevenLabs**: Used for ultra-realistic Text-to-Speech generation (Voice IDs configured for both English and Portuguese).

### Automation & Integrations
*   **@whiskeysockets/baileys**: The underlying library powering the WhatsApp web socket connection.
*   **node-telegram-bot-api**: Powers the Telegram bot interface.
*   **Playwright**: Used for headless browser automation and web scraping capabilities via the Model Context Protocol (MCP).
*   **node-cron**: Handles scheduling for the Consciousness Loop and Morning Briefings.
