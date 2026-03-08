/**
 * Consensus Coordinator — Distributed Consensus with Load Balancing
 *
 * Responsibilities:
 * - Route consensus requests to optimal clone subset
 * - Parallel invocation of multiple clones (async/await all)
 * - Distributed consensus resolution (majority, consensus, expertise-weighted)
 * - Performance metrics collection & optimization
 * - Circuit breaker for slow/failing clones
 */

import { MindCloneService } from './mindCloneService';
import { ExpertInsight, ConsensusDecision, ConsensusProfile, RedisClient, Pool } from './types';

export interface CloneLoadMetrics {
  cloneId: string;
  responseTime: number;
  successRate: number;
  lastUsed: number;
  failureCount: number;
}

export interface ConsensusOption {
  query: string;
  domain?: string; // Filter by domain
  minClones?: number; // Minimum clones to consult (default: 3)
  maxClones?: number; // Maximum clones to consult (default: 10)
  timeoutMs?: number; // Timeout per clone (default: 5000)
  conflictResolution?: 'majority' | 'consensus' | 'weighted';
}

export class ConsensusCoordinator {
  private mindCloneService: MindCloneService;
  private cache: RedisClient;
  private db: Pool;
  private metrics: Map<string, CloneLoadMetrics> = new Map();
  private circuitBreaker: Map<string, { failures: number; reset: number }> = new Map();
  private readonly MAX_FAILURES = 3;
  private readonly CIRCUIT_RESET_MS = 60000; // 1 minute

  constructor(mindCloneService: MindCloneService, cache: RedisClient, db: Pool) {
    this.mindCloneService = mindCloneService;
    this.cache = cache;
    this.db = db;
  }

  /**
   * Get optimal clone subset for consensus (load-balanced selection)
   */
  private async selectOptimalClones(
    domain: string | undefined,
    minClones: number = 3,
    maxClones: number = 10
  ): Promise<string[]> {
    // Get all available clones for domain
    const clones = await this.mindCloneService.listClones(domain);

    if (clones.length === 0) {
      throw new Error(`No clones available for domain: ${domain}`);
    }

    // Filter out clones in circuit breaker state
    const healthy: (typeof clones[0])[] = [];
    for (const clone of clones) {
      const breaker = this.circuitBreaker.get(clone.cloneId);
      if (!breaker || Date.now() > breaker.reset) {
        healthy.push(clone);
      }
    }

    if (healthy.length === 0) {
      throw new Error(`No healthy clones available for domain: ${domain}`);
    }

    // Sort by success rate (descending), then by activation count (ascending = fresher)
    healthy.sort((a, b) => {
      const successDiff = b.successRate - a.successRate;
      if (successDiff !== 0) return successDiff;
      return a.activationCount - b.activationCount;
    });

    // Select subset within min/max bounds
    const count = Math.max(minClones, Math.min(maxClones, healthy.length));
    return healthy.slice(0, count).map((c) => c.cloneId);
  }

