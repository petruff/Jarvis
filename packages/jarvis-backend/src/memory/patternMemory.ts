/**
 * JARVIS Evolution v6.0 — Pattern Memory (Sprint 1 / Phase F1)
 *
 * Extracts recurring patterns from completed missions and stores them in SQLite.
 * Patterns are injected into future mission prompts to bootstrap agent reasoning
 * with accumulated institutional knowledge.
 *
 * Pattern types:
 *   successful_approach — what worked well for a type of mission
 *   common_failure      — pitfalls to avoid
 *   optimization        — performance/quality improvements discovered
 *   tool_sequence       — reliable tool call sequences for specific tasks
 *
 * Schema (extends existing jarvis.db):
 *   CREATE TABLE patterns (
 *     id TEXT PRIMARY KEY,
 *     type TEXT,
 *     description TEXT,
 *     squad TEXT,
 *     frequency INTEGER,
 *     lastSeen TEXT,
 *     examples TEXT,
 *     decayScore REAL,
 *     createdAt TEXT
 *   )
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import { queryLLM } from '../llm';
import logger from '../logger';
import { metricsCollector } from '../instrumentation/metricsCollector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatternType =
    | 'successful_approach'
    | 'common_failure'
    | 'optimization'
    | 'tool_sequence';

export interface Pattern {
    id: string;
    type: PatternType;
    description: string;
    squad: string;           // squad this pattern applies to, or '*' for all
    frequency: number;       // times this pattern has been observed
    lastSeen: string;        // ISO timestamp
    examples: string[];      // up to 3 mission IDs or excerpts
    decayScore: number;      // 0.0-1.0, decays if not seen in 30 days
    createdAt: string;
}

// ─── Pattern Memory ───────────────────────────────────────────────────────────

class PatternMemory {
    private db: Database.Database | null = null;
    private readonly DECAY_DAYS = 30;

    async initialize(): Promise<void> {
        try {
            const dataDir = path.resolve(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            this.db = new Database(path.join(dataDir, 'jarvis.db'));

            this.db.exec(`
                CREATE TABLE IF NOT EXISTS patterns (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    squad TEXT NOT NULL DEFAULT '*',
                    frequency INTEGER NOT NULL DEFAULT 1,
                    lastSeen TEXT NOT NULL,
                    examples TEXT NOT NULL DEFAULT '[]',
                    decayScore REAL NOT NULL DEFAULT 1.0,
                    createdAt TEXT NOT NULL
                )
            `);

            // Index for squad + type queries
            this.db.exec(`
                CREATE INDEX IF NOT EXISTS idx_patterns_squad ON patterns(squad);
                CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
            `);

            logger.info('[PatternMemory] Initialized successfully.');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[PatternMemory] Initialization failed: ${msg}`);
        }
    }

    /**
     * Extract patterns from a just-completed mission and upsert them.
     * Called from the Self-Critique Loop (Step 13) or orchestrator.
     */
    async extractFromMission(params: {
        missionId: string;
        prompt: string;
        result: string;
        squadId: string;
        qualityScore: number;
    }): Promise<number> {
        if (!this.db) return 0;

        const { missionId, prompt, result, squadId, qualityScore } = params;

        // Only extract patterns from missions that actually completed (quality > 0)
        if (qualityScore < 30) return 0;

        try {
            const extractPrompt = `You are a pattern extractor for an AI system. Analyze this completed mission and extract reusable patterns.

MISSION PROMPT: ${prompt.slice(0, 500)}
MISSION RESULT (excerpt): ${result.slice(0, 800)}
SQUAD: ${squadId}
QUALITY SCORE: ${qualityScore}/100

Extract 1-3 patterns from this mission. Each pattern should be a reusable insight that would help future similar missions.

Respond ONLY with valid JSON array:
[
  {
    "type": "successful_approach" | "common_failure" | "optimization" | "tool_sequence",
    "description": "One clear sentence describing the pattern",
    "squad": "${squadId}" or "*" if generally applicable
  }
]

If no clear patterns exist, respond with: []`;

            const resp = await queryLLM('Pattern Extractor', extractPrompt, 'forge');
            const clean = resp.replace(/```json|```/g, '').trim();
            const start = clean.indexOf('[');
            const end = clean.lastIndexOf(']');
            if (start === -1 || end === -1) return 0;

            const extracted = JSON.parse(clean.substring(start, end + 1)) as Array<{
                type: PatternType;
                description: string;
                squad: string;
            }>;

            let upserted = 0;
            for (const p of extracted) {
                if (p.description && p.type) {
                    await this.upsertPattern({
                        type: p.type,
                        description: p.description,
                        squad: p.squad || squadId,
                        exampleMissionId: missionId,
                    });
                    upserted++;
                }
            }

            if (upserted > 0) {
                logger.info(`[PatternMemory] Extracted ${upserted} pattern(s) from mission ${missionId}`);
            }

            return upserted;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[PatternMemory] Pattern extraction failed for ${missionId}: ${msg}`);
            return 0;
        }
    }

    /**
     * Upsert a pattern — if a similar description already exists, increment frequency.
     * Uses fuzzy dedup: same type + squad + first 60 chars of description = same pattern.
     */
    private async upsertPattern(params: {
        type: PatternType;
        description: string;
        squad: string;
        exampleMissionId: string;
    }): Promise<void> {
        if (!this.db) return;

        const { type, description, squad, exampleMissionId } = params;
        const now = new Date().toISOString();
        const descKey = description.slice(0, 60).toLowerCase();

        // Check for existing similar pattern
        const existing = this.db.prepare(`
            SELECT id, frequency, examples FROM patterns
            WHERE type = ? AND squad = ? AND LOWER(SUBSTR(description, 1, 60)) = ?
            LIMIT 1
        `).get(type, squad, descKey) as { id: string; frequency: number; examples: string } | undefined;

        if (existing) {
            // Increment frequency, add example, update decay
            const examples = JSON.parse(existing.examples || '[]') as string[];
            if (!examples.includes(exampleMissionId)) examples.push(exampleMissionId);
            const trimmedExamples = examples.slice(-3); // Keep last 3

            this.db.prepare(`
                UPDATE patterns
                SET frequency = frequency + 1,
                    lastSeen = ?,
                    examples = ?,
                    decayScore = 1.0
                WHERE id = ?
            `).run(now, JSON.stringify(trimmedExamples), existing.id);
        } else {
            // Insert new pattern
            const id = crypto.randomUUID();
            this.db.prepare(`
                INSERT INTO patterns (id, type, description, squad, frequency, lastSeen, examples, decayScore, createdAt)
                VALUES (?, ?, ?, ?, 1, ?, ?, 1.0, ?)
            `).run(id, type, description, squad, now, JSON.stringify([exampleMissionId]), now);
        }
    }

    /**
     * Retrieve top-N relevant patterns for a query + squad combination.
     * Used by agents before mission execution.
     */
    async recallPatterns(query: string, squadId?: string, limit = 3): Promise<Pattern[]> {
        if (!this.db) return [];

        const startTime = Date.now();
        try {
            // Apply decay before retrieval
            this.applyDecay();

            const squad = squadId?.split('-')[0] || '*';

            // Fetch patterns matching squad (or global '*') sorted by frequency * decayScore
            const rows = this.db.prepare(`
                SELECT * FROM patterns
                WHERE (squad = ? OR squad = '*')
                AND decayScore > 0.1
                ORDER BY (frequency * decayScore) DESC
                LIMIT 20
            `).all(squad) as Pattern[];

            if (!rows.length) {
                const latency = Date.now() - startTime;
                metricsCollector.recordMemoryQueryLatency('pattern', latency, 'success');
                return [];
            }

            // Semantic filter: pick top-N most relevant to query using keyword overlap
            const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 3));
            const scored = rows.map(r => {
                const desc = r.description.toLowerCase();
                const overlap = [...queryWords].filter(w => desc.includes(w)).length;
                return { pattern: r, score: overlap + r.frequency * r.decayScore };
            });

            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('pattern', latency, 'success');

            return scored
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(s => ({
                    ...s.pattern,
                    examples: typeof s.pattern.examples === 'string'
                        ? JSON.parse(s.pattern.examples as unknown as string)
                        : s.pattern.examples,
                }));
        } catch (err: unknown) {
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('pattern', latency, 'error');
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[PatternMemory] recallPatterns failed: ${msg}`);
            return [];
        }
    }

    /**
     * Format patterns as a prompt injection string.
     */
    async formatPatternsForPrompt(query: string, squadId?: string): Promise<string> {
        const patterns = await this.recallPatterns(query, squadId);
        if (!patterns.length) return '';

        const lines = patterns.map(p =>
            `• [${p.type.toUpperCase()}] ${p.description} (seen ${p.frequency}x)`
        ).join('\n');

        return `[JARVIS LEARNED PATTERNS — ${patterns.length} relevant to this mission]\n${lines}`;
    }

    /**
     * Get all patterns (for API).
     */
    getAllPatterns(squadId?: string): Pattern[] {
        if (!this.db) return [];
        try {
            const query = squadId
                ? `SELECT * FROM patterns WHERE squad = ? OR squad = '*' ORDER BY (frequency * decayScore) DESC`
                : `SELECT * FROM patterns ORDER BY (frequency * decayScore) DESC`;
            const params = squadId ? [squadId.split('-')[0]] : [];
            const rows = this.db.prepare(query).all(...params) as Pattern[];
            return rows.map(r => ({
                ...r,
                examples: typeof r.examples === 'string' ? JSON.parse(r.examples as unknown as string) : r.examples,
            }));
        } catch {
            return [];
        }
    }

    /**
     * Apply decay to patterns not seen in DECAY_DAYS days.
     * Patterns with decayScore < 0.1 are effectively dormant.
     */
    private applyDecay(): void {
        if (!this.db) return;
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - this.DECAY_DAYS);
            const cutoffStr = cutoff.toISOString();

            this.db.prepare(`
                UPDATE patterns
                SET decayScore = MAX(0.0, decayScore - 0.1)
                WHERE lastSeen < ?
            `).run(cutoffStr);
        } catch { /* decay is best-effort */ }
    }

    /**
     * Force pattern extraction on recent missions (API endpoint: POST /api/patterns/extract).
     */
    async forceExtract(limit = 10): Promise<{ extracted: number; missions: number }> {
        if (!this.db) return { extracted: 0, missions: 0 };

        try {
            // Re-query recent completed missions from episodic memory
            const { episodicMemory } = require('../index');
            if (!episodicMemory) return { extracted: 0, missions: 0 };

            // Use a generic recall to get recent missions
            const episodes = await episodicMemory.recall('completed mission', undefined, limit);
            let totalExtracted = 0;

            for (const ep of episodes) {
                const count = await this.extractFromMission({
                    missionId: ep.id,
                    prompt: ep.prompt,
                    result: ep.result,
                    squadId: ep.squad || '*',
                    qualityScore: ep.qualityScore || 50,
                });
                totalExtracted += count;
            }

            return { extracted: totalExtracted, missions: episodes.length };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[PatternMemory] forceExtract failed: ${msg}`);
            return { extracted: 0, missions: 0 };
        }
    }
}

export const patternMemory = new PatternMemory();
export default patternMemory;
