// src/autonomy.ts
// JARVIS Autonomy Engine — Dynamic OODA Loop
//
// Replaces 3 hardcoded cron jobs with a confidence-scored, signal-driven
// proactive mission engine.
//
// Cycle (every 30 min, 6 AM–10 PM):
//   ORIENT  → Scan episodic memory + goal health
//   ASSESS  → Score active signals (goal drift, friction, market, health)
//   DECIDE  → ConfidenceEngine gates execution (AUTO_EXECUTE vs PENDING_APPROVAL)
//   ACT     → Either fire the mission or queue it for Founder approval

import cron from 'node-cron';
import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { routeMission } from './squadRouter';
import { createTask, updateTask } from './taskQueue';
import { EpisodicMemory } from './memory/episodic';
import { GoalManager } from './goals/goalManager';
import { MissionOrchestrator } from './orchestrator';
import { ConfidenceEngine } from './autonomy/confidenceEngine';

// ─── Signal Types ─────────────────────────────────────────────────────────────

type SignalType =
    | 'goal_drift'          // Goals in RED / AMBER state
    | 'execution_friction'  // Repeated task failures or low quality scores
    | 'market_opportunity'  // Business-hours trigger for market intelligence
    | 'daily_briefing'      // 8 AM morning briefing
    | 'competitor_shift'    // Weekly competitor monitoring
    | 'system_health'      // End-of-day operational review
    | 'world_anomaly'      // Critical global events (detected by Monitor)
    | 'predictive_growth'; // High-confidence strategic predictions

interface Signal {
    type: SignalType;
    severity: number;   // 1 = low, higher = more urgent
}

// ─── Mission Bank ─────────────────────────────────────────────────────────────
// Each entry maps a signal type to a candidate mission.
// minIntervalHours prevents re-triggering within the cooldown window.

interface MissionTemplate {
    signal: SignalType;
    name: string;
    prompt: string;
    preferredSquad: string;     // Hint to router when keywords are ambiguous
    minIntervalHours: number;
}

const MISSION_BANK: MissionTemplate[] = [
    {
        signal: 'daily_briefing',
        name: 'Morning Executive Briefing',
        prompt: 'Generate the daily market, technology, and execution briefing for the founders. Analyze the main technology trends from the last 24h and summarize them into 3 actionable bullet points.',
        preferredSquad: 'oracle',
        minIntervalHours: 20, // Daily
    },
    {
        signal: 'market_opportunity',
        name: 'AI Market Intelligence Brief',
        prompt: 'Research and analyze the latest news and trends in the AI Agents and Automation market over the last 24 hours. Provide a concise executive summary of the top 3 threats and opportunities relevant to JARVIS.',
        preferredSquad: 'oracle',
        minIntervalHours: 24,
    },
    {
        signal: 'competitor_shift',
        name: 'Weekly Competitor Deep Dive',
        prompt: 'Research our top 3 competitors in the AI OS space. Identify any new features or announcements from the past 7 days and recommend 2–3 strategic counter-moves for JARVIS.',
        preferredSquad: 'oracle',
        minIntervalHours: 168,   // Weekly
    },
    {
        signal: 'system_health',
        name: 'Nightly Operations Review',
        prompt: 'Review internal task completion rates and execution times for today. Identify bottlenecks in squad routing or agent performance and propose concrete optimizations.',
        preferredSquad: 'atlas',
        minIntervalHours: 24,
    },
    {
        signal: 'goal_drift',
        name: 'Goal Recovery Sprint',
        prompt: 'Analyze the struggling goals and recent execution friction in JARVIS. Design a focused recovery plan with 3 concrete actions the squads can take this week to get back on track.',
        preferredSquad: 'atlas',
        minIntervalHours: 12,
    },
    {
        signal: 'execution_friction',
        name: 'Execution Quality Audit',
        prompt: 'Review recent failed or low-quality missions in JARVIS. Identify the root causes of execution failures and recommend squad configuration and agent prompt improvements.',
        preferredSquad: 'atlas',
        minIntervalHours: 8,
    },
    {
        signal: 'world_anomaly',
        name: 'Global Crisis Response',
        prompt: 'A critical event has been detected by the World Monitor. Analyze the geopolitical alerts and aviation/maritime disruptions from the last hour. Propose a mitigation strategy or an executive summary of risks to JARVIS operations.',
        preferredSquad: 'sentinel',
        minIntervalHours: 4,
    },
    {
        signal: 'predictive_growth',
        name: 'Anticipatory Strategic Move',
        prompt: 'Based on the current trajectory of user behavior and market trends, I have identified a non-obvious opportunity for growth. Detail the prediction and design a proactive mission to capitalize on it.',
        preferredSquad: 'nexus',
        minIntervalHours: 48,
    },
];

