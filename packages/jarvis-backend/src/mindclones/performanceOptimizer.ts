/**
 * Performance Optimizer — Caching, Batching, and Optimization
 *
 * Responsibilities:
 * - Distributed caching of insights (Redis)
 * - Batch processing of consensus requests
 * - Smart cache invalidation
 * - Request deduplication (concurrent same-query)
 * - Performance metrics collection
 */

import Redis from 'redis';
import { ExpertInsight, ConsensusDecision } from './types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in seconds
  hits: number;
}

export interface BatchRequest {
  id: string;
  query: string;
  cloneId: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  result?: ExpertInsight | null;
  error?: string;
}

export interface PerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgQueryTime: number;
  batchProcessed: number;
  deduplicatedRequests: number;
}

export class PerformanceOptimizer {
  private cache: Redis.RedisClient;
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private inFlightRequests: Map<string, Promise<any>> = new Map();
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
    totalQueryTime: 0,
    batchProcessed: 0,
    deduplicatedRequests: 0,
  };
  private readonly LOCAL_CACHE_TTL = 300; // 5 minutes
  private readonly REDIS_CACHE_TTL = 3600; // 1 hour

  constructor(cache: Redis.RedisClient) {
    this.cache = cache;
    this.startCacheCleanup();
  }

  /**
   * Get cached insight with multi-level strategy (local → Redis → cache miss)
   */
  async getCachedInsight(cloneId: string, query: string): Promise<ExpertInsight | null> {
    const cacheKey = this.generateCacheKey(cloneId, query);

    // Check local cache first (fastest)
    const localEntry = this.localCache.get(cacheKey);
    if (localEntry && !this.isExpired(localEntry)) {
      localEntry.hits++;
      this.stats.cacheHits++;
      return localEntry.data;
    }

    // Check Redis cache (distributed)
    const redisEntry = await this.cache.get(`insight:${cacheKey}`);
    if (redisEntry) {
      try {
        const data = JSON.parse(redisEntry);
        // Refresh local cache
        this.localCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: this.LOCAL_CACHE_TTL,
          hits: 1,
        });
        this.stats.cacheHits++;
        return data;
      } catch (e) {
        console.error('[PerformanceOptimizer] Failed to parse cached insight', e);
      }
    }

    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Cache insight with both local and Redis storage
   */
  async cacheInsight(cloneId: string, query: string, insight: ExpertInsight): Promise<void> {
    const cacheKey = this.generateCacheKey(cloneId, query);

    // Store in local cache
    this.localCache.set(cacheKey, {
      data: insight,
      timestamp: Date.now(),
      ttl: this.LOCAL_CACHE_TTL,
      hits: 0,
    });

    // Store in Redis for distribution
    await this.cache.set(
      `insight:${cacheKey}`,
      JSON.stringify(insight),
      { EX: this.REDIS_CACHE_TTL }
    );
  }

  /**
   * Invalidate cache for clone (when clone is updated)
   */
  async invalidateCloneCache(cloneId: string): Promise<void> {
    // Clear local cache entries for this clone
    for (const key of this.localCache.keys()) {
      if (key.startsWith(`clone:${cloneId}`)) {
        this.localCache.delete(key);
      }
    }

    // Clear Redis cache entries for this clone
    const pattern = `insight:clone:${cloneId}:*`;
    const keys = await this.cache.keys(pattern);
    for (const key of keys) {
      await this.cache.del(key);
    }
  }

  /**
   * Deduplicate concurrent requests for same query
   * If multiple requests for same (cloneId, query) in-flight, return same promise
   */
  async deduplicateRequest<T>(
    cloneId: string,
    query: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.generateCacheKey(cloneId, query);
    const inFlightKey = `inflight:${key}`;

    // Check if already in-flight
    if (this.inFlightRequests.has(inFlightKey)) {
      this.stats.deduplicatedRequests++;
      return this.inFlightRequests.get(inFlightKey)!;
    }

    // Start new request
    const promise = fetcher();
    this.inFlightRequests.set(inFlightKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up in-flight tracking
      this.inFlightRequests.delete(inFlightKey);
    }
  }

  /**
   * Batch multiple requests for efficiency
   * Collect requests over short window, execute together
   */
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 100; // Collect for 100ms

  async addToBatch(request: BatchRequest): Promise<void> {
    const domain = `batch:default`; // Could be per-domain in future
    if (!this.batchQueue.has(domain)) {
      this.batchQueue.set(domain, []);
    }

    this.batchQueue.get(domain)!.push(request);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatches();
      }, this.BATCH_WINDOW_MS);
    }
  }

  /**
   * Process all batched requests
   */
  private async processBatches(): Promise<void> {
    for (const [domain, requests] of this.batchQueue.entries()) {
      if (requests.length > 0) {
        console.log(
          `[PerformanceOptimizer] Processing batch of ${requests.length} requests for ${domain}`
        );
        this.stats.batchProcessed += requests.length;
        // Process in parallel
        await Promise.all(
          requests.map((req) => this.processBatchRequest(req))
        );
      }
    }

    this.batchQueue.clear();
    this.batchTimer = null;
  }

  /**
   * Process individual batch request
   */
  private async processBatchRequest(request: BatchRequest): Promise<void> {
    // This would be implemented by the caller
    // Just update status for now
    request.status = 'completed';
  }

  /**
   * Start periodic cleanup of expired cache entries
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      let cleaned = 0;
      for (const [key, entry] of this.localCache.entries()) {
        if (this.isExpired(entry)) {
          this.localCache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(`[PerformanceOptimizer] Cleaned ${cleaned} expired cache entries`);
      }
    }, 60000); // Every minute
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(cloneId: string, query: string): string {
    return `clone:${cloneId}:query:${Buffer.from(query).toString('base64')}`;
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const hitRate =
      this.stats.totalQueries > 0
        ? (this.stats.cacheHits / this.stats.totalQueries) * 100
        : 0;

    const avgQueryTime =
      this.stats.totalQueries > 0
        ? this.stats.totalQueryTime / this.stats.totalQueries
        : 0;

    return {
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate,
      avgQueryTime,
      batchProcessed: this.stats.batchProcessed,
      deduplicatedRequests: this.stats.deduplicatedRequests,
    };
  }

  /**
   * Record query timing
   */
  recordQueryTime(duration: number): void {
    this.stats.totalQueries++;
    this.stats.totalQueryTime += duration;
  }

  /**
   * Clear all caches (for testing or emergency)
   */
  async clearAllCaches(): Promise<void> {
    this.localCache.clear();
    const keys = await this.cache.keys('insight:*');
    for (const key of keys) {
      await this.cache.del(key);
    }
  }
}
