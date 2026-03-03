import { Server } from 'socket.io';
import { Mission, SubTask } from './types/mission';
import { updateTask, createTask } from './taskQueue';
import { memory } from './memory';
import { runSquadPlan } from './squad';
import { agentRegistry } from './agents/registry';
import { episodicMemory, goalManager, qualityGate, hookSystem, recoverySystem, patternMemory } from './index';
import { agentBus } from './agent-bus/redis-streams';
import { planner } from './planner';

export class MissionOrchestrator {
    public io: Server;
    public systemPrompt: string;

    constructor(io: Server, systemPrompt: string) {
        this.io = io;
        this.systemPrompt = systemPrompt;
    }

    /**
     * Start a new mission lifecycle
     */
    async start(params: {
        prompt: string;
        squadId?: string;
        source: Mission['source'] | 'gateway';
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        taskId?: string;
        allocations?: any[];
    }): Promise<Mission> {
        const { prompt, squadId, source, priority = 'MEDIUM', taskId, allocations } = params;

        // 1. Mission Object Creation
        const routing = allocations ? { squad: { name: squadId || 'Unknown', icon: '🤖', id: squadId }, allocations } : this.routeMission(prompt, squadId);
        let task;

        if (taskId) {
            const existing = require('./taskQueue').getTask(taskId);
            if (existing) task = existing;
        }

        if (!task) {
            try {
                task = createTask(
                    prompt,
                    routing.squad.name,
                    routing.squad.icon,
                    routing.allocations.map((a: any) => a.agentId),
                    priority,
                    { source: source as any, squadId: routing.squad.id },
                    routing.allocations
                );
            } catch (err) {
                console.error('[Orchestrator] Task creation failed', err);
            }
        }

        let mission: Mission = {
            id: task ? task.id : `legacy-${Date.now()}`,
            prompt,
            squad: routing.squad.name,
            agentIds: routing.allocations.map((a: any) => a.agentId),
            status: 'IN_PROGRESS',
            source: source as any,
            createdAt: new Date().toISOString()
        };

        try {
            // [HOOK POINT A & B INJECTION PREPARATION]
            mission = await this.onBeforeExecution(mission);

            // 2. Execution
            this.io.emit('squad/task_created', { taskId: mission.id, squad: mission.squad });
            if (task) updateTask(mission.id, { status: 'IN_PROGRESS' });

            const startTime = Date.now();
            // Publish AUTONOMOUS_ACTION to bus when consciousness triggers this mission
            if (source === 'consciousness') {
                agentBus.publish({
                    fromSquad: 'consciousness',
                    fromAgent: 'consciousness',
                    toSquad: '*',
                    type: 'AUTONOMOUS_ACTION',
                    payload: `Consciousness-triggered mission started: ${mission.prompt.slice(0, 300)}`,
                    mission: mission.id,
                    priority: priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                    correlationId: mission.id,
                }).catch(err => console.warn(`[AgentBus] AUTONOMOUS_ACTION publish failed: ${err.message}`));
            }

            // ─── THE RECURSIVE PLANNER HOOK ───────────────────────────────────────────
            if (priority === 'HIGH' || priority === 'CRITICAL') {
                this.io.emit('squad/log', { agentId: 'orchestrator', message: 'Mission is complex. Engaging Recursive Alpha Strategist...' });
                const subTasks = await planner.decomposeMission(mission.prompt, mission.id);

                if (subTasks.length > 1) {
                    this.io.emit('squad/log', { agentId: 'orchestrator', message: `Mission decomposed into ${subTasks.length} distinct phases.` });
                    mission.subTasks = subTasks;

                    let massiveResult = "Recursive Mission Execution Record:\n\n";

                    // Proceed sequentially for Phase 9 implementation
                    for (let i = 0; i < subTasks.length; i++) {
                        const t = subTasks[i];
                        t.status = 'IN_PROGRESS';
                        this.io.emit('squad/log', { agentId: 'orchestrator', message: `[Phase ${i + 1}/${subTasks.length}] Executing: ${t.description} -> Target: ${t.targetSquad}` });

                        // Overwrite routing target for this specific task
                        const subRouting = this.routeMission(t.description, t.targetSquad);
                        const subPrompt = `[PARENT OBJECTIVE] ${mission.prompt}\n[YOUR SPECIFIC PHASE] ${t.description}`;

                        const r = await runSquadPlan(mission.id, subPrompt, subRouting.allocations, this.io, this.systemPrompt, this, subRouting.squad.id);
                        t.result = r;
                        t.status = 'DONE';
                        massiveResult += `--- Phase ${i + 1} (${t.targetSquad}) ---\n${r}\n\n`;
                    }

                    const duration = Date.now() - startTime;
                    return await this.complete(mission.id, massiveResult, duration);
                }
                // If it failed to decompose or was determined purely atomic, fall through to default processing.
            }
            // ──────────────────────────────────────────────────────────────────────

            // Single Node execution (Simple or fallback)
            const result = await runSquadPlan(mission.id, mission.prompt, routing.allocations, this.io, this.systemPrompt, this, routing.squad.id);
            const duration = Date.now() - startTime;

            return await this.complete(mission.id, result, duration);

        } catch (err: any) {
            return await this.fail(mission.id, err.message);
        }
    }

