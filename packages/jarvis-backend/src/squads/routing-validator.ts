/**
 * Squad Routing Validator — Phase 2.5
 *
 * Validates semantic routing accuracy with:
 * - Routing decision validation
 * - Squad specialization matching
 * - Agent allocation accuracy
 * - Routing confidence tracking
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface RoutingDecision {
    input: string;
    squadId: string;
    squadName: string;
    confidence: number; // 0-100
    allocations: Array<{
        agentId: string;
        role: string;
        relevanceScore: number; // 0-1
    }>;
    reasoning: string;
}

export interface RoutingValidationResult {
    decision: RoutingDecision;
    isAccurate: boolean;
    expectedSquad?: string;
    expectedAgents?: string[];
    accuracy: number; // 0-100
    feedback: string[];
}

// Squad specializations for validation
const SQUAD_SPECIALIZATIONS: Record<string, { keywords: string[]; domains: string[] }> = {
    'forge': {
        keywords: ['code', 'build', 'implement', 'develop', 'api', 'backend', 'frontend', 'refactor', 'debug'],
        domains: ['software-engineering', 'architecture', 'implementation']
    },
    'oracle': {
        keywords: ['research', 'analyze', 'investigate', 'discover', 'study', 'learn', 'insight', 'trend'],
        domains: ['research', 'intelligence', 'analysis']
    },
    'mercury': {
        keywords: ['copy', 'content', 'write', 'marketing', 'campaign', 'messaging', 'brand', 'communication'],
        domains: ['marketing', 'content', 'copywriting']
    },
    'atlas': {
        keywords: ['plan', 'strategy', 'roadmap', 'goal', 'metrics', 'okr', 'coordinate', 'orchestrate'],
        domains: ['strategy', 'planning', 'coordination']
    },
    'sentinel': {
        keywords: ['security', 'risk', 'threat', 'compliance', 'safety', 'audit', 'protection'],
        domains: ['security', 'risk-management', 'compliance']
    },
    'product': {
        keywords: ['feature', 'product', 'requirement', 'specification', 'validation', 'approval'],
        domains: ['product-management', 'requirements']
    },
    'nexus': {
        keywords: ['ai', 'ml', 'model', 'neural', 'algorithm', 'innovation', 'experiment'],
        domains: ['ai', 'machine-learning', 'innovation']
    },
    'board': {
        keywords: ['decision', 'executive', 'board', 'financial', 'budget', 'allocation', 'investment'],
        domains: ['executive', 'financial', 'strategic-decisions']
    }
};

export class SquadRoutingValidator {
    private routingHistory: RoutingDecision[] = [];
    private accuracyMetrics: Map<string, { correct: number; total: number }> = new Map();
    private confidenceHistory: number[] = [];

    /**
     * Validate a routing decision
     */
    validateRouting(decision: RoutingDecision): RoutingValidationResult {
        const feedback: string[] = [];
        const input = decision.input.toLowerCase();

        // Check 1: Squad specialization match
        const squadscore = this.calculateSpecializationScore(input, decision.squadId);
        const isSpecializationMatch = squadscore > 0.6;

        if (isSpecializationMatch) {
            feedback.push(`✓ Squad specialization match: ${(squadscore * 100).toFixed(0)}% confidence`);
        } else {
            feedback.push(`⚠ Squad specialization below threshold: ${(squadscore * 100).toFixed(0)}%`);
        }

        // Check 2: Confidence level
        if (decision.confidence < 50) {
            feedback.push(`⚠ Low confidence score: ${decision.confidence}/100`);
        } else if (decision.confidence >= 80) {
            feedback.push(`✓ High confidence score: ${decision.confidence}/100`);
        }

        // Check 3: Agent relevance
        const avgRelevance = decision.allocations.length > 0
            ? decision.allocations.reduce((sum, a) => sum + a.relevanceScore, 0) / decision.allocations.length
            : 0;

        if (avgRelevance < 0.5) {
            feedback.push(`⚠ Agent relevance below 50%: ${(avgRelevance * 100).toFixed(0)}%`);
        } else {
            feedback.push(`✓ Agent relevance score: ${(avgRelevance * 100).toFixed(0)}%`);
        }

        // Check 4: Allocation count
        if (decision.allocations.length === 0) {
            feedback.push(`⚠ No agents allocated`);
        } else if (decision.allocations.length > 5) {
            feedback.push(`⚠ Too many agents allocated: ${decision.allocations.length}`);
        } else {
            feedback.push(`✓ Agent count: ${decision.allocations.length}`);
        }

        // Calculate overall accuracy
        const accuracy = (isSpecializationMatch ? 0.4 : 0) +
                        (decision.confidence / 100) * 0.4 +
                        (avgRelevance * 0.2);

        const result: RoutingValidationResult = {
            decision,
            isAccurate: accuracy > 0.7,
            accuracy: accuracy * 100,
            feedback
        };

        // Record routing
        this.recordRouting(decision, result.isAccurate);

        // Emit metrics
        metricsCollector.recordSquadRouting(decision.squadId, result.isAccurate);

        return result;
    }

    /**
     * Calculate specialization score for a squad
     */
    private calculateSpecializationScore(input: string, squadId: string): number {
        const spec = SQUAD_SPECIALIZATIONS[squadId];
        if (!spec) return 0;

        const inputWords = input.split(/\s+/);
        let matches = 0;

        for (const word of inputWords) {
            if (spec.keywords.some(kw => word.includes(kw) || kw.includes(word))) {
                matches++;
            }
        }

        return Math.min(1, matches / Math.max(inputWords.length, spec.keywords.length));
    }

    /**
     * Record routing decision
     */
    private recordRouting(decision: RoutingDecision, isAccurate: boolean): void {
        this.routingHistory.push(decision);
        this.confidenceHistory.push(decision.confidence);

        if (!this.accuracyMetrics.has(decision.squadId)) {
            this.accuracyMetrics.set(decision.squadId, { correct: 0, total: 0 });
        }

        const metrics = this.accuracyMetrics.get(decision.squadId)!;
        metrics.total++;
        if (isAccurate) metrics.correct++;

        // Keep history manageable
        if (this.routingHistory.length > 1000) {
            this.routingHistory.shift();
            this.confidenceHistory.shift();
        }
    }

    /**
     * Get routing accuracy per squad
     */
    getAccuracyBySquad(): Record<string, { accuracy: number; routings: number }> {
        const result: Record<string, { accuracy: number; routings: number }> = {};

        for (const [squadId, metrics] of this.accuracyMetrics.entries()) {
            result[squadId] = {
                accuracy: metrics.total > 0 ? (metrics.correct / metrics.total) * 100 : 0,
                routings: metrics.total
            };
        }

        return result;
    }

    /**
     * Get overall routing statistics
     */
    getRoutingStats(): {
        totalRoutings: number;
        averageConfidence: number;
        overallAccuracy: number;
        squadBreakdown: Record<string, { accuracy: number; count: number }>;
    } {
        const accuracyBySquad = this.getAccuracyBySquad();
        const averageConfidence = this.confidenceHistory.length > 0
            ? this.confidenceHistory.reduce((a, b) => a + b, 0) / this.confidenceHistory.length
            : 0;

        const squads = Object.values(accuracyBySquad);
        const overallAccuracy = squads.length > 0
            ? squads.reduce((sum, s) => sum + s.accuracy, 0) / squads.length
            : 0;

        const squadBreakdown: Record<string, { accuracy: number; count: number }> = {};
        for (const [squad, metrics] of Object.entries(accuracyBySquad)) {
            squadBreakdown[squad] = {
                accuracy: metrics.accuracy,
                count: metrics.routings
            };
        }

        return {
            totalRoutings: this.routingHistory.length,
            averageConfidence,
            overallAccuracy,
            squadBreakdown
        };
    }

    /**
     * Get routing history
     */
    getRecentRoutings(limit: number = 10): RoutingDecision[] {
        return this.routingHistory.slice(-limit);
    }

    /**
     * Clear history for testing
     */
    clearHistory(): void {
        this.routingHistory = [];
        this.accuracyMetrics.clear();
        this.confidenceHistory = [];
    }
}

// Singleton instance
export const squadRoutingValidator = new SquadRoutingValidator();
