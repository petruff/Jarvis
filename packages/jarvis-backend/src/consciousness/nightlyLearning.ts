// src/consciousness/nightlyLearning.ts
// JARVIS Nightly Learning Cycle — 5 Modules
// Charter Section 06: "This is what separates JARVIS from every static AI system: it genuinely gets smarter every night."
//
// Module 1 — Project Retrospective (30 min)
// Module 2 — Error Archaeology (20 min)
// Module 3 — Web Intelligence Harvest (60 min)
// Module 4 — Knowledge Synthesis (20 min)
// Module 5 — Self-Calibration (10 min)

import * as cron from 'node-cron';
import { Server } from 'socket.io';
import { queryLLM } from '../llm';
import { EpisodicMemory } from '../memory/episodic';
import { sendTelegramMessage } from '../telegram';
import { mutationStore } from '../agents/mutationStore';
import RssParser from 'rss-parser';
import { metricsCollector } from '../instrumentation/metricsCollector';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LearningCycleResult {
    cycleId: string;
    startedAt: string;
    completedAt?: string;
    modules: {
        retrospective?: ModuleResult;
        errorArchaeology?: ModuleResult;
        webHarvest?: ModuleResult;
        synthesis?: ModuleResult;
        selfCalibration?: ModuleResult;
    };
    proposedDnaMutations: DnaMutation[];
    nightlyReport: string;
}

interface ModuleResult {
    status: 'completed' | 'failed' | 'skipped';
    durationMs: number;
    findings: string;
    error?: string;
}

interface DnaMutation {
    agentId: string;
    field: 'dna' | 'mandate' | 'focus';
    currentValue: string;
    proposedChange: string;
    reason: string;
}

// ─── Knowledge Domain Sources (Module 3) ───────────────────────────────────────

const KNOWLEDGE_DOMAINS = [
    { name: 'AI & Tech', feedUrl: 'https://techcrunch.com/feed/', beneficiaries: ['NEXUS', 'FORGE', 'ORACLE'] },
    { name: 'Startup & Growth', feedUrl: 'https://ycombinator.com/blog.xml', beneficiaries: ['BOARD', 'ATLAS', 'PRODUTO'] },
    { name: 'Marketing Trends', feedUrl: 'https://feeds.feedburner.com/seoblog', beneficiaries: ['MERCURY', 'REVENUE'] },
    { name: 'Competitor Intel', feedUrl: 'https://feeds.feedburner.com/ycombinator', beneficiaries: ['ORACLE', 'ATLAS', 'MERCURY'] },
];

// ─── Main Class ────────────────────────────────────────────────────────────────

export class NightlyLearningCycle {
    private job: any | null = null;
    private isRunning = false;
    private rssParser = new RssParser({ timeout: 10000 });

    constructor(
        private io: Server,
        private episodicMemory: EpisodicMemory
    ) { }

    start(): void {
        // Default: 2:00 AM every night. Override with NIGHTLY_LEARNING_CRON env var.
        const schedule = process.env.NIGHTLY_LEARNING_CRON || '0 2 * * *';
        console.log(`[LEARNING] Nightly Learning Cycle scheduling: ${schedule}`);

        this.job = cron.schedule(schedule, () => {
            this.run().catch(err => {
                console.error(`[LEARNING] Cycle failed: ${err.message}`);
            });
        });

        console.log('[LEARNING] Nightly Learning Cycle online.');
    }

    stop(): void {
        this.job?.stop();
    }