    /**
     * Mark a mission as successfully complete
     */
    public async complete(missionId: string, result: string, durationMs?: number): Promise<Mission> {
        const mission = this.getMissionInternal(missionId);
        mission.result = result;
        mission.durationMs = durationMs;
        mission.completedAt = new Date().toISOString();
        mission.status = 'DONE';

        // [HOOK POINT C & D INJECTION PREPARATION]
        const finalMission = await this.onAfterExecution(mission);

        await this.finalize(finalMission);
        return finalMission;
    }

    /**
     * Mark a mission as failed
     */
    public async fail(missionId: string, error: string): Promise<Mission> {
        const mission = this.getMissionInternal(missionId);
        mission.status = 'FAILED';
        mission.result = `Error: ${error}`;

        updateTask(mission.id, { status: 'FAILED', result: error });
        this.io.emit('squad/error', { taskId: mission.id, message: error });

        // ── Sprint 1: Fire onMissionFailed hook ────────────────────────────
        hookSystem.fire('onMissionFailed', {
            missionId,
            squadId: mission.squad?.toLowerCase(),
            error,
        }).catch(() => { });

        // ── Sprint 1: Save recovery checkpoint on failure ──────────────────
        recoverySystem.saveCheckpoint(missionId, 'FAILED', mission.prompt, {
            squadId: mission.squad?.toLowerCase(),
            source: mission.source,
        }).catch(() => { });

        return mission;
    }

    private getMissionInternal(id: string): Mission {
        return {
            id,
            prompt: 'Session Mission',
            squad: 'ORACLE',
            agentIds: [],
            status: 'IN_PROGRESS',
            source: 'desktop',
            createdAt: new Date().toISOString()
        };
    }

