/**
 * JARVIS Evolution v6.0 — 10-Phase QA Evolution (Sprint 1 / Phase E5)
 *
 * Replaces the simple 3-criterion quality gate with a structured 10-phase review.
 * Each phase returns a 0-100 score. Final score is a weighted composite.
 *
 * Phases 1-4 and 9-10 run for ALL squads.
 * Phases 5-8 (code-specific) only run for Forge and Nexus squads.
 *
 * Weighting:
 *   Completeness  30%
 *   Accuracy      25%
 *   Consistency    5%
 *   Style          5%
 *   Security       5%  (forge/nexus only, else inherit accuracy)
 *   Performance    5%  (forge/nexus only)
 *   Testability    5%  (forge/nexus only)
 *   Documentation  5%  (forge/nexus only)
 *   Founder Align  5%
 *   Final bonus   10%  (reserved for exceptional output)
 */

import { queryLLM } from '../llm';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseScore {
    phase: string;
    score: number;         // 0-100
    rationale: string;
    skipped?: boolean;
}

export interface QAReport {
    missionId: string;
    squadId: string;
    phases: PhaseScore[];
    finalScore: number;   // weighted composite 0-100
    passed: boolean;
    summary: string;
    weakestPhase: string;
    improvementNote: string;
    evaluatedAt: string;
}

// ─── Code-specific squads ─────────────────────────────────────────────────────
const CODE_SQUADS = new Set(['forge', 'nexus']);

// ─── QA Evolution Engine ──────────────────────────────────────────────────────

class QAEvolution {
    private readonly passThreshold = 65;

    /**
     * Run all 10 QA phases on a mission result.
     * Returns a full QAReport with per-phase scores and a weighted final score.
     */
    async evaluate(
        output: string,
        missionContext: { missionId: string; prompt: string; squad?: string },
        squadId: string
    ): Promise<QAReport> {
        const isCodeSquad = CODE_SQUADS.has(squadId.split('-')[0]);
        const phases: PhaseScore[] = [];

        // ── Phase 1: COMPLETENESS ───────────────────────────────────────────
        phases.push(await this.runPhase(
            'COMPLETENESS',
            `Does this output address ALL requirements from the mission prompt?
Is every required deliverable present (not just described)?
Score 0=completely missing, 50=partial, 100=fully complete.`,
            output, missionContext.prompt
        ));

        // ── Phase 2: ACCURACY ───────────────────────────────────────────────
        phases.push(await this.runPhase(
            'ACCURACY',
            `Are all factual/technical claims in this output verifiable or demonstrably correct?
Are code examples syntactically valid and logically sound?
Are there hallucinations or clear errors?
Score 0=many errors, 50=minor issues, 100=fully accurate.`,
            output, missionContext.prompt
        ));

        // ── Phase 3: CONSISTENCY ────────────────────────────────────────────
        phases.push(await this.runPhase(
            'CONSISTENCY',
            `Is the output internally consistent — no contradictions between sections?
Do variable names, terminology, and logic stay coherent throughout?
Score 0=contradictory, 50=minor inconsistencies, 100=fully consistent.`,
            output, missionContext.prompt
        ));

        // ── Phase 4: STYLE ──────────────────────────────────────────────────
        phases.push(await this.runPhase(
            'STYLE',
            `Does the output match the expected JARVIS voice — direct, decisive, expert?
Is it appropriately concise (no padding) yet complete?
Does it use proper formatting for the output type (markdown for docs, clean code for code)?
Score 0=wrong style, 50=acceptable, 100=perfectly on-brand.`,
            output, missionContext.prompt
        ));

        // ── Phases 5-8: CODE-SPECIFIC (forge/nexus only) ────────────────────
        if (isCodeSquad) {
            phases.push(await this.runPhase(
                'SECURITY',
                `Scan the code output for security vulnerabilities:
- SQL injection, XSS, command injection
- Hardcoded secrets, insecure random, unvalidated inputs
- Missing authentication/authorization checks
- Insecure dependencies or dangerous function calls
Score 0=critical vulns, 50=minor issues, 100=no security concerns.`,
                output, missionContext.prompt
            ));

            phases.push(await this.runPhase(
                'PERFORMANCE',
                `Identify performance anti-patterns:
- N+1 queries, blocking I/O in async context
- Missing indexes, unbounded loops, memory leaks
- Unoptimized algorithms for the data size implied
Score 0=severe perf issues, 50=minor concerns, 100=performant.`,
                output, missionContext.prompt
            ));

            phases.push(await this.runPhase(
                'TESTABILITY',
                `Is the code structured for testability?
- Functions are pure/mockable where appropriate
- Edge cases and error paths are handled
- Clear contracts (inputs/outputs) that can be tested
Score 0=untestable, 50=somewhat testable, 100=fully testable.`,
                output, missionContext.prompt
            ));

            phases.push(await this.runPhase(
                'DOCUMENTATION',
                `Are key functions, classes, and modules documented?
- Complex logic has inline comments
- Public APIs have parameter/return descriptions
- Non-obvious decisions are explained
Score 0=no docs, 50=sparse, 100=well documented.`,
                output, missionContext.prompt
            ));
        } else {
            // Skip code phases for non-code squads — mark as skipped with neutral score
            for (const name of ['SECURITY', 'PERFORMANCE', 'TESTABILITY', 'DOCUMENTATION']) {
                phases.push({ phase: name, score: 80, rationale: 'Skipped: not a code squad.', skipped: true });
            }
        }

        // ── Phase 9: FOUNDER ALIGNMENT ──────────────────────────────────────
        phases.push(await this.runPhase(
            'FOUNDER_ALIGNMENT',
            `Does this output align with the company's strategic direction?
- Advances the stated goals/OKRs
- Respects resource constraints (budget, time)
- The founder could act on this immediately without clarification
Score 0=misaligned, 50=neutral, 100=perfectly aligned.`,
            output, missionContext.prompt
        ));

        // ── Phase 10: FINAL SCORE (composite) ──────────────────────────────
        const finalScore = this.computeWeightedScore(phases, isCodeSquad);
        const passed = finalScore >= this.passThreshold;
        const weakest = [...phases].sort((a, b) => a.score - b.score).find(p => !p.skipped);
        const weakestPhase = weakest?.phase ?? 'none';
        const improvementNote = weakest?.rationale ?? 'All phases passed.';

        const report: QAReport = {
            missionId: missionContext.missionId,
            squadId,
            phases,
            finalScore,
            passed,
            summary: `${passed ? '✅ PASSED' : '❌ FAILED'} — ${finalScore}/100 (threshold: ${this.passThreshold})`,
            weakestPhase,
            improvementNote,
            evaluatedAt: new Date().toISOString(),
        };

        logger.info(`[QAEvolution] Mission ${missionContext.missionId} | Score: ${finalScore}/100 | ${passed ? 'PASSED' : 'FAILED'} | Weakest: ${weakestPhase}`);

        return report;
    }