    // Allow manual trigger for testing / forced cycle
    async run(): Promise<LearningCycleResult> {
        if (this.isRunning) {
            console.log('[LEARNING] Cycle skipped — previous still running');
            return { cycleId: 'skipped', startedAt: new Date().toISOString(), modules: {}, proposedDnaMutations: [], nightlyReport: 'Skipped — previous cycle still running' };
        }

        this.isRunning = true;
        const cycleId = `cycle-${Date.now()}`;
        const startedAt = new Date().toISOString();

        console.log(`\n[LEARNING] ========== NIGHTLY LEARNING CYCLE STARTED ==========`);
        console.log(`[LEARNING] Cycle ID: ${cycleId}`);

        this.io.emit('jarvis/learning_started', { cycleId, startedAt });

        const result: LearningCycleResult = {
            cycleId,
            startedAt,
            modules: {},
            proposedDnaMutations: [],
            nightlyReport: '',
        };

        try {
            // ── Module 1: Project Retrospective ─────────────────────────────────
            result.modules.retrospective = await this.runModule(
                'Project Retrospective',
                () => this.moduleRetrospective()
            );

            // ── Module 2: Error Archaeology ──────────────────────────────────────
            result.modules.errorArchaeology = await this.runModule(
                'Error Archaeology',
                () => this.moduleErrorArchaeology()
            );

            // ── Module 3: Web Intelligence Harvest ───────────────────────────────
            result.modules.webHarvest = await this.runModule(
                'Web Intelligence Harvest',
                () => this.moduleWebHarvest()
            );

            // ── Module 4: Knowledge Synthesis ────────────────────────────────────
            const harvestedContent = result.modules.webHarvest?.findings || '';
            result.modules.synthesis = await this.runModule(
                'Knowledge Synthesis',
                () => this.moduleSynthesis(harvestedContent)
            );

            // ── Module 5: Self-Calibration ────────────────────────────────────────
            result.modules.selfCalibration = await this.runModule(
                'Self-Calibration',
                () => this.moduleSelfCalibration()
            );

            // ── Generate DNA Mutations from Retrospective ─────────────────────────
            if (result.modules.retrospective?.findings) {
                result.proposedDnaMutations = await this.extractDnaMutations(
                    result.modules.retrospective.findings
                );
            }

            // ── Persist DNA Mutations to MutationStore (Phase 3 DNA Auto-Mutation) ─
            if (result.proposedDnaMutations.length > 0) {
                const saved = mutationStore.saveMutations(result.proposedDnaMutations, cycleId);
                console.log(`[LEARNING] ${saved.length} DNA mutations saved to store, awaiting Founder approval`);
            }

            // ── Phase 8 AGI: Continuous Mathematical Fine-Tuning ─────────────────
            try {
                const { fineTuningService } = require('../api/fineTuning');
                const recentAll = await this.episodicMemory.getRecentHistory(48); // last 48 hours
                const datasetPath = await fineTuningService.exportToJSONL(recentAll);
                if (datasetPath) {
                    await fineTuningService.initiateFineTuningJob(datasetPath);
                    console.log(`[LEARNING] Mathematical Fine-Tuning cycle launched successfully.`);
                }
            } catch (e: any) {
                console.error(`[LEARNING] Fine-Tuning initialization failed: ${e.message}`);
            }

            // ── Compile Nightly Report ─────────────────────────────────────────────
            result.nightlyReport = await this.compileReport(result);
            result.completedAt = new Date().toISOString();

            console.log(`[LEARNING] ========== NIGHTLY LEARNING CYCLE COMPLETE ==========`);

            // Store in episodic memory
            await this.episodicMemory.consolidate({
                id: cycleId,
                prompt: 'NIGHTLY_LEARNING_CYCLE',
                result: result.nightlyReport,
                squad: 'CONSCIOUSNESS',
                source: 'nightly',
                lang: 'en',
                qualityScore: 90,
                durationMs: Date.now() - new Date(startedAt).getTime(),
                status: 'DONE',
                completedAt: result.completedAt,
            } as any);

            // Emit to dashboard
            this.io.emit('jarvis/learning_complete', {
                cycleId,
                report: result.nightlyReport,
                mutations: result.proposedDnaMutations.length,
                pendingMutationIds: result.proposedDnaMutations.map((_, i) => `mut-${cycleId}-${i}`),
            });

            // Send Telegram summary with per-mutation approve/reject buttons
            const founderId = process.env.FOUNDER_TELEGRAM_ID || process.env.TELEGRAM_CHAT_ID;
            if (founderId && result.proposedDnaMutations.length > 0) {
                const pendingMutations = mutationStore.getPendingMutations()
                    .filter(m => m.cycleId === cycleId);

                const mutationLines = pendingMutations
                    .map((m, i) => `${i + 1}. *${m.agentId}*: ${m.proposedChange.slice(0, 80)}...`)
                    .join('\n');

                const summary = `🧠 *NIGHTLY LEARNING COMPLETE*\n\n${result.nightlyReport.slice(0, 600)}\n\n🧬 *${pendingMutations.length} DNA Mutations Proposed:*\n${mutationLines}\n\n_Approve in morning briefing or via /api/mutations/_`;
                try { sendTelegramMessage(founderId as string, summary); } catch (e) { }
            } else if (process.env.TELEGRAM_CHAT_ID) {
                const summary = `🧠 *NIGHTLY LEARNING COMPLETE*\n\n${result.nightlyReport.slice(0, 800)}\n\n_No DNA mutations proposed this cycle._`;
                try { sendTelegramMessage(process.env.TELEGRAM_CHAT_ID as string, summary); } catch (e) { }
            }

        } catch (err: any) {
            console.error(`[LEARNING] Critical failure: ${err.message}`);
            result.nightlyReport = `Learning cycle failed: ${err.message}`;
        } finally {
            this.isRunning = false;
        }

        return result;
    }

