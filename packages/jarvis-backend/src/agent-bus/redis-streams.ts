// src/agent-bus/redis-streams.ts
// JARVIS Redis Streams Agent Bus
// Phase 2 — True Inter-Agent Communication
//
// Charter: "Replace the local orchestrator with Redis Streams.
// This allows an agent (e.g., Ogilvy) to finish a copywriting task,
// publish it to a stream, and have another agent (e.g., Torvalds)
// pick it up to implement it into a landing page."
//
// Architecture:
//   Producer: any squad/agent publishes AgentMessage to stream 'jarvis:agent-bus'
//   Consumer Group: each downstream squad subscribes and processes relevant messages
//   DLQ: failed messages go to 'jarvis:agent-bus:dlq' after MAX_RETRIES

import Redis from 'ioredis';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MessagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MessageStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface AgentMessage {
    id?: string;           // Assigned by Redis on publish
    fromSquad: string;     // Who published (e.g. 'mercury')
    fromAgent: string;     // Which agent within the squad (e.g. 'ogilvy')
    toSquad: string;       // Destination squad (e.g. 'forge') or '*' for broadcast
    type: string;          // Event type (e.g. 'COPY_READY', 'CODE_REVIEW_REQUEST')
    payload: string;       // The content/artifact being passed
    mission: string;       // Original mission context
    priority: MessagePriority;
    correlationId?: string; // Links related messages in a workflow chain
    createdAt: string;
}

export interface ConsumedMessage extends AgentMessage {
    streamId: string;      // Redis stream entry ID
    retryCount: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STREAM_KEY = 'jarvis:agent-bus';
const DLQ_KEY = 'jarvis:agent-bus:dlq';
const MAX_RETRIES = 3;
const CONSUMER_GROUP = 'jarvis-workers';
const MAX_STREAM_LENGTH = 10000; // Trim stream to prevent unbounded growth
const BLOCK_TIMEOUT_MS = 2000;   // How long consumers wait for new messages

// ─── Agent Bus Class ──────────────────────────────────────────────────────────

export class AgentBus {
    private redis: Redis | null = null;
    private consumerRedis: Redis | null = null; // Separate connection for blocking reads
    private consumers: Map<string, NodeJS.Timeout> = new Map();
    private isInitialized = false;

    private getRedisConfig() {
        return {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            lazyConnect: true,
            retryStrategy: (times: number) => {
                if (times > 3) return null; // Stop retrying — Redis is optional
                return Math.min(times * 200, 1000);
            },
            reconnectOnError: () => false,
        };
    }

    async initialize(): Promise<boolean> {
        try {
            this.redis = new Redis(this.getRedisConfig());
            this.consumerRedis = new Redis(this.getRedisConfig());

            await this.redis.connect();
            await this.redis.ping();

            // Create consumer group (MKSTREAM creates the stream if it doesn't exist)
            try {
                await this.redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
                console.log(`[AGENT-BUS] Consumer group '${CONSUMER_GROUP}' created`);
            } catch (err: any) {
                if (!err.message.includes('BUSYGROUP')) throw err;
                // Group already exists — that's fine
            }

            this.isInitialized = true;
            console.log(`[AGENT-BUS] Redis Streams Agent Bus online — stream: ${STREAM_KEY}`);
            return true;

        } catch (err: any) {
            console.warn(`[AGENT-BUS] Redis unavailable (${err.message}). Agent bus running in fallback mode (Promise.all only).`);
            this.redis = null;
            this.consumerRedis = null;
            return false;
        }
    }

    get available(): boolean {
        return this.isInitialized && this.redis !== null;
    }

    // ─── Producer: Publish message to stream ─────────────────────────────────

