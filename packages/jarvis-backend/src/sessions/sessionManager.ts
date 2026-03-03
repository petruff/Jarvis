/**
 * JARVIS Evolution v6.0 — Unified Session Manager (Sprint 2 / Phase A6)
 *
 * Manages conversation sessions across all channels (WhatsApp, Telegram, Slack,
 * Discord, Email, WebChat). Each session is identified by channelId + userId.
 * Group chats get isolated sessions separate from DM sessions.
 *
 * Sessions persist to .jarvis/sessions/ across restarts.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChannelType = 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'email' | 'webchat' | 'webhook';

export interface SessionMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface Session {
    sessionId: string;       // channelType:channelId:userId
    channelType: ChannelType;
    channelId: string;       // e.g. group chat id, guild id, or 'dm'
    userId: string;          // sender identifier
    isGroup: boolean;
    conversationHistory: SessionMessage[];
    activeMissions: string[];
    preferences: Record<string, string>;
    lastActivity: string;
    createdAt: string;
}

// ─── Session Manager ──────────────────────────────────────────────────────────

class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private readonly sessionsDir: string;
    private readonly MAX_HISTORY = 20;      // messages per session
    private readonly SESSION_TTL_HOURS = 72; // auto-expire after 72h of inactivity

    constructor() {
        this.sessionsDir = path.resolve(process.cwd(), '.jarvis', 'sessions');
        this.ensureDir();
        this.loadFromDisk();
    }

    private ensureDir(): void {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    private sessionKey(channelType: ChannelType, channelId: string, userId: string): string {
        return `${channelType}:${channelId}:${userId}`;
    }

    private sessionPath(sessionId: string): string {
        return path.join(this.sessionsDir, `${sessionId.replace(/:/g, '_')}.json`);
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Get or create a session for a given channel + user.
     * Groups get isolated sessions from DMs automatically.
     */
    getOrCreate(
        channelType: ChannelType,
        userId: string,
        options: { channelId?: string; isGroup?: boolean } = {}
    ): Session {
        const channelId = options.channelId || 'dm';
        const isGroup = options.isGroup || false;
        const key = this.sessionKey(channelType, channelId, isGroup ? channelId : userId);

        if (this.sessions.has(key)) {
            const session = this.sessions.get(key)!;
            session.lastActivity = new Date().toISOString();
            return session;
        }

        const session: Session = {
            sessionId: key,
            channelType,
            channelId,
            userId,
            isGroup,
            conversationHistory: [],
            activeMissions: [],
            preferences: {},
            lastActivity: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        this.sessions.set(key, session);
        this.persistSession(session);
        logger.info(`[SessionManager] New session: ${key}`);
        return session;
    }

    /**
     * Get an existing session by its key (channelType:channelId:userId).
     */
    get(sessionId: string): Session | null {
        return this.sessions.get(sessionId) ?? null;
    }

    /**
     * Add a message to a session's conversation history.
     */
    addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.conversationHistory.push({
            role,
            content: content.slice(0, 2000), // cap to avoid bloat
            timestamp: new Date().toISOString(),
        });

        // Trim to MAX_HISTORY
        if (session.conversationHistory.length > this.MAX_HISTORY) {
            session.conversationHistory = session.conversationHistory.slice(-this.MAX_HISTORY);
        }

        session.lastActivity = new Date().toISOString();
        this.persistSession(session);
    }

    /**
     * Get formatted conversation history for prompt injection.
     */
    getHistoryContext(sessionId: string, maxMessages = 6): string {
        const session = this.sessions.get(sessionId);
        if (!session || !session.conversationHistory.length) return '';

        const recent = session.conversationHistory.slice(-maxMessages);
        return `[CONVERSATION HISTORY]\n` +
            recent.map(m => `${m.role === 'user' ? 'User' : 'JARVIS'}: ${m.content}`).join('\n');
    }

    /**
     * Track an active mission ID against a session.
     */
    trackMission(sessionId: string, missionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (!session.activeMissions.includes(missionId)) {
            session.activeMissions.push(missionId);
            this.persistSession(session);
        }
    }

    /**
     * Remove a completed mission from session tracking.
     */
    completeMission(sessionId: string, missionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.activeMissions = session.activeMissions.filter(id => id !== missionId);
        this.persistSession(session);
    }

    /**
     * Reset a session's history.
     */
    reset(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.conversationHistory = [];
        session.activeMissions = [];
        session.lastActivity = new Date().toISOString();
        this.persistSession(session);
        logger.info(`[SessionManager] Session reset: ${sessionId}`);
    }

    /**
     * List all active sessions.
     */
    listSessions(): Session[] {
        return Array.from(this.sessions.values())
            .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }

    /**
     * List sessions for a specific channel.
     */
    listByChannel(channelType: ChannelType): Session[] {
        return Array.from(this.sessions.values())
            .filter(s => s.channelType === channelType);
    }

    /**
     * Set a user preference on a session.
     */
    setPreference(sessionId: string, key: string, value: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.preferences[key] = value;
        this.persistSession(session);
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    private persistSession(session: Session): void {
        try {
            fs.writeFileSync(
                this.sessionPath(session.sessionId),
                JSON.stringify(session, null, 2)
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[SessionManager] Persist failed for ${session.sessionId}: ${msg}`);
        }
    }

    private loadFromDisk(): void {
        this.ensureDir();
        try {
            const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
            const now = Date.now();
            const ttlMs = this.SESSION_TTL_HOURS * 3_600_000;
            let loaded = 0;

            for (const file of files) {
                try {
                    const raw = fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8');
                    const session = JSON.parse(raw) as Session;

                    // Skip expired sessions
                    const lastActivity = new Date(session.lastActivity).getTime();
                    if (now - lastActivity > ttlMs) continue;

                    this.sessions.set(session.sessionId, session);
                    loaded++;
                } catch { /* skip malformed files */ }
            }

            if (loaded > 0) {
                logger.info(`[SessionManager] Loaded ${loaded} session(s) from disk.`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[SessionManager] Load from disk failed: ${msg}`);
        }
    }
}

export const sessionManager = new SessionManager();
export default sessionManager;