    // ─── Module Runner (wraps each module with timing + error handling) ─────────

    private async runModule(name: string, fn: () => Promise<string>): Promise<ModuleResult> {
        const start = Date.now();
        console.log(`[LEARNING] [MODULE] Starting: ${name}`);
        this.io.emit('jarvis/learning_module', { module: name, status: 'running' });

        try {
            const findings = await fn();
            const durationMs = Date.now() - start;
            console.log(`[LEARNING] [MODULE] Complete: ${name} (${durationMs}ms)`);
            this.io.emit('jarvis/learning_module', { module: name, status: 'complete', durationMs });
            metricsCollector.recordConsciousnessModuleDuration(name, durationMs, 'success');
            return { status: 'completed', durationMs, findings };
        } catch (err: any) {
            const durationMs = Date.now() - start;
            console.error(`[LEARNING] [MODULE] Failed: ${name} — ${err.message}`);
            this.io.emit('jarvis/learning_module', { module: name, status: 'failed', error: err.message });
            metricsCollector.recordConsciousnessModuleDuration(name, durationMs, 'failed');
            return { status: 'failed', durationMs, findings: '', error: err.message };
        }
    }

    // ─── Module 1: Project Retrospective ────────────────────────────────────────
    // Reads all missions completed in the past 24h, runs structured retrospective

    private async moduleRetrospective(): Promise<string> {
        const recentMissions = await this.episodicMemory.getRecentHistory(24);

        if (!recentMissions.length) {
            return 'No missions completed in the past 24 hours.';
        }

        const missionSummaries = recentMissions.slice(0, 20).map(m => ({
            squad: m.squad,
            prompt: m.prompt.slice(0, 200),
            result: m.result.slice(0, 300),
            qualityScore: m.qualityScore,
            status: m.status,
        }));

        const prompt = `You are JARVIS running a structured Project Retrospective on the past 24 hours of missions.

COMPLETED MISSIONS (last 24h):
${JSON.stringify(missionSummaries, null, 2)}

For EACH mission, analyze:
1. What was the expected quality? Was it met?
2. Where did agents deviate from ideal behavior?
3. What specific change to the agent DNA prompt would have improved the output?

Then generate:
- TOP 3 WINS: what worked exceptionally well
- TOP 3 GAPS: recurring weaknesses or missed opportunities
- PROPOSED DNA MUTATIONS: specific, actionable changes to agent prompts

Format as structured markdown with clear sections.`;

        return await queryLLM('JARVIS Nightly Learning — Retrospective Module', prompt, 'forge');
    }

