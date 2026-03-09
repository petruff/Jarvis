/**
 * Memory System Optimizer — Phase 2.4
 *
 * Optimizes memory queries with:
 * - Parallel query execution across systems
 * - Smart caching (episodic, semantic, pattern)
 * - Query result deduplication
 * - Latency monitoring and auto-tuning
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface CachedQuery {
    query: string;
    results: any;
    timestamp: number;
    ttlMs: number;
}

export interface MemoryOptimizationConfig {
    enableParallelQueries: boolean;
    enableCaching: boolean;
    cacheTTLMs: number;
    maxCacheSize: number;
    parallelTimeoutMs: number;
    deduplicateResults: boolean;
}

export class MemoryOptimizer {
    private queryCache: Map<string, CachedQuery> = new Map();
    private cacheHits = 0;
    private cacheMisses = 0;
    private config: MemoryOptimizationConfig = {
        enableParallelQueries: true,
        enableCaching: true,
        cacheTTLMs: 5 * 60 * 1000, // 5 minutes
        maxCacheSize: 500,
        parallelTimeoutMs: 3000,
        deduplicateResults: true
    };

    constructor(config?: Partial<MemoryOptimizationConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Execute parallel queries across multiple memory systems
     */
    async parallelQuery(
        episodicQuery: () => Promise<any>,
        semanticQuery: () => Promise<any>,
        hybridQuery: () => Promise<any>,
        patternQuery: () => Promise<any>
    ): Promise<{
        episodic: any;
        semantic: any;
        hybrid: any;
        pattern: any;
        totalDurationMs: number;
    }> {
        const startTime = Date.now();

        if (!this.config.enableParallelQueries) {
            // Sequential fallback
            return {
                episodic: await episodicQuery(),
                semantic: await semanticQuery(),
                hybrid: await hybridQuery(),
                pattern: await patternQuery(),
                totalDurationMs: Date.now() - startTime
            };
        }

        // Execute all queries in parallel with timeout
        const results = await Promise.allSettled([
            this.withTimeout(episodicQuery(), this.config.parallelTimeoutMs),
            this.withTimeout(semanticQuery(), this.config.parallelTimeoutMs),
            this.withTimeout(hybridQuery(), this.config.parallelTimeoutMs),
            this.withTimeout(patternQuery(), this.config.parallelTimeoutMs)
        ]);

        return {
            episodic: results[0].status === 'fulfilled' ? results[0].value : null,
            semantic: results[1].status === 'fulfilled' ? results[1].value : null,
            hybrid: results[2].status === 'fulfilled' ? results[2].value : null,
            pattern: results[3].status === 'fulfilled' ? results[3].value : null,
            totalDurationMs: Date.now() - startTime
        };
    }

    /**
     * Query with caching layer
     */
    async cachedQuery<T>(
        key: string,
        queryFn: () => Promise<T>,
        ttlMs: number = this.config.cacheTTLMs
    ): Promise<T> {
        if (this.config.enableCaching) {
            const cached = this.queryCache.get(key);
            if (cached && Date.now() - cached.timestamp < cached.ttlMs) {
                this.cacheHits++;
                return cached.results as T;
            }
        }

        this.cacheMisses++;
        const result = await queryFn();

        if (this.config.enableCaching) {
            this.queryCache.set(key, {
                query: key,
                results: result,
                timestamp: Date.now(),
                ttlMs
            });

            // Enforce max cache size
            if (this.queryCache.size > this.config.maxCacheSize) {
                const oldestKey = Array.from(this.queryCache.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
                this.queryCache.delete(oldestKey);
            }
        }

        return result;
    }

    /**
     * Deduplicate query results
     */
    deduplicateResults(results: any[]): any[] {
        if (!this.config.deduplicateResults || !Array.isArray(results)) {
            return results;
        }

        const seen = new Set<string>();
        return results.filter(item => {
            const key = JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Merge results from multiple memory systems
     */
    mergeResults(episodic: any[], semantic: any[], hybrid: any[], pattern: any[]): {
        merged: any[];
        resultCounts: { episodic: number; semantic: number; hybrid: number; pattern: number };
    } {
        const all = [
            ...(Array.isArray(episodic) ? episodic : []),
            ...(Array.isArray(semantic) ? semantic : []),
            ...(Array.isArray(hybrid) ? hybrid : []),
            ...(Array.isArray(pattern) ? pattern : [])
        ];

        const merged = this.deduplicateResults(all);

        return {
            merged,
            resultCounts: {
                episodic: Array.isArray(episodic) ? episodic.length : 0,
                semantic: Array.isArray(semantic) ? semantic.length : 0,
                hybrid: Array.isArray(hybrid) ? hybrid.length : 0,
                pattern: Array.isArray(pattern) ? pattern.length : 0
            }
        };
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        hitRate: number;
        cacheSize: number;
        totalHits: number;
        totalMisses: number;
    } {
        const totalRequests = this.cacheHits + this.cacheMisses;
        return {
            hitRate: totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0,
            cacheSize: this.queryCache.size,
            totalHits: this.cacheHits,
            totalMisses: this.cacheMisses
        };
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.queryCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<MemoryOptimizationConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Helper: Add timeout to promise
     */
    private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
            )
        ]);
    }
}

// Singleton instance with defaults
export const memoryOptimizer = new MemoryOptimizer({
    enableParallelQueries: true,
    enableCaching: true,
    cacheTTLMs: 5 * 60 * 1000,
    maxCacheSize: 500,
    parallelTimeoutMs: 3000,
    deduplicateResults: true
});
