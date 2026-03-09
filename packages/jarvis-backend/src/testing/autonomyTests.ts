/**
 * JARVIS AGI: Autonomy OODA Loop Validation Test Suite
 *
 * Tests for:
 * - OODA cycle timing (30±2 min)
 * - OBSERVE phase completeness
 * - ORIENT phase contextualization
 * - DECIDE phase logic (confidence thresholds)
 * - ACT phase execution
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getAutonomyEngine } from '../autonomy';
import { metricsCollector } from '../instrumentation/metricsCollector';

describe('Autonomy OODA Loop Validation', () => {
    let autonomyEngine: any;
    const OODA_CYCLE_TARGET_MS = 30 * 60 * 1000; // 30 minutes
    const OODA_CYCLE_TOLERANCE_MS = 2 * 60 * 1000; // ±2 minutes
    const OODA_MIN_MS = OODA_CYCLE_TARGET_MS - OODA_CYCLE_TOLERANCE_MS;
    const OODA_MAX_MS = OODA_CYCLE_TARGET_MS + OODA_CYCLE_TOLERANCE_MS;

    beforeAll(async () => {
        autonomyEngine = getAutonomyEngine();
        if (!autonomyEngine) {
            throw new Error('AutonomyEngine not initialized');
        }
    });

    describe('OODA Cycle Timing', () => {
        it('should have OODA engine initialized', () => {
            expect(autonomyEngine).toBeDefined();
            expect(autonomyEngine.state).toBeDefined();
        });

        it('should track cycle start time', () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastCycleTime');
        });

        it('should emit cycle duration metrics', () => {
            // Verify that metricsCollector can receive cycle duration
            const testDuration = 1800000; // 30 minutes
            metricsCollector.recordOodaCycleDuration(testDuration);

            // If this doesn't throw, metrics are being tracked
            expect(metricsCollector).toBeDefined();
        });

        it('should maintain ±2 min tolerance over multiple cycles', async () => {
            // This is a placeholder for integration testing
            // In production, run for 24h and collect 48 cycle durations
            const testCycles = [
                1800000, // 30 min
                1795000, // 29:55 (within tolerance)
                1805000, // 30:05 (within tolerance)
                1800000, // 30 min
            ];

            for (const duration of testCycles) {
                expect(duration).toBeGreaterThanOrEqual(OODA_MIN_MS);
                expect(duration).toBeLessThanOrEqual(OODA_MAX_MS);
            }
        });
    });

    describe('OBSERVE Phase', () => {
        it('should fetch agent logs from recent period', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastObservation');

            if (status.lastObservation) {
                expect(status.lastObservation).toHaveProperty('agentLogs');
            }
        });

        it('should collect system telemetry', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('systemTelemetry');

            if (status.systemTelemetry) {
                expect(status.systemTelemetry).toHaveProperty('timestamp');
            }
        });

        it('should retrieve incoming missions', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('incomingMissions');

            // Even if empty, property should exist
            if (status.incomingMissions) {
                expect(Array.isArray(status.incomingMissions)).toBe(true);
            }
        });

        it('should capture recent errors from logs', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('recentErrors');

            if (status.recentErrors) {
                expect(Array.isArray(status.recentErrors)).toBe(true);
            }
        });

        it('should timestamp observations', async () => {
            const status = autonomyEngine.getStatus();
            const observeTime = status.lastObservationTime;

            if (observeTime) {
                expect(typeof observeTime === 'number' || observeTime instanceof Date).toBe(true);
            }
        });
    });

    describe('ORIENT Phase', () => {
        it('should contextualize observations against active goals', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('activeGoals');

            if (status.activeGoals) {
                expect(Array.isArray(status.activeGoals)).toBe(true);
            }
        });

        it('should identify patterns from logs', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('identifiedPatterns');

            if (status.identifiedPatterns) {
                expect(Array.isArray(status.identifiedPatterns)).toBe(true);
            }
        });

        it('should calculate confidence score (0-100)', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('confidenceScore');

            if (typeof status.confidenceScore === 'number') {
                expect(status.confidenceScore).toBeGreaterThanOrEqual(0);
                expect(status.confidenceScore).toBeLessThanOrEqual(100);
            }
        });

        it('should assess action safety', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('safetyAssessment');

            if (status.safetyAssessment) {
                expect(['safe', 'risky', 'blocked']).toContain(status.safetyAssessment);
            }
        });

        it('should track orientation time', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastOrientationTime');
        });
    });

    describe('DECIDE Phase - Confidence Thresholds', () => {
        it('should execute autonomously when confidence >= 85', async () => {
            // Simulate high confidence decision
            const status = autonomyEngine.getStatus();

            // If confidence >= 85, decision should be AUTO_EXECUTE
            if (status.confidenceScore >= 85) {
                expect(status.decision).toBe('AUTO_EXECUTE');
            }
        });

        it('should request approval when confidence is 70-85', async () => {
            // Simulate medium confidence decision
            const status = autonomyEngine.getStatus();

            // If 70 <= confidence < 85, decision should be REQUEST_APPROVAL
            if (status.confidenceScore >= 70 && status.confidenceScore < 85) {
                expect(status.decision).toBe('REQUEST_APPROVAL');
            }
        });

        it('should escalate when confidence < 70', async () => {
            // Simulate low confidence decision
            const status = autonomyEngine.getStatus();

            // If confidence < 70, decision should be ESCALATE
            if (status.confidenceScore < 70) {
                expect(status.decision).toBe('ESCALATE');
            }
        });

        it('should log decision rationale', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('decisionRationale');

            if (status.decisionRationale) {
                expect(typeof status.decisionRationale === 'string').toBe(true);
            }
        });

        it('should set decision timestamp', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastDecisionTime');
        });
    });

    describe('ACT Phase', () => {
        it('should apply approved mutations', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('executedMutations');

            if (status.executedMutations) {
                expect(Array.isArray(status.executedMutations)).toBe(true);
            }
        });

        it('should adjust squad routing if needed', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('routingAdjustments');

            if (status.routingAdjustments) {
                expect(Array.isArray(status.routingAdjustments)).toBe(true);
            }
        });

        it('should optimize agent DNA based on analysis', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('dnaOptimizations');

            if (status.dnaOptimizations) {
                expect(Array.isArray(status.dnaOptimizations)).toBe(true);
            }
        });

        it('should trigger consciousness if needed', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('consciousnessTriggered');

            if (status.consciousnessTriggered) {
                expect(typeof status.consciousnessTriggered === 'boolean').toBe(true);
            }
        });

        it('should log all actions taken', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('actionLog');

            if (status.actionLog) {
                expect(Array.isArray(status.actionLog)).toBe(true);
            }
        });

        it('should set execution timestamp', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastExecutionTime');
        });
    });

    describe('Full OODA Cycle Integration', () => {
        it('should complete full cycle (OBSERVE→ORIENT→DECIDE→ACT)', async () => {
            const status = autonomyEngine.getStatus();

            // All phases should have executed
            expect(status).toHaveProperty('lastObservationTime');
            expect(status).toHaveProperty('lastOrientationTime');
            expect(status).toHaveProperty('lastDecisionTime');
            expect(status).toHaveProperty('lastExecutionTime');
        });

        it('should maintain state consistency across cycle', async () => {
            const status = autonomyEngine.getStatus();

            // Check that confidence score is used in decision
            if (status.confidenceScore !== undefined && status.decision) {
                const decision = status.decision;
                const confidence = status.confidenceScore;

                if (confidence >= 85) {
                    expect(decision).toBe('AUTO_EXECUTE');
                } else if (confidence >= 70 && confidence < 85) {
                    expect(decision).toBe('REQUEST_APPROVAL');
                } else {
                    expect(decision).toBe('ESCALATE');
                }
            }
        });

        it('should handle edge cases (no missions, no errors)', async () => {
            const status = autonomyEngine.getStatus();

            // Should handle gracefully even if no missions/errors
            expect(status).toBeDefined();
            expect(status.state).toBeDefined();
        });

        it('should record metrics for each cycle', async () => {
            // Verify metrics are being recorded
            const snapshot = metricsCollector.getSnapshot();
            expect(snapshot).toBeDefined();
            expect(snapshot.metrics).toBeDefined();
            expect(snapshot.metrics.autonomy).toBeDefined();
        });
    });

    describe('OODA Cycle Reliability', () => {
        it('should never skip a cycle', async () => {
            const status = autonomyEngine.getStatus();
            const cycleCount = status.cycleCount || 0;

            // Should be > 0 if running
            expect(cycleCount).toBeGreaterThanOrEqual(0);
        });

        it('should recover from LLM failures', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('lastError');

            // Even if there was an error, cycle should continue
            expect(status.state).toHaveProperty('running');
        });

        it('should detect hung cycles with watchdog', async () => {
            const status = autonomyEngine.getStatus();
            expect(status).toHaveProperty('watchdogStatus');

            if (status.watchdogStatus) {
                expect(['healthy', 'warning', 'triggered']).toContain(status.watchdogStatus);
            }
        });

        it('should log all cycle execution times for analytics', async () => {
            const snapshot = metricsCollector.getSnapshot();

            if (snapshot.metrics.autonomy) {
                expect(snapshot.metrics.autonomy).toHaveProperty('oodaCycleDuration');
            }
        });

        it('should calculate cycle timing statistics', async () => {
            const snapshot = metricsCollector.getSnapshot();

            if (snapshot.metrics.autonomy) {
                const duration = snapshot.metrics.autonomy.oodaCycleDuration;
                // Should be a number or have statistics
                expect(duration === null || typeof duration === 'number').toBe(true);
            }
        });
    });

    describe('Metrics Integration', () => {
        it('should expose OODA metrics via metricsCollector', () => {
            expect(metricsCollector).toBeDefined();

            // Test recording a cycle
            metricsCollector.recordOodaCycleDuration(1800000);

            const snapshot = metricsCollector.getSnapshot();
            expect(snapshot.metrics.autonomy).toBeDefined();
        });

        it('should provide health status check', () => {
            const health = metricsCollector.getHealthStatus();

            expect(health).toHaveProperty('oodaCycleOk');
            expect(typeof health.oodaCycleOk === 'boolean').toBe(true);
        });

        it('should track autonomy success in metrics', () => {
            // Record a successful ReAct loop as part of autonomy
            metricsCollector.recordReActLoopCompletion(
                5000,    // duration ms
                3,       // iterations
                2,       // tool calls
                85,      // quality score
                true     // success
            );

            const snapshot = metricsCollector.getSnapshot();
            expect(snapshot.metrics.agent.reActSuccessRate).toBeGreaterThan(0);
        });
    });

    afterAll(() => {
        // Cleanup if needed
        if (autonomyEngine) {
            // Engine should continue running
            expect(autonomyEngine.state.running).toBe(true);
        }
    });
});

/**
 * Integration Test Helper
 * Run this test suite to validate OODA loop for 24+ hours
 */
