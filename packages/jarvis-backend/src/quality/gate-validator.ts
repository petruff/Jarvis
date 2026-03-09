/**
 * Quality Gate Validator — Phase 2.6
 *
 * Validates quality gate decisions with:
 * - Score validation and bounds checking
 * - Criterion distribution analysis
 * - Pass/fail rate tracking
 * - Quality trend analysis
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface QualityScore {
    completeness: number; // 0-100
    accuracy: number;     // 0-100
    actionability: number; // 0-100
}

export interface QualityGateResult {
    score: number; // 0-100
    passed: boolean;
    scores: QualityScore;
    recommendation: string;
    confidence: number; // 0-1
}

export class QualityGateValidator {
    private readonly PASS_THRESHOLD = 75;
    private readonly MIN_CRITERION_THRESHOLD = 50; // Min score for any criterion
    private readonly IDEAL_SCORE = 85;

    private scoreHistory: number[] = [];
    private passCount = 0;
    private failCount = 0;
    private criterionDistribution: Record<string, number[]> = {
        completeness: [],
        accuracy: [],
        actionability: []
    };

    /**
     * Validate a quality gate decision
     */
    validate(scores: QualityScore): QualityGateResult {
        const average = (scores.completeness + scores.accuracy + scores.actionability) / 3;
        const passed = average >= this.PASS_THRESHOLD;
        const confidence = this.calculateConfidence(scores);

        let recommendation = '';
        const issues: string[] = [];

        // Check individual criteria
        if (scores.completeness < this.MIN_CRITERION_THRESHOLD) {
            issues.push(`Completeness too low: ${scores.completeness}/100`);
        } else if (scores.completeness < this.PASS_THRESHOLD) {
            issues.push(`Completeness: ${scores.completeness}/100 (below threshold)`);
        }

        if (scores.accuracy < this.MIN_CRITERION_THRESHOLD) {
            issues.push(`Accuracy too low: ${scores.accuracy}/100`);
        } else if (scores.accuracy < this.PASS_THRESHOLD) {
            issues.push(`Accuracy: ${scores.accuracy}/100 (below threshold)`);
        }

        if (scores.actionability < this.MIN_CRITERION_THRESHOLD) {
            issues.push(`Actionability too low: ${scores.actionability}/100`);
        } else if (scores.actionability < this.PASS_THRESHOLD) {
            issues.push(`Actionability: ${scores.actionability}/100 (below threshold)`);
        }

        if (passed) {
            if (average >= this.IDEAL_SCORE) {
                recommendation = '✓ Excellent quality - Approve without revision';
            } else {
                recommendation = `✓ Pass - Average ${average.toFixed(0)}/100${issues.length > 0 ? '. Minor improvements: ' + issues.join('; ') : ''}`;
            }
        } else {
            recommendation = `✗ Fail - Average ${average.toFixed(0)}/100. Issues: ${issues.join('; ')}`;
        }

        const result: QualityGateResult = {
            score: average,
            passed,
            scores,
            recommendation,
            confidence
        };

        // Record metrics
        this.recordResult(average, passed);
        metricsCollector.recordQualityGateDecision(average, passed);

        return result;
    }

    /**
     * Calculate confidence in quality assessment
     */
    private calculateConfidence(scores: QualityScore): number {
        // Higher variance between criteria = lower confidence
        const values = [scores.completeness, scores.accuracy, scores.actionability];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Variance > 30 points = lower confidence
        const varianceConfidence = Math.max(0, 1 - (stdDev / 50));

        // All criteria above 70 = higher confidence
        const allHighConfidence = values.every(v => v >= 70) ? 0.2 : 0;

        return Math.min(1, Math.max(0.3, varianceConfidence + allHighConfidence));
    }

    /**
     * Record quality result
     */
    private recordResult(score: number, passed: boolean): void {
        this.scoreHistory.push(score);
        if (passed) {
            this.passCount++;
        } else {
            this.failCount++;
        }

        // Keep history manageable
        if (this.scoreHistory.length > 1000) {
            this.scoreHistory.shift();
        }
    }

    /**
     * Get quality statistics
     */
    getQualityStats(): {
        passRate: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
        totalEvaluations: number;
        trend: 'improving' | 'stable' | 'declining';
    } {
        const totalEvals = this.passCount + this.failCount;
        const passRate = totalEvals > 0 ? (this.passCount / totalEvals) * 100 : 0;
        const avgScore = this.scoreHistory.length > 0
            ? this.scoreHistory.reduce((a, b) => a + b, 0) / this.scoreHistory.length
            : 0;
        const highestScore = this.scoreHistory.length > 0 ? Math.max(...this.scoreHistory) : 0;
        const lowestScore = this.scoreHistory.length > 0 ? Math.min(...this.scoreHistory) : 0;

        // Calculate trend (last 10 vs previous 10)
        const recent = this.scoreHistory.slice(-10);
        const previous = this.scoreHistory.slice(-20, -10);
        let trend: 'improving' | 'stable' | 'declining' = 'stable';

        if (recent.length > 0 && previous.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

            if (recentAvg > prevAvg + 5) trend = 'improving';
            else if (recentAvg < prevAvg - 5) trend = 'declining';
        }

        return {
            passRate,
            averageScore: avgScore,
            highestScore,
            lowestScore,
            totalEvaluations: totalEvals,
            trend
        };
    }

    /**
     * Get criterion analysis
     */
    getCriterionStats(): Record<string, { average: number; min: number; max: number; variance: number }> {
        const result: Record<string, { average: number; min: number; max: number; variance: number }> = {};

        for (const [criterion, scores] of Object.entries(this.criterionDistribution)) {
            if (scores.length === 0) continue;

            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;

            result[criterion] = {
                average: avg,
                min,
                max,
                variance: Math.sqrt(variance)
            };
        }

        return result;
    }

    /**
     * Get recommendations based on trends
     */
    getRecommendations(): string[] {
        const stats = this.getQualityStats();
        const recommendations: string[] = [];

        if (stats.passRate < 50) {
            recommendations.push('⚠ Critical: Pass rate below 50%. Review quality gates and mission execution.');
        } else if (stats.passRate < 75) {
            recommendations.push('⚠ Attention: Pass rate below 75%. Increase focus on quality improvements.');
        } else if (stats.passRate >= 90) {
            recommendations.push('✓ Excellent: Pass rate above 90%. Maintain current quality standards.');
        }

        if (stats.trend === 'declining') {
            recommendations.push('⚠ Trend: Quality declining. Investigate recent mission failures.');
        } else if (stats.trend === 'improving') {
            recommendations.push('✓ Positive: Quality improving. Continue current strategies.');
        }

        if (stats.averageScore < 75) {
            recommendations.push('⚠ Low average score. Focus on improving completeness and accuracy.');
        }

        return recommendations;
    }

    /**
     * Clear history for testing
     */
    clearHistory(): void {
        this.scoreHistory = [];
        this.passCount = 0;
        this.failCount = 0;
        this.criterionDistribution = {
            completeness: [],
            accuracy: [],
            actionability: []
        };
    }
}

// Singleton instance
export const qualityGateValidator = new QualityGateValidator();
