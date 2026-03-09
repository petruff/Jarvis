/**
 * Redis Latency Monitor — Phase 2.7
 *
 * Monitors Redis performance with:
 * - Stream publish/subscribe latency
 * - Cache operation latency
 * - Message delivery tracking
 * - Latency SLA monitoring
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface RedisLatencyMetrics {
    operation: 'publish' | 'subscribe' | 'get' | 'set' | 'xadd' | 'xread' | 'block';
    latencyMs: number;
    timestamp: number;
    success: boolean;
    messageSize?: number; // bytes
}

export interface RedisPerformanceStats {
    operation: string;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    totalOperations: number;
    successRate: number;
    slaStatus: 'healthy' | 'warning' | 'critical';
}

export class RedisLatencyMonitor {
    private metrics: RedisLatencyMetrics[] = [];
    private operationMetrics: Map<string, RedisLatencyMetrics[]> = new Map();

    // SLA targets (in milliseconds)
    private readonly SLA_TARGETS = {
        'publish': 10,      // Stream publish <10ms
        'subscribe': 10,    // Subscribe handler <10ms
        'get': 5,          // Cache get <5ms
        'set': 5,          // Cache set <5ms
        'xadd': 15,        // Stream add <15ms
        'xread': 20,       // Stream read <20ms
        'block': 2000      // Blocking XREAD <2s
    };

    /**
     * Record a Redis operation latency
     */
    recordOperation(
        operation: 'publish' | 'subscribe' | 'get' | 'set' | 'xadd' | 'xread' | 'block',
        latencyMs: number,
        success: boolean = true,
        messageSize?: number
    ): void {
        const metric: RedisLatencyMetrics = {
            operation,
            latencyMs,
            timestamp: Date.now(),
            success,
            messageSize
        };

        this.metrics.push(metric);

        if (!this.operationMetrics.has(operation)) {
            this.operationMetrics.set(operation, []);
        }
        this.operationMetrics.get(operation)!.push(metric);

        // Keep history manageable
        if (this.metrics.length > 10000) {
            this.metrics.shift();
        }

        const opArray = this.operationMetrics.get(operation)!;
        if (opArray.length > 1000) {
            opArray.shift();
        }

        // Emit to metrics collector
        metricsCollector.recordRedisStreamMessage(operation, latencyMs, success ? 'success' : 'error');
    }

    /**
     * Calculate percentile latency
     */
    private calculatePercentile(values: number[], percentile: number): number {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get performance stats for an operation
     */
    getOperationStats(operation: string): RedisPerformanceStats | null {
        const metrics = this.operationMetrics.get(operation);
        if (!metrics || metrics.length === 0) {
            return null;
        }

        const latencies = metrics.map(m => m.latencyMs);
        const successCount = metrics.filter(m => m.success).length;
        const successRate = (successCount / metrics.length) * 100;

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const p50 = this.calculatePercentile(latencies, 50);
        const p95 = this.calculatePercentile(latencies, 95);
        const p99 = this.calculatePercentile(latencies, 99);
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);

        const slaTarget = this.SLA_TARGETS[operation as keyof typeof this.SLA_TARGETS] || 50;
        let slaStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

        if (p95 > slaTarget * 1.5) {
            slaStatus = 'critical';
        } else if (p95 > slaTarget) {
            slaStatus = 'warning';
        }

        return {
            operation,
            avgLatency,
            p50Latency: p50,
            p95Latency: p95,
            p99Latency: p99,
            maxLatency,
            minLatency,
            totalOperations: metrics.length,
            successRate,
            slaStatus
        };
    }

    /**
     * Get overall Redis health
     */
    getRedisHealth(): {
        allOperationsHealthy: boolean;
        criticalOperations: string[];
        warningOperations: string[];
        averageLatency: number;
        healthScore: number; // 0-100
    } {
        const criticalOps: string[] = [];
        const warningOps: string[] = [];
        let totalLatency = 0;
        let operationCount = 0;

        for (const operation of this.operationMetrics.keys()) {
            const stats = this.getOperationStats(operation);
            if (!stats) continue;

            totalLatency += stats.avgLatency;
            operationCount++;

            if (stats.slaStatus === 'critical') {
                criticalOps.push(operation);
            } else if (stats.slaStatus === 'warning') {
                warningOps.push(operation);
            }
        }

        const avgLatency = operationCount > 0 ? totalLatency / operationCount : 0;
        const healthScore = Math.max(0, 100 - (criticalOps.length * 20 + warningOps.length * 10));

        return {
            allOperationsHealthy: criticalOps.length === 0 && warningOps.length === 0,
            criticalOperations: criticalOps,
            warningOperations: warningOps,
            averageLatency: avgLatency,
            healthScore
        };
    }

    /**
     * Get all operation statistics
     */
    getAllStats(): Record<string, RedisPerformanceStats> {
        const result: Record<string, RedisPerformanceStats> = {};

        for (const operation of this.operationMetrics.keys()) {
            const stats = this.getOperationStats(operation);
            if (stats) {
                result[operation] = stats;
            }
        }

        return result;
    }

    /**
     * Get latency trend (recent vs historical)
     */
    getLatencyTrend(operation: string): {
        recentAvg: number;
        historicalAvg: number;
        trend: 'improving' | 'stable' | 'degrading';
        percentChange: number;
    } {
        const metrics = this.operationMetrics.get(operation);
        if (!metrics || metrics.length < 20) {
            return {
                recentAvg: 0,
                historicalAvg: 0,
                trend: 'stable',
                percentChange: 0
            };
        }

        const recent = metrics.slice(-10).map(m => m.latencyMs);
        const historical = metrics.slice(0, -10).map(m => m.latencyMs);

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const historicalAvg = historical.reduce((a, b) => a + b, 0) / historical.length;

        const percentChange = historicalAvg > 0
            ? ((recentAvg - historicalAvg) / historicalAvg) * 100
            : 0;

        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (percentChange < -10) trend = 'improving';
        else if (percentChange > 10) trend = 'degrading';

        return {
            recentAvg,
            historicalAvg,
            trend,
            percentChange
        };
    }

    /**
     * Clear history for testing
     */
    clearHistory(): void {
        this.metrics = [];
        this.operationMetrics.clear();
    }
}

// Singleton instance
export const redisLatencyMonitor = new RedisLatencyMonitor();
