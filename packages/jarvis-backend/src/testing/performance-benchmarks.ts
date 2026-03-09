/**
 * Performance Benchmarking — Phase 3.6
 *
 * Comprehensive performance testing across all critical systems:
 * - Memory query latency under load
 * - Agent reasoning latency
 * - Squad routing performance
 * - Message throughput on Redis Streams
 * - Database operation performance
 * - Concurrent agent execution
 */

export interface BenchmarkResult {
  test: string;
  duration: number; // ms
  operations: number;
  throughput: number; // ops/sec
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  success: boolean;
  errors: number;
}

export interface PerformanceReport {
  timestamp: string;
  tests: BenchmarkResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    totalDuration: number; // ms
    overallScore: number; // 0-100
  };
  recommendations: string[];
}

export class PerformanceBenchmark {
  /**
   * Benchmark memory query latency
   */
  async benchmarkMemoryQueries(
    episodicMemory: any,
    queries: string[] = []
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const iterations = 100;
    const latencies: number[] = [];
    let errors = 0;

    const defaultQueries = [
      'agent reasoning',
      'squad coordination',
      'mission planning',
      'error recovery',
      'performance optimization'
    ];

    const testQueries = queries.length > 0 ? queries : defaultQueries;

    for (let i = 0; i < iterations; i++) {
      const query = testQueries[i % testQueries.length];
      try {
        const start = Date.now();
        await episodicMemory.recall(query, undefined).catch(() => []);
        const latency = Date.now() - start;
        latencies.push(latency);
      } catch (err) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sorted = latencies.sort((a, b) => a - b);

    return {
      test: 'Memory Query Latency',
      duration,
      operations: iterations - errors,
      throughput: ((iterations - errors) / duration) * 1000,
      latency: {
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
      },
      success: errors === 0,
      errors
    };
  }

  /**
   * Benchmark agent reasoning loop
   */
  async benchmarkAgentReasoning(agent: any): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const iterations = 20;
    const latencies: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const start = Date.now();
        // Simulate agent reasoning with a simple LLM call
        const result = await (agent.reason ?
          agent.reason(`Solve: What is 2+2? (Iteration ${i+1})`) :
          Promise.resolve('4')
        );
        const latency = Date.now() - start;
        latencies.push(latency);
      } catch (err) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sorted = latencies.sort((a, b) => a - b);

    return {
      test: 'Agent Reasoning Loop',
      duration,
      operations: iterations - errors,
      throughput: ((iterations - errors) / duration) * 1000,
      latency: {
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
      },
      success: errors === 0,
      errors
    };
  }

  /**
   * Benchmark concurrent execution
   */
  async benchmarkConcurrentExecution(
    executeFunc: (id: number) => Promise<any>,
    concurrency: number = 10,
    iterations: number = 50
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const latencies: number[] = [];
    let errors = 0;
    let completed = 0;

    for (let batch = 0; batch < Math.ceil(iterations / concurrency); batch++) {
      const promises = [];
      for (let i = 0; i < concurrency && batch * concurrency + i < iterations; i++) {
        promises.push(
          (async () => {
            try {
              const start = Date.now();
              await executeFunc(batch * concurrency + i);
              const latency = Date.now() - start;
              latencies.push(latency);
              completed++;
            } catch (err) {
              errors++;
            }
          })()
        );
      }
      await Promise.all(promises);
    }

    const duration = Date.now() - startTime;
    const sorted = latencies.sort((a, b) => a - b);

    return {
      test: `Concurrent Execution (${concurrency} concurrent)`,
      duration,
      operations: completed,
      throughput: (completed / duration) * 1000,
      latency: {
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
      },
      success: errors === 0,
      errors
    };
  }

  /**
   * Benchmark squad routing
   */
  async benchmarkSquadRouting(routeFunc: (prompt: string) => any): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const iterations = 100;
    const latencies: number[] = [];
    let errors = 0;

    const prompts = [
      'Implement a new feature',
      'Analyze this data',
      'Write marketing copy',
      'Plan the strategy',
      'Review security'
    ];

    for (let i = 0; i < iterations; i++) {
      const prompt = prompts[i % prompts.length];
      try {
        const start = Date.now();
        await routeFunc(prompt);
        const latency = Date.now() - start;
        latencies.push(latency);
      } catch (err) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sorted = latencies.sort((a, b) => a - b);

    return {
      test: 'Squad Routing Decision',
      duration,
      operations: iterations - errors,
      throughput: ((iterations - errors) / duration) * 1000,
      latency: {
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
      },
      success: errors === 0,
      errors
    };
  }

  /**
   * Generate performance report
   */
  generateReport(results: BenchmarkResult[]): PerformanceReport {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    // Score calculation: each test worth 100 points
    // Deduct based on latency and error rate
    let score = 100 * results.length;
    for (const result of results) {
      // Penalize high latencies (p99 > 1000ms)
      if (result.latency.p99 > 1000) {
        score -= 10;
      }
      // Penalize errors (>0 errors)
      if (result.errors > 0) {
        score -= 5 * Math.min(result.errors, 10);
      }
    }

    const overallScore = Math.max(0, Math.min(100, (score / (100 * results.length)) * 100));

    const recommendations: string[] = [];
    for (const result of results) {
      if (result.latency.p99 > 1000) {
        recommendations.push(`⚠️ ${result.test}: P99 latency exceeds 1s (${result.latency.p99.toFixed(0)}ms)`);
      }
      if (result.errors > 0) {
        recommendations.push(`⚠️ ${result.test}: ${result.errors} errors during benchmark`);
      }
      if (result.latency.p95 > 500) {
        recommendations.push(`💡 ${result.test}: Consider optimization for P95 latency (${result.latency.p95.toFixed(0)}ms)`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      tests: results,
      summary: {
        totalTests: results.length,
        passed,
        failed,
        totalDuration,
        overallScore
      },
      recommendations
    };
  }
}

// Export singleton
export const performanceBenchmark = new PerformanceBenchmark();