    // ─── Module 2: Error Archaeology ────────────────────────────────────────────
    // Scans all FAILED and LOW-SCORE tasks in past 7 days, clusters failure patterns

    private async moduleErrorArchaeology(): Promise<string> {
        const recentHistory = await this.episodicMemory.getRecentHistory(168); // 7 days in hours

        const failures = recentHistory.filter(m =>
            m.status === 'FAILED' || (m.qualityScore !== null && m.qualityScore < 70)
        );

        if (!failures.length) {
            return 'No failures or low-quality missions detected in the past 7 days. System performing well.';
        }

        const failureData = failures.slice(0, 15).map(m => ({
            squad: m.squad,
            prompt: m.prompt.slice(0, 150),
            qualityScore: m.qualityScore,
            status: m.status,
        }));

        const prompt = `You are JARVIS running Error Archaeology — analyzing failure patterns across the past 7 days.

FAILED/LOW-SCORE MISSIONS:
${JSON.stringify(failureData, null, 2)}

Analyze and produce:
1. FAILURE CLUSTERS: Group failures by squad, task type, and pattern
2. ROOT CAUSES: What systemic weakness does each cluster reveal?
3. FAILURE DIGEST: Top 3 systemic weaknesses (these become Section 5 agenda items)
4. QUICK FIXES: What can be changed immediately to prevent recurrence?

Format as a "Failure Digest" — a structured report for the Founder and for agent improvement.`;

        return await queryLLM('JARVIS Nightly Learning — Error Archaeology Module', prompt, 'forge');
    }

    // ─── Module 3: Web Intelligence Harvest ─────────────────────────────────────
    // Navigates RSS feeds to gather intelligence across configured knowledge domains
    // PRIVACY RULE: read-only, no login, no posting, no private data in queries

    private async moduleWebHarvest(): Promise<string> {
        const harvestedItems: string[] = [];

        for (const domain of KNOWLEDGE_DOMAINS) {
            try {
                console.log(`[LEARNING] [HARVEST] Fetching: ${domain.name} — ${domain.feedUrl}`);
                const feed = await this.rssParser.parseURL(domain.feedUrl);
                const items = (feed.items || []).slice(0, 5).map(item => ({
                    title: item.title || '',
                    summary: (item.contentSnippet || item.content || '').slice(0, 300),
                    link: item.link || '',
                    pubDate: item.pubDate || '',
                }));

                harvestedItems.push(`## ${domain.name} (Beneficiaries: ${domain.beneficiaries.join(', ')})\n${items.map(i => `- **${i.title}**: ${i.summary}`).join('\n')}`);
            } catch (err: any) {
                console.warn(`[LEARNING] [HARVEST] Failed to fetch ${domain.name}: ${err.message}`);
                harvestedItems.push(`## ${domain.name}\n_Feed unavailable: ${err.message}_`);
            }
        }

        return harvestedItems.join('\n\n');
    }

    // ─── Module 4: Knowledge Synthesis ──────────────────────────────────────────
    // SHANNON runs signal-extraction pass on harvested content

    private async moduleSynthesis(harvestedContent: string): Promise<string> {
        if (!harvestedContent || harvestedContent.length < 100) {
            return 'Insufficient harvested content for synthesis.';
        }

        const prompt = `You are SHANNON (Claude Shannon, Information Theorist) running a Knowledge Synthesis pass for JARVIS.

HARVESTED CONTENT FROM LAST NIGHT'S WEB INTELLIGENCE HARVEST:
${harvestedContent.slice(0, 6000)}

Apply information theory to this content:
1. What are the 5 MOST RELEVANT developments for a company building AI-powered products/services?
2. What has CHANGED from last week's baseline (assume standard startup context)?
3. What CONTRADICTS what we might have believed before?
4. What OPPORTUNITIES does this intelligence reveal?
5. What RISKS are emerging?

Output a compressed, high-signal synthesis. No noise. Only actionable intelligence.
This output feeds directly into the morning briefing Section 5.`;

        return await queryLLM('JARVIS Nightly Learning — Knowledge Synthesis (Shannon)', prompt, 'forge');
    }

