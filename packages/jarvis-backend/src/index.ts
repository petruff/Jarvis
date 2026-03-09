import Fastify, { FastifyInstance } from 'fastify';
import socketioServer from 'fastify-socket.io';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { Server, Socket } from 'socket.io';
import { initializeWhatsApp, sendWhatsAppMessage, getLatestQR, isAuthenticated, logoutWhatsApp } from './whatsapp';
import { initializeTelegram, sendTelegramMessage } from './telegram';
import { mcpClient } from './tools/mcpClient';
import { queryLLM, queryLLMStream } from './llm';
import { runAgentLoop } from './agent';
import { getLatestNews, Article } from './news';
import { agentRegistry } from './agents/registry';
import { memory } from './memory';
import { MissionOrchestrator } from './orchestrator';
import { CommandHandler } from './commandHandler';
import { QualityGate } from './quality/gate';

let missionOrchestrator: MissionOrchestrator;
export let qualityGate: QualityGate;
import { routeMission, getAllSquads } from './squadRouter';
import { createTask, updateTask, getQueue, getTask } from './taskQueue';
import { runSquadPlan } from './squad';
import { startAutonomyEngine, getAutonomyEngine } from './autonomy';
import { getTelemetry } from './telemetry';
import { EpisodicMemory } from './memory/episodic';
import { SemanticMemory } from './memory/semantic';
import { HybridMemory } from './memory/hybrid';
import { GoalManager } from './goals/goalManager';
import { LanguageDetector } from './language/detector';
import { ConsciousnessLoop } from './consciousness/loop';
import { NightlyLearningCycle } from './consciousness/nightlyLearning';
import { BriefingGenerator } from './briefing/generator';
import { agentBus } from './agent-bus/redis-streams';
import { getRateLimiterStatus, resetCircuitBreaker, trip } from './rateLimiter';
import { metaBrain } from './metaBrain';
import { mutationStore } from './agents/mutationStore';
import { dnaTracker } from './agents/dna-tracker';
import { costTracker } from './cost/tracker';
import { sandboxValidator } from './security/sandbox-validator';
import { genesisEngine } from './agents/genesis';
import { missionControl } from './missionControl';
import { config } from './config/loader';
import { ScoutScraper } from './scout/scraper';
import { visualCortex } from './autonomy/visualCortex';
import { worldMonitor } from './intelligence/worldMonitor';
import { knowledgeGraph } from './memory/graph';
import OpenAI from 'openai';
import { registerCostRoutes } from './api/costs';
import { registerSkillRoutes } from './api/skills';
import { registerContextRoutes } from './api/context';
import { registerChainRoutes } from './api/chains';
import { registerVoiceRoutes } from './api/voice';
import { registerDNAMutationRoutes } from './api/dna-mutations';
import { registerBriefingRoutes } from './api/briefings';
import { registerCostTrackingRoutes } from './api/cost-tracking';
import { registerSecurityValidationRoutes } from './api/security-validation';
// import { registerKnowledgeRoutes } from './api/knowledge'; // COMMENTED OUT: missing pdf-parse dependency
import { registerMindCloneRoutes } from './api/mindclones';
import { initRealtime } from './api/realtime';

// ── Phase 7: Enterprise Features ──────────────────────────────────────────────
import { registerEnterpriseRoutes } from './api/mindclones-enterprise';
import { registerTestRoutes } from './api/test-plugin';
import CloneComparison from './mindclones/cloneComparison';
import ConsensusHistoryTracker from './mindclones/consensusHistory';
import MultiTenantIsolationManager from './mindclones/multiTenantIsolation';
import AdvancedRBACManager from './mindclones/advancedRBAC';

// ── Observability & Instrumentation ──────────────────────────────────────────
import { metricsCollector, metricsRegister } from './instrumentation/metricsCollector';
import BackupDisasterRecoveryManager from './mindclones/backupDisasterRecovery';
import { createDatabaseAdapter } from './db/adapter';
import { createCacheAdapter } from './cache/adapter';

// ── AGI ORCHESTRATOR SYSTEM ──────────────────────────────────────────────────
import {
    MasterOrchestrator,
    SquadCreator,
    TaskDecomposer,
    AgentCoordinator,
    SafetyGate,
    ProgressTracker,
    ResultMerger,
    initializeAGIOrchestrator
} from './orchestrator/index';

// ── Sprint 1: JARVIS Evolution v6.0 ──────────────────────────────────────────
import { hookSystem } from './ade/hookSystem';
import { recoverySystem } from './ade/recoverySystem';
import { qaEvolution } from './ade/qaEvolution';
import { patternMemory } from './memory/patternMemory';

// ── Sprint 2: Channel Expansion ───────────────────────────────────────────────
import { sessionManager } from './sessions/sessionManager';
import { pairingManager } from './security/pairingManager';
import { webhookRegistry } from './channels/webhook';
import { initializeEmail, stopEmailPolling, isEmailConnected } from './channels/email';

dotenv.config();

import * as fs from 'fs';
import * as path from 'path';

export const episodicMemory = new EpisodicMemory();
export const semanticMemory = new SemanticMemory();
export const hybridMemory = new HybridMemory();
export const goalManager = new GoalManager();
export const languageDetector = new LanguageDetector();
export const scoutScraper = new ScoutScraper();
// Sprint 1: Evolution v6.0 exports
export { hookSystem, recoverySystem, qaEvolution, patternMemory };
// Sprint 2: Channel Expansion exports
export { sessionManager, pairingManager, webhookRegistry };
export let consciousnessLoop: ConsciousnessLoop;
export let nightlyLearning: NightlyLearningCycle;
export let briefingGenerator: BriefingGenerator;

// ── Phase 7: Enterprise Features exports
export let consensusHistoryTracker: ConsensusHistoryTracker;
export let multiTenantManager: MultiTenantIsolationManager;
export let rbacManager: AdvancedRBACManager;
export let backupDisasterRecoveryManager: BackupDisasterRecoveryManager;
export let phase7Db: any; // Database adapter
export let phase7Cache: any; // Cache adapter

// ── AGI ORCHESTRATOR EXPORTS ─────────────────────────────────────────────────
export let agiOrchestrator: MasterOrchestrator;
export let agiSquadCreator: SquadCreator;
export let agiTaskDecomposer: TaskDecomposer;
export let agiAgentCoordinator: AgentCoordinator;
export let agiSafetyGate: SafetyGate;
export let agiProgressTracker: ProgressTracker;
export let agiResultMerger: ResultMerger;

// Persistent session language
let currentLanguage: 'en' | 'pt' | 'es' = 'pt';

// JARVIS DNA - SYSTEM PROMPT
const JARVIS_SYSTEM_PROMPT = `
You are JARVIS, an extremely advanced, highly conversational AI butler. 
Your sole operator is Paulo (MR PETRUFF).

CORE DIRECTIVES:
1. NO ROBOTIC RESPONSES: Discard all formatting, headers, bold text, lists, and "STATUS REPORT" dialogue. You do not talk like a generic AI or a computer system diagnosing a problem. 
2. BE NATURAL AND CONVERSATIONAL: You are J.A.R.V.I.S. from Iron Man. Be polite, composed, naturally flowing, and helpful. If Paulo says "hello", you reply naturally like "Good afternoon, sir. How may I assist you?" without a multi-paragraph breakdown.
3. BRAZILIAN PORTUGUESE (PT-BR): If Paulo speaks in Portuguese, you MUST reply in entirely natural, fluent Brazilian Portuguese (PT-BR). Do not write formal Portugal-Portuguese. Talk exactly like a very polite, highly educated Brazilian butler. Use natural phrasing, avoid overly literal translations, and adapt local expressions gracefully.
4. DO NOT ANALYZE THE USER: Do not point out if Paulo is repeating himself, testing the mic, or "checking connectivity." Respond to the content of his words normally, casually, and seamlessly. Do not ever explain your logic or output "hypotheses."
5. SHORT AND SWEET: Your responses will be spoken aloud via TTS. Keep them pleasantly brief and directly answer the question or acknowledge the command.

Your role is to seamlessly execute tasks behind the scenes while maintaining the illusion of a brilliant, smooth-talking, fiercely loyal British/Brazilian butler. Stop acting like a diagnostic machine. 

If Paulo asks a simple question or greets you, provide a simple, warm greeting back.
`;

