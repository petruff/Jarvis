// src/autonomy/confidenceEngine.ts
// JARVIS Confidence Engine — Decides whether a proposed autonomous action
// executes immediately (AUTO_EXECUTE) or queues for Founder approval (PENDING_APPROVAL)
//
// Scoring model:
//   risk_level + reversibility + cost_estimate + past_success_rate → confidence score
//   HIGH confidence + LOW risk → AUTO_EXECUTE
//   LOW confidence or HIGH risk → PENDING_APPROVAL

import { EpisodicMemory } from '../memory/episodic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskType =
    | 'research'      // Information gathering, analysis (LOW risk, fully reversible)
    | 'analysis'      // Processing existing data (LOW risk, fully reversible)
    | 'writing'       // Content creation, copywriting (LOW risk, reversible)
    | 'planning'      // OKR/strategy/roadmap creation (LOW risk, reversible)
    | 'code'          // Code generation / file writes (MEDIUM risk, reversible)
    | 'communication' // Sending messages, emails (MEDIUM risk, partially reversible)
    | 'deploy'        // Deployment to servers/cloud (HIGH risk, hard to reverse)
    | 'financial'     // Financial analysis or transactions (CRITICAL risk, irreversible)
    | 'delete'        // File/data deletion (CRITICAL risk, irreversible);

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExecutionDecision = 'AUTO_EXECUTE' | 'PENDING_APPROVAL';

export interface ConfidenceAssessment {
    taskType: TaskType;
    riskLevel: RiskLevel;
    reversible: boolean;
    estimatedCostUsd: number;
    pastSuccessRate: number;        // 0.0–1.0, from episodic memory
    confidenceScore: number;        // 0–100
    decision: ExecutionDecision;
    rationale: string;
}

// ─── Risk Profiles ────────────────────────────────────────────────────────────

const TASK_RISK_PROFILES: Record<TaskType, { risk: RiskLevel; reversible: boolean; baseCost: number }> = {
    research:      { risk: 'LOW',      reversible: true,  baseCost: 0.02 },
    analysis:      { risk: 'LOW',      reversible: true,  baseCost: 0.02 },
    writing:       { risk: 'LOW',      reversible: true,  baseCost: 0.03 },
    planning:      { risk: 'LOW',      reversible: true,  baseCost: 0.03 },
    code:          { risk: 'MEDIUM',   reversible: true,  baseCost: 0.06 },
    communication: { risk: 'MEDIUM',   reversible: false, baseCost: 0.01 },
    deploy:        { risk: 'HIGH',     reversible: false, baseCost: 0.05 },
    financial:     { risk: 'CRITICAL', reversible: false, baseCost: 0.00 },
    delete:        { risk: 'CRITICAL', reversible: false, baseCost: 0.00 },
};

// AUTO_EXECUTE thresholds — all conditions must be met
const AUTO_EXECUTE_RULES = {
    maxRisk: 'LOW' as RiskLevel,          // Only LOW risk tasks auto-execute
    mustBeReversible: true,                // Must be undoable
    maxCostUsd: 0.10,                      // Under $0.10 per action
    minSuccessRate: 0.70,                  // ≥70% historical success for similar tasks
    minConfidenceScore: 65,                // Composite score must be ≥65/100
};

const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// ─── Confidence Engine ────────────────────────────────────────────────────────

export class ConfidenceEngine {
    constructor(private episodicMemory: EpisodicMemory) {}

    /**
     * Assess whether a proposed task should auto-execute or queue for approval.
     * @param taskPrompt The task description (used for semantic success-rate lookup)
     * @param squadId The squad that would execute the task
     * @param overrides Optional overrides for testing or explicit control
     */
    async assess(
        taskPrompt: string,
        squadId: string,
        overrides?: Partial<{ taskType: TaskType; estimatedCostUsd: number }>
    ): Promise<ConfidenceAssessment> {
        // 1. Detect task type from prompt keywords
        const taskType = overrides?.taskType ?? this.detectTaskType(taskPrompt, squadId);
        const profile = TASK_RISK_PROFILES[taskType];

        // 2. Look up historical success rate from episodic memory
        const pastSuccessRate = await this.lookupSuccessRate(taskPrompt, squadId);

        // 3. Estimated cost (profile base + per-squad adjustments)
        const estimatedCostUsd = overrides?.estimatedCostUsd ?? this.estimateCost(taskType, squadId);

        // 4. Composite confidence score (0–100)
        const confidenceScore = this.computeConfidenceScore({
            riskLevel: profile.risk,
            reversible: profile.reversible,
            estimatedCostUsd,
            pastSuccessRate,
        });

        // 5. Apply auto-execute rules
        const decision = this.makeDecision(profile.risk, profile.reversible, estimatedCostUsd, pastSuccessRate, confidenceScore);

        const rationale = this.buildRationale(decision, {
            taskType,
            riskLevel: profile.risk,
            reversible: profile.reversible,
            estimatedCostUsd,
            pastSuccessRate,
            confidenceScore,
        });

        return {
            taskType,
            riskLevel: profile.risk,
            reversible: profile.reversible,
            estimatedCostUsd,
            pastSuccessRate,
            confidenceScore,
            decision,
            rationale,
        };
    }

    // ─── Task Type Detection ──────────────────────────────────────────────────