    // ─── Module 5: Self-Calibration ──────────────────────────────────────────────
    // Reviews JARVIS's own prediction accuracy and recommendation quality

    private async moduleSelfCalibration(): Promise<string> {
        const recentHistory = await this.episodicMemory.getRecentHistory(48); // 2 days

        const consciousnessActions = recentHistory.filter(m =>
            m.squad === 'CONSCIOUSNESS' || m.prompt.includes('[AUTONOMOUS INTERJECTION]')
        );

        if (!consciousnessActions.length) {
            return 'No autonomous interjections in the past 48 hours. Nothing to calibrate.';
        }

        const actionsData = consciousnessActions.slice(0, 10).map(m => ({
            action: m.prompt.slice(0, 200),
            outcome: m.status,
            qualityScore: m.qualityScore,
            completedAt: (m as any).completedAt || (m as any).createdAt,
        }));

        const prompt = `You are JARVIS performing Self-Calibration — reviewing your own prediction and recommendation accuracy.

RECENT AUTONOMOUS ACTIONS AND OUTCOMES:
${JSON.stringify(actionsData, null, 2)}

Analyze:
1. ACCURACY REVIEW: Which autonomous decisions proved correct? Which were wrong?
2. CONFIDENCE CALIBRATION: Am I systematically over or under-confident in specific domains?
3. BIAS DETECTION: What decision patterns appear in my autonomous actions? Are any biased?
4. IMPROVEMENT PROTOCOL: What should I adjust in my decision-making for the next cycle?

Be honest. Self-deception is worse than acknowledged uncertainty.
Update confidence levels for the next cycle based on this review.`;

        return await queryLLM('JARVIS Nightly Learning — Self-Calibration Module', prompt, 'forge');
    }

    // ─── DNA Mutation Extraction ─────────────────────────────────────────────────

    private async extractDnaMutations(retrospectiveFindings: string): Promise<DnaMutation[]> {
        try {
            const prompt = `Based on these retrospective findings from JARVIS's nightly learning cycle:

${retrospectiveFindings.slice(0, 3000)}

Extract proposed DNA mutations as JSON array. Each mutation should be specific and actionable.
Format:
[
  {
    "agentId": "ogilvy|schwartz|torvalds|etc",
    "field": "dna|mandate|focus",
    "currentValue": "brief description of current behavior",
    "proposedChange": "specific improvement to the DNA prompt",
    "reason": "why this would improve performance based on observed gaps"
  }
]

Return ONLY valid JSON. Maximum 5 mutations. Only propose mutations with strong evidence from the findings.`;

            const response = await queryLLM('JARVIS DNA Mutation Extractor', prompt, 'forge');
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as DnaMutation[];
            }
        } catch (err: any) {
            console.warn(`[LEARNING] DNA mutation extraction failed: ${err.message}`);
        }
        return [];
    }

    // ─── Compile Nightly Report ───────────────────────────────────────────────────

    private async compileReport(result: LearningCycleResult): Promise<string> {
        const sections = [
            result.modules.retrospective?.findings && `## 📊 Retrospective\n${result.modules.retrospective.findings.slice(0, 500)}`,
            result.modules.errorArchaeology?.findings && `## 🔴 Error Archaeology\n${result.modules.errorArchaeology.findings.slice(0, 500)}`,
            result.modules.synthesis?.findings && `## 📡 Intelligence Synthesis\n${result.modules.synthesis.findings.slice(0, 500)}`,
            result.modules.selfCalibration?.findings && `## 🎯 Self-Calibration\n${result.modules.selfCalibration.findings.slice(0, 300)}`,
            result.proposedDnaMutations.length > 0 && `## 🧬 Proposed DNA Mutations (${result.proposedDnaMutations.length})\n${result.proposedDnaMutations.map(m => `- **${m.agentId}**: ${m.proposedChange}`).join('\n')}`,
        ].filter(Boolean);

        return sections.join('\n\n');
    }
}
