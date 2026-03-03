/**
 * JARVIS Evolution v6.0 — 13-Step Self-Critique Execution Loop (Sprint 1 / Phase E3)
 *
 * Wraps runAgentLoop() (agent.ts) with a structured 13-step checkpoint system.
 * Each step adds reasoning discipline without changing the underlying ReAct architecture.
 *
 * Steps:
 *  1.  PARSE         — understand mission, identify deliverable type
 *  2.  RECALL        — check episodic memory for similar past missions
 *  3.  PLAN          — outline approach in scratchpad
 *  4.  SPEC_CHECK    — verify alignment with spec file if it exists
 *  5.  CONTEXT_INJECT— inject strategic goals via query_goals()
 *  6.  EXECUTE       — run primary agent loop (runAgentLoop)
 *  7.  SELF_REVIEW   — agent reviews own output for gaps
 *  8.  GAP_ANALYSIS  — identify what's missing vs requirements
 *  9.  ENHANCEMENT   — if gaps found, second LLM call to fill them
 * 10.  QUALITY_CHECK — compute quality score via QAEvolution
 * 11.  RETRY_OR_PASS — if score < 75, retry step 6 with gap analysis
 * 12.  FILE_DELIVERY — extract and save any code/files
 * 13.  MEMORY_WRITE  — write episode to episodic memory with quality score
 */

import { queryLLM } from '../llm';
import { hookSystem } from './hookSystem';
import { qaEvolution } from './qaEvolution';
import { recoverySystem } from './recoverySystem';
import logger from '../logger';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CritiqueOptions {
    missionId: string;
    prompt: string;
    squadId: string;
    agentId?: string;
    socket?: { emit: (event: string, data: unknown) => void };
    systemPrompt?: string;
    /** Called to actually run the core agent execution */
    executeFn: () => Promise<string>;
}

export interface CritiqueResult {
    output: string;
    qualityScore: number;
    passed: boolean;
    stepsCompleted: string[];
    retries: number;
    enhancementApplied: boolean;
    missionId: string;
}

// ─── Self-Critique Loop ───────────────────────────────────────────────────────

class SelfCritiqueLoop {
    private readonly RETRY_THRESHOLD = 75;
    private readonly MAX_RETRIES = 2;
    private readonly deliverablesDir: string;
    private readonly specsDir: string;

    constructor() {
        this.deliverablesDir = path.resolve(process.cwd(), 'workspace', 'deliverables');
        this.specsDir = path.resolve(process.cwd(), '.jarvis', 'specs');
    }

    private log(socket: CritiqueOptions['socket'], step: string, msg: string, missionId: string): void {
        logger.info(`[SCL:${step}] ${missionId} — ${msg}`);
        if (socket) {
            socket.emit('squad/log', { agentId: 'self-critique', message: `[${step}] ${msg}` });
        }
    }

