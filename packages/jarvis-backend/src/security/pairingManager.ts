/**
 * JARVIS Evolution v6.0 — DM Pairing Security (Sprint 2 / Phase A7)
 *
 * Unknown senders receive a 6-digit pairing code before any message is processed.
 * Once confirmed, the sender is added to the runtime allowlist for the session.
 *
 * Flow:
 *   1. Message arrives from unknown sender
 *   2. pairingManager.requiresPairing(senderId) → true
 *   3. System sends: "Your JARVIS pairing code is: 482913. Reply with this code to connect."
 *   4. Sender replies with the code
 *   5. pairingManager.confirmCode(senderId, code) → true
 *   6. Sender added to approved list, original message queued for processing
 *
 * Approved pairs persist to .jarvis/approved-pairs.json across restarts.
 */

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingPair {
    senderId: string;
    channel: string;
    code: string;
    expiresAt: string;
    quarantinedMessages: string[];
}

interface ApprovedPair {
    senderId: string;
    channel: string;
    approvedAt: string;
    approvedBy: 'code' | 'admin';
}

// ─── Pairing Manager ──────────────────────────────────────────────────────────

class PairingManager {
    private pending: Map<string, PendingPair> = new Map();
    private approved: Map<string, ApprovedPair> = new Map();
    private readonly pairsFile: string;
    private readonly CODE_TTL_MS: number;
    private enabled: boolean;

    constructor() {
        this.pairsFile = path.resolve(process.cwd(), '.jarvis', 'approved-pairs.json');
        this.CODE_TTL_MS = parseInt(process.env.PAIRING_CODE_TTL_MINUTES || '30', 10) * 60_000;
        this.enabled = process.env.REQUIRE_PAIRING !== 'false'; // default ON
        this.loadApprovedPairs();
    }

    /**
     * Check if a sender needs to complete the pairing flow.
     * Returns false if pairing is disabled globally.
     */
    requiresPairing(senderId: string, channel: string): boolean {
        if (!this.enabled) return false;
        const key = `${channel}:${senderId}`;
        return !this.approved.has(key);
    }

    /**
     * Initiate pairing for an unknown sender.
     * Returns the pairing code to send to the user.
     * Quarantines any existing message.
     */
    initiatePairing(senderId: string, channel: string, originalMessage?: string): string {
        const key = `${channel}:${senderId}`;
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + this.CODE_TTL_MS).toISOString();

        const existing = this.pending.get(key);
        const quarantined = existing?.quarantinedMessages ?? [];
        if (originalMessage) quarantined.push(originalMessage);

        this.pending.set(key, {
            senderId,
            channel,
            code,
            expiresAt,
            quarantinedMessages: quarantined,
        });

        logger.info(`[PairingManager] Pairing initiated for ${key} | code: ${code}`);
        return code;
    }

    /**
     * Verify a submitted pairing code.
     * On success: approves the sender and returns queued messages.
     * On failure: returns null.
     */
    confirmCode(senderId: string, channel: string, submittedCode: string): {
        success: boolean;
        quarantinedMessages: string[];
    } {
        const key = `${channel}:${senderId}`;
        const pending = this.pending.get(key);

        if (!pending) {
            return { success: false, quarantinedMessages: [] };
        }

        // Check expiry
        if (new Date(pending.expiresAt) < new Date()) {
            this.pending.delete(key);
            logger.warn(`[PairingManager] Expired code attempt from ${key}`);
            return { success: false, quarantinedMessages: [] };
        }

        // Constant-time comparison to prevent timing attacks
        const expected = Buffer.from(pending.code);
        const submitted = Buffer.from(submittedCode.trim());
        const match = expected.length === submitted.length &&
            crypto.timingSafeEqual(expected, submitted);

        if (!match) {
            logger.warn(`[PairingManager] Wrong code from ${key}`);
            return { success: false, quarantinedMessages: [] };
        }

        // Approve
        const quarantinedMessages = [...pending.quarantinedMessages];
        this.pending.delete(key);
        this.approveSender(senderId, channel, 'code');

        return { success: true, quarantinedMessages };
    }

    /**
     * Admin override: directly approve a sender without code flow.
     */
    adminApprove(senderId: string, channel: string): void {
        this.approveSender(senderId, channel, 'admin');
        logger.info(`[PairingManager] Admin approved: ${channel}:${senderId}`);
    }

    /**
     * Check if a message looks like a pairing code attempt.
     */
    isPairingAttempt(message: string): boolean {
        return /^\s*\d{6}\s*$/.test(message);
    }

    /**
     * List pending (unconfirmed) pairing requests.
     */
    listPending(): PendingPair[] {
        this.cleanExpired();
        return Array.from(this.pending.values());
    }

    /**
     * List all approved pairs.
     */
    listApproved(): ApprovedPair[] {
        return Array.from(this.approved.values());
    }

    /**
     * Enable or disable pairing system globally.
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        logger.info(`[PairingManager] Pairing ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Revoke an approved pair (admin use).
     */
    revoke(senderId: string, channel: string): void {
        const key = `${channel}:${senderId}`;
        this.approved.delete(key);
        this.persistApprovedPairs();
        logger.info(`[PairingManager] Revoked: ${key}`);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private generateCode(): string {
        // Cryptographically random 6-digit code
        const num = parseInt(crypto.randomBytes(3).toString('hex'), 16) % 1_000_000;
        return num.toString().padStart(6, '0');
    }

    private approveSender(senderId: string, channel: string, by: 'code' | 'admin'): void {
        const key = `${channel}:${senderId}`;
        this.approved.set(key, {
            senderId,
            channel,
            approvedAt: new Date().toISOString(),
            approvedBy: by,
        });
        this.persistApprovedPairs();
    }

    private cleanExpired(): void {
        const now = new Date();
        for (const [key, pair] of this.pending.entries()) {
            if (new Date(pair.expiresAt) < now) {
                this.pending.delete(key);
            }
        }
    }

    private persistApprovedPairs(): void {
        try {
            const dir = path.dirname(this.pairsFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(
                this.pairsFile,
                JSON.stringify(Array.from(this.approved.values()), null, 2)
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[PairingManager] Persist failed: ${msg}`);
        }
    }

    private loadApprovedPairs(): void {
        try {
            if (!fs.existsSync(this.pairsFile)) return;
            const raw = fs.readFileSync(this.pairsFile, 'utf-8');
            const pairs = JSON.parse(raw) as ApprovedPair[];
            for (const pair of pairs) {
                this.approved.set(`${pair.channel}:${pair.senderId}`, pair);
            }
            logger.info(`[PairingManager] Loaded ${pairs.length} approved pair(s).`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[PairingManager] Load failed: ${msg}`);
        }
    }
}

export const pairingManager = new PairingManager();
export default pairingManager;