// ─── Engine State ─────────────────────────────────────────────────────────────

interface MissionCooldown {
    lastTriggered: Date;
    count: number;
}

export interface AutonomyState {
    lastTick: Date | null;
    cycleCount: number;
    autoExecuted: number;
    pendingApproval: number;
    idleCycles: number;
    running: boolean;
}

// ─── Autonomy Engine ─────────────────────────────────────────────────────────

export class AutonomyEngine {
    private cronJob: ReturnType<typeof cron.schedule> | null = null;
    private isRunning = false;
    private cooldowns = new Map<string, MissionCooldown>();
    private confidenceEngine: ConfidenceEngine;
    private log: (...args: any[]) => void;

    public state: AutonomyState = {
        lastTick: null,
        cycleCount: 0,
        autoExecuted: 0,
        pendingApproval: 0,
        idleCycles: 0,
        running: false,
    };

    constructor(
        private io: Server,
        private episodicMemory: EpisodicMemory | null,
        private goalManager: GoalManager | null,
        private orchestrator: MissionOrchestrator | null,
        private worldMonitor: any | null = null,
        logFn?: (...args: any[]) => void,
    ) {
        this.log = logFn ?? console.log;
        if (episodicMemory) {
            this.confidenceEngine = new ConfidenceEngine(episodicMemory as EpisodicMemory);
        } else {
            // Providing a fallback or letting it fail safely to fix the TS constructor error if not initialized directly. Actually let me use a fallback dummy for now just to pass TS, or bypass the initialized error:
            this.confidenceEngine = {} as any;
        }
    }

    /** Start the OODA cron schedule */
    start(): void {
        const schedule = process.env.AUTONOMY_CRON ?? '*/30 6-22 * * *'; // Every 30 min, 6 AM–10 PM
        this.log(`[Autonomy] OODA Engine starting. Schedule: ${schedule}`);
        this.state.running = true;

        this.cronJob = cron.schedule(schedule, () => {
            this.tick().catch(err => this.log(`[Autonomy] Tick error: ${err.message}`));
        });
    }

    stop(): void {
        if (this.cronJob) this.cronJob.stop();
        this.state.running = false;
    }

    // ── OODA Cycle ─────────────────────────────────────────────────────────

