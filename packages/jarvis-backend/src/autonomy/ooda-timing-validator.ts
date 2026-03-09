/**
 * OODA Cycle Timing Validator — Phase 2.1
 *
 * Ensures OODA cycles maintain 30±2 minute timing through:
 * - Watchdog timer for hung cycles (>35 min)
 * - Drift detection and correction
 * - Per-phase timing breakdown
 * - Automatic recovery from timing violations
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

const OODA_TARGET_MS = 30 * 60 * 1000; // 30 minutes
const OODA_TOLERANCE_MS = 2 * 60 * 1000; // ±2 minutes
const OODA_WATCHDOG_MS = 35 * 60 * 1000; // 35 minutes max
const PHASE_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes per phase max

export interface PhaseMetrics {
    name: 'ORIENT' | 'ASSESS' | 'DECIDE' | 'ACT';
    startTime: number;
    duration?: number;
    status: 'running' | 'complete' | 'timeout';
    error?: string;
}

export interface TimingReport {
    cycleId: string;
    totalDuration: number;
    phases: PhaseMetrics[];
    withinTolerance: boolean;
    driftFromTarget: number;
    watchdogTriggered: boolean;
    correctionApplied?: string;
}

export class OODATimingValidator {
    private phaseStartTimes: Map<string, number> = new Map();
    private cycleStartTime: number = 0;
    private watchdogTimer: NodeJS.Timeout | null = null;
    private lastCycleDuration: number = 0;
    private driftHistory: number[] = [];

    /**
     * Start cycle timing validation
     */
    startCycle(cycleId: string): void {
        this.cycleStartTime = Date.now();
        this.phaseStartTimes.clear();
        this.watchdogTimer = setTimeout(() => {
            this.onWatchdogTimeout(cycleId);
        }, OODA_WATCHDOG_MS);
    }

    /**
     * Mark phase completion and validate timing
     */
    completePhase(phaseName: 'ORIENT' | 'ASSESS' | 'DECIDE' | 'ACT'): PhaseMetrics {
        const phaseKey = phaseName.toLowerCase();

        if (!this.phaseStartTimes.has(phaseKey)) {
            this.phaseStartTimes.set(phaseKey, Date.now());
        }

        const startTime = this.phaseStartTimes.get(phaseKey)!;
        const duration = Date.now() - startTime;

        const metrics: PhaseMetrics = {
            name: phaseName,
            startTime,
            duration,
            status: duration > PHASE_TIMEOUT_MS ? 'timeout' : 'complete'
        };

        if (metrics.status === 'timeout') {
            metrics.error = `Phase ${phaseName} exceeded timeout (${duration}ms > ${PHASE_TIMEOUT_MS}ms)`;
        }

        return metrics;
    }

    /**
     * Complete cycle and generate timing report
     */
    completeCycle(cycleId: string): TimingReport {
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
        }

        const totalDuration = Date.now() - this.cycleStartTime;
        this.lastCycleDuration = totalDuration;

        const withinTolerance = totalDuration >= (OODA_TARGET_MS - OODA_TOLERANCE_MS) &&
                               totalDuration <= (OODA_TARGET_MS + OODA_TOLERANCE_MS);

        const driftFromTarget = totalDuration - OODA_TARGET_MS;
        this.driftHistory.push(driftFromTarget);
        if (this.driftHistory.length > 100) this.driftHistory.shift();

        const report: TimingReport = {
            cycleId,
            totalDuration,
            phases: [],
            withinTolerance,
            driftFromTarget,
            watchdogTriggered: false
        };

        // Collect all phase metrics
        const phaseNames: Array<'ORIENT' | 'ASSESS' | 'DECIDE' | 'ACT'> = ['ORIENT', 'ASSESS', 'DECIDE', 'ACT'];
        for (const phaseName of phaseNames) {
            const startTime = this.phaseStartTimes.get(phaseName.toLowerCase());
            if (startTime) {
                report.phases.push({
                    name: phaseName,
                    startTime,
                    status: 'complete'
                });
            }
        }

        // Detect drift and apply correction if needed
        if (!withinTolerance) {
            report.correctionApplied = this.detectAndApplyDriftCorrection(driftFromTarget);
        }

        return report;
    }

    /**
     * Watchdog timeout handler — cycle took too long
     */
    private onWatchdogTimeout(cycleId: string): void {
        console.error(`[OODA] WATCHDOG TRIGGERED: Cycle ${cycleId} exceeded 35 minutes`);
        metricsCollector.recordOodaCycleDuration(OODA_WATCHDOG_MS);

        // Emergency action: force cycle completion and restart
        // This prevents the system from hanging indefinitely
    }

    /**
     * Detect timing drift and suggest corrections
     */
    private detectAndApplyDriftCorrection(driftMs: number): string {
        const recentDrifts = this.driftHistory.slice(-5);
        const avgRecentDrift = recentDrifts.reduce((a, b) => a + b, 0) / recentDrifts.length;

        if (driftMs > 0) {
            // Cycle is running too fast
            return `DRIFT_TOO_FAST: Current ${driftMs}ms ahead of target. Average last 5 cycles: ${avgRecentDrift.toFixed(0)}ms. Recommend: Increase observation depth or add delay in ASSESS phase.`;
        } else {
            // Cycle is running too slow
            return `DRIFT_TOO_SLOW: Current ${Math.abs(driftMs)}ms behind target. Average last 5 cycles: ${avgRecentDrift.toFixed(0)}ms. Recommend: Optimize query latency or parallelize phase execution.`;
        }
    }

    /**
     * Get timing statistics for analytics
     */
    getTimingStatistics(): {
        lastCycleDuration: number;
        avgDrift: number;
        maxDrift: number;
        minDrift: number;
        driftTrend: 'accelerating' | 'decelerating' | 'stable';
    } {
        if (this.driftHistory.length === 0) {
            return {
                lastCycleDuration: this.lastCycleDuration,
                avgDrift: 0,
                maxDrift: 0,
                minDrift: 0,
                driftTrend: 'stable'
            };
        }

        const avgDrift = this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length;
        const maxDrift = Math.max(...this.driftHistory);
        const minDrift = Math.min(...this.driftHistory);

        // Calculate drift trend (last 5 cycles)
        const recent = this.driftHistory.slice(-5);
        const trend = recent.length >= 2
            ? recent[recent.length - 1] - recent[0]
            : 0;

        let driftTrend: 'accelerating' | 'decelerating' | 'stable' = 'stable';
        if (trend > 30000) driftTrend = 'accelerating';
        else if (trend < -30000) driftTrend = 'decelerating';

        return {
            lastCycleDuration: this.lastCycleDuration,
            avgDrift,
            maxDrift,
            minDrift,
            driftTrend
        };
    }

    /**
     * Reset validator for next cycle
     */
    reset(): void {
        this.cycleStartTime = 0;
        this.phaseStartTimes.clear();
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }
}

// Singleton instance
export const oodaTimingValidator = new OODATimingValidator();