    async publish(message: Omit<AgentMessage, 'id' | 'createdAt'> & { retryCount?: number }): Promise<string | null> {
        if (!this.redis) return null;

        const payload: AgentMessage & { retryCount?: number } = {
            ...message,
            createdAt: new Date().toISOString(),
        };

        try {
            // XADD with MAXLEN to prevent unbounded growth
            const streamId = await this.redis.xadd(
                STREAM_KEY,
                'MAXLEN', '~', MAX_STREAM_LENGTH,
                '*', // Auto-generated ID
                'fromSquad', payload.fromSquad,
                'fromAgent', payload.fromAgent,
                'toSquad', payload.toSquad,
                'type', payload.type,
                'payload', payload.payload.slice(0, 50000), // Cap payload size
                'mission', payload.mission.slice(0, 1000),
                'priority', payload.priority,
                'correlationId', payload.correlationId || '',
                'createdAt', payload.createdAt,
                'retryCount', String(payload.retryCount || 0)
            );

            console.log(`[AGENT-BUS] Published: ${payload.fromSquad}→${payload.toSquad} [${payload.type}] id=${streamId}`);
            return streamId;
        } catch (err: any) {
            console.error(`[AGENT-BUS] Publish failed: ${err.message}`);
            return null;
        }
    }

    // ─── Consumer: Register a squad to receive messages ──────────────────────

    subscribe(
        squadId: string,
        handler: (message: ConsumedMessage) => Promise<void>
    ): void {
        if (!this.consumerRedis) {
            console.warn(`[AGENT-BUS] Cannot subscribe ${squadId} — Redis unavailable`);
            return;
        }

        const consumerName = `${squadId}-consumer`;
        console.log(`[AGENT-BUS] Subscribing: ${squadId}`);

        const poll = async () => {
            if (!this.consumerRedis) return;

            try {
                // XREADGROUP with blocking: waits up to BLOCK_TIMEOUT_MS for new messages
                // Use .call to bypass strict overload checks while maintaining proper TS structure
                type XReadGroupResult = [string, [string, string[]][]][] | null;
                const results = await this.consumerRedis.call(
                    'XREADGROUP', 'GROUP', CONSUMER_GROUP, consumerName,
                    'COUNT', '10', 'BLOCK', String(BLOCK_TIMEOUT_MS),
                    'STREAMS', STREAM_KEY, '>'
                ) as XReadGroupResult;

                if (!results) {
                    // Timeout — no new messages, loop again
                    setTimeout(poll, 100);
                    return;
                }

                const [, entries] = results[0];

                for (const [streamId, fields] of entries) {
                    const msg = this.parseStreamEntry(streamId, fields);

                    // Route: only process messages for this squad or broadcasts
                    if (msg.toSquad !== squadId && msg.toSquad !== '*') {
                        await this.ack(streamId);
                        continue;
                    }

                    try {
                        await handler(msg);
                        await this.ack(streamId);
                        console.log(`[AGENT-BUS] ${squadId} processed: ${streamId} [${msg.type}]`);
                    } catch (err: any) {
                        console.error(`[AGENT-BUS] ${squadId} handler error: ${err.message}`);
                        await this.handleRetry(streamId, msg);
                    }
                }

                // Continue polling
                setTimeout(poll, 50);

            } catch (err: any) {
                if (err.message.includes('NOGROUP')) {
                    console.warn('[AGENT-BUS] Consumer group gone — reinitializing');
                    await this.initialize();
                }
                setTimeout(poll, 1000);
            }
        };

        // Start polling loop
        setTimeout(poll, 100);
    }

    // ─── Acknowledge a processed message ────────────────────────────────────

    private async ack(streamId: string): Promise<void> {
        if (!this.redis) return;
        await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, streamId).catch(() => { });
    }

    // ─── Handle retry / DLQ ─────────────────────────────────────────────────