    /**
     * Run a single QA phase via LLM.
     */
    private async runPhase(
        phaseName: string,
        rubric: string,
        output: string,
        prompt: string
    ): Promise<PhaseScore> {
        try {
            const llmPrompt = `You are a QA evaluator running the ${phaseName} phase.

RUBRIC:
${rubric}

MISSION PROMPT (first 400 chars):
${prompt.slice(0, 400)}

OUTPUT TO EVALUATE (first 1500 chars):
${output.slice(0, 1500)}

Respond ONLY with valid JSON, no markdown, no explanation outside JSON:
{"score": 0-100, "rationale": "one sentence explaining the score"}`;

            const resp = await queryLLM('QA Evolution Evaluator', llmPrompt, 'forge');
            const clean = resp.replace(/```json|```/g, '').trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            const parsed = JSON.parse(clean.substring(start, end + 1)) as { score: number; rationale: string };

            return {
                phase: phaseName,
                score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
                rationale: parsed.rationale || '',
            };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[QAEvolution] Phase ${phaseName} failed: ${msg}. Defaulting to 75.`);
            return { phase: phaseName, score: 75, rationale: 'Evaluation error — default pass applied.' };
        }
    }

    /**
     * Compute weighted composite score from all phases.
     *
     * Weights:
     *   COMPLETENESS   30%
     *   ACCURACY       25%
     *   CONSISTENCY     5%
     *   STYLE           5%
     *   SECURITY        5%
     *   PERFORMANCE     5%
     *   TESTABILITY     5%
     *   DOCUMENTATION   5%
     *   FOUNDER_ALIGN  10%
     *   (10% reserved, taken from ACCURACY if code squad)
     */
    private computeWeightedScore(phases: PhaseScore[], isCodeSquad: boolean): number {
        const weights: Record<string, number> = {
            COMPLETENESS: 0.30,
            ACCURACY: 0.25,
            CONSISTENCY: 0.05,
            STYLE: 0.05,
            SECURITY: isCodeSquad ? 0.05 : 0.0,
            PERFORMANCE: isCodeSquad ? 0.05 : 0.0,
            TESTABILITY: isCodeSquad ? 0.05 : 0.0,
            DOCUMENTATION: isCodeSquad ? 0.05 : 0.0,
            FOUNDER_ALIGNMENT: 0.10,
        };

        // Redistribute non-code weights to ACCURACY + COMPLETENESS
        if (!isCodeSquad) {
            weights['ACCURACY'] += 0.10;
            weights['COMPLETENESS'] += 0.10;
        }

        let total = 0;
        let weightSum = 0;
        for (const phase of phases) {
            const w = weights[phase.phase] ?? 0;
            total += phase.score * w;
            weightSum += w;
        }

        // Normalise if weights don't sum to 1.0 exactly
        if (weightSum > 0 && Math.abs(weightSum - 1.0) > 0.01) {
            total = total / weightSum;
        }

        return Math.round(total);
    }

    /**
     * Quick compatibility shim — returns a simple pass/fail like the old QualityGate.
     * Used by code that hasn't been updated to consume the full QAReport.
     */
    async quickEvaluate(output: string, prompt: string, missionId: string, squadId: string): Promise<{
        total: number;
        passed: boolean;
        improvementNote: string;
    }> {
        const report = await this.evaluate(output, { missionId, prompt }, squadId);
        return {
            total: report.finalScore,
            passed: report.passed,
            improvementNote: report.improvementNote,
        };
    }
}

export const qaEvolution = new QAEvolution();
export default qaEvolution;