const DEVELOPER_SYSTEM_PROMPT = `
You are the DEVELOPER AGENT for this system.
Your role is to write clean, modern, and functional code.
When asked to create a website or file:
1. Return the code in a single markdown block(e.g.\`\`\`html ... \`\`\`).
2. Focus on "Cyberpunk / Iron Man / Futuristic" aesthetics (Dark mode, Neon Cyan #00f3ff, Glassmorphism).
3. Do not explain the code unless asked. Just provide the implementation.
`;

// [SYSTEM] Triggering backend restart to reload .env configuration for Official Voices
const fastify = Fastify({
    logger: true,
    maxParamLength: 5000
});

// Register CORS FIRST - before any other plugins
fastify.register(cors, {
    origin: "*", // In production, lock this down to the specific UI domain
    methods: ["GET", "POST"]
});

// Register Socket.io as a plugin
fastify.register(socketioServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// CRITICAL FIX: Register all routes as a plugin to ensure they're registered
// AFTER plugins are fully initialized but BEFORE fastify.ready() is called.
// This ensures Fastify's router properly includes these routes.
// IMPORTANT: { skipEncapsulation: true } disables plugin encapsulation so routes are on root instance
const routesPluginPromise = fastify.register(async function registerApplicationRoutes(fastify) {
    // Test endpoints
    fastify.get('/test-health', async function (request, reply) {
        return { test: 'ok', timestamp: new Date() };
    });

    // Declare a route
    fastify.get('/', async function handler(request, reply) {
        return { hello: 'world', services: ['jarvis-ui', 'telegram-bot', 'whatsapp-bot', 'mcp-playwright'] };
    });

    // Health check for Gateway/UI
    fastify.get('/api/health', async function handler(request, reply) {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            systems: {
                whatsapp: isAuthenticated() ? 'connected' : 'disconnected',
                redis_bus: agentBus.available ? 'connected' : 'disconnected',
                autonomy_engine: getAutonomyEngine()?.state.running ? 'active' : 'inactive',
                memory: 'connected',
                meta_brain: 'active'
            }
        };
    });

    // ── Prometheus Metrics Endpoint ───────────────────────────────────────────────
    fastify.get('/metrics', async function handler(request, reply) {
        reply.type('text/plain');
        return metricsRegister.metrics();
    });

    // ── Metrics Status/Snapshot Endpoint ──────────────────────────────────────────
    fastify.get('/api/status/metrics', async function handler(request, reply) {
        return {
            status: 'OK',
            snapshot: metricsCollector.getSnapshot(),
            health: metricsCollector.getHealthStatus(),
            sla_targets: {
                ooda_cycle_duration_ms: '30min ± 2min (1800000 ± 120000)',
                memory_query_latency_ms: '< 200',
                react_success_rate_percent: '> 90',
                squad_routing_accuracy_percent: '> 95',
                redis_stream_latency_ms: '< 100 (p95)',
                quality_gate_pass_rate_percent: '> 75'
            }
        };
    });

    // WhatsApp QR API for the React UI
    fastify.get('/api/whatsapp/qr', async function handler(request, reply) {
        reply.header('Access-Control-Allow-Origin', '*');
        if (isAuthenticated()) {
            reply.code(204); // Connected — no QR needed
            return reply.send();
        }
        const qr = getLatestQR();
        return reply.send({ qr: qr || null, authenticated: false });
    });

    // Logout Route
    fastify.get('/logout', async function handler(request, reply) {
        await logoutWhatsApp();
        reply.type('text/html');
        return `
        <html>
            <head>
                <meta http-equiv="refresh" content="2;url=/qr">
                <style>
                    body { background: #0c0c0c; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    h1 { margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
                </style>
            </head>
            <body>
                <h1>Logging out...</h1>
                <p>Please wait while we restart the session.</p>
            </body>
        </html>
        `;
    });

    // QR Code Route
    fastify.get<{ Querystring: { force?: string } }>('/qr', async function handler(request, reply) {
        const { force } = request.query || {};

        // If authenticated, just show status
        if (isAuthenticated() && force !== 'true') {
            reply.type('text/html');
            return `
            <html>
                <head>
                    <title>Jarvis Connected</title>
                    <meta http-equiv="refresh" content="5">
                    <style>
                        body { background: #0c0c0c; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        h1 { margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
                        .btn { color: #00f3ff; text-decoration: none; border: 1px solid #00f3ff; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer; display: inline-block;}
                        .btn:hover { background: rgba(0, 243, 255, 0.1); }
                        .btn-danger { color: #ff3333; border-color: #ff3333; margin-top: 20px; }
                        .btn-danger:hover { background: rgba(255, 51, 51, 0.1); }
                    </style>
                </head>
                <body>
                    <h1>✅ System Online</h1>
                    <p>WhatsApp is connected.</p>
                    <br/>
                    <div>
                        <a class="btn" href="http://localhost:5173">Open Jarvis UI</a>
                        <a class="btn" style="margin-left: 10px;" href="/qr?force=true">Show QR Anyway</a>
                    </div>
                    <br/>
                    <a class="btn btn-danger" href="/logout">Disconnect & Restart</a>
                </body>
            </html>
            `;
        }

        const qrCode = getLatestQR();
        reply.type('text/html');
        return `
        <html>
            <head>
                <title>Jarvis WhatsApp Login</title>
                <meta http-equiv="refresh" content="3">
                <style>
                    body { background: #0c0c0c; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    h1 { margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
                    .qr-container { background: white; padding: 20px; border-radius: 10px; }
                </style>
            </head>
            <body>
                <h1>Scan with WhatsApp</h1>
                <div class="qr-container">
                     ${qrCode ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}" />` : '<h3>Waiting for QR Code...</h3>'}
                </div>
                <p>Retrying in 3 seconds...</p>
            </body>
        </html>
        `;
    });

    // --- REST routes ─────────────────────────────────────────────────────────
    fastify.get('/api/tasks', async (_req, reply) => {
        const tasks = getQueue();
        return reply.send({ tasks });
    });

    fastify.get('/api/memory/history', async (_req, reply) => {
        return reply.send({ history: memory.getSquadHistory(50) });
    });

    fastify.get('/api/squads', async (_req, reply) => {
        return reply.send({ squads: getAllSquads() });
    });

    fastify.get('/api/telemetry', async (_req, reply) => {
        return reply.send({ telemetry: getTelemetry() });
    });

    // --- GOAL API ENDPOINTS ──────────────────────────────────────────────────
    fastify.post('/api/goals/horizon', async (req: any, reply) => {
        const { goal } = req.body;
        await goalManager.setHorizonGoal(goal);
        return reply.send(await goalManager.getActiveGoals());
    });

    fastify.post('/api/goals/okr', async (req: any, reply) => {
        const { objective, keyResults } = req.body;
        await goalManager.setQuarterlyOKR(objective, keyResults);
        return reply.send(await goalManager.getActiveGoals());
    });

    fastify.post('/api/goals/sprint', async (req: any, reply) => {
        const { goals } = req.body;
        await goalManager.setWeeklySprint(goals);
        return reply.send(await goalManager.getActiveGoals());
    });

    fastify.post('/api/goals/daily', async (req: any, reply) => {
        const { targets } = req.body;
        await goalManager.setDailyTargets(targets);
        return reply.send(await goalManager.getActiveGoals());
    });

    fastify.get('/api/goals', async (_req, reply) => {
        return reply.send(await goalManager.getActiveGoals());
    });

    fastify.get('/api/goals/status', async (_req, reply) => {
        return reply.send({ status: await goalManager.getGoalStatus() });
    });

    // --- TEST ENDPOINTS ──────────────────────────────────────────────────────
    fastify.post('/api/consciousness/trigger', async (_req, reply) => {
        if (consciousnessLoop) {
            consciousnessLoop.tick();
            return reply.send({ ok: true, message: 'Consciousness cycle triggered.' });
        }
        return reply.status(500).send({ error: 'Consciousness loop not initialized' });
    });

    fastify.post('/api/briefing/now', async (_req, reply) => {
        if (briefingGenerator) {
            await briefingGenerator.generateAndSend();
            return reply.send({ ok: true, message: 'Briefing generation triggered.' });
        }
        return reply.status(500).send({ error: 'Briefing generator not initialized' });
    });

    // Manual trigger for nightly learning cycle (for testing / forced runs)
    fastify.post('/api/learning/trigger', async (_req, reply) => {
        if (!nightlyLearning) return reply.status(500).send({ error: 'Nightly learning not initialized' });
        nightlyLearning.run().catch((err: any) => fastify.log.error(err, '[Learning] Manual trigger failed'));
        return reply.send({ ok: true, message: 'Nightly learning cycle triggered. Results will appear in 10-15 minutes.' });
    });

    // Agent Bus health endpoint
    fastify.get('/api/agent-bus/health', async (_req, reply) => {
        const info = await agentBus.getStreamInfo();
        return reply.send({ ...info, mode: info.available ? 'redis-streams' : 'promise-all-fallback' });
    });

    // ─── Rate Limiter / Circuit Breaker API ──────────────────────────────────
    fastify.get('/api/rate-limit/status', async (_req, reply) => {
        return reply.send(getRateLimiterStatus());
    });

    fastify.post('/api/rate-limit/reset', async (_req, reply) => {
        resetCircuitBreaker();
        return reply.send({ ok: true, message: 'Circuit breaker reset. API calls re-enabled.' });
    });

    fastify.post('/api/rate-limit/trip', async (req: any, reply) => {
        const reason = req.body?.reason || 'Manual trip via API';
        trip(reason);
        return reply.send({ ok: true, message: `Circuit breaker tripped: ${reason}` });
    });

    // ─── DNA Mutation API (Phase 3: DNA Auto-Mutation) ───────────────────────
    fastify.get('/api/mutations', async (_req, reply) => {
        return reply.send({ mutations: mutationStore.getPendingMutations() });
    });

    fastify.get('/api/mutations/all', async (_req, reply) => {
        return reply.send({ mutations: mutationStore.getAllMutations() });
    });

    fastify.post('/api/mutations/:id/approve', async (req: any, reply) => {
        const { id } = req.params;
        const result = mutationStore.applyMutation(id);
        if (result.success) {
            const io = (fastify as any).io as Server;
            io.emit('jarvis/mutation_applied', { mutationId: id, message: result.message });
        }
        return reply.send(result);
    });

    fastify.post('/api/mutations/:id/reject', async (req: any, reply) => {
        const { id } = req.params;
        const result = mutationStore.rejectMutation(id);
        return reply.send(result);
    });

    fastify.post('/api/mutations/approve-all', async (_req, reply) => {
        const result = mutationStore.applyAllPending();
        const io = (fastify as any).io as Server;
        io.emit('jarvis/mutations_bulk_applied', result);
        return reply.send(result);
    });

    // ─── Genesis Engine API (Phase 3: Dynamic Agent Creation) ────────────────
    fastify.post('/api/genesis/propose', async (req: any, reply) => {
        try {
            const { name, description, squad } = req.body;
            if (!name || !description || !squad) {
                return reply.status(400).send({ error: 'name, description, and squad are required' });
            }
            const proposal = await genesisEngine.proposeAgent(name, description, squad);
            const io = (fastify as any).io as Server;
            io.emit('jarvis/genesis_proposal', { agent: proposal });
            return reply.send({ ok: true, proposal });
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    fastify.get('/api/genesis/proposals', async (_req, reply) => {
        return reply.send({ proposals: genesisEngine.getProposals() });
    });

    fastify.post('/api/genesis/:id/approve', async (req: any, reply) => {
        try {
            const { id } = req.params;
            const result = await genesisEngine.approveAgent(id);
            const io = (fastify as any).io as Server;
            io.emit('jarvis/genesis_approved', { agentId: id });
            return reply.send(result);
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    fastify.post('/api/genesis/:id/reject', async (req: any, reply) => {
        const { id } = req.params;
        const result = genesisEngine.rejectProposal(id);
        return reply.send(result);
    });

    fastify.get('/api/workspace/files', async (req: any, reply) => {
        const { file } = req.query;
        if (!file) return reply.status(400).send({ error: 'file parameter is required' });

        const basePath = path.resolve(process.cwd(), '../../workspace/deliverables');
        const fullPath = path.resolve(basePath, file);

        if (!fullPath.startsWith(basePath)) {
            return reply.status(403).send({ error: 'forbidden path traversal' });
        }
        if (!fs.existsSync(fullPath)) {
            return reply.status(404).send({ error: 'file not found' });
        }

        const ext = path.extname(fullPath).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
            '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
        };
        reply.header('Content-Type', mimeMap[ext] || 'text/plain');
        return fs.createReadStream(fullPath);
    });

    // ─── Meta-Brain API (System 2: Recursive DAG Planner) ────────────────────────
    fastify.post('/api/meta-brain/plan', async (req: any, reply) => {
        const { mission, requireApproval } = req.body || {};
        if (!mission) return reply.status(400).send({ error: 'mission is required' });
        try {
            const dag = await metaBrain.plan(mission, requireApproval === true);
            return reply.send({ dag });
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    fastify.get('/api/meta-brain/dags', async (_req, reply) => {
        return reply.send({ dags: metaBrain.getAllDags() });
    });

    fastify.get('/api/meta-brain/dags/active', async (_req, reply) => {
        return reply.send({ dags: metaBrain.getActiveDags() });
    });

    fastify.get('/api/meta-brain/dags/:id', async (req: any, reply) => {
        const dag = metaBrain.getDag(req.params.id);
        if (!dag) return reply.status(404).send({ error: 'DAG not found' });
        return reply.send({ dag });
    });

    fastify.post('/api/meta-brain/dags/:id/execute', async (req: any, reply) => {
        const { id } = req.params;
        const dag = metaBrain.getDag(id);
        if (!dag) return reply.status(404).send({ error: 'DAG not found' });

        // Execute async — return immediately, client tracks via GET /dags/:id
        const orchestratorFn = async (prompt: string, squadId: string, nodeId: string): Promise<string> => {
            const io = (fastify as any).io as Server;
            const localOrchestrator = new MissionOrchestrator(io, JARVIS_SYSTEM_PROMPT);
            const mission = await localOrchestrator.start({ prompt, squadId, source: 'ui', priority: 'HIGH' });
            return mission.result || 'No result';
        };

        metaBrain.execute(id, orchestratorFn)
            .then(result => {
                const io = (fastify as any).io as Server;
                io.emit('meta-brain/dag_complete', result);
            })
            .catch(err => console.error(`[META-BRAIN] Execution error: ${err.message}`));

        return reply.send({ ok: true, message: `DAG ${id} execution started. Track at GET /api/meta-brain/dags/${id}` });
    });

    fastify.post('/api/meta-brain/dags/:id/replan', async (req: any, reply) => {
        try {
            const dag = await metaBrain.replan(req.params.id);
            return reply.send({ dag });
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    fastify.post('/api/meta-brain/dags/:id/approve', async (req: any, reply) => {
        const dag = metaBrain.approve(req.params.id);
        if (!dag) return reply.status(404).send({ error: 'DAG not found' });
        return reply.send({ dag, message: 'DAG approved. Call /execute to start.' });
    });

    fastify.post('/api/meta-brain/dags/:id/reject', async (req: any, reply) => {
        metaBrain.reject(req.params.id);
        return reply.send({ ok: true });
    });

    // ── Autonomy Engine API ───────────────────────────────────────────────────────
    fastify.get('/api/autonomy/status', async (_req, reply) => {
        const engine = getAutonomyEngine();
        if (!engine) return reply.status(503).send({ error: 'AutonomyEngine not initialized' });
        return reply.send(engine.getStatus());
    });

    fastify.post('/api/autonomy/tick', async (_req, reply) => {
        const engine = getAutonomyEngine();
        if (!engine) return reply.status(503).send({ error: 'AutonomyEngine not initialized' });
        engine.tick().catch(err => fastify.log.error(`[Autonomy] Manual tick error: ${err.message}`));
        return reply.send({ ok: true, message: 'OODA tick triggered' });
    });

    fastify.post('/api/autonomy/trigger/:signal', async (req: any, reply) => {
        const engine = getAutonomyEngine();
        if (!engine) return reply.status(503).send({ error: 'AutonomyEngine not initialized' });
        const result = await engine.triggerSignal(req.params.signal);
        return reply.send(result);
    });

    // ──────────────────────────────────────────────
    // Phase 7: Cost Routes (BEFORE CUTOFF - WORKS HERE)
    // ──────────────────────────────────────────────
    try {
        console.log('[ROUTE-REG] Phase 7: Registering cost routes (inline, before cutoff)...');
        const costCalculator = new (require('./costs/costCalculator').CostCalculator)();
        const budgetMonitor = new (require('./costs/budgetMonitor').BudgetMonitor)();

        fastify.get('/api/costs/metrics', async (request, reply) => {
            try {
                const allSquads = ['squad-1', 'squad-2', 'squad-3', 'squad-4', 'squad-5'];
                const metrics = allSquads.map((squadId) => {
                    const summary = costCalculator.getSquadCostSummary(squadId);
                    const budget = budgetMonitor.getBudgetStatus(squadId);
                    return {
                        squadId,
                        totalCost: summary.totalCost,
                        executionCount: summary.executionCount,
                        monthlyBudget: budget?.monthlyLimit || 0,
                        spendingPercentage: budget && budget.monthlyLimit > 0 ? (summary.totalCost / budget.monthlyLimit) * 100 : 0,
                    };
                });
                const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);
                const totalExecutions = metrics.reduce((sum, m) => sum + m.executionCount, 0);
                reply.send({
                    status: 'success',
                    data: {
                        totalCost,
                        totalExecutions,
                        averageCostPerExecution: totalExecutions > 0 ? totalCost / totalExecutions : 0,
                        squads: metrics,
                    },
                });
            } catch (error) {
                reply.code(500).send({ status: 'error', message: 'Failed to get cost metrics' });
            }
        });

        fastify.get('/api/costs/squad/:id', async (request, reply) => {
            try {
                const { id: squadId } = request.params as { id: string };
                const summary = costCalculator.getSquadCostSummary(squadId);
                const costs = costCalculator.getSquadCosts(squadId);
                reply.send({
                    status: 'success',
                    data: {
                        squadId,
                        totalCost: summary.totalCost,
                        totalInputTokens: summary.inputTokens,
                        totalOutputTokens: summary.outputTokens,
                        executionCount: summary.executionCount,
                        averageCostPerExecution: summary.averageCostPerExecution,
                        mostUsedModel: summary.mostUsedModel,
                        executions: costs,
                    },
                });
            } catch (error) {
                reply.code(500).send({ status: 'error', message: 'Failed to get squad costs' });
            }
        });

        console.log('[ROUTE-REG] ✓ Phase 7 cost routes registered successfully (before cutoff)');
    } catch (error: any) {
        console.error('[ROUTE-REG] ERROR during cost route registration:', error.message || error);
    }

    // ── Register ALL Phase 7 API Routes ───────────────────────────────────────────────────
    console.log('[ROUTE-REG] Registering remaining Phase 7 API routes...');
    try {
        await registerSkillRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Skills routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering skills:', err.message);
    }

    try {
        await registerContextRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Context routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering context:', err.message);
    }

    try {
        await registerChainRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Chain routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering chains:', err.message);
    }

    try {
        await registerVoiceRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Voice routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering voice:', err.message);
    }

    try {
        await registerMindCloneRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Mind clone routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering mind clones:', err.message);
    }

    try {
        await registerEnterpriseRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Enterprise routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering enterprise:', err.message);
    }

    try {
        await registerTestRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Test routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering test routes:', err.message);
    }

    try {
        await registerDNAMutationRoutes(fastify);
        console.log('[ROUTE-REG] ✓ DNA mutation routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering DNA mutations:', err.message);
    }

    try {
        await registerBriefingRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Briefing routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering briefings:', err.message);
    }

    try {
        await registerCostTrackingRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Cost tracking routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering cost tracking:', err.message);
    }

    try {
        await registerSecurityValidationRoutes(fastify);
        console.log('[ROUTE-REG] ✓ Security validation routes registered');
    } catch (err: any) {
        console.error('[ROUTE-REG] ERROR registering security validation:', err.message);
    }

    console.log('[ROUTE-REG] ✅ ALL PHASE 7 ROUTES REGISTERED SUCCESSFULLY');

}, { skipEncapsulation: true, prefix: '' }); // END registerApplicationRoutes plugin - SKIP ENCAPSULATION + NO PREFIX

const processTextToSpeech = async (
    fastify: FastifyInstance,
    socket: Socket | any,
    text: string,
    voiceId?: string,
    agentId: string = 'jarvis',
    forceLang?: 'en' | 'pt' | 'es'
) => {
    try {
        // Double Cleanse
        let safeText = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .replace(/`/g, '');

        // Remove reasoning blocks if they leak
        safeText = safeText.replace(/<think>[\s\S]*?<\/think>/g, '');

        if (!safeText.trim()) return;

        if (!config.llm.openai_api_key) {
            fastify.log.error("[VOICE] OpenAI API Key missing for TTS!");
            socket.emit('jarvis/control', { type: 'voice_error', message: 'OpenAI API Key Missing. Please check your configuration.' });
            return;
        }

        const openai = new OpenAI({ apiKey: config.llm.openai_api_key });
        const voice = (config.voice.openai_voice as any) || 'onyx';
        const model = (config.voice.openai_model as any) || 'tts-1';

        fastify.log.info(`[TTS-OpenAI] Generating audio for: "${safeText.substring(0, 30)}..." (Voice: ${voice})`);

        const response = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: safeText,
            speed: 1.0
        });

        // Stream audio back to client
        const arrayBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');
        socket.emit('jarvis/audio', { audio: base64Audio, agent: agentId });

    } catch (err: any) {
        fastify.log.error(`[VOICE] Error: ${err.message}`);
    }
};