    private detectTaskType(prompt: string, squadId: string): TaskType {
        const p = prompt.toLowerCase();

        // Override based on squad
        if (squadId === 'forge') return 'code';
        if (squadId === 'vault') return 'financial';

        // Keyword detection
        if (/delete|remove|drop|destroy|erase/.test(p)) return 'delete';
        if (/deploy|publish|release|push to|go live|production/.test(p)) return 'deploy';
        if (/send|email|message|notify|post|tweet|publish/.test(p)) return 'communication';
        if (/code|implement|build|create|develop|program|script/.test(p)) return 'code';
        if (/plan|roadmap|okr|strategy|prioritize/.test(p)) return 'planning';
        if (/write|copy|content|landing page|blog|article/.test(p)) return 'writing';
        if (/analyz|assess|evaluat|review|audit|diagnose/.test(p)) return 'analysis';
        return 'research'; // Default: safe
    }

    // ─── Success Rate Lookup ──────────────────────────────────────────────────

    private async lookupSuccessRate(prompt: string, squadId: string): Promise<number> {
        try {
            const similar = await this.episodicMemory.recall(prompt, squadId);
            if (similar.length === 0) return 0.75; // No history → assume moderate success

            const successCount = similar.filter(e =>
                e.status === 'DONE' && (e.qualityScore ?? 0) >= 70
            ).length;

            return successCount / similar.length;
        } catch {
            return 0.75; // Fallback on memory error
        }
    }

    // ─── Cost Estimation ──────────────────────────────────────────────────────

    private estimateCost(taskType: TaskType, squadId: string): number {
        const base = TASK_RISK_PROFILES[taskType].baseCost;
        // Squads with more agents cost more
        const agentMultiplier: Record<string, number> = {
            mercury: 1.5, // 9 agents
            forge: 1.3,   // 6 agents
            board: 1.4,   // 8 agents
        };
        return base * (agentMultiplier[squadId] || 1.0);
    }

    // ─── Confidence Scoring ───────────────────────────────────────────────────

    private computeConfidenceScore(params: {
        riskLevel: RiskLevel;
        reversible: boolean;
        estimatedCostUsd: number;
        pastSuccessRate: number;
    }): number {
        let score = 100;

        // Deduct for risk level
        score -= RISK_ORDER[params.riskLevel] * 20;

        // Deduct for irreversibility
        if (!params.reversible) score -= 15;

        // Deduct for cost above threshold
        if (params.estimatedCostUsd > 0.05) score -= 10;
        if (params.estimatedCostUsd > 0.20) score -= 15;

        // Boost/deduct based on historical success
        score += (params.pastSuccessRate - 0.70) * 30; // ±15 points around 70% baseline

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    // ─── Decision Logic ───────────────────────────────────────────────────────

    private makeDecision(
        risk: RiskLevel,
        reversible: boolean,
        cost: number,
        successRate: number,
        confidence: number
    ): ExecutionDecision {
        if (RISK_ORDER[risk] > RISK_ORDER[AUTO_EXECUTE_RULES.maxRisk]) return 'PENDING_APPROVAL';
        if (!reversible && AUTO_EXECUTE_RULES.mustBeReversible) return 'PENDING_APPROVAL';
        if (cost > AUTO_EXECUTE_RULES.maxCostUsd) return 'PENDING_APPROVAL';
        if (successRate < AUTO_EXECUTE_RULES.minSuccessRate) return 'PENDING_APPROVAL';
        if (confidence < AUTO_EXECUTE_RULES.minConfidenceScore) return 'PENDING_APPROVAL';
        return 'AUTO_EXECUTE';
    }

    // ─── Rationale Builder ────────────────────────────────────────────────────

    private buildRationale(decision: ExecutionDecision, params: {
        taskType: TaskType;
        riskLevel: RiskLevel;
        reversible: boolean;
        estimatedCostUsd: number;
        pastSuccessRate: number;
        confidenceScore: number;
    }): string {
        const reasons: string[] = [];

        if (decision === 'AUTO_EXECUTE') {
            reasons.push(`LOW risk ${params.taskType} task`);
            reasons.push(`reversible=true`);
            reasons.push(`est. cost=$${params.estimatedCostUsd.toFixed(3)}`);
            reasons.push(`historical success=${Math.round(params.pastSuccessRate * 100)}%`);
            reasons.push(`confidence=${params.confidenceScore}/100`);
            return `AUTO_EXECUTE: ${reasons.join(', ')}`;
        } else {
            if (RISK_ORDER[params.riskLevel] > 0) reasons.push(`risk=${params.riskLevel}`);
            if (!params.reversible) reasons.push(`irreversible action`);
            if (params.estimatedCostUsd > AUTO_EXECUTE_RULES.maxCostUsd) reasons.push(`cost=$${params.estimatedCostUsd.toFixed(3)} exceeds $${AUTO_EXECUTE_RULES.maxCostUsd}`);
            if (params.pastSuccessRate < AUTO_EXECUTE_RULES.minSuccessRate) reasons.push(`success_rate=${Math.round(params.pastSuccessRate * 100)}% below ${AUTO_EXECUTE_RULES.minSuccessRate * 100}% threshold`);
            if (params.confidenceScore < AUTO_EXECUTE_RULES.minConfidenceScore) reasons.push(`confidence=${params.confidenceScore}/100 below ${AUTO_EXECUTE_RULES.minConfidenceScore}`);
            return `PENDING_APPROVAL: ${reasons.join('; ')}`;
        }
    }
}