  /**
   * Execute single clone with timeout and error handling
   */
  private async executeCloneWithTimeout(
    cloneId: string,
    query: string,
    timeoutMs: number
  ): Promise<{ insight: ExpertInsight; responseTime: number } | null> {
    const startTime = Date.now();

    try {
      const insight = await Promise.race([
        this.mindCloneService.getExpertInsight(cloneId, query),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      if (insight) {
        // Update metrics on success
        this.updateMetrics(cloneId, responseTime, true);
        return { insight, responseTime };
      }

      return null;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics on failure
      this.updateMetrics(cloneId, responseTime, false);

      // Track circuit breaker failures
      const breaker = this.circuitBreaker.get(cloneId) || { failures: 0, reset: 0 };
      breaker.failures++;

      if (breaker.failures >= this.MAX_FAILURES) {
        breaker.reset = Date.now() + this.CIRCUIT_RESET_MS;
        console.warn(
          `[ConsensusCoordinator] Circuit breaker OPEN for clone ${cloneId} (${breaker.failures} failures)`
        );
      }

      this.circuitBreaker.set(cloneId, breaker);
      return null;
    }
  }

  /**
   * Update load metrics for clone
   */
  private updateMetrics(cloneId: string, responseTime: number, success: boolean): void {
    const existing = this.metrics.get(cloneId) || {
      cloneId,
      responseTime: 0,
      successRate: 1.0,
      lastUsed: 0,
      failureCount: 0,
    };

    existing.responseTime = (existing.responseTime + responseTime) / 2; // Moving average
    existing.lastUsed = Date.now();

    if (!success) {
      existing.failureCount++;
      existing.successRate = Math.max(0, existing.successRate - 0.1);
    } else {
      existing.successRate = Math.min(1.0, existing.successRate + 0.05);
    }

    this.metrics.set(cloneId, existing);
  }

  /**
   * Execute consensus across multiple clones
   */
  async getDistributedConsensus(options: ConsensusOption): Promise<ConsensusDecision> {
    const {
      query,
      domain,
      minClones = 3,
      maxClones = 10,
      timeoutMs = 5000,
      conflictResolution = 'weighted',
    } = options;

    // Select optimal clones
    const selectedCloneIds = await this.selectOptimalClones(domain, minClones, maxClones);

    // Execute all clones in parallel
    const results = await Promise.all(
      selectedCloneIds.map((cloneId) => this.executeCloneWithTimeout(cloneId, query, timeoutMs))
    );

    // Filter successful results
    const insights = results.filter((r) => r !== null) as Array<{
      insight: ExpertInsight;
      responseTime: number;
    }>;

    if (insights.length === 0) {
      throw new Error(
        `Failed to get insights from any of ${selectedCloneIds.length} clones`
      );
    }

    // Use MindCloneService to synthesize consensus from collected insights
    const consensus = await this.mindCloneService.synthesizeConsensus(
      query,
      insights.map((i) => i.insight),
      conflictResolution as any
    );

    // Record coordination metrics
    await this.recordConsensusMetrics(selectedCloneIds, insights.length, consensus);

    return consensus;
  }

  /**
   * Record consensus coordination metrics to Redis for analytics
   */
  private async recordConsensusMetrics(
    selectedCloneIds: string[],
    successfulCount: number,
    consensus: ConsensusDecision
  ): Promise<void> {
    const timestamp = Date.now();
    const metric = {
      timestamp,
      selectedCount: selectedCloneIds.length,
      successfulCount,
      confidence: consensus.confidence,
      responseTime: consensus.evidence?.length || 0,
    };

    // Push to Redis Streams for analysis
    await this.cache.xAdd(
      'consensus-metrics',
      '*',
      metric as any
    );

    // Keep last 1000 metrics in memory
    const existing = await this.cache.get('consensus-metrics-last');
    const metrics = existing ? JSON.parse(existing as string) : [];
    metrics.push(metric);
    if (metrics.length > 1000) metrics.shift();
    await this.cache.set('consensus-metrics-last', JSON.stringify(metrics));
  }

  /**
   * Get coordinator health status
   */
  async getHealth(): Promise<{
    healthy: number;
    unhealthy: number;
    avgResponseTime: number;
    circuitBreakerOpen: number;
  }> {
    let healthy = 0,
      unhealthy = 0,
      totalResponseTime = 0;

    for (const [cloneId, metrics] of this.metrics.entries()) {
      const breaker = this.circuitBreaker.get(cloneId);
      if (breaker && Date.now() < breaker.reset) {
        unhealthy++;
      } else {
        healthy++;
      }
      totalResponseTime += metrics.responseTime;
    }

    return {
      healthy,
      unhealthy,
      avgResponseTime: this.metrics.size > 0 ? totalResponseTime / this.metrics.size : 0,
      circuitBreakerOpen: this.circuitBreaker.size,
    };
  }

  /**
   * Get load metrics for all clones
   */
  getLoadMetrics(): CloneLoadMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Reset circuit breaker for clone (manual intervention)
   */
  resetCircuitBreaker(cloneId: string): void {
    this.circuitBreaker.delete(cloneId);
    console.log(`[ConsensusCoordinator] Circuit breaker reset for clone ${cloneId}`);
  }
}