    private async handleRetry(streamId: string, msg: ConsumedMessage): Promise<void> {
        if (!this.redis) return;

        const newRetryCount = (msg.retryCount || 0) + 1;

        if (newRetryCount >= MAX_RETRIES) {
            // Move to DLQ
            await this.redis.xadd(DLQ_KEY, '*',
                'originalStreamId', streamId,
                'fromSquad', msg.fromSquad,
                'toSquad', msg.toSquad,
                'type', msg.type,
                'payload', msg.payload,
                'mission', msg.mission,
                'retryCount', String(newRetryCount),
                'failedAt', new Date().toISOString()
            ).catch(() => { });

            await this.ack(streamId);
            console.error(`[AGENT-BUS] Message ${streamId} moved to DLQ after ${MAX_RETRIES} retries`);
        } else {
            // Re-publish with incremented retry count
            await this.publish({
                ...msg,
                correlationId: msg.correlationId || streamId,
            }).catch(() => { });
            await this.ack(streamId);
            console.warn(`[AGENT-BUS] Message ${streamId} requeued (retry ${newRetryCount}/${MAX_RETRIES})`);
        }
    }

    // ─── Parse Redis stream entry to AgentMessage ────────────────────────────

    private parseStreamEntry(streamId: string, fields: string[]): ConsumedMessage {
        const obj: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            obj[fields[i]] = fields[i + 1];
        }

        return {
            id: streamId,
            streamId,
            fromSquad: obj.fromSquad || '',
            fromAgent: obj.fromAgent || '',
            toSquad: obj.toSquad || '',
            type: obj.type || '',
            payload: obj.payload || '',
            mission: obj.mission || '',
            priority: (obj.priority as MessagePriority) || 'MEDIUM',
            correlationId: obj.correlationId || undefined,
            createdAt: obj.createdAt || new Date().toISOString(),
            retryCount: parseInt(obj.retryCount || '0'),
        };
    }

    // ─── Stream Health & Monitoring ──────────────────────────────────────────

    async getStreamInfo(): Promise<{
        length: number;
        groups: number;
        dlqLength: number;
        available: boolean;
    }> {
        if (!this.redis) return { length: 0, groups: 0, dlqLength: 0, available: false };

        try {
            const [length, dlqLength] = await Promise.all([
                this.redis.xlen(STREAM_KEY),
                this.redis.xlen(DLQ_KEY).catch(() => 0),
            ]);

            const groups = await this.redis.xinfo('GROUPS', STREAM_KEY).catch(() => []);

            return {
                length,
                groups: Array.isArray(groups) ? groups.length : 0,
                dlqLength: dlqLength as number,
                available: true,
            };
        } catch {
            return { length: 0, groups: 0, dlqLength: 0, available: false };
        }
    }

    async cleanup(): Promise<void> {
        try {
            await this.redis?.quit();
            await this.consumerRedis?.quit();
        } catch { /* graceful */ }
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const agentBus = new AgentBus();

// ─── Pre-defined Message Types (Inter-Squad Workflows) ───────────────────────

export const MessageTypes = {
    // Mercury → Forge: copy is ready, implement in landing page
    COPY_READY: 'COPY_READY',
    // Oracle → Mercury: research complete, use for content
    RESEARCH_COMPLETE: 'RESEARCH_COMPLETE',
    // Forge → QA: code complete, needs review
    CODE_COMPLETE: 'CODE_COMPLETE',
    // Atlas → All: new OKR set, align squad outputs
    OKR_UPDATED: 'OKR_UPDATED',
    // Vault → Board: risk identified, needs strategic decision
    RISK_ESCALATED: 'RISK_ESCALATED',
    // Sentinel → All: security issue blocking release
    SENTINEL_VETO: 'SENTINEL_VETO',
    // Produto → Forge: PRD approved, build it
    PRD_APPROVED: 'PRD_APPROVED',
    // Revenue → Mercury: churn signal, needs retention campaign
    CHURN_SIGNAL: 'CHURN_SIGNAL',
    // Consciousness → All: broadcast from autonomous loop
    AUTONOMOUS_ACTION: 'AUTONOMOUS_ACTION',
} as const;
