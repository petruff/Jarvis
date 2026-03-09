/**
 * ReAct Success Validator — Phase 2.3
 *
 * Validates ReAct loop quality with:
 * - Iteration limits (max 10 steps)
 * - Success criteria (quality score threshold 75/100)
 * - Tool call efficiency (tool calls per step ratio)
 * - Reasoning quality (LLM parsing success rate)
 * - Early termination detection
 */

import { metricsCollector } from '../instrumentation/metricsCollector';

export interface ReActStepMetrics {
    step: number;
    toolName?: string;
    evaluationScore: number; // 0-1
    reasoningQuality: 'valid_json' | 'parse_error' | 'malformed' | 'timeout';
    toolCallSuccess: boolean;
    durationMs: number;
}

export interface ReActSuccessReport {
    totalSteps: number;
    totalToolCalls: number;
    averageQualityScore: number;
    successCriteriaMet: boolean;
    reasons: string[];
    warnings: string[];
    efficiency: {
        toolCallsPerStep: number;
        averageStepDuration: number;
        reasoning_success_rate: number;
    };
}

export class ReActSuccessValidator {
    private readonly STEP_LIMIT = 10;
    private readonly SUCCESS_THRESHOLD = 75; // out of 100
    private readonly TOOL_CALLS_PER_STEP_MAX = 1.5;
    private readonly STEP_TIMEOUT_MS = 15000; // 15 seconds per step
    private readonly AVG_STEP_DURATION_MAX = 5000; // 5 seconds average

    /**
     * Validate ReAct loop completion
     */
    validateCompletion(
        totalSteps: number,
        totalToolCalls: number,
        qualityScores: number[],
        stepMetrics: ReActStepMetrics[],
        finalAnswer: string
    ): ReActSuccessReport {
        const reasons: string[] = [];
        const warnings: string[] = [];

        // Check 1: Iteration limit
        if (totalSteps > this.STEP_LIMIT) {
            reasons.push(`Step limit exceeded: ${totalSteps} > ${this.STEP_LIMIT}`);
        } else {
            reasons.push(`✓ Step limit respected: ${totalSteps}/${this.STEP_LIMIT}`);
        }

        // Check 2: Quality score threshold
        const avgQuality = qualityScores.length > 0
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
            : 0;

        if (avgQuality < this.SUCCESS_THRESHOLD) {
            reasons.push(`Quality below threshold: ${avgQuality.toFixed(0)}/100 < ${this.SUCCESS_THRESHOLD}`);
        } else {
            reasons.push(`✓ Quality meets threshold: ${avgQuality.toFixed(0)}/100`);
        }

        // Check 3: Tool call efficiency
        const toolCallsPerStep = totalSteps > 0 ? totalToolCalls / totalSteps : 0;
        if (toolCallsPerStep > this.TOOL_CALLS_PER_STEP_MAX) {
            warnings.push(`Tool efficiency warning: ${toolCallsPerStep.toFixed(2)} calls/step > ${this.TOOL_CALLS_PER_STEP_MAX}`);
        }

        // Check 4: Reasoning quality (JSON parsing success)
        const validReasoningCount = stepMetrics.filter(m => m.reasoningQuality === 'valid_json').length;
        const reasoningSuccessRate = totalSteps > 0 ? validReasoningCount / totalSteps : 0;
        if (reasoningSuccessRate < 0.8) {
            warnings.push(`Reasoning quality: ${(reasoningSuccessRate * 100).toFixed(0)}% valid JSON < 80% target`);
        }

        // Check 5: Step duration consistency
        const avgStepDuration = stepMetrics.length > 0
            ? stepMetrics.reduce((sum, m) => sum + m.durationMs, 0) / stepMetrics.length
            : 0;

        if (avgStepDuration > this.AVG_STEP_DURATION_MAX) {
            warnings.push(`Step duration: ${avgStepDuration.toFixed(0)}ms > ${this.AVG_STEP_DURATION_MAX}ms target`);
        }

        // Check 6: Early termination (finished before hitting step limit)
        const earlyTermination = totalSteps < this.STEP_LIMIT / 2; // Less than half steps used
        if (!earlyTermination && totalSteps >= this.STEP_LIMIT) {
            warnings.push(`Loop potentially stuck: used full step limit (${totalSteps}/${this.STEP_LIMIT})`);
        }

        // Check 7: Final answer quality
        if (!finalAnswer || finalAnswer.length < 10) {
            reasons.push(`Warning: Final answer too short or empty`);
        } else if (finalAnswer.includes('unfinished') || finalAnswer.includes('timeout')) {
            reasons.push(`Loop did not complete successfully`);
        } else {
            reasons.push(`✓ Final answer present and reasonable`);
        }

        // Overall success criteria
        const successCriteriaMet =
            totalSteps <= this.STEP_LIMIT &&
            avgQuality >= this.SUCCESS_THRESHOLD &&
            reasoningSuccessRate >= 0.8 &&
            finalAnswer &&
            finalAnswer.length > 10 &&
            !finalAnswer.includes('unfinished');

        return {
            totalSteps,
            totalToolCalls,
            averageQualityScore: avgQuality,
            successCriteriaMet,
            reasons,
            warnings,
            efficiency: {
                toolCallsPerStep,
                averageStepDuration: avgStepDuration,
                reasoning_success_rate: reasoningSuccessRate
            }
        };
    }

    /**
     * Check if step is within performance bounds
     */
    validateStep(step: number, durationMs: number, evaluationScore: number): {
        valid: boolean;
        warnings: string[];
    } {
        const warnings: string[] = [];

        if (step > this.STEP_LIMIT) {
            return { valid: false, warnings: [`Step ${step} exceeds limit of ${this.STEP_LIMIT}`] };
        }

        if (durationMs > this.STEP_TIMEOUT_MS) {
            warnings.push(`Step ${step} duration (${durationMs}ms) exceeds ${this.STEP_TIMEOUT_MS}ms timeout`);
        }

        if (evaluationScore < 0.5) {
            warnings.push(`Step ${step} quality score (${(evaluationScore * 100).toFixed(0)}/100) below 50%`);
        }

        return {
            valid: warnings.length === 0,
            warnings
        };
    }

    /**
     * Get success rate across multiple runs
     */
    calculateSuccessRate(runs: ReActSuccessReport[]): {
        successRate: number;
        averageStepsPerRun: number;
        averageQualityPerRun: number;
        successfulRuns: number;
        totalRuns: number;
    } {
        if (runs.length === 0) {
            return {
                successRate: 0,
                averageStepsPerRun: 0,
                averageQualityPerRun: 0,
                successfulRuns: 0,
                totalRuns: 0
            };
        }

        const successfulRuns = runs.filter(r => r.successCriteriaMet).length;
        const avgSteps = runs.reduce((sum, r) => sum + r.totalSteps, 0) / runs.length;
        const avgQuality = runs.reduce((sum, r) => sum + r.averageQualityScore, 0) / runs.length;

        return {
            successRate: (successfulRuns / runs.length) * 100,
            averageStepsPerRun: avgSteps,
            averageQualityPerRun: avgQuality,
            successfulRuns,
            totalRuns: runs.length
        };
    }
}

// Singleton instance
export const reactSuccessValidator = new ReActSuccessValidator();