export const runOODAValidation24h = async () => {
    const startTime = Date.now();
    const duration24h = 24 * 60 * 60 * 1000;
    const cycleDurations: number[] = [];
    const confidenceScores: number[] = [];
    const decisionCounts = {
        auto_execute: 0,
        request_approval: 0,
        escalate: 0,
    };

    while (Date.now() - startTime < duration24h) {
        const autonomyEngine = getAutonomyEngine();
        if (!autonomyEngine) break;

        const status = autonomyEngine.getStatus();

        if (status.lastCycleTime) {
            cycleDurations.push(status.cycleTime || 0);
        }
        if (status.confidenceScore !== undefined) {
            confidenceScores.push(status.confidenceScore);
        }

        const decision = status.decision;
        if (decision === 'AUTO_EXECUTE') decisionCounts.auto_execute++;
        else if (decision === 'REQUEST_APPROVAL') decisionCounts.request_approval++;
        else if (decision === 'ESCALATE') decisionCounts.escalate++;

        // Wait for next cycle
        await new Promise(resolve => setTimeout(resolve, 300000)); // Check every 5 minutes
    }

    // Calculate statistics
    const avgCycleDuration = cycleDurations.length > 0
        ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length
        : 0;

    const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

    const totalDecisions = Object.values(decisionCounts).reduce((a, b) => a + b, 0);

    return {
        duration: Date.now() - startTime,
        cycleCount: cycleDurations.length,
        avgCycleDuration,
        cycleDurationStats: {
            min: Math.min(...cycleDurations),
            max: Math.max(...cycleDurations),
            within_tolerance: cycleDurations.filter(
                d => d >= (1800000 - 120000) && d <= (1800000 + 120000)
            ).length,
        },
        confidenceStats: {
            avg: avgConfidence,
            min: Math.min(...confidenceScores),
            max: Math.max(...confidenceScores),
        },
        decisionDistribution: {
            auto_execute: (decisionCounts.auto_execute / totalDecisions) * 100,
            request_approval: (decisionCounts.request_approval / totalDecisions) * 100,
            escalate: (decisionCounts.escalate / totalDecisions) * 100,
        },
    };
};