    private async onBeforeExecution(mission: Mission): Promise<Mission> {
        console.log(`[Orchestrator] Hook (Before): ${mission.id}`);

        // ── Sprint 1: Fire onSessionStart hook ────────────────────────────
        await hookSystem.fire('onSessionStart', {
            missionId: mission.id,
            squadId: mission.squad?.toLowerCase(),
            agentId: mission.agentIds?.[0],
        });

        /**
         * HOOK A: Episodic Recall (Temporarily bypassed)
         * We disable this for now because the Vector DB keeps fetching stale 
         * or corrupted past context ("rosto lavado", for example) and polluting 
         * the main execution loop indiscriminately. HybridMemory inside R1 handles context well.
         */

        /*
        const episodes = await episodicMemory.recall(
            mission.prompt,
            mission.squad
        );

        if (episodes.length > 0) {
            mission.episodesUsed = episodes.map(e => e.id);
            const context = episodes.map(e =>
                `[Past ${e.squad} mission | score:${e.qualityScore ?? 'unscored'}]\n` +
                `Prompt: ${e.prompt.slice(0, 200)}\n` +
                `Result: ${e.result.slice(0, 400)}`
            ).join('\n---\n');

            mission.prompt =
                `[JARVIS MEMORY — ${episodes.length} related past missions]\n` +
                context +
                `\n\n[CURRENT MISSION]\n` +
                mission.prompt;

            console.log(`[EPISODIC] Injected ${episodes.length} past missions into prompt for ${mission.id}`);
        }
        */

        // HOOK B: Goal Context Injection
        try {
            const goals = await goalManager.getActiveGoals();
            const hasGoals = goals.horizon || goals.quarterly?.objective;

            if (hasGoals) {
                const goalContext =
                    `[ACTIVE COMPANY GOALS]\n` +
                    (goals.horizon ? `Horizon: ${goals.horizon}\n` : '') +
                    (goals.quarterly?.objective ?
                        `Quarterly: ${goals.quarterly.objective}\n` : '') +
                    (goals.weekly?.length ?
                        `This Week: ${goals.weekly.join(', ')}\n` : '');

                mission.prompt = goalContext + '\n' + mission.prompt;
                console.log(`[GOALS] Injected active goals into prompt for ${mission.id}`);
            }
        } catch (err) {
            console.error(`[GOALS] Goal injection failed: ${(err as Error).message}`);
        }

        return mission;
    }

    private async onAfterExecution(mission: Mission): Promise<Mission> {
        console.log(`[Orchestrator] Hook (After): ${mission.id}`);

        // HOOK C: Quality Gate
        mission = await qualityGate.intercept(mission);

        // HOOK D: Episodic Consolidate
        await episodicMemory.consolidate(mission);

        // ── Sprint 1: Fire onMissionComplete hook ──────────────────────────
        await hookSystem.fire('onMissionComplete', {
            missionId: mission.id,
            squadId: mission.squad?.toLowerCase(),
            qualityScore: mission.qualityScore,
            result: mission.result?.slice(0, 200),
        });

        // ── Sprint 1: Extract patterns from completed mission ──────────────
        if (mission.result && mission.qualityScore !== undefined) {
            patternMemory.extractFromMission({
                missionId: mission.id,
                prompt: mission.prompt,
                result: mission.result,
                squadId: mission.squad?.toLowerCase() || 'unknown',
                qualityScore: mission.qualityScore,
            }).catch(err => console.warn(`[PatternMemory] Extraction error: ${err.message}`));
        }

        // ── Sprint 1: Fire onMemoryWrite hook ─────────────────────────────
        await hookSystem.fire('onMemoryWrite', {
            missionId: mission.id,
            squadId: mission.squad?.toLowerCase(),
            qualityScore: mission.qualityScore,
        });

        return mission;
    }

    private async finalize(mission: Mission): Promise<void> {
        updateTask(mission.id, {
            status: mission.status as any,
            result: mission.result?.slice(0, 2000),
            completedAt: mission.completedAt,
            durationMs: mission.durationMs
        });

        memory.logSquadTask(mission.squad, mission.prompt, mission.result || '', mission.durationMs);

        this.io.emit('squad/task_complete', {
            taskId: mission.id,
            squad: mission.squad,
            result: mission.result,
            durationMs: mission.durationMs
        });
    }

    public async finalizeMission(missionId: string, result: string): Promise<void> {
        await this.complete(missionId, result);
    }

    private routeMission(prompt: string, squadId?: string) {
        const { routeMission, getAllSquads } = require('./squadRouter');

        if (squadId) {
            const squads = getAllSquads();
            const s = squads.find((sq: any) => sq.id === squadId);
            if (s) {
                return {
                    squad: s,
                    allocations: s.agents.map((a: any) => ({
                        agentId: `${s.id}-${a.id}`,
                        agentName: `${a.name} (${a.dna})`,
                        task: prompt,
                        systemPrompt: agentRegistry.buildSystemPrompt(a as any)
                    }))
                };
            }
        }
        return routeMission(prompt);
    }
}