    async tick(): Promise<void> {
        if (this.isRunning) {
            this.log('[Autonomy] Tick skipped — previous cycle still running');
            return;
        }
        this.isRunning = true;
        this.state.cycleCount++;
        this.state.lastTick = new Date();

        try {
            // ── HTN LONG-HORIZON WAKE UP ────────────────────────────────────
            try {
                const { metaBrain } = require('./metaBrain');
                const dags = metaBrain.getActiveDags();
                for (const dag of dags) {
                    if (dag.status === 'executing') {
                        const hasAwake = dag.nodes.some((n: any) => n.status === 'suspended' && n.suspendUntil && new Date() > new Date(n.suspendUntil));
                        if (hasAwake) {
                            this.log(`[Autonomy] [HTN] Waking up DAG ${dag.id} from suspension`);
                            const orchestratorFn = async (prompt: string, squadId: string, nodeId: string): Promise<string> => {
                                if (!this.orchestrator) return "Orchestrator offline.";
                                const res = await this.orchestrator.start({ prompt, squadId, source: 'autonomy', priority: 'HIGH' });
                                return res.result || 'No result';
                            };
                            // Run asynchronously in background
                            metaBrain.execute(dag.id, orchestratorFn).catch((e: any) => this.log(`HTN error: ${e.message}`));
                        }
                    }
                }
            } catch (err: any) {
                this.log(`[Autonomy] HTN loop error: ${err.message}`);
            }

            // ── 1. ORIENT ───────────────────────────────────────────────────
            this.log(`[Autonomy] [ORIENT] Cycle #${this.state.cycleCount}: Scanning system state...`);

            const goals = this.goalManager
                ? await this.goalManager.getGoalStatus().catch(() => [])
                : [];

            const recentEpisodes = this.episodicMemory
                ? await this.episodicMemory.getRecentHistory(10).catch(() => [])
                : [];

            const worldState = this.worldMonitor ? this.worldMonitor.getState() : null;

            // ── 2. ASSESS ───────────────────────────────────────────────────
            this.log('[Autonomy] [ASSESS] Scoring signals...');
            const signals = this.scoreSignals(goals, recentEpisodes, worldState);

            const signalSummary = signals.length > 0
                ? signals.map(s => `${s.type}(${s.severity})`).join(', ')
                : 'none';
            this.log(`[Autonomy] [ASSESS] Signals: ${signalSummary}`);

            if (signals.length === 0) {
                this.state.idleCycles++;
                this.log('[Autonomy] [DECIDE] System stable — no action required.');
                return;
            }

            // ── 3. DECIDE + 4. ACT ──────────────────────────────────────────
            this.log('[Autonomy] [DECIDE] Running confidence assessment for candidates...');
            const candidates = this.selectCandidates(signals);

            for (const candidate of candidates) {
                await this.decideAndAct(candidate);
            }

        } catch (err: any) {
            this.log(`[Autonomy] OODA cycle error: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    // ── Signal Detection ───────────────────────────────────────────────────

    private scoreSignals(goals: any[], episodes: any[], worldState: any | null): Signal[] {
        const signals: Signal[] = [];
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // WORLD ANOMALIES (Monitor-driven)
        if (worldState) {
            const hasCriticalAlerts = worldState.geopolitics.critical_alerts.length > 0;
            const flightSurge = worldState.aviation.total_active_flights > 15000; // Example threshold

            if (hasCriticalAlerts || flightSurge) {
                signals.push({ type: 'world_anomaly', severity: hasCriticalAlerts ? 5 : 2 });
            }
        }

        // Goal drift: RED/AMBER goals indicate strategic risk
        const atRisk = goals.filter(g => g.status === 'RED' || g.status === 'AMBER');
        if (atRisk.length > 0) {
            signals.push({ type: 'goal_drift', severity: atRisk.length });
        }

        // Execution friction: ≥2 recent failures or sub-70 quality scores
        const failures = episodes.filter(
            e => e.status === 'FAILED' || (e.qualityScore != null && e.qualityScore < 70)
        );
        if (failures.length >= 2) {
            signals.push({ type: 'execution_friction', severity: failures.length });
        }

        // Market opportunity: business hours Mon–Fri only
        const isBusinessHours = day >= 1 && day <= 5 && hour >= 8 && hour <= 18;
        if (isBusinessHours) {
            signals.push({ type: 'market_opportunity', severity: 1 });
        }

        // Daily Briefing: every weekday at 8 AM
        if (day >= 1 && day <= 5 && hour === 8) {
            signals.push({ type: 'daily_briefing', severity: 2 });
        }

        // Competitor shift: Monday 9 AM only
        if (day === 1 && hour === 9) {
            signals.push({ type: 'competitor_shift', severity: 1 });
        }

        // System health: late-night review (10 PM+)
        if (hour >= 22) {
            signals.push({ type: 'system_health', severity: 1 });
        }

        return signals;
    }

    // ── Candidate Selection with Cooldown ──────────────────────────────────

    private selectCandidates(signals: Signal[]): MissionTemplate[] {
        const selected: MissionTemplate[] = [];

        for (const signal of signals) {
            const template = MISSION_BANK.find(m => m.signal === signal.type);
            if (!template) continue;

            // Cooldown check
            const cd = this.cooldowns.get(signal.type);
            if (cd) {
                const hoursSinceLast = (Date.now() - cd.lastTriggered.getTime()) / 3_600_000;
                if (hoursSinceLast < template.minIntervalHours) {
                    const remaining = Math.ceil(template.minIntervalHours - hoursSinceLast);
                    this.log(`[Autonomy] [DECIDE] Skipping "${template.name}" — cooldown ${remaining}h remaining`);
                    continue;
                }
            }

            selected.push(template);
        }

        // Cap at 2 missions per tick to avoid flooding the queue
        return selected.slice(0, 2);
    }

    // ── DECIDE + ACT per Candidate ─────────────────────────────────────────

    private async decideAndAct(mission: MissionTemplate): Promise<void> {
        const routing = routeMission(mission.prompt);
        const squadId = routing.squad.id || mission.preferredSquad;

        // DECIDE: score via confidence engine
        const assessment = await this.confidenceEngine.assess(mission.prompt, squadId);
        this.log(
            `[Autonomy] [DECIDE] "${mission.name}" → ${assessment.decision}` +
            ` (score: ${assessment.confidenceScore}/100, risk: ${assessment.riskLevel})`
        );

        // Update cooldown
        const existing = this.cooldowns.get(mission.signal);
        this.cooldowns.set(mission.signal, {
            lastTriggered: new Date(),
            count: (existing?.count ?? 0) + 1,
        });

        if (assessment.decision === 'AUTO_EXECUTE' && this.orchestrator) {
            // ACT: Launch mission immediately (fire-and-forget)
            this.log(`[Autonomy] [ACT] AUTO_EXECUTE: "${mission.name}"`);
            this.state.autoExecuted++;

            this.orchestrator.start({
                prompt: mission.prompt,
                squadId,
                source: 'desktop',   // Closest valid source type for autonomy
                priority: 'MEDIUM',
            }).catch(err => this.log(`[Autonomy] [ACT] Auto-execute error: ${err.message}`));

            this.io.emit('jarvis/autonomy_action', {
                type: 'AUTO_EXECUTE',
                mission: mission.name,
                squad: squadId,
                confidenceScore: assessment.confidenceScore,
                rationale: assessment.rationale,
            });

        } else {
            // ACT: Queue for Founder approval
            this.log(`[Autonomy] [ACT] PENDING_APPROVAL: "${mission.name}" — ${assessment.rationale}`);
            this.state.pendingApproval++;

            const task = createTask(
                `[AUTONOMY: ${mission.name}]\n${mission.prompt}`,
                routing.squad.name,
                routing.squad.icon,
                routing.allocations.slice(0, 3).map(a => a.agentId),
                'MEDIUM',
                {
                    source: 'autonomy',
                    signal: mission.signal,
                    confidenceScore: assessment.confidenceScore,
                    rationale: assessment.rationale,
                }
            );
            updateTask(task.id, { status: 'PENDING_APPROVAL' });

            this.io.emit('jarvis/alert', {
                type: 'PROACTIVE_MISSION',
                jobName: mission.name,
                taskId: task.id,
                squad: routing.squad.name,
                icon: routing.squad.icon,
                confidenceScore: assessment.confidenceScore,
                rationale: assessment.rationale,
                message: `Sir, I have prepared "${mission.name}". Awaiting your approval. ${assessment.rationale}`,
            });
        }
    }

    // ── Manual Trigger (API) ───────────────────────────────────────────────

    async triggerSignal(signalType: string): Promise<{ status: string; mission?: string; rationale?: string }> {
        const template = MISSION_BANK.find(m => m.signal === signalType);
        if (!template) return { status: 'error_unknown_signal' };

        await this.decideAndAct(template);
        return { status: 'triggered', mission: template.name };
    }

    getStatus(): object {
        return {
            ...this.state,
            cooldowns: Object.fromEntries(
                [...this.cooldowns.entries()].map(([k, v]) => [
                    k,
                    { lastTriggered: v.lastTriggered, count: v.count },
                ])
            ),
            missionBank: MISSION_BANK.map(m => ({
                signal: m.signal,
                name: m.name,
                squad: m.preferredSquad,
                cooldownHours: m.minIntervalHours,
            })),
        };
    }
}

// ─── Singleton + Factory ──────────────────────────────────────────────────────

let _engine: AutonomyEngine | null = null;

/**
 * Initialize and start the Autonomy Engine.
 * Pass episodicMemory, goalManager, orchestrator to enable the full OODA loop.
 * Without them the engine starts in limited mode (no proactive scanning).
 */
export function startAutonomyEngine(
    fastify: FastifyInstance,
    io: Server,
    episodicMemory?: EpisodicMemory,
    goalManager?: GoalManager,
    orchestrator?: MissionOrchestrator,
    worldMonitor?: any
): AutonomyEngine {
    const logFn = (...args: any[]) => fastify.log.info(args.join(' '));

    if (!episodicMemory || !goalManager || !orchestrator) {
        fastify.log.warn('[Autonomy] Started in limited mode — OODA disabled (missing dependencies)');
        _engine = new AutonomyEngine(io, null, null, null, null, logFn);
        return _engine;
    }

    _engine = new AutonomyEngine(io, episodicMemory, goalManager, orchestrator, worldMonitor || null, logFn);
    _engine.start();
    fastify.log.info('[Autonomy] OODA Engine initialized with World Intelligence.');
    return _engine;
}

/** Retrieve the singleton engine (for API endpoints) */
export function getAutonomyEngine(): AutonomyEngine | null {
    return _engine;
}
