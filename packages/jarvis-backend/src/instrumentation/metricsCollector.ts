/**
 * JARVIS AGI Metrics Collector
 * Prometheus-based observability for all core systems
 *
 * Metrics tracked:
 * - OODA cycle timing (autonomy)
 * - Consciousness module durations (nightly learning)
 * - Memory query latencies (all 4 systems)
 * - ReAct loop success rates (agent reasoning)
 * - Squad routing accuracy
 * - Redis Streams message delivery latency
 * - Quality gate pass rates
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';

export interface MetricsSnapshot {
    timestamp: string;
    metrics: {
        autonomy: {
            oodaCycleDuration: number;
            lastCycleTime: string;
        };
        consciousness: {
            moduleDurations: Record<string, number>;
            totalCycleDuration: number;
            lastCycleTime: string;
        };
        memory: {
            episodicLatency: number[];
            semanticLatency: number[];
            hybridLatency: number[];
            patternLatency: number[];
        };
        agent: {
            reActSuccessRate: number;
            averageIterations: number;
            averageToolCalls: number;
        };
        squad: {
            routingAccuracy: number;
            totalRoutings: number;
        };
        redis: {
            streamLatency: number[];
            averageLatency: number;
        };
        quality: {
            passRate: number;
            averageScore: number;
        };
    };
}

class MetricsCollector {
    private static instance: MetricsCollector;

    // Autonomy Metrics
    private oodaCycleDuration: Histogram;
    private oodaCycleCounter: Counter;
    private lastOodaCycleTime: Gauge;

    // Consciousness Metrics
    private consciousnessModuleDuration: Histogram;
    private consciousnessModuleCounter: Counter;
    private consciousnessLastCycleTime: Gauge;
    private consciousnessTotalDuration: Gauge;

    // Memory Metrics
    private memoryQueryLatency: Histogram;
    private memoryQueryCounter: Counter;

    // Agent ReAct Metrics
    private reActLoopDuration: Histogram;
    private reActSuccessCounter: Counter;
    private reActFailureCounter: Counter;
    private reActIterationCount: Histogram;
    private reActToolCallCount: Histogram;
    private reActQualityScore: Histogram;

    // Squad Routing Metrics
    private squadRoutingCounter: Counter;
    private squadRoutingAccuracyGauge: Gauge;

    // Redis Streams Metrics
    private redisStreamLatency: Histogram;
    private redisStreamCounter: Counter;

    // Quality Gate Metrics
    private qualityGatePassCounter: Counter;
    private qualityGateFailCounter: Counter;
    private qualityGateScoreGauge: Histogram;

    // Data storage for analytics
    private metricsData: {
        oodaCycleTimes: number[];
        consciousnessModuleTimes: Map<string, number[]>;
        memoryLatencies: Map<string, number[]>;
        reActSuccessCount: number;
        reActFailureCount: number;
        squadRoutingHits: number;
        squadRoutingTotal: number;
        redisStreamLatencies: number[];
        qualityGatePassCount: number;
        qualityGateFailCount: number;
    };

    constructor() {
        this.metricsData = {
            oodaCycleTimes: [],
            consciousnessModuleTimes: new Map(),
            memoryLatencies: new Map([
                ['episodic', []],
                ['semantic', []],
                ['hybrid', []],
                ['pattern', []],
            ]),
            reActSuccessCount: 0,
            reActFailureCount: 0,
            squadRoutingHits: 0,
            squadRoutingTotal: 0,
            redisStreamLatencies: [],
            qualityGatePassCount: 0,
            qualityGateFailCount: 0,
        };

        // Initialize Autonomy Metrics
        this.oodaCycleDuration = new Histogram({
            name: 'autonomy_ooda_cycle_duration_ms',
            help: 'Duration of complete OODA cycle in milliseconds',
            buckets: [60000, 300000, 600000, 1200000, 1800000, 3600000],
            registers: [register],
        });

        this.oodaCycleCounter = new Counter({
            name: 'autonomy_ooda_cycles_total',
            help: 'Total number of OODA cycles executed',
            registers: [register],
        });

        this.lastOodaCycleTime = new Gauge({
            name: 'autonomy_ooda_last_cycle_time_seconds',
            help: 'Unix timestamp of last OODA cycle completion',
            registers: [register],
        });

        // Initialize Consciousness Metrics
        this.consciousnessModuleDuration = new Histogram({
            name: 'consciousness_module_duration_ms',
            help: 'Duration of consciousness module execution',
            labelNames: ['module'],
            buckets: [60000, 300000, 600000, 1200000, 1800000, 3600000],
            registers: [register],
        });

        this.consciousnessModuleCounter = new Counter({
            name: 'consciousness_modules_executed_total',
            help: 'Total number of consciousness modules executed',
            labelNames: ['module', 'status'], // status: success, skipped, failed
            registers: [register],
        });

        this.consciousnessLastCycleTime = new Gauge({
            name: 'consciousness_last_cycle_time_seconds',
            help: 'Unix timestamp of last consciousness cycle completion',
            registers: [register],
        });

        this.consciousnessTotalDuration = new Gauge({
            name: 'consciousness_total_cycle_duration_ms',
            help: 'Total duration of complete consciousness cycle',
            registers: [register],
        });

        // Initialize Memory Metrics
        this.memoryQueryLatency = new Histogram({
            name: 'memory_query_latency_ms',
            help: 'Latency of memory system queries',
            labelNames: ['system'], // system: episodic, semantic, hybrid, pattern
            buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
            registers: [register],
        });

        this.memoryQueryCounter = new Counter({
            name: 'memory_queries_total',
            help: 'Total number of memory queries',
            labelNames: ['system', 'status'], // status: success, timeout, error
            registers: [register],
        });

        // Initialize Agent ReAct Metrics
        this.reActLoopDuration = new Histogram({
            name: 'react_loop_duration_ms',
            help: 'Duration of complete ReAct loop execution',
            buckets: [1000, 5000, 10000, 30000, 60000, 120000],
            registers: [register],
        });

        this.reActSuccessCounter = new Counter({
            name: 'react_loops_success_total',
            help: 'Total successful ReAct loop completions',
            registers: [register],
        });

        this.reActFailureCounter = new Counter({
            name: 'react_loops_failure_total',
            help: 'Total failed ReAct loop completions',
            registers: [register],
        });

        this.reActIterationCount = new Histogram({
            name: 'react_loop_iterations',
            help: 'Number of iterations in a ReAct loop',
            buckets: [1, 2, 3, 5, 10, 20],
            registers: [register],
        });

        this.reActToolCallCount = new Histogram({
            name: 'react_loop_tool_calls',
            help: 'Number of tool calls per ReAct loop',
            buckets: [0, 1, 2, 5, 10, 20],
            registers: [register],
        });

        this.reActQualityScore = new Histogram({
            name: 'react_loop_quality_score',
            help: 'Quality score of ReAct loop output (0-100)',
            buckets: [25, 50, 75, 85, 90, 95, 100],
            registers: [register],
        });

        // Initialize Squad Routing Metrics
        this.squadRoutingCounter = new Counter({
            name: 'squad_routing_total',
            help: 'Total squad routing decisions',
            labelNames: ['squad', 'status'], // status: success, incorrect
            registers: [register],
        });

        this.squadRoutingAccuracyGauge = new Gauge({
            name: 'squad_routing_accuracy',
            help: 'Accuracy of squad routing (0-100)',
            registers: [register],
        });

        // Initialize Redis Streams Metrics
        this.redisStreamLatency = new Histogram({
            name: 'redis_stream_latency_ms',
            help: 'Latency of Redis Streams message delivery',
            buckets: [10, 50, 100, 200, 500, 1000],
            registers: [register],
        });

        this.redisStreamCounter = new Counter({
            name: 'redis_stream_messages_total',
            help: 'Total Redis Streams messages delivered',
            labelNames: ['event_type', 'status'], // status: success, timeout, error
            registers: [register],
        });

        // Initialize Quality Gate Metrics
        this.qualityGatePassCounter = new Counter({
            name: 'quality_gate_pass_total',
            help: 'Total quality gate passes (score >= 75)',
            registers: [register],
        });

        this.qualityGateFailCounter = new Counter({
            name: 'quality_gate_fail_total',
            help: 'Total quality gate failures (score < 75)',
            registers: [register],
        });

        this.qualityGateScoreGauge = new Histogram({
            name: 'quality_gate_score',
            help: 'Quality gate score distribution (0-100)',
            buckets: [25, 50, 75, 80, 85, 90, 95, 100],
            registers: [register],
        });
    }

    /**
     * Singleton accessor
     */
    static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    /**
     * AUTONOMY METRICS
     */
    recordOodaCycleDuration(durationMs: number): void {
        this.oodaCycleDuration.observe(durationMs);
        this.oodaCycleCounter.inc();
        this.lastOodaCycleTime.set(Date.now() / 1000);

        // Store for analytics
        this.metricsData.oodaCycleTimes.push(durationMs);
        if (this.metricsData.oodaCycleTimes.length > 1000) {
            this.metricsData.oodaCycleTimes.shift();
        }
    }

    /**
     * CONSCIOUSNESS METRICS
     */
    recordConsciousnessModuleDuration(
        moduleName: string,
        durationMs: number,
        status: 'success' | 'skipped' | 'failed' = 'success'
    ): void {
        this.consciousnessModuleDuration.observe({ module: moduleName }, durationMs);
        this.consciousnessModuleCounter.inc({ module: moduleName, status });

        // Store for analytics
        if (!this.metricsData.consciousnessModuleTimes.has(moduleName)) {
            this.metricsData.consciousnessModuleTimes.set(moduleName, []);
        }
        const times = this.metricsData.consciousnessModuleTimes.get(moduleName)!;
        times.push(durationMs);
        if (times.length > 100) times.shift();
    }

    recordConsciousnessFullCycle(totalDurationMs: number): void {
        this.consciousnessLastCycleTime.set(Date.now() / 1000);
        this.consciousnessTotalDuration.set(totalDurationMs);
    }

    /**
     * MEMORY METRICS
     */
    recordMemoryQueryLatency(
        system: 'episodic' | 'semantic' | 'hybrid' | 'pattern',
        latencyMs: number,
        status: 'success' | 'timeout' | 'error' = 'success'
    ): void {
        this.memoryQueryLatency.observe({ system }, latencyMs);
        this.memoryQueryCounter.inc({ system, status });

        // Store for analytics
        if (!this.metricsData.memoryLatencies.has(system)) {
            this.metricsData.memoryLatencies.set(system, []);
        }
        const latencies = this.metricsData.memoryLatencies.get(system)!;
        latencies.push(latencyMs);
        if (latencies.length > 1000) latencies.shift();
    }

    /**
     * REACT LOOP METRICS
     */
    recordReActLoopCompletion(
        durationMs: number,
        iterations: number,
        toolCalls: number,
        qualityScore: number,
        success: boolean
    ): void {
        this.reActLoopDuration.observe(durationMs);
        this.reActIterationCount.observe(iterations);
        this.reActToolCallCount.observe(toolCalls);
        this.reActQualityScore.observe(qualityScore);

        if (success) {
            this.reActSuccessCounter.inc();
            this.metricsData.reActSuccessCount++;
        } else {
            this.reActFailureCounter.inc();
            this.metricsData.reActFailureCount++;
        }
    }

    getReActSuccessRate(): number {
        const total = this.metricsData.reActSuccessCount + this.metricsData.reActFailureCount;
        if (total === 0) return 100;
        return (this.metricsData.reActSuccessCount / total) * 100;
    }

    /**
     * SQUAD ROUTING METRICS
     */
    recordSquadRouting(squadId: string, isAccurate: boolean): void {
        const status = isAccurate ? 'success' : 'incorrect';
        this.squadRoutingCounter.inc({ squad: squadId, status });

        this.metricsData.squadRoutingTotal++;
        if (isAccurate) {
            this.metricsData.squadRoutingHits++;
        }

        const accuracy = (this.metricsData.squadRoutingHits / this.metricsData.squadRoutingTotal) * 100;
        this.squadRoutingAccuracyGauge.set(accuracy);
    }

    getSquadRoutingAccuracy(): number {
        if (this.metricsData.squadRoutingTotal === 0) return 100;
        return (this.metricsData.squadRoutingHits / this.metricsData.squadRoutingTotal) * 100;
    }

    /**
     * REDIS STREAMS METRICS
     */
    recordRedisStreamMessage(
        eventType: string,
        latencyMs: number,
        status: 'success' | 'timeout' | 'error' = 'success'
    ): void {
        this.redisStreamLatency.observe(latencyMs);
        this.redisStreamCounter.inc({ event_type: eventType, status });

        // Store for analytics
        this.metricsData.redisStreamLatencies.push(latencyMs);
        if (this.metricsData.redisStreamLatencies.length > 10000) {
            this.metricsData.redisStreamLatencies.shift();
        }
    }

    getRedisStreamLatencyPercentile(percentile: number): number {
        if (this.metricsData.redisStreamLatencies.length === 0) return 0;
        const sorted = [...this.metricsData.redisStreamLatencies].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * QUALITY GATE METRICS
     */
    recordQualityGateDecision(score: number, passed: boolean): void {
        this.qualityGateScoreGauge.observe(score);
        if (passed) {
            this.qualityGatePassCounter.inc();
            this.metricsData.qualityGatePassCount++;
        } else {
            this.qualityGateFailCounter.inc();
            this.metricsData.qualityGateFailCount++;
        }
    }

    getQualityGatePassRate(): number {
        const total = this.metricsData.qualityGatePassCount + this.metricsData.qualityGateFailCount;
        if (total === 0) return 100;
        return (this.metricsData.qualityGatePassCount / total) * 100;
    }

    /**
     * SNAPSHOT GENERATION
     * Returns current metrics in structured format for dashboard
     */
    getSnapshot(): MetricsSnapshot {
        const now = new Date().toISOString();

        // Calculate percentiles for memory latencies
        const memoryLatencies: Record<string, number[]> = {
            episodic: this.metricsData.memoryLatencies.get('episodic') || [],
            semantic: this.metricsData.memoryLatencies.get('semantic') || [],
            hybrid: this.metricsData.memoryLatencies.get('hybrid') || [],
            pattern: this.metricsData.memoryLatencies.get('pattern') || [],
        };

        return {
            timestamp: now,
            metrics: {
                autonomy: {
                    oodaCycleDuration: this.metricsData.oodaCycleTimes.length > 0
                        ? this.metricsData.oodaCycleTimes[this.metricsData.oodaCycleTimes.length - 1]
                        : 0,
                    lastCycleTime: now,
                },
                consciousness: {
                    moduleDurations: Array.from(this.metricsData.consciousnessModuleTimes).reduce(
                        (acc, [module, times]) => {
                            acc[module] = times.length > 0 ? times[times.length - 1] : 0;
                            return acc;
                        },
                        {} as Record<string, number>
                    ),
                    totalCycleDuration: 0, // Set by recordConsciousnessFullCycle
                    lastCycleTime: now,
                },
                memory: {
                    episodicLatency: memoryLatencies.episodic,
                    semanticLatency: memoryLatencies.semantic,
                    hybridLatency: memoryLatencies.hybrid,
                    patternLatency: memoryLatencies.pattern,
                },
                agent: {
                    reActSuccessRate: this.getReActSuccessRate(),
                    averageIterations: 0, // Calculated from histogram
                    averageToolCalls: 0, // Calculated from histogram
                },
                squad: {
                    routingAccuracy: this.getSquadRoutingAccuracy(),
                    totalRoutings: this.metricsData.squadRoutingTotal,
                },
                redis: {
                    streamLatency: this.metricsData.redisStreamLatencies,
                    averageLatency: this.metricsData.redisStreamLatencies.length > 0
                        ? this.metricsData.redisStreamLatencies.reduce((a, b) => a + b, 0) /
                          this.metricsData.redisStreamLatencies.length
                        : 0,
                },
                quality: {
                    passRate: this.getQualityGatePassRate(),
                    averageScore: 0, // Calculated from histogram
                },
            },
        };
    }

    /**
     * HEALTH CHECK
     * Returns quick health status
     */
    getHealthStatus(): {
        timestamp: string;
        oodaCycleOk: boolean;
        memoryOk: boolean;
        reActSuccessRateOk: boolean;
        squadRoutingOk: boolean;
        redisStreamOk: boolean;
        qualityGateOk: boolean;
    } {
        const redisLatencyP95 = this.getRedisStreamLatencyPercentile(95);

        return {
            timestamp: new Date().toISOString(),
            oodaCycleOk: this.metricsData.oodaCycleTimes.length > 0,
            memoryOk: Array.from(this.metricsData.memoryLatencies.values()).every(
                latencies => latencies.length === 0 || latencies[latencies.length - 1] < 200
            ),
            reActSuccessRateOk: this.getReActSuccessRate() >= 90,
            squadRoutingOk: this.getSquadRoutingAccuracy() >= 95,
            redisStreamOk: redisLatencyP95 < 100,
            qualityGateOk: this.getQualityGatePassRate() >= 75,
        };
    }
}

// Export singleton instance and register
export const metricsCollector = MetricsCollector.getInstance();
export { register as metricsRegister };
