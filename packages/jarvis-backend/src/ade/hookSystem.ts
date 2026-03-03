/**
 * JARVIS Evolution v6.0 — Hook System (Sprint 1 / Phase E6)
 * Agent lifecycle hook registry enabling pre/post observability on all agent operations.
 *
 * Hooks fire at: session start/end, before/after every tool call, before/after every LLM call,
 * mission complete/failed, quality fail, and memory write.
 *
 * Usage:
 *   hookSystem.register('onBeforeTool', '*', async (ctx) => { ... });
 *   hookSystem.fire('onMissionComplete', { mission, squad, result });
 */

import logger from '../logger';

// ─── Hook Types ────────────────────────────────────────────────────────────────

export type HookType =
    | 'onSessionStart'     // Before first agent call in a mission
    | 'onBeforeTool'       // Before each MCP/internal tool call
    | 'onAfterTool'        // After each tool call (with result)
    | 'onBeforeLLM'        // Before each LLM call
    | 'onAfterLLM'         // After each LLM call (with response)
    | 'onMissionComplete'  // When mission reaches DONE state
    | 'onMissionFailed'    // When mission fails/aborts
    | 'onQualityFail'      // When quality gate fails
    | 'onMemoryWrite';     // When episode written to episodic memory

export interface HookContext {
    missionId?: string;
    squadId?: string;
    agentId?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolResult?: string;
    llmPrompt?: string;
    llmResponse?: string;
    mission?: Record<string, unknown>;
    result?: string;
    error?: string;
    qualityScore?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export type HookHandler = (ctx: HookContext) => Promise<void>;

interface HookRegistration {
    id: string;
    hookType: HookType;
    squadFilter: string; // '*' = all squads, or specific squad id (e.g. 'forge')
    handler: HookHandler;
    description: string;
}

// ─── Hook System ──────────────────────────────────────────────────────────────

class HookSystem {
    private registrations: HookRegistration[] = [];
    private stats: Record<string, { fires: number; errors: number }> = {};

    /**
     * Register a hook handler.
     * @param hookType   - lifecycle event to listen for
     * @param squadFilter - '*' for all squads, or specific squad id
     * @param handler    - async function receiving HookContext
     * @param description - human-readable description for telemetry
     */
    register(
        hookType: HookType,
        squadFilter: string,
        handler: HookHandler,
        description = ''
    ): string {
        const id = `hook-${hookType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        this.registrations.push({ id, hookType, squadFilter, handler, description });
        if (!this.stats[hookType]) this.stats[hookType] = { fires: 0, errors: 0 };
        logger.info(`[HookSystem] Registered hook: ${hookType} | squad:${squadFilter} | ${description}`);
        return id;
    }

    /**
     * Unregister a hook by its ID.
     */
    unregister(hookId: string): void {
        const before = this.registrations.length;
        this.registrations = this.registrations.filter(r => r.id !== hookId);
        if (this.registrations.length < before) {
            logger.info(`[HookSystem] Unregistered hook: ${hookId}`);
        }
    }

    /**
     * Fire all hooks registered for a given event + squad combination.
     * Handlers run in registration order, errors are logged but never throw.
     */
    async fire(hookType: HookType, ctx: HookContext): Promise<void> {
        const squadId = ctx.squadId || '*';
        const matching = this.registrations.filter(r =>
            r.hookType === hookType &&
            (r.squadFilter === '*' || r.squadFilter === squadId)
        );

        if (matching.length === 0) return;

        if (this.stats[hookType]) this.stats[hookType].fires++;

        for (const reg of matching) {
            try {
                await reg.handler(ctx);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                if (this.stats[hookType]) this.stats[hookType].errors++;
                logger.error(`[HookSystem] Hook handler error [${hookType}/${reg.id}]: ${msg}`);
                // Hooks NEVER propagate errors — they are observers, not blockers
            }
        }
    }

    /**
     * Get telemetry stats for all registered hooks.
     */
    getStats(): {
        totalRegistrations: number;
        byType: Record<string, { count: number; fires: number; errors: number }>;
    } {
        const byType: Record<string, { count: number; fires: number; errors: number }> = {};
        for (const reg of this.registrations) {
            if (!byType[reg.hookType]) {
                byType[reg.hookType] = { count: 0, fires: 0, errors: 0 };
            }
            byType[reg.hookType].count++;
            const s = this.stats[reg.hookType];
            if (s) {
                byType[reg.hookType].fires = s.fires;
                byType[reg.hookType].errors = s.errors;
            }
        }
        return { totalRegistrations: this.registrations.length, byType };
    }

    /**
     * List all registered hooks (for API inspection).
     */
    listHooks(): Array<{ id: string; hookType: HookType; squadFilter: string; description: string }> {
        return this.registrations.map(({ id, hookType, squadFilter, description }) => ({
            id, hookType, squadFilter, description
        }));
    }
}

export const hookSystem = new HookSystem();

// ─── Built-in Hook Registrations ──────────────────────────────────────────────

/**
 * Built-in: Log every tool call to console (telemetry).
 */
hookSystem.register('onBeforeTool', '*', async (ctx) => {
    logger.info(`[TELEMETRY] Tool call: ${ctx.toolName} | mission:${ctx.missionId || 'n/a'} | squad:${ctx.squadId || 'n/a'}`);
}, 'Telemetry: log tool calls');

/**
 * Built-in: Log tool results (truncated).
 */
hookSystem.register('onAfterTool', '*', async (ctx) => {
    const preview = (ctx.toolResult || '').slice(0, 120).replace(/\n/g, ' ');
    logger.info(`[TELEMETRY] Tool result: ${ctx.toolName} => ${preview}…`);
}, 'Telemetry: log tool results');

/**
 * Built-in: Log mission completions.
 */
hookSystem.register('onMissionComplete', '*', async (ctx) => {
    logger.info(`[HOOK] Mission complete: ${ctx.missionId} | squad:${ctx.squadId} | score:${ctx.qualityScore ?? 'n/a'}`);
}, 'Telemetry: mission complete');

/**
 * Built-in: Log mission failures.
 */
hookSystem.register('onMissionFailed', '*', async (ctx) => {
    logger.warn(`[HOOK] Mission FAILED: ${ctx.missionId} | squad:${ctx.squadId} | error:${ctx.error}`);
}, 'Telemetry: mission failed');

/**
 * Built-in: Log quality gate failures.
 */
hookSystem.register('onQualityFail', '*', async (ctx) => {
    logger.warn(`[HOOK] Quality gate failed: ${ctx.missionId} | score:${ctx.qualityScore}/100`);
}, 'Telemetry: quality gate fail');

/**
 * Built-in: Log episodic memory writes.
 */
hookSystem.register('onMemoryWrite', '*', async (ctx) => {
    logger.info(`[HOOK] Memory write: ${ctx.missionId} | squad:${ctx.squadId}`);
}, 'Telemetry: memory write');

export default hookSystem;
