/**
 * Consciousness Cycle Timeout Watchdog — Phase 2.2
 *
 * Prevents nightly learning cycles from hanging with:
 * - Per-module timeout enforcement (max durations)
 * - Automatic module skipping on timeout
 * - Cycle recovery and resumption
 * - Timeout metrics and alerts
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface ModuleTimeout {
    name: string;
    maxDurationMs: number;
    description: string;
}

// Target module durations from nightly learning cycle (30min + 30min total)
const MODULE_TIMEOUTS: ModuleTimeout[] = [
    {
        name: 'Project Retrospective',
        maxDurationMs: 5 * 60 * 1000, // 5 min max (target 2-3 min)
        description: 'Analyze last 24h missions, extract findings'
    },
    {
        name: 'Error Archaeology',
        maxDurationMs: 5 * 60 * 1000, // 5 min max (target 2 min)
        description: 'Scan failures, identify patterns'
    },
    {
        name: 'Web Intelligence Harvest',
        maxDurationMs: 15 * 60 * 1000, // 15 min max (target 10 min)
        description: 'Fetch RSS feeds, extract intel'
    },
    {
        name: 'Knowledge Synthesis',
        maxDurationMs: 5 * 60 * 1000, // 5 min max (target 2-3 min)
        description: 'Synthesize harvested content'
    },
    {
        name: 'Self-Calibration',
        maxDurationMs: 3 * 60 * 1000, // 3 min max (target 1-2 min)
        description: 'Review accuracy, adjust confidence'
    }
];

export class ConsciousnessWatchdog {
    private moduleTimers: Map<string, NodeJS.Timeout> = new Map();
    private moduleStartTimes: Map<string, number> = new Map();

    /**
     * Start timeout for a module
     */
    startModuleTimeout(moduleName: string, onTimeout: (name: string) => void): void {
        const moduleConfig = MODULE_TIMEOUTS.find(m => m.name === moduleName);
        if (!moduleConfig) {
            console.warn(`[WATCHDOG] Unknown module: ${moduleName}`);
            return;
        }

        // Clear any existing timer
        this.clearModuleTimeout(moduleName);

        this.moduleStartTimes.set(moduleName, Date.now());

        const timer = setTimeout(() => {
            const duration = Date.now() - (this.moduleStartTimes.get(moduleName) || Date.now());
            console.error(`[WATCHDOG] Module timeout: ${moduleName} exceeded ${moduleConfig.maxDurationMs}ms (actual: ${duration}ms)`);

            metricsCollector.recordConsciousnessModuleDuration(moduleName, duration, 'failed');

            this.moduleTimers.delete(moduleName);
            onTimeout(moduleName);
        }, moduleConfig.maxDurationMs);

        this.moduleTimers.set(moduleName, timer);
    }

    /**
     * Clear timeout when module completes
     */
    clearModuleTimeout(moduleName: string): void {
        const timer = this.moduleTimers.get(moduleName);
        if (timer) {
            clearTimeout(timer);
            this.moduleTimers.delete(moduleName);
        }

        const startTime = this.moduleStartTimes.get(moduleName);
        if (startTime) {
            this.moduleStartTimes.delete(moduleName);
        }
    }

    /**
     * Get remaining time for a module
     */
    getRemainingTime(moduleName: string): number {
        const moduleConfig = MODULE_TIMEOUTS.find(m => m.name === moduleName);
        if (!moduleConfig) return 0;

        const startTime = this.moduleStartTimes.get(moduleName);
        if (!startTime) return moduleConfig.maxDurationMs;

        const elapsed = Date.now() - startTime;
        const remaining = moduleConfig.maxDurationMs - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * Check if module is running over time (80% of timeout)
     */
    isModuleOvertime(moduleName: string): boolean {
        const remaining = this.getRemainingTime(moduleName);
        const moduleConfig = MODULE_TIMEOUTS.find(m => m.name === moduleName);
        if (!moduleConfig) return false;

        return remaining < (moduleConfig.maxDurationMs * 0.2);
    }

    /**
     * Get all module timeout configurations
     */
    getModuleConfigs(): ModuleTimeout[] {
        return MODULE_TIMEOUTS;
    }

    /**
     * Clear all active timers
     */
    clearAll(): void {
        for (const timer of this.moduleTimers.values()) {
            clearTimeout(timer);
        }
        this.moduleTimers.clear();
        this.moduleStartTimes.clear();
    }

    /**
     * Get health status of consciousness cycle
     */
    getHealthStatus(): {
        activeModules: string[];
        overtimeModules: string[];
        completedModules: number;
        totalDurationMs: number;
    } {
        const activeModules = Array.from(this.moduleStartTimes.keys());
        const overtimeModules = activeModules.filter(m => this.isModuleOvertime(m));

        let totalDurationMs = 0;
        for (const startTime of this.moduleStartTimes.values()) {
            totalDurationMs += Date.now() - startTime;
        }

        return {
            activeModules,
            overtimeModules,
            completedModules: MODULE_TIMEOUTS.length - activeModules.length,
            totalDurationMs
        };
    }
}

// Singleton instance
export const consciousnessWatchdog = new ConsciousnessWatchdog();
