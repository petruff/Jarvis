/**
 * Memory Retrieval Orchestrator — Phase 2.4
 *
 * Coordinates optimized retrieval across all memory systems using:
 * - Parallel query execution
 * - Intelligent result merging
 * - Caching and deduplication
 */

import { EpisodicMemory } from './episodic';
import { SemanticMemory } from './semantic';
import { HybridMemory } from './hybrid';
import { memoryOptimizer } from './memory-optimizer';
import { metricsCollector } from '../instrumentation/metricsCollector';

export interface MemoryContext {
    query: string;
    episodic: any[];
    semantic: any;
    hybrid: any[];
    pattern: any[];
    resultCount: number;
    durationMs: number;
    sourceBreakdown: {
        episodic: number;
        semantic: number;
        hybrid: number;
        pattern: number;
    };
}

export class MemoryRetrievalOrchestrator {
    constructor(
        private episodicMemory: EpisodicMemory,
        private semanticMemory: SemanticMemory,
        private hybridMemory: HybridMemory,
        private patternMemory: any // PatternMemory singleton instance
    ) {}

    /**
     * Retrieve comprehensive memory context for a query
     */
    async retrieveContext(
        query: string,
        squadId?: string,
        enableOptimization: boolean = true
    ): Promise<MemoryContext> {
        const startTime = Date.now();

        if (enableOptimization) {
            return this.optimizedRetrieval(query, squadId);
        } else {
            return this.basicRetrieval(query, squadId);
        }
    }

    /**
     * Optimized retrieval with parallel queries and caching
     */
    private async optimizedRetrieval(query: string, squadId?: string): Promise<MemoryContext> {
        const startTime = Date.now();
        const cacheKey = `${query}:${squadId || 'all'}`;

        // Check cache first
        const cached = await memoryOptimizer.cachedQuery(
            cacheKey,
            async () => this.executeParallelQueries(query, squadId),
            5 * 60 * 1000 // 5 min TTL
        );

        const durationMs = Date.now() - startTime;

        return {
            query,
            episodic: cached.episodic || [],
            semantic: cached.semantic || {},
            hybrid: cached.hybrid || [],
            pattern: cached.pattern || [],
            resultCount: (cached.episodic?.length || 0) + (cached.hybrid?.length || 0) + (cached.pattern?.length || 0),
            durationMs,
            sourceBreakdown: {
                episodic: cached.episodic?.length || 0,
                semantic: cached.semantic ? 1 : 0,
                hybrid: cached.hybrid?.length || 0,
                pattern: cached.pattern?.length || 0
            }
        };
    }

    /**
     * Execute parallel queries across all memory systems
     */
    private async executeParallelQueries(query: string, squadId?: string): Promise<any> {
        const results = await memoryOptimizer.parallelQuery(
            // Episodic (Qdrant vector search)
            () => this.episodicMemory.recall(query, squadId).catch(() => []),

            // Semantic (Neo4j/SQLite context)
            () => this.semanticMemory.getCompanyContext().catch(() => ({})),

            // Hybrid (LanceDB knowledge base)
            () => this.hybridMemory.searchKnowledge(query, 5).catch(() => []),

            // Pattern (SQLite learned patterns)
            () => this.patternMemory.recallPatterns(query, squadId, 3).catch(() => [])
        );

        return results;
    }

    /**
     * Basic sequential retrieval (no optimization)
     */
    private async basicRetrieval(query: string, squadId?: string): Promise<MemoryContext> {
        const startTime = Date.now();

        const episodic = await this.episodicMemory.recall(query, squadId).catch(() => []);
        const semantic = await this.semanticMemory.getCompanyContext().catch(() => ({}));
        const hybrid = await this.hybridMemory.searchKnowledge(query, 5).catch(() => []);
        const pattern = await this.patternMemory.recallPatterns(query, squadId, 3).catch(() => []);

        const durationMs = Date.now() - startTime;

        return {
            query,
            episodic,
            semantic,
            hybrid,
            pattern,
            resultCount: episodic.length + hybrid.length + pattern.length,
            durationMs,
            sourceBreakdown: {
                episodic: episodic.length,
                semantic: semantic && Object.keys(semantic).length > 0 ? 1 : 0,
                hybrid: hybrid.length,
                pattern: pattern.length
            }
        };
    }

    /**
     * Format memory context for prompt injection
     */
    formatContextForPrompt(context: MemoryContext): string {
        const lines: string[] = [];

        lines.push(`[MEMORY CONTEXT FOR: "${context.query}"]`);
        lines.push(`Source results: Episodic(${context.sourceBreakdown.episodic}), Semantic(${context.sourceBreakdown.semantic}), Hybrid(${context.sourceBreakdown.hybrid}), Pattern(${context.sourceBreakdown.pattern})`);
        lines.push(`Query latency: ${context.durationMs}ms\n`);

        if (context.pattern.length > 0) {
            lines.push('LEARNED PATTERNS:');
            context.pattern.forEach((p, i) => {
                lines.push(`  ${i + 1}. [${p.type}] ${p.description}`);
            });
            lines.push('');
        }

        if (context.episodic.length > 0) {
            lines.push('RELEVANT PAST MISSIONS:');
            context.episodic.slice(0, 3).forEach((ep, i) => {
                lines.push(`  ${i + 1}. ${ep.prompt?.slice(0, 60)}... (score: ${ep.qualityScore || 'N/A'})`);
            });
            lines.push('');
        }

        if (context.semantic && context.semantic.goals && context.semantic.goals.length > 0) {
            lines.push('ACTIVE GOALS:');
            context.semantic.goals.slice(0, 3).forEach((g, i) => {
                lines.push(`  ${i + 1}. ${g}`);
            });
            lines.push('');
        }

        if (context.hybrid.length > 0) {
            lines.push('KNOWLEDGE BASE HITS:');
            context.hybrid.slice(0, 3).forEach((h, i) => {
                lines.push(`  ${i + 1}. ${h.text?.slice(0, 80)}...`);
            });
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Get memory system health
     */
    getMemoryHealth(): {
        cacheHitRate: number;
        cachedQueries: number;
        memoryOptimizationEnabled: boolean;
    } {
        const cacheStats = memoryOptimizer.getCacheStats();

        return {
            cacheHitRate: cacheStats.hitRate,
            cachedQueries: cacheStats.cacheSize,
            memoryOptimizationEnabled: true
        };
    }
}
