/**
 * JARVIS Evolution v6.0 — Inbound Webhook Receivers (Sprint 2 / Phase A5)
 *
 * Registers dynamic webhook endpoints: POST /webhooks/:webhookId
 * Each webhook maps to a mission template stored in .jarvis/webhooks.json.
 * Supports GitHub webhooks, Stripe events, and generic POST.
 * HMAC signature validation for security.
 */

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookDefinition {
    id: string;
    name: string;
    path: string;              // registered at /webhooks/:id
    missionTemplate: string;   // {{payload}} replaced with JSON payload
    squad?: string;            // route to specific squad
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    hmacSecret?: string;       // if set, validate X-Hub-Signature-256
    createdAt: string;
    enabled: boolean;
}

// ─── Webhook Registry ─────────────────────────────────────────────────────────

class WebhookRegistry {
    private webhooks: Map<string, WebhookDefinition> = new Map();
    private readonly registryFile: string;

    constructor() {
        this.registryFile = path.resolve(process.cwd(), '.jarvis', 'webhooks.json');
        this.load();
    }

    register(def: Omit<WebhookDefinition, 'id' | 'createdAt'>): WebhookDefinition {
        const id = crypto.randomUUID().split('-')[0]; // short 8-char id
        const webhook: WebhookDefinition = {
            ...def,
            id,
            createdAt: new Date().toISOString(),
        };
        this.webhooks.set(id, webhook);
        this.persist();
        logger.info(`[Webhook] Registered: ${id} → ${webhook.name}`);
        return webhook;
    }

    delete(id: string): boolean {
        const existed = this.webhooks.delete(id);
        if (existed) this.persist();
        return existed;
    }

    get(id: string): WebhookDefinition | null {
        return this.webhooks.get(id) ?? null;
    }

    list(): WebhookDefinition[] {
        return Array.from(this.webhooks.values());
    }

    /**
     * Validate HMAC-SHA256 signature from GitHub/Stripe style webhooks.
     * Returns true if no secret set (open webhook) or if signature matches.
     */
    validateSignature(webhookId: string, rawBody: string, signature: string): boolean {
        const def = this.webhooks.get(webhookId);
        if (!def?.hmacSecret) return true; // no validation required

        const expected = 'sha256=' + crypto
            .createHmac('sha256', def.hmacSecret)
            .update(rawBody)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expected)
            );
        } catch {
            return false;
        }
    }

    /**
     * Build mission prompt from template + payload.
     */
    buildMissionPrompt(webhookId: string, payload: Record<string, unknown>): string {
        const def = this.webhooks.get(webhookId);
        if (!def) throw new Error(`Webhook ${webhookId} not found`);
        const payloadJson = JSON.stringify(payload, null, 2).slice(0, 2000);
        return def.missionTemplate.replace(/\{\{payload\}\}/g, payloadJson);
    }

    private persist(): void {
        try {
            const dir = path.dirname(this.registryFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.registryFile, JSON.stringify(Array.from(this.webhooks.values()), null, 2));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[Webhook] Persist failed: ${msg}`);
        }
    }

    private load(): void {
        try {
            if (!fs.existsSync(this.registryFile)) return;
            const raw = fs.readFileSync(this.registryFile, 'utf-8');
            const defs = JSON.parse(raw) as WebhookDefinition[];
            for (const def of defs) {
                if (def.enabled !== false) this.webhooks.set(def.id, def);
            }
            logger.info(`[Webhook] Loaded ${defs.length} webhook(s).`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[Webhook] Load failed: ${msg}`);
        }
    }
}

export const webhookRegistry = new WebhookRegistry();
export default webhookRegistry;
