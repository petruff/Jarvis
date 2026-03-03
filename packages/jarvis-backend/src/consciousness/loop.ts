import * as cron from 'node-cron';
import { Server } from 'socket.io';
import { queryLLM } from '../llm';
import { GoalManager } from '../goals/goalManager';
import { EpisodicMemory } from '../memory/episodic';
import { MissionOrchestrator } from '../orchestrator';
import { createTask, updateTask } from '../taskQueue';
import { ConfidenceEngine } from '../autonomy/confidenceEngine';
import { routeMission } from '../squadRouter';

export class ConsciousnessLoop {
    private job: ReturnType<typeof cron.schedule> | null = null;
    private isRunning = false;
    private confidenceEngine: ConfidenceEngine;

    constructor(
        private io: Server,
        private orchestrator: MissionOrchestrator,
        private goalManager: GoalManager,
        private episodicMemory: EpisodicMemory
    ) {
        this.confidenceEngine = new ConfidenceEngine(episodicMemory);
    }

    start(): void {
        const schedule = process.env.CONSCIOUSNESS_CRON ?? '0 */6 * * *'; // Default: every 6 hours (safe budget)
        console.log(`[CONSCIOUSNESS] Continuous Monologue Loop active starting with schedule: ${schedule}`);

        this.job = cron.schedule(schedule, () => {
            this.tick().catch(err => console.error(`[CONSCIOUSNESS] Tick failed: ${err.message}`));
        });
    }

    async tick(): Promise<void> {
        if (this.isRunning) {
            console.log('[CONSCIOUSNESS] Cycle skipped — previous still running');
            return;
        }
        this.isRunning = true;

        try {
            // ── 1. ORIENT ─────────────────────────────────────────────────────
            console.log('[CONSCIOUSNESS] [1/6] ORIENT: Scanning system state...');
            const goals = await this.goalManager.getGoalStatus();
            const recentEpisodes = await this.episodicMemory.getRecentHistory(4);

            // ── 2. ASSESS ─────────────────────────────────────────────────────
            console.log('[CONSCIOUSNESS] [2/6] ASSESS: Analyzing goal health and friction...');
            const strugglingGoals = goals.filter(g => g.status === 'RED' || g.status === 'AMBER');
            const frictionPoints = recentEpisodes.filter(
                e => e.status === 'FAILED' || (e.qualityScore != null && e.qualityScore < 70)
            );

            // ── 3. DECIDE ─────────────────────────────────────────────────────
            console.log('[CONSCIOUSNESS] [3/6] DECIDE: Determining if interjection is required...');

            // Note: In an AGI implementation, this would pull goals, recent error logs, and episodic memory.
            const ctxSummary = `Recent Episodes: ${JSON.stringify(recentEpisodes.map(e => e.prompt))}. Goals in danger: ${strugglingGoals.map(g => (g as any).title).join(', ')}. Friction: ${frictionPoints.length} failing nodes.`;

            // Generate real associative thought based on actual retrieved system arrays and performance metrics
            // Always use 'atlas' (deepseek-chat, not reasoner) — consciousness is a background task, not strategic reasoning
            const thought = await queryLLM("System: Consciousness Loop", `Based on this internal state, generate exactly ONE short actionable proactive idea for system optimization or a helpful founder alert: ${ctxSummary}`, 'atlas');

            console.log(`[CONSCIOUSNESS] [5/6] THOUGHT GENERATION: ${thought}`);

            const prompt = `Based on your continuous evaluation, execute this self-assigned optimization: ${thought}`;

            const routing = routeMission(prompt);
            let missionPrompt = prompt;

            // ── 4. CONFIDENCE GATE ────────────────────────────────────────────
            if (!missionPrompt || missionPrompt.trim().toUpperCase() === 'IDLE') {
                console.log('[CONSCIOUSNESS] [4/6] ACT: System stable. No mission required.');
                console.log('[CONSCIOUSNESS] [5/6] QUEUE: Skipping.');
                return;
            }

            console.log(`[CONSCIOUSNESS] [4/6] ACT: Mission proposed — scoring via ConfidenceEngine...`);

            // Detect squad from mission text to get accurate risk profile
            const squadId = routing.squad.id;

            const assessment = await this.confidenceEngine.assess(missionPrompt, squadId);
            console.log(
                `[CONSCIOUSNESS] [4/6] Confidence: ${assessment.confidenceScore}/100, ` +
                `risk: ${assessment.riskLevel}, decision: ${assessment.decision}`
            );

            // ── 5. QUEUE / EXECUTE ────────────────────────────────────────────
            if (assessment.decision === 'AUTO_EXECUTE') {
                // LOW risk mission — execute immediately
                console.log(`[CONSCIOUSNESS] [5/6] AUTO_EXECUTE: Launching mission via orchestrator...`);

                this.orchestrator.start({
                    prompt: missionPrompt,
                    squadId,
                    source: 'desktop',
                    priority: 'HIGH',
                }).catch(err => console.error(`[CONSCIOUSNESS] Auto-execute failed: ${err.message}`));

                this.io.emit('jarvis/consciousness_alert', {
                    message: missionPrompt,
                    reason: strugglingGoals.length > 0 ? 'Goal at risk' : 'Execution friction',
                    confidenceScore: assessment.confidenceScore,
                    rationale: assessment.rationale,
                    autoExecuted: true,
                    requiresApproval: false,
                });

            } else {
                // PENDING_APPROVAL — queue for Founder
                console.log(`[CONSCIOUSNESS] [5/6] PENDING_APPROVAL: Queuing for Founder review...`);
                const task = createTask(
                    `[CONSCIOUSNESS]\n${missionPrompt}`,
                    routing.squad.name,
                    routing.squad.icon,
                    routing.allocations.slice(0, 3).map(a => a.agentId),
                    'HIGH',
                    { source: 'consciousness', confidenceScore: assessment.confidenceScore, rationale: assessment.rationale }
                );
                updateTask(task.id, { status: 'PENDING_APPROVAL' });

                this.io.emit('jarvis/consciousness_alert', {
                    taskId: task.id,
                    message: missionPrompt,
                    reason: strugglingGoals.length > 0 ? 'Goal at risk' : 'Execution friction',
                    confidenceScore: assessment.confidenceScore,
                    rationale: assessment.rationale,
                    requiresApproval: true,
                });
            }

            // ── 6. REFLECT ────────────────────────────────────────────────────
            console.log('[CONSCIOUSNESS] [6/6] REFLECT: Cycle complete. Logging state.');

        } catch (err: any) {
            console.error(`[CONSCIOUSNESS] Cycle failed: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    stop(): void {
        if (this.job) this.job.stop();
    }
}