    /**
     * Run the full 13-step self-critique loop around an agent execution function.
     */
    async run(opts: CritiqueOptions): Promise<CritiqueResult> {
        const { missionId, prompt, squadId, agentId = 'jarvis', socket, systemPrompt, executeFn } = opts;
        const stepsCompleted: string[] = [];
        let output = '';
        let qualityScore = 0;
        let passed = false;
        let retries = 0;
        let enhancementApplied = false;

        // ── Fire session start hook ──────────────────────────────────────────
        await hookSystem.fire('onSessionStart', { missionId, squadId, agentId });

        // ── Step 1: PARSE ───────────────────────────────────────────────────
        await recoverySystem.saveCheckpoint(missionId, 'PARSE', prompt, { squadId });
        this.log(socket, 'PARSE', 'Identifying mission deliverable type', missionId);
        const deliverableType = await this.identifyDeliverableType(prompt, squadId);
        stepsCompleted.push('PARSE');
        this.log(socket, 'PARSE', `Deliverable type: ${deliverableType}`, missionId);

        // ── Step 2: RECALL ──────────────────────────────────────────────────
        await recoverySystem.saveCheckpoint(missionId, 'RECALL', prompt, { squadId });
        this.log(socket, 'RECALL', 'Checking episodic memory for similar missions', missionId);
        let recallContext = '';
        try {
            const { episodicMemory } = require('../index');
            if (episodicMemory) {
                const episodes = await episodicMemory.recall(prompt.slice(0, 300), squadId);
                if (episodes.length > 0) {
                    recallContext = `[PAST MISSIONS — ${episodes.length} similar]\n` +
                        episodes.slice(0, 2).map((ep: { squad: string; qualityScore: number; prompt: string; result: string }) =>
                            `Squad:${ep.squad} | Score:${ep.qualityScore}/100\nTask: ${ep.prompt.slice(0, 100)}\nResult: ${ep.result.slice(0, 200)}`
                        ).join('\n---\n');
                    this.log(socket, 'RECALL', `Found ${episodes.length} relevant past mission(s)`, missionId);
                }
            }
        } catch { /* episodic memory optional */ }
        stepsCompleted.push('RECALL');

        // ── Step 3: PLAN ────────────────────────────────────────────────────
        await recoverySystem.saveCheckpoint(missionId, 'PLAN', prompt, { squadId });
        this.log(socket, 'PLAN', 'Generating execution plan', missionId);
        const plan = await this.generatePlan(prompt, deliverableType, recallContext, squadId);
        stepsCompleted.push('PLAN');
        this.log(socket, 'PLAN', `Plan: ${plan.slice(0, 120)}`, missionId);

        // ── Step 4: SPEC_CHECK ──────────────────────────────────────────────
        this.log(socket, 'SPEC_CHECK', 'Checking for existing spec file', missionId);
        const specContext = this.loadSpecContext(missionId);
        if (specContext) {
            this.log(socket, 'SPEC_CHECK', 'Spec file found — injecting', missionId);
        }
        stepsCompleted.push('SPEC_CHECK');

        // ── Step 5: CONTEXT_INJECT ──────────────────────────────────────────
        await recoverySystem.saveCheckpoint(missionId, 'CONTEXT_INJECT', prompt, { squadId });
        this.log(socket, 'CONTEXT_INJECT', 'Injecting strategic goals context', missionId);
        let goalsContext = '';
        try {
            const { goalManager } = require('../index');
            if (goalManager) {
                const goals = await goalManager.getActiveGoals();
                if (goals?.horizon || goals?.quarterly?.objective) {
                    goalsContext =
                        `[COMPANY GOALS]\n` +
                        (goals.horizon ? `Horizon: ${goals.horizon}\n` : '') +
                        (goals.quarterly?.objective ? `Quarterly: ${goals.quarterly.objective}\n` : '');
                }
            }
        } catch { /* goals optional */ }
        stepsCompleted.push('CONTEXT_INJECT');

        // Build enriched prompt with all context
        const enrichedPrompt = [
            recallContext,
            specContext,
            goalsContext,
            `[EXECUTION PLAN]\n${plan}`,
            `[MISSION]\n${prompt}`,
        ].filter(Boolean).join('\n\n');

        // ── Steps 6 + 11 RETRY LOOP ─────────────────────────────────────────
        let gapAnalysis = '';
        do {
            // ── Step 6: EXECUTE ─────────────────────────────────────────────
            await recoverySystem.saveCheckpoint(missionId, 'EXECUTE', enrichedPrompt, { squadId, context: { retries } });
            this.log(socket, 'EXECUTE', `Running agent (attempt ${retries + 1})`, missionId);
            await hookSystem.fire('onBeforeLLM', { missionId, squadId, agentId, llmPrompt: enrichedPrompt.slice(0, 200) });

            try {
                output = await executeFn();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                output = `[EXECUTION ERROR] ${msg}`;
            }

            await hookSystem.fire('onAfterLLM', { missionId, squadId, agentId, llmResponse: output.slice(0, 200) });
            stepsCompleted.push(`EXECUTE_${retries + 1}`);

            // ── Step 7: SELF_REVIEW ─────────────────────────────────────────
            this.log(socket, 'SELF_REVIEW', 'Agent reviewing own output', missionId);
            const selfReview = await this.selfReview(prompt, output, squadId);
            stepsCompleted.push('SELF_REVIEW');

            // ── Step 8: GAP_ANALYSIS ────────────────────────────────────────
            this.log(socket, 'GAP_ANALYSIS', 'Identifying gaps', missionId);
            gapAnalysis = selfReview.gaps;
            const hasGaps = selfReview.hasGaps;
            stepsCompleted.push('GAP_ANALYSIS');

            // ── Step 9: ENHANCEMENT ─────────────────────────────────────────
            if (hasGaps && gapAnalysis) {
                this.log(socket, 'ENHANCEMENT', `Gaps found — enhancing output`, missionId);
                const enhanced = await this.enhance(prompt, output, gapAnalysis, squadId);
                if (enhanced && enhanced.length > output.length * 0.5) {
                    output = enhanced;
                    enhancementApplied = true;
                    this.log(socket, 'ENHANCEMENT', 'Enhancement applied', missionId);
                }
            }
            stepsCompleted.push('ENHANCEMENT');

            // ── Step 10: QUALITY_CHECK ──────────────────────────────────────
            await recoverySystem.saveCheckpoint(missionId, 'QUALITY_CHECK', prompt, { squadId, partialResult: output.slice(0, 500) });
            this.log(socket, 'QUALITY_CHECK', 'Running QA Evolution (10-phase)', missionId);

            const qaReport = await qaEvolution.evaluate(output, { missionId, prompt }, squadId);
            qualityScore = qaReport.finalScore;
            passed = qaReport.passed;

            this.log(socket, 'QUALITY_CHECK', `Score: ${qualityScore}/100 | ${passed ? 'PASSED' : 'FAILED'}`, missionId);
            stepsCompleted.push('QUALITY_CHECK');

            // ── Step 11: RETRY_OR_PASS ──────────────────────────────────────
            if (!passed) {
                retries++;
                await hookSystem.fire('onQualityFail', { missionId, squadId, qualityScore });
                if (retries < this.MAX_RETRIES) {
                    this.log(socket, 'RETRY', `Score ${qualityScore} < ${this.RETRY_THRESHOLD} — retrying with gap feedback`, missionId);
                    // Inject quality feedback into executeFn context via enrichedPrompt (next iteration)
                    gapAnalysis = `Previous score: ${qualityScore}/100. Weakest: ${qaReport.weakestPhase}. Issue: ${qaReport.improvementNote}. Please address these gaps.`;
                }
            }
        } while (!passed && retries < this.MAX_RETRIES);

        // ── Step 12: FILE_DELIVERY ───────────────────────────────────────────
        await recoverySystem.saveCheckpoint(missionId, 'FILE_DELIVERY', prompt, { squadId, partialResult: output.slice(0, 500) });
        this.log(socket, 'FILE_DELIVERY', 'Checking for file deliverables', missionId);
        this.extractAndSaveFiles(output, missionId);
        stepsCompleted.push('FILE_DELIVERY');

        // ── Step 13: MEMORY_WRITE ────────────────────────────────────────────
        this.log(socket, 'MEMORY_WRITE', 'Writing episode to memory', missionId);
        try {
            const { episodicMemory } = require('../index');
            if (episodicMemory) {
                await episodicMemory.consolidate({
                    id: missionId,
                    prompt,
                    result: output,
                    status: passed ? 'DONE' : 'FAILED',
                    qualityScore,
                    squad: squadId,
                    agentIds: [agentId],
                    source: 'autonomy',
                    createdAt: new Date().toISOString(),
                });
                await hookSystem.fire('onMemoryWrite', { missionId, squadId, qualityScore });
            }
        } catch { /* memory write optional */ }
        stepsCompleted.push('MEMORY_WRITE');

        // ── Mark recovery checkpoint complete ─────────────────────────────────
        await recoverySystem.markCompleted(missionId);

        return { output, qualityScore, passed, stepsCompleted, retries, enhancementApplied, missionId };
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async identifyDeliverableType(prompt: string, squadId: string): Promise<string> {
        try {
            const resp = await queryLLM(
                'Mission parser — identify the primary deliverable type in one word.',
                `Mission: ${prompt.slice(0, 400)}\nSquad: ${squadId}\nRespond with ONE word from: [code, analysis, copy, plan, research, design, data, report, action, other]`,
                'forge'
            );
            return resp.trim().split(/\s/)[0]?.toLowerCase() ?? 'other';
        } catch {
            return 'other';
        }
    }

    private async generatePlan(prompt: string, type: string, recall: string, squadId: string): Promise<string> {
        try {
            const planPrompt = `Create a concise 3-5 step execution plan for this mission.
Type: ${type} | Squad: ${squadId}
${recall ? `Past context:\n${recall.slice(0, 400)}\n` : ''}
Mission: ${prompt.slice(0, 500)}
Respond with a numbered list of steps only.`;
            return await queryLLM('Mission Planner', planPrompt, 'forge');
        } catch {
            return 'Default plan: execute mission directly.';
        }
    }

    private loadSpecContext(missionId: string): string {
        try {
            const prdPath = path.join(this.specsDir, missionId, 'prd.md');
            const archPath = path.join(this.specsDir, missionId, 'architecture.md');
            const parts: string[] = [];
            if (fs.existsSync(prdPath)) parts.push(`[PRD SPEC]\n${fs.readFileSync(prdPath, 'utf-8').slice(0, 1000)}`);
            if (fs.existsSync(archPath)) parts.push(`[ARCHITECTURE SPEC]\n${fs.readFileSync(archPath, 'utf-8').slice(0, 1000)}`);
            return parts.join('\n\n');
        } catch {
            return '';
        }
    }

    private async selfReview(prompt: string, output: string, squadId: string): Promise<{ hasGaps: boolean; gaps: string }> {
        try {
            const reviewPrompt = `You are reviewing your own output. Be brutally honest.

MISSION: ${prompt.slice(0, 400)}
YOUR OUTPUT: ${output.slice(0, 1200)}

Respond ONLY with JSON:
{"hasGaps": true/false, "gaps": "description of what is missing or incomplete, or empty string if none"}`;
            const resp = await queryLLM('Self-reviewer', reviewPrompt, 'forge');
            const clean = resp.replace(/```json|```/g, '').trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            const parsed = JSON.parse(clean.substring(start, end + 1)) as { hasGaps: boolean; gaps: string };
            return { hasGaps: !!parsed.hasGaps, gaps: parsed.gaps || '' };
        } catch {
            return { hasGaps: false, gaps: '' };
        }
    }

    private async enhance(prompt: string, output: string, gaps: string, squadId: string): Promise<string> {
        try {
            const enhancePrompt = `You produced the following output for a mission but it has gaps.
MISSION: ${prompt.slice(0, 400)}
GAPS IDENTIFIED: ${gaps}
PREVIOUS OUTPUT: ${output.slice(0, 1200)}

Produce an improved, complete version that addresses ALL identified gaps.
Do NOT start over — build on and complete the previous output.`;
            return await queryLLM('Enhancement agent', enhancePrompt, squadId);
        } catch {
            return output;
        }
    }

    private extractAndSaveFiles(output: string, missionId: string): void {
        // Extract fenced code blocks and save to workspace if labelled with a filename
        const filePattern = /```(\w+)?\s*(?:\/\/\s*filename:\s*(.+?)\n|\/\*\s*filename:\s*(.+?)\s*\*\/\n)?([^`]+)```/g;
        const matches = [...output.matchAll(filePattern)];

        if (!matches.length) return;

        try {
            const missionDir = path.join(this.deliverablesDir, missionId);
            if (!fs.existsSync(missionDir)) fs.mkdirSync(missionDir, { recursive: true });

            for (const [, lang, fn1, fn2, code] of matches) {
                const filename = (fn1 || fn2 || `output_${Date.now()}.${lang || 'txt'}`).trim();
                if (filename && code) {
                    const filePath = path.join(missionDir, path.basename(filename));
                    fs.writeFileSync(filePath, code.trim());
                    logger.info(`[SCL:FILE_DELIVERY] Saved: ${filePath}`);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[SCL:FILE_DELIVERY] Failed to extract files: ${msg}`);
        }
    }
}

export const selfCritiqueLoop = new SelfCritiqueLoop();
export default selfCritiqueLoop;