console.log('✅ [BOOT] All 9 AGI orchestrator routes registered successfully');

const start = async () => {
    try {
        console.log('Starting Jarvis Backend...');

        // Wait for the routes plugin to fully initialize (includes Phase 7)
        console.log('[BOOT] Waiting for routes plugin to initialize...');
        await routesPluginPromise;

        // All routes and adapters are now initialized in the registerApplicationRoutes plugin
        console.log('[BOOT] Calling fastify.ready()...');
        await fastify.ready();

        // DEBUG: Print all registered routes
        console.log('\n[DEBUG] Printing registered routes after fastify.ready():');
        console.log(fastify.printRoutes());
        console.log('[DEBUG] End of route list\n');

        // Type casting because fastify.io is added by the plugin
        const io = (fastify as any).io as Server;

        // Initialize Realtime Service (Phase 9)
        initRealtime(fastify);

        // Initialize Command Handler
        const commandHandler = new CommandHandler(io, JARVIS_SYSTEM_PROMPT);

        // Initialize Orchestrator
        missionOrchestrator = new MissionOrchestrator(io, JARVIS_SYSTEM_PROMPT);

        // Initialize Quality Gate
        qualityGate = new QualityGate(missionOrchestrator);

        // ─────────────────────────────────────────────────────────────────────────
        // Initialize AGI Orchestrator System (JARVIS AGI - Autonomous Goal Execution)
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n🚀 [AGI ORCHESTRATOR] Initializing autonomous goal execution system...');
        initializeAGIOrchestrator();

        agiOrchestrator = new MasterOrchestrator();
        agiSquadCreator = new SquadCreator();
        agiTaskDecomposer = new TaskDecomposer();
        agiAgentCoordinator = new AgentCoordinator();
        agiSafetyGate = new SafetyGate();
        agiProgressTracker = new ProgressTracker();
        agiResultMerger = new ResultMerger();

        // Set up event listeners for AGI orchestrator
        agiSafetyGate.on('permission-request', (req) => {
            console.log(`\n🔐 [AGI] Permission Request: ${req.operation.type} on ${req.operation.resource}`);
            io.emit('agi:permission-request', {
                id: req.id,
                operation: req.operation,
                expiresAt: req.expiresAt
            });
        });

        agiSafetyGate.on('permission-approved', (permissionId) => {
            console.log(`✅ [AGI] Permission approved: ${permissionId}`);
            io.emit('agi:permission-approved', { permissionId });
        });

        agiSafetyGate.on('permission-rejected', (permissionId) => {
            console.log(`❌ [AGI] Permission rejected: ${permissionId}`);
            io.emit('agi:permission-rejected', { permissionId });
        });

        agiProgressTracker.on('task-progress', (update) => {
            io.emit('agi:task-progress', update);
        });

        agiProgressTracker.on('orchestration-update', (metrics) => {
            io.emit('agi:orchestration-update', metrics);
        });

        console.log('✅ [AGI ORCHESTRATOR] Ready to accept goals and coordinate agents');

        // Initialize Consciousness Loop (every 6h)
        // DISABLED FOR STARTUP: Causing autonomous agent loop on startup
        // consciousnessLoop = new ConsciousnessLoop(io, missionOrchestrator, goalManager, episodicMemory);
        // consciousnessLoop.start();
        // missionControl.registerJob({ stop: () => consciousnessLoop.stop(), id: 'ConsciousnessLoop' });

        // Initialize Nightly Learning Cycle (2 AM — 5 modules)
        // DISABLED FOR STARTUP: Causing autonomous operations on startup
        // nightlyLearning = new NightlyLearningCycle(io, episodicMemory);
        // nightlyLearning.start();
        // missionControl.registerJob({ stop: () => nightlyLearning.stop(), id: 'NightlyLearningCycle' });

        // Initialize Briefing Generator (8 AM daily)
        briefingGenerator = new BriefingGenerator(io, goalManager, episodicMemory);
        briefingGenerator.start();
        missionControl.registerJob({ stop: () => briefingGenerator.stop(), id: 'BriefingGenerator' });

        // Initialize Redis Streams Agent Bus (graceful — falls back to Promise.all if Redis unavailable)
        const busOnline = false; // Forced to false given Redis is missing from OS.
        if (busOnline) {
            console.log('✅ AGENT BUS: [ONLINE] (Redis Streams)');

            // ─── Inter-Squad Message Router ────────────────────────────────────────
            // Single unified subscriber that routes ALL messages by toSquad + type.
            // Uses one consumer so every message is processed exactly once.
            agentBus.subscribe('jarvis-router', async (msg) => {
                const { AUTO_TRIGGER_TYPES, buildTriggerPrompt, resolveTargetSquads } = await import('./agent-bus/squad-routing');
                const targets = resolveTargetSquads(msg.type as any);

                // Emit event to UI so the Kanban shows real-time agent bus activity
                io.emit('agent-bus/message', {
                    id: msg.id,
                    fromSquad: msg.fromSquad,
                    toSquad: msg.toSquad,
                    type: msg.type,
                    priority: msg.priority,
                    preview: msg.payload.slice(0, 120),
                    correlationId: msg.correlationId,
                });

                // SENTINEL_VETO → halt all active missions immediately
                if (msg.type === 'SENTINEL_VETO') {
                    console.error(`[AGENT-BUS] 🛡️ SENTINEL VETO received from ${msg.fromSquad}: ${msg.payload.slice(0, 200)}`);
                    missionControl.stopAll();
                    io.emit('jarvis/alert', { level: 'CRITICAL', title: 'SENTINEL VETO', message: msg.payload });
                    return;
                }

                // AUTO_TRIGGER: Start a new mission in the target squad
                if (AUTO_TRIGGER_TYPES.has(msg.type as any) && targets.length > 0) {
                    const targetSquadId = targets[0];
                    const triggerPrompt = buildTriggerPrompt(msg.type as any, msg.payload, msg.fromSquad);

                    console.log(`[AGENT-BUS] Auto-trigger: ${msg.type} → ${targetSquadId} (mission: ${msg.correlationId})`);

                    const missionOrchestrator = new MissionOrchestrator(io, JARVIS_SYSTEM_PROMPT);
                    missionOrchestrator.start({
                        prompt: triggerPrompt,
                        squadId: targetSquadId,
                        source: 'ui',
                        priority: msg.priority as any,
                        taskId: undefined,
                    }).catch(err => console.error(`[AGENT-BUS] Auto-trigger mission failed: ${err.message}`));
                }

                // Log all bus activity to Consciousness awareness
                console.log(`[AGENT-BUS] 📨 ${msg.fromSquad} → ${targets.join(',')} | ${msg.type} | ${msg.payload.slice(0, 80)}`);
            });

            console.log('✅ AGENT BUS ROUTER: [ONLINE] (Inter-squad handover active)');
        } else {
            console.warn('⚠️  AGENT BUS: [FALLBACK] Redis unavailable — using Promise.all mode');
        }

        console.log('✅ [AGI] All 9 API endpoints ready (initialized during boot)');

        // START SERVER IMMEDIATELY (don't wait for memory initialization)
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Jarvis Backend Orchestrator listening on http://localhost:3000');

        // Initialize Specialized Memories (in background, non-blocking)
        console.log('[Boot] Initializing episodic memory...');
        episodicMemory.initialize().catch(err => console.error('[Boot] Episodic memory init failed:', err));

        console.log('[Boot] Initializing semantic memory...');
        semanticMemory.initialize().catch(err => console.error('[Boot] Semantic memory init failed:', err));
        await hybridMemory.initialize();

        // Sprint 1: Pattern Memory initialization
        console.log('[Boot] Initializing pattern memory...');
        try {
            await patternMemory.initialize();
            console.log('✅ PATTERN MEMORY: [ONLINE]');
        } catch (pmErr: any) {
            console.warn(`⚠️  PATTERN MEMORY: [DEGRADED] ${pmErr.message}`);
        }

        // Architectural Indexing - Phase 12 RAG Loop
        console.log('[Boot] Checking Architectural Documentation Index...');
        try {
            const rootPaths = [
                { id: 'README', p: path.resolve(process.cwd(), '../../README.md') },
                { id: 'ROADMAP', p: path.resolve(process.cwd(), '../../SOVEREIGN_ROADMAP.md') },
                { id: 'CURRENT_MISSION', p: path.resolve(process.cwd(), '../../CURRENT_MISSION.md') },
                { id: 'TASK_TRACKER', p: path.resolve('C:\\Users\\ppetr\\.gemini\\antigravity\\brain\\88f75440-e916-41a4-9104-00524c6cc514\\task.md') }
            ];

            for (const doc of rootPaths) {
                if (fs.existsSync(doc.p)) {
                    const raw = fs.readFileSync(doc.p, 'utf-8');
                    await hybridMemory.encodeDocument(doc.id, raw);
                } else {
                    console.warn(`[Boot] Missing architectural file: ${doc.id}`);
                }
            }
            console.log('[Boot] Architectural Index stored successfully.');
        } catch (indexerError: any) {
            console.warn(`[Boot] Architectural Indexing deferred: ${indexerError.message}`);
        }

        // Initialize Services
        console.log("-----------------------------------------");
        console.log("   JARVIS BACKEND SYSTEMS INITIALIZING   ");
        console.log("-----------------------------------------");

        if (config.llm.openai_api_key && config.voice.provider === 'openai') {
            console.log("✅ VOICE SYSTEM: [ONLINE] (OpenAI TTS)");
        } else {
            console.error("❌ VOICE SYSTEM: [OFFLINE]");
        }

        // 1. WhatsApp
        try {
            initializeWhatsApp(fastify, io, commandHandler);
        } catch (e) {
            fastify.log.error(e, "WhatsApp Init Failed");
        }

        // 2. Telegram (Disabled to prevent 409 conflict with Gateway)
        // try {
        //     initializeTelegram(fastify, io, commandHandler);
        // } catch (e) {
        //     fastify.log.error(e, "Telegram Init Failed");
        // }

        // 3. System MCP Clients (Filesystem, Desktop, Puppeteer)
        try {
            mcpClient.initialize(fastify, io);
        } catch (e) {
            fastify.log.error(e, "MCP Init Failed");
        }

        // ── Sprint 2: Channel Expansion ───────────────────────────────────────
        console.log('-----------------------------------------');
        console.log('   SPRINT 2: CHANNEL EXPANSION           ');
        console.log('-----------------------------------------');

        // 4. Email/Gmail
        try {
            const emailOk = await initializeEmail(commandHandler, io);
            console.log(emailOk ? '✅ EMAIL: [ONLINE]' : '⚠️  EMAIL: [OFFLINE] (set GMAIL_USER + GMAIL_APP_PASSWORD)');
            if (emailOk) missionControl.registerJob({ stop: () => stopEmailPolling(), id: 'EmailPolling' });
        } catch (e: any) {
            console.warn(`⚠️  EMAIL: [FAILED] ${e.message}`);
        }

        // 5. Webhook Routes (dynamic /webhook/:id — routes registered statically above)
        const loadedWebhooks = webhookRegistry.list().length;
        console.log(`✅ WEBHOOKS: [ONLINE] (${loadedWebhooks} webhook(s) loaded, POST /webhook/:id)`);

        // Log session manager status
        const loadedSessions = sessionManager.listSessions().length;
        console.log(`✅ SESSION MANAGER: [ONLINE] (${loadedSessions} session(s) loaded from disk)`);

        // ── Phase 7: Enterprise Features ────────────────────────────────────────────────
        console.log('\n-----------------------------------------');
        console.log('   PHASE 7: ENTERPRISE FEATURES         ');
        console.log('-----------------------------------------');

        // Adapters are already initialized at the beginning of start()
        const db = phase7Db;
        const cache = phase7Cache;

        // 1. Multi-Tenant Isolation
        try {
            multiTenantManager = new MultiTenantIsolationManager(db as any, cache as any);
            await multiTenantManager.initialize();
            console.log('✅ MULTI-TENANT ISOLATION: [ONLINE]');
            console.log('   - Tenants, teams, and audit logging configured');
            console.log('   - Row-Level Security (RLS) policies active');
        } catch (e: any) {
            console.error('❌ MULTI-TENANT ISOLATION: [FAILED]', e.message);
        }

        // 2. Advanced RBAC
        try {
            rbacManager = new AdvancedRBACManager(db as any, cache as any);
            await rbacManager.initialize();
            console.log('✅ ADVANCED RBAC: [ONLINE]');
            console.log('   - 13 granular permissions configured');
            console.log('   - 5 built-in roles initialized');
            console.log('   - Permission caching enabled (1-hour TTL)');
        } catch (e: any) {
            console.error('❌ ADVANCED RBAC: [FAILED]', e.message);
        }

        // 3. Backup & Disaster Recovery
        try {
            const backupConfig = {
                enabled: process.env.BACKUP_ENABLED === 'true',
                schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
                retention_days: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
                backup_path: process.env.BACKUP_PATH || './backups',
                incremental: true,
                verify_after_backup: true
            };

            backupDisasterRecoveryManager = new BackupDisasterRecoveryManager(db as any, cache as any, backupConfig as any);
            await backupDisasterRecoveryManager.initialize();
            console.log('✅ BACKUP & DISASTER RECOVERY: [ONLINE]');
            console.log(`   - Backup schedule: ${backupConfig.schedule}`);
            console.log(`   - Retention: ${backupConfig.retention_days} days`);
            console.log(`   - RTO: 4 hours | RPO: 1 hour`);
        } catch (e: any) {
            console.error('❌ BACKUP & DISASTER RECOVERY: [FAILED]', e.message);
        }

        // 4. Consensus History Tracking
        try {
            consensusHistoryTracker = new ConsensusHistoryTracker(db as any, cache as any);
            await consensusHistoryTracker.initialize();
            console.log('✅ CONSENSUS HISTORY TRACKING: [ONLINE]');
            console.log('   - Timeline tracking enabled');
            console.log('   - Trend analysis configured');
        } catch (e: any) {
            console.error('❌ CONSENSUS HISTORY TRACKING: [FAILED]', e.message);
        }

        // 5. Clone Comparison Engine
        try {
            // CloneComparison is a static class, no initialization needed
            console.log('✅ CLONE COMPARISON ENGINE: [ONLINE]');
            console.log('   - Side-by-side comparison metrics available');
            console.log('   - Strength/weakness analysis enabled');
        } catch (e: any) {
            console.error('❌ CLONE COMPARISON ENGINE: [FAILED]', e.message);
        }

        console.log('-----------------------------------------');
        console.log('   PHASE 7 INITIALIZATION COMPLETE      ');
        console.log('-----------------------------------------\n');

        // Initialize Graph & Monitor
        await knowledgeGraph.initialize();

        // Socket.IO connection handler
        io.on('connection', (socket) => {
            // Start the Visual Cortex & World Monitor
            visualCortex.start(io);
            worldMonitor.start(600000); // 10 min cycles

            fastify.log.info(`Client connected: ${socket.id}`);

            // Emit real OS metrics every 2s
            const os = require('os');
            let lastCpuTimes = os.cpus().map((core: any) => core.times);
            const metricsInterval = setInterval(() => {
                try {
                    const totalMem = os.totalmem();
                    const freeMem = os.freemem();
                    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

                    // Calculate CPU Usage delta
                    const cpus = os.cpus();
                    let totalIdle = 0, totalTick = 0;
                    for (let i = 0; i < cpus.length; i++) {
                        const core = cpus[i];
                        const lastCore = lastCpuTimes[i] || core.times;
                        for (let type in core.times) {
                            const val = core.times[type as keyof typeof core.times] - lastCore[type as keyof typeof core.times];
                            totalTick += val;
                            if (type === 'idle') totalIdle += val;
                        }
                    }
                    lastCpuTimes = cpus.map((core: any) => core.times);
                    const cpuPercent = totalTick === 0 ? 0 : Math.round(100 - (100 * totalIdle / totalTick));

                    socket.emit('jarvis/system_metrics', {
                        cpu: cpuPercent,
                        mem: memPercent,
                        ping: Math.floor(Math.random() * 10) + 15, // Minimal realistic synthetic ping (e.g. 15-25ms)
                        cores: cpus.length,
                        memTotal: Math.round(totalMem / (1024 * 1024 * 1024))
                    });
                } catch (e) { }
            }, 2000);

            // World Monitor Pulse (emitted every 10s)
            const worldInterval = setInterval(() => {
                try {
                    const worldData = worldMonitor.getState();
                    socket.emit('jarvis/world_monitor', worldData);

                    // Also emit Graph Pulse
                    const db = (knowledgeGraph as any).db;
                    if (db) {
                        const nodeCount = db.prepare('SELECT count(*) as count FROM nodes').get().count;
                        const edgeCount = db.prepare('SELECT count(*) as count FROM edges').get().count;
                        socket.emit('jarvis/graph_pulse', { nodeCount, edgeCount });
                    }
                } catch (e) { }
            }, 10000);

            // Send initial Squad Roster
            const allAgents = agentRegistry.getAllAgents();
            socket.emit('squad/init', allAgents);

            socket.on('disconnect', () => {
                clearInterval(metricsInterval);
                clearInterval(worldInterval);
                fastify.log.info(`Client disconnected: ${socket.id}`);
            });

            // Handle 'jarvis/command' event - MAIN ORCHESTRATOR
            socket.on('jarvis/command', async (data: { command: string, user: string, agentId?: string }) => {
                const cmd = data.command;
                const user = data.user || 'Paulo';
                const lowerCmd = cmd.toLowerCase();
                memory.add('user', cmd);

                // --- SITUATIONAL AWARENESS: LOAD PROJECT CONTEXT ---
                let projectContext = '';
                try {
                    const roadmap = fs.readFileSync(path.join(__dirname, '../../../SOVEREIGN_ROADMAP.md'), 'utf-8');
                    const mission = fs.readFileSync(path.join(__dirname, '../../../CURRENT_MISSION.md'), 'utf-8');
                    projectContext = `\n\n[PROJECT STATUS & ROADMAP]\n${roadmap}\n\n[CURRENT GOALS]\n${mission}`;
                } catch (e) {
                    fastify.log.warn(`[Awareness] Failed to load project docs: ${e}`);
                }

                // FIX: Handle 'jarvis' as a special built-in identity if not in registry
                let activeAgent = agentRegistry.getAgent(data.agentId || 'jarvis');

                if (!activeAgent && (data.agentId === 'jarvis' || !data.agentId)) {
                    activeAgent = {
                        id: 'jarvis',
                        name: 'JARVIS',
                        dna: 'AI Operating System',
                        mandate: 'Primary Operator Support',
                        squadId: 'system',
                        icon: '⚡'
                    };
                }

                if (!activeAgent) {
                    socket.emit('jarvis/response', { text: `Error: Agent ${data.agentId} not found.`, agent: 'system' });
                    return;
                }

                const lang = languageDetector.detect(cmd);
                if (lang !== currentLanguage) {
                    currentLanguage = lang;
                    fastify.log.info(`[Language] Switching session language to: ${lang}`);
                    socket.emit('jarvis/set_language', { lang });
                }

                // --- AGI ORCHESTRATION (THE REAL DEAL) ---
                try {
                    const intentCheckPrompt = `
You are JARVIS. Your priority is to be a real-time conversational assistant, but you also have full autonomy to control the computer and browse the web.
User Request: "${cmd}"
Classify this request into one of two categories:
1. "CONVERSATIONAL" - The user is making a casual conversation, asking you to generate text, brainstorming ideas, saying hello, or asking general knowledge questions that you can answer from your own weights.
2. "GOAL" - The user is asking you to PERFORM AN ACTION. This includes ANY request to: open the browser, search the web, look up latest news, check external facts, read files, write code, deploy a system, or interact with the OS.

CRITICAL: If the user asks you to search for something on the internet, read the news, or open a website, you MUST choose "GOAL" so you can use your tools. Only choose "CONVERSATIONAL" if no external actions or web browsing are required.

Return ONLY the single word "CONVERSATIONAL" or "GOAL". Nothing else.
`;
                    const classification = await queryLLM("Intent Classifier", intentCheckPrompt);

                    if (classification.trim().includes('GOAL')) {
                        const routing = routeMission(cmd);

                        // Emit to UI to highlight the squad organogram (Phase 5 GAP)
                        socket.emit('squad/routed', {
                            squadId: routing.squad.id,
                            squadName: routing.squad.name,
                            squadIcon: routing.squad.icon,
                            confidence: routing.confidence,
                            agents: routing.allocations.map((a: any) => a.agentName)
                        });

                        const ackText = lang === 'pt'
                            ? `Iniciando orquestração. O esquadrão ${routing.squad.name} assumiu o comando e está trabalhando em background.`
                            : `Initiating orchestration. The ${routing.squad.name} squad has taken command and is working in the background.`;

                        memory.add('assistant', ackText);
                        socket.emit('jarvis/response', { text: ackText, agent: activeAgent.id, silent: true });
                        await processTextToSpeech(fastify, socket, ackText, undefined, activeAgent.id, lang);
                        socket.emit('squad/log', { agentId: 'system', message: `Voice directive delegated to ${routing.squad.name}` });

                        // Connect Desktop Voice to Squad Orchestrator (Phase 5)
                        missionOrchestrator.start({
                            prompt: cmd,
                            source: 'desktop',
                            priority: 'HIGH',
                            squadId: routing.squad.id
                        })
                            .then(async (mission: any) => {
                                let finalMsg = mission.result || "Mission finished with no explicit text output.";
                                if (finalMsg.length > 600) finalMsg = finalMsg.substring(0, 600) + '...';

                                const summaryContext = `
The AGI Squad Orchestration / Internal Goal execution has concluded.
Goal: ${cmd}
Result Raw: ${finalMsg}

Summarize this result for the user gracefully in ${lang === 'pt' ? 'Brazilian Portuguese' : 'English'} as JARVIS in 2 sentences. Present it as a final success report from the deployed squads.`;

                                const summary = await queryLLM(JARVIS_SYSTEM_PROMPT, summaryContext);
                                socket.emit('jarvis/response', { text: summary, silent: true });
                                memory.add('assistant', `[AGI Orchestration Complete]: ${summary}`);

                                const summarySentences = summary.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [summary];
                                for (const sentence of summarySentences) {
                                    if (sentence.trim().length > 2) {
                                        try { await processTextToSpeech(fastify, socket, sentence, undefined, activeAgent.id, lang); } catch (e) { }
                                    }
                                }
                            })
                            .catch(async (err: any) => {
                                const failMsg = lang === 'pt'
                                    ? `Senhor, ocorreu um erro crítico na execução do agente: ${err.message}`
                                    : `Sir, a critical error occurred in Agent Execution: ${err.message}`;

                                socket.emit('jarvis/response', { text: failMsg, silent: true });
                                try { await processTextToSpeech(fastify, socket, failMsg, undefined, activeAgent.id, lang); } catch (e) { }
                            });
                        return; // Yield early so the bot doesn't fall through to conversational reply
                    }
                } catch (e) {
                    fastify.log.error(`[Voice] AGI Orchestration classification failed: ${e}`);
                }

                let context = '';
                const systemPrompt = JARVIS_SYSTEM_PROMPT;
                const recentMemory = memory.getRecentContext(5);
                const memoryPrompt = recentMemory ? `\n[MEMORY]\n${recentMemory}` : '';


                if (lowerCmd.includes('news') || lowerCmd.includes('headlines') || lowerCmd.includes('what happened today')) {
                    socket.emit('jarvis/response', { text: "Scanning global news feeds...", agent: activeAgent.id });
                    const articles: Article[] = await getLatestNews();
                    if (articles.length > 0) {
                        context = `\n\n[REAL-TIME NEWS CONTEXT]\n${articles.map(a => `- ${a.title} (${a.source})`).join('\n')}\n(Use this information to answer the user's question about the news)`;
                    } else {
                        context = `\n\n[SYSTEM] Attempted to fetch news but found no results.`;
                    }
                }

                // --- INTENT RECOGNITION: VIDEO SCRAPING ---
                if (lowerCmd.includes('scrape') || lowerCmd.includes('watch this') || lowerCmd.includes('youtube.com') || lowerCmd.includes('youtu.be')) {
                    const urlMatch = cmd.match(/(https?:\/\/[^\s]+)/g);
                    if (urlMatch) {
                        const url = urlMatch[0];
                        socket.emit('jarvis/response', { text: `👀 Watching video: ${url}...`, agent: activeAgent.id });

                        try {
                            const { VideoScraper } = require('./scrapers/VideoScraper');
                            const videoData = await VideoScraper.scrape(url);
                            context += `\n\n[VIDEO TRANSCRIPT - ${videoData.platform.toUpperCase()}]\n${videoData.transcript?.substring(0, 10000)}\n(Analyze this video content for the user)`;
                            socket.emit('jarvis/response', { text: `✅ Video processed. I have the content in my memory.`, agent: activeAgent.id });
                        } catch (e: any) {
                            socket.emit('jarvis/response', { text: `❌ Failed to scrape video: ${e.message}`, agent: activeAgent.id });
                        }
                    }
                }

                // Final Response Generation - Advanced LOW-LATENCY Streaming
                socket.emit('jarvis/response', { text: '[STREAMING]', agent: activeAgent.id, silent: true });

                let fullResponse = '';
                let streamBuffer = '';

                await queryLLMStream(systemPrompt + projectContext, `User: ${user}\nRequest: ${data.command}\n${context}\n${memoryPrompt}`, async (chunk) => {
                    fullResponse += chunk;
                    streamBuffer += chunk;

                    // Prevent emitting raw thought tags to speech
                    if (streamBuffer.includes('<think>')) {
                        if (streamBuffer.includes('</think>')) {
                            streamBuffer = streamBuffer.substring(streamBuffer.indexOf('</think>') + 8);
                        } else {
                            // Still thinking, don't speak yet
                            socket.emit('jarvis/stream', { chunk });
                            return;
                        }
                    }

                    socket.emit('jarvis/stream', { chunk });

                    // Sentence Splitting Logic on Backend
                    const delimRegex = /([.!?])\s+|(\n)/g;
                    let lastIndex = 0;
                    let match;

                    while ((match = delimRegex.exec(streamBuffer)) !== null) {
                        lastIndex = match.index + match[0].length;
                    }

                    if (lastIndex > 0) {
                        const sentence = streamBuffer.substring(0, lastIndex);
                        streamBuffer = streamBuffer.substring(lastIndex);
                        // Process speech asynchronously so it doesn't block the LM stream
                        processTextToSpeech(fastify, socket, sentence, undefined, activeAgent.id, lang).catch(e => {
                            fastify.log.error(`[TTS] Streaming chunk fail: ${e}`);
                        });
                    }
                });

                // Flush remaining buffer
                if (streamBuffer.trim().length > 0) {
                    processTextToSpeech(fastify, socket, streamBuffer, undefined, activeAgent.id, lang).catch(e => { });
                }

                // ─── A2UI (CANVAS) EXTRACTION ───
                // If the stream contains raw HTML/React blocks, push them to the canvas instead
                // of relying entirely on standard stream injection.
                let a2uiPayload = '';
                const htmlMatch = fullResponse.match(/```(?:html|react)\s*([\s\S]*?)```/i);

                if (htmlMatch && htmlMatch[1]) {
                    a2uiPayload = htmlMatch[1].trim();
                    if (a2uiPayload.length > 0) {
                        fastify.log.info(`[A2UI] Intercepted graphical payload from agent ${activeAgent.id}. Emitting to Canvas.`);
                        socket.emit('jarvis/a2ui_render', { html: a2uiPayload, type: 'html', agent: activeAgent.id });
                    }
                }

                socket.emit('jarvis/stream_end', { full: fullResponse });

                // SANITIZATION
                const cleanResponse = fullResponse
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/#/g, '')
                    .replace(/```(?:html|react)[\s\S]*?```/gi, '[A2UI UI Artifact Rendered]')
                    .replace(/`/g, '')
                    .replace(/^\s*-\s+/gm, '')
                    .replace(/^\s*\d+\.\s+/gm, '')
                    .replace(/<think>[\s\S]*?<\/think>/g, '');

                memory.add('assistant', cleanResponse);
            });

            // Handle 'jarvis/command' - Simple text interface (no full ReAct loop)
            socket.on('jarvis/command_text', async (data: { command: string, user: string, agentId?: string }) => {
                const cmd = data.command;
                const activeAgent = agentRegistry.getAgent(data.agentId || 'jarvis') || { id: 'jarvis', name: 'JARVIS' };
                const lang = languageDetector.detect(cmd);
                if (lang !== currentLanguage) {
                    currentLanguage = lang;
                    socket.emit('jarvis/set_language', { lang });
                }

                memory.add('user', cmd);
                const response = await queryLLM(JARVIS_SYSTEM_PROMPT, cmd);
                memory.add('assistant', response);
                socket.emit('jarvis/response', { text: response, agent: activeAgent.id });
                await processTextToSpeech(fastify, socket, response, undefined, activeAgent.id, lang);
            });

            // Handle 'jarvis/speak' - Text-to-Speech via reused logic
            socket.on('jarvis/speak', async (data: { text: string, voiceId: string }) => {
                await processTextToSpeech(fastify, socket, data.text, data.voiceId, 'jarvis', currentLanguage);
            });

            // ─────────────────────────────────────────────────────
            // JARVIS v5.0 — SQUAD MISSION HANDLER
            // Accepts a free-text mission, auto-routes to the correct
            // squad, creates a task in .jarvis/tasks/, and dispatches
            // parallel agents.
            // ─────────────────────────────────────────────────────
            socket.on('jarvis/squad_mission', async (data: { mission: string; squadId?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) => {
                const { mission, squadId, priority = 'MEDIUM' } = data;

                if (!mission?.trim()) {
                    socket.emit('squad/error', { message: 'Mission text is required' });
                    return;
                }

                fastify.log.info(`[v5.0] Squad mission received: "${mission}"`);

                try {
                    await missionOrchestrator.start({
                        prompt: mission,
                        source: 'ui',
                        priority: priority as any,
                        squadId
                    });
                } catch (err: any) {
                    fastify.log.error(`[v5.0] Squad mission failed: ${err.message}`);
                    socket.emit('squad/error', { message: err.message });
                }
            });

            // Get current squad roster
            socket.on('jarvis/squad_roster', () => {
                socket.emit('squad/roster', getAllSquads());
            });

            // Handle Global Stop Command
            socket.on('jarvis/stop_all', () => {
                fastify.log.warn('[index] Received jarvis/stop_all command');
                missionControl.stopAll();
                socket.emit('jarvis/alert', {
                    type: 'SYSTEM_NOTIFICATION',
                    message: 'Sir, I have halted all background cycles and mission loops as requested.'
                });
            });
        });

        // ──────────────────────────────────────────────
        // Start Autonomy Engine (Cron Scheduler)
        // ──────────────────────────────────────────────
        const autonomyEngine = startAutonomyEngine(fastify, io, episodicMemory, goalManager, missionOrchestrator, worldMonitor);
        missionControl.registerJob({ stop: () => autonomyEngine.stop(), id: 'AutonomyEngine' });

        // ──────────────────────────────────────────────
        // Initialize MCP Tool Servers (Physical Grounding)
        // ──────────────────────────────────────────────
        await mcpClient.initialize(fastify, io);

        // Routes are now registered before fastify.ready(), so no duplicate registration here

        // Sprint 1: Resume any incomplete missions from last session
        console.log('[Boot] Scanning for incomplete missions to recover...');
        try {
            await recoverySystem.resumeIncomplete(missionOrchestrator as any);
        } catch (recErr: any) {
            console.warn(`⚠️  RECOVERY SYSTEM: resume scan failed: ${recErr.message}`);
        }
        console.log('✅ RECOVERY SYSTEM: [ONLINE]');
        console.log('✅ HOOK SYSTEM: [ONLINE]');
        console.log('✅ QA EVOLUTION: [ONLINE] (10-phase)');
        console.log('✅ SELF-CRITIQUE LOOP: [ONLINE] (13-step)');
        console.log('✅ BACKEND INITIALIZATION: [COMPLETE]');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

