/**
 * JARVIS Evolution v6.0 — Mission Recovery System (Sprint 1 / Phase E4)
 *
 * Provides checkpoint-based recovery for crashed or incomplete missions.
 * On system restart, scans .jarvis/recovery/ for incomplete checkpoints and
 * resumes them from the last saved state.
 *
 * Flow:
 *   1. orchestrator.start() calls recoverySystem.saveCheckpoint() at key steps
 *   2. On crash/restart, index.ts calls recoverySystem.resumeIncomplete()
 *   3. Incomplete missions are re-submitted to the orchestrator from last checkpoint
 *   4. After max retries, mission is escalated to founder via Telegram + marked FAILED
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissionCheckpoint {
    missionId: string;
    step: string;           // e.g. 'PLAN', 'EXECUTE', 'QUALITY'
    prompt: string;
    squadId?: string;
    source?: string;
    partialResult?: string;
    context?: Record<string, unknown>;
    attempts: number;
    maxRetries: number;
    createdAt: string;
    updatedAt: string;
    status: 'INCOMPLETE' | 'RESUMED' | 'ABANDONED' | 'COMPLETED';
}

// ─── Recovery System ──────────────────────────────────────────────────────────

class RecoverySystem {
    private readonly recoveryDir: string;
    private readonly maxRetries: number;

    constructor() {
        this.recoveryDir = path.resolve(process.cwd(), '.jarvis', 'recovery');
        this.maxRetries = parseInt(process.env.ADE_RECOVERY_MAX_RETRIES || '3', 10);
        this.ensureDir();
    }

    private ensureDir(): void {
        if (!fs.existsSync(this.recoveryDir)) {
            fs.mkdirSync(this.recoveryDir, { recursive: true });
        }
    }

    private checkpointPath(missionId: string): string {
        return path.join(this.recoveryDir, `${missionId}.json`);
    }

    /**
     * Save a checkpoint at a specific step in the mission lifecycle.
     * Call this before any potentially-failing operation.
     */
    async saveCheckpoint(
        missionId: string,
        step: string,
        prompt: string,
        options: {
            squadId?: string;
            source?: string;
            partialResult?: string;
            context?: Record<string, unknown>;
        } = {}
    ): Promise<void> {
        try {
            const existing = this.loadCheckpoint(missionId);
            const checkpoint: MissionCheckpoint = {
                missionId,
                step,
                prompt,
                squadId: options.squadId,
                source: options.source || 'autonomy',
                partialResult: options.partialResult,
                context: options.context,
                attempts: existing ? existing.attempts : 0,
                maxRetries: this.maxRetries,
                createdAt: existing ? existing.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'INCOMPLETE',
            };
            fs.writeFileSync(this.checkpointPath(missionId), JSON.stringify(checkpoint, null, 2));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[Recovery] Failed to save checkpoint for ${missionId}: ${msg}`);
        }
    }

    /**
     * Increment attempt counter for a mission.
     */
    async incrementAttempt(missionId: string): Promise<number> {
        const cp = this.loadCheckpoint(missionId);
        if (!cp) return 1;
        cp.attempts += 1;
        cp.updatedAt = new Date().toISOString();
        fs.writeFileSync(this.checkpointPath(missionId), JSON.stringify(cp, null, 2));
        return cp.attempts;
    }

    /**
     * Mark a mission checkpoint as completed (removes it from pending).
     */
    async markCompleted(missionId: string): Promise<void> {
        const cp = this.loadCheckpoint(missionId);
        if (!cp) return;
        cp.status = 'COMPLETED';
        cp.updatedAt = new Date().toISOString();
        fs.writeFileSync(this.checkpointPath(missionId), JSON.stringify(cp, null, 2));
    }

    /**
     * Mark a mission checkpoint as abandoned (max retries exceeded).
     */
    async markAbandoned(missionId: string): Promise<void> {
        const cp = this.loadCheckpoint(missionId);
        if (!cp) return;
        cp.status = 'ABANDONED';
        cp.updatedAt = new Date().toISOString();
        fs.writeFileSync(this.checkpointPath(missionId), JSON.stringify(cp, null, 2));
        logger.warn(`[Recovery] Mission ${missionId} abandoned after ${cp.attempts} attempts.`);
    }

    /**
     * Load checkpoint from disk.
     */
    loadCheckpoint(missionId: string): MissionCheckpoint | null {
        const filePath = this.checkpointPath(missionId);
        if (!fs.existsSync(filePath)) return null;
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MissionCheckpoint;
        } catch {
            return null;
        }
    }

    /**
     * Get all pending (INCOMPLETE or RESUMED) checkpoints.
     */
    getPendingCheckpoints(): MissionCheckpoint[] {
        this.ensureDir();
        try {
            return fs.readdirSync(this.recoveryDir)
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    try {
                        return JSON.parse(fs.readFileSync(path.join(this.recoveryDir, f), 'utf-8')) as MissionCheckpoint;
                    } catch {
                        return null;
                    }
                })
                .filter((cp): cp is MissionCheckpoint =>
                    cp !== null && (cp.status === 'INCOMPLETE' || cp.status === 'RESUMED')
                );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[Recovery] Failed to scan recovery dir: ${msg}`);
            return [];
        }
    }

    /**
     * Get all checkpoints (any status) for the API.
     */
    getAllCheckpoints(): MissionCheckpoint[] {
        this.ensureDir();
        try {
            return fs.readdirSync(this.recoveryDir)
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    try {
                        return JSON.parse(fs.readFileSync(path.join(this.recoveryDir, f), 'utf-8')) as MissionCheckpoint;
                    } catch {
                        return null;
                    }
                })
                .filter((cp): cp is MissionCheckpoint => cp !== null)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } catch {
            return [];
        }
    }

    /**
     * Resume all incomplete missions on system startup.
     * Called once from index.ts after all subsystems initialise.
     */
    async resumeIncomplete(orchestrator: {
        start: (params: {
            prompt: string;
            squadId?: string;
            source: 'desktop' | 'telegram' | 'whatsapp' | 'ui' | 'autonomy' | 'consciousness' | 'gateway';
            priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            taskId?: string;
            allocations?: unknown[];
        }) => Promise<unknown>;
    }): Promise<void> {
        const pending = this.getPendingCheckpoints();

        if (pending.length === 0) {
            logger.info('[Recovery] No incomplete missions to resume.');
            return;
        }

        logger.info(`[Recovery] Found ${pending.length} incomplete mission(s). Resuming...`);

        for (const cp of pending) {
            if (cp.attempts >= cp.maxRetries) {
                await this.markAbandoned(cp.missionId);
                logger.warn(`[Recovery] Mission ${cp.missionId} exceeded max retries (${cp.maxRetries}). Abandoned.`);
                // Notify via Telegram if available
                this.notifyFounder(cp);
                continue;
            }

            logger.info(`[Recovery] Resuming mission ${cp.missionId} (attempt ${cp.attempts + 1}/${cp.maxRetries}) from step: ${cp.step}`);

            try {
                cp.status = 'RESUMED';
                cp.updatedAt = new Date().toISOString();
                fs.writeFileSync(this.checkpointPath(cp.missionId), JSON.stringify(cp, null, 2));

                // Re-submit to orchestrator — includes partial context as prefix
                const resumedPrompt = cp.partialResult
                    ? `[RECOVERY RESUME — step: ${cp.step}]\nPartial work so far:\n${cp.partialResult.slice(0, 800)}\n\n[CONTINUE FROM HERE]\n${cp.prompt}`
                    : `[RECOVERY RESUME — step: ${cp.step}]\n${cp.prompt}`;

                await orchestrator.start({
                    prompt: resumedPrompt,
                    squadId: cp.squadId,
                    source: 'autonomy' as const,
                    priority: 'HIGH' as const,
                });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`[Recovery] Failed to resume mission ${cp.missionId}: ${msg}`);
                await this.incrementAttempt(cp.missionId);
            }
        }
    }

    /**
     * Notify founder via Telegram that a mission was abandoned.
     * Gracefully skips if telegram is not configured.
     */
    private notifyFounder(cp: MissionCheckpoint): void {
        try {
            const { telegramBot } = require('../index');
            if (!telegramBot) return;
            const chatId = process.env.TELEGRAM_FOUNDER_CHAT_ID;
            if (!chatId) return;
            const msg =
                `⚠️ *Mission Abandoned*\n` +
                `ID: \`${cp.missionId}\`\n` +
                `Step: ${cp.step}\n` +
                `Attempts: ${cp.attempts}/${cp.maxRetries}\n` +
                `Prompt: ${cp.prompt.slice(0, 200)}`;
            telegramBot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(() => { });
        } catch {
            // Telegram not available — silent skip
        }
    }

    /**
     * Manually abandon a mission (API endpoint support).
     */
    async abandon(missionId: string): Promise<void> {
        await this.markAbandoned(missionId);
    }
}

export const recoverySystem = new RecoverySystem();
export default recoverySystem;
