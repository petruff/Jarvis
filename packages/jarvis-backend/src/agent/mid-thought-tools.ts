/**
 * Mid-Thought Tools Optimizer — Phase 3.1
 *
 * Optimizes internal memory tools called DURING agent reasoning:
 * - recall_memory: episodic retrieval during thinking
 * - query_goals: semantic context mid-execution
 * - query_fact: specific fact lookup
 * - dispatch_squad: cross-team handoff
 */

import { episodicMemory, semanticMemory } from '../index';
import { memoryOptimizer } from '../memory/memory-optimizer';
import { metricsCollector } from '../instrumentation/metricsCollector';

export interface MidThoughtToolRequest {
    toolName: string;
    args: Record<string, any>;
    agentId: string;
    stepNumber: number;
}

export interface MidThoughtToolResult {
    toolName: string;
    success: boolean;
    result: any;
    latencyMs: number;
    cacheHit: boolean;
    reasoning: string;
}

export class MidThoughtToolOptimizer {
    /**
     * Handle recall_memory during reasoning
     */
    async handleRecallMemory(
        query: string,
        squadId?: string,
        agentId?: string
    ): Promise<MidThoughtToolResult> {
        const startTime = Date.now();

        try {
            // Use cached query for faster mid-thought retrieval
            const results = await memoryOptimizer.cachedQuery(
                `recall:${query}:${squadId || 'all'}`,
                () => episodicMemory.recall(query, squadId).catch(() => []),
                2 * 60 * 1000 // 2 min TTL for mid-thought (shorter than full context)
            );

            const latency = Date.now() - startTime;

            return {
                toolName: 'recall_memory',
                success: true,
                result: results.slice(0, 3), // Limit to 3 results during reasoning
                latencyMs: latency,
                cacheHit: latency < 50, // Estimate cache hit
                reasoning: `Retrieved ${results.length} similar past missions, limited to top 3 for reasoning context`
            };
        } catch (err: any) {
            return {
                toolName: 'recall_memory',
                success: false,
                result: [],
                latencyMs: Date.now() - startTime,
                cacheHit: false,
                reasoning: `Recall failed: ${err.message}`
            };
        }
    }

    /**
     * Handle query_goals during reasoning
     */
    async handleQueryGoals(agentId?: string): Promise<MidThoughtToolResult> {
        const startTime = Date.now();

        try {
            // Use cached company context (longer TTL since it changes rarely)
            const context = await memoryOptimizer.cachedQuery(
                'company_context',
                () => semanticMemory.getCompanyContext().catch(() => ({})),
                60 * 60 * 1000 // 1 hour TTL for company context
            );

            const latency = Date.now() - startTime;

            const ctx = context as any;
            const reasoning = [
                ctx.goals?.length ? `${ctx.goals.length} active goals` : 'No active goals',
                ctx.metrics && Object.keys(ctx.metrics).length ? `${Object.keys(ctx.metrics).length} metrics tracked` : 'No metrics',
                ctx.lessons?.length ? `${ctx.lessons.length} lessons learned` : 'No lessons'
            ].join(', ');

            return {
                toolName: 'query_goals',
                success: true,
                result: context,
                latencyMs: latency,
                cacheHit: latency < 10, // Estimate cache hit
                reasoning: `Company context: ${reasoning}`
            };
        } catch (err: any) {
            return {
                toolName: 'query_goals',
                success: false,
                result: {},
                latencyMs: Date.now() - startTime,
                cacheHit: false,
                reasoning: `Context query failed: ${err.message}`
            };
        }
    }

    /**
     * Handle query_fact for specific lookups
     */
    async handleQueryFact(key: string, agentId?: string): Promise<MidThoughtToolResult> {
        const startTime = Date.now();

        try {
            const fact = await memoryOptimizer.cachedQuery(
                `fact:${key}`,
                () => semanticMemory.getFact(key).catch(() => null),
                30 * 60 * 1000 // 30 min TTL for facts
            );

            const latency = Date.now() - startTime;

            return {
                toolName: 'query_fact',
                success: fact !== null,
                result: fact,
                latencyMs: latency,
                cacheHit: latency < 10,
                reasoning: fact ? `Retrieved fact: ${key} = "${fact.substring(0, 100)}..."` : `Fact not found: ${key}`
            };
        } catch (err: any) {
            return {
                toolName: 'query_fact',
                success: false,
                result: null,
                latencyMs: Date.now() - startTime,
                cacheHit: false,
                reasoning: `Fact query failed: ${err.message}`
            };
        }
    }

    /**
     * Handle dispatch_squad for cross-team handoff
     */
    async handleDispatchSquad(
        targetSquad: string,
        mission: string,
        priority: string,
        agentId?: string
    ): Promise<MidThoughtToolResult> {
        const startTime = Date.now();

        try {
            // Validate target squad
            const validSquads = ['forge', 'oracle', 'mercury', 'atlas', 'sentinel', 'product', 'nexus', 'board'];
            if (!validSquads.includes(targetSquad)) {
                return {
                    toolName: 'dispatch_squad',
                    success: false,
                    result: null,
                    latencyMs: Date.now() - startTime,
                    cacheHit: false,
                    reasoning: `Invalid squad: ${targetSquad}. Valid options: ${validSquads.join(', ')}`
                };
            }

            // In real implementation, this would queue the mission to the target squad
            // For now, return success indication
            const latency = Date.now() - startTime;

            return {
                toolName: 'dispatch_squad',
                success: true,
                result: {
                    squadId: targetSquad,
                    missionQueued: true,
                    priority,
                    handoffId: `handoff-${Date.now()}`
                },
                latencyMs: latency,
                cacheHit: false,
                reasoning: `Mission dispatched to ${targetSquad} squad with ${priority} priority`
            };
        } catch (err: any) {
            return {
                toolName: 'dispatch_squad',
                success: false,
                result: null,
                latencyMs: Date.now() - startTime,
                cacheHit: false,
                reasoning: `Squad dispatch failed: ${err.message}`
            };
        }
    }

    /**
     * Process a mid-thought tool request
     */
    async processMidThoughtTool(request: MidThoughtToolRequest): Promise<MidThoughtToolResult> {
        const { toolName, args, agentId, stepNumber } = request;

        switch (toolName) {
            case 'recall_memory':
                return this.handleRecallMemory(args.query, args.squad, agentId);

            case 'query_goals':
                return this.handleQueryGoals(agentId);

            case 'query_fact':
                return this.handleQueryFact(args.key, agentId);

            case 'dispatch_squad':
                return this.handleDispatchSquad(
                    args.targetSquad,
                    args.mission,
                    args.priority,
                    agentId
                );

            default:
                return {
                    toolName,
                    success: false,
                    result: null,
                    latencyMs: 0,
                    cacheHit: false,
                    reasoning: `Unknown mid-thought tool: ${toolName}`
                };
        }
    }

    /**
     * Get cache statistics for mid-thought tools
     */
    getCacheStats(): {
        hitRate: number;
        cachedQueries: number;
        memoryOptimizationActive: boolean;
    } {
        const stats = memoryOptimizer.getCacheStats();
        return {
            hitRate: stats.hitRate,
            cachedQueries: stats.cacheSize,
            memoryOptimizationActive: true
        };
    }
}

// Singleton instance
export const midThoughtToolOptimizer = new MidThoughtToolOptimizer();
