import Database from 'better-sqlite3';
import { Mission } from '../types/mission';
import { queryLLM } from '../llm';
import * as path from 'path';
import * as fs from 'fs';
import { metricsCollector } from '../instrumentation/metricsCollector';

export interface CompanyContext {
    goals: string[];
    metrics: Record<string, string>;
    lessons: string[];
    founderLanguage: string;
}

export class SemanticMemory {
    private db: Database.Database | null = null;

    async initialize(): Promise<void> {
        try {
            const dataDir = path.resolve(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const dbPath = path.join(dataDir, 'jarvis.db');
            this.db = new Database(dbPath);

            // Create tables replacing Neo4j nodes
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS facts (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    nodeType TEXT NOT NULL
                )
            `);

            // Migrate Neo4j constraints to SQLite UNIQUE where applicable
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS goals (
                    id TEXT PRIMARY KEY,
                    text TEXT,
                    objective TEXT,
                    tier TEXT,
                    keyResults TEXT,
                    goals_list TEXT,
                    targets TEXT,
                    progressPct INTEGER,
                    reason TEXT,
                    updatedAt TEXT NOT NULL
                )
            `);

            this.db.exec(`
                CREATE TABLE IF NOT EXISTS metrics (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `);

            this.db.exec(`
                CREATE TABLE IF NOT EXISTS lessons (
                    id TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `);

            console.log('[SEMANTIC] Memory online — SQLite local');
        } catch (err: any) {
            console.error(`[SEMANTIC] Initialization failed: ${err.message}`);
        }
    }

    async setFact(key: string, value: string, nodeType: string): Promise<void> {
        if (!this.db) return;
        try {
            const stmt = this.db.prepare(`
                INSERT INTO facts (key, value, updatedAt, nodeType)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updatedAt = excluded.updatedAt
            `);

            // To maintain compatibility with Neo4j logical groupings, we mirror inserts into specialized tables as well 
            // if the original implementation expected them via specific node types.
            // The original setFact implementation just used the generic nodeType label in Neo4j.
            // In SQLite, we use the `facts` table with a `nodeType` column to mimic labels.

            stmt.run(key, value, new Date().toISOString(), nodeType);

            // Also mirror explicitly to specific tables if they match the nodeTypes used in getCompanyContext
            if (nodeType === 'Goal') {
                const goalStmt = this.db.prepare(`
                    INSERT INTO goals (id, text, updatedAt)
                    VALUES (?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                    text = excluded.text,
                    updatedAt = excluded.updatedAt
                `);
                goalStmt.run(key, value, new Date().toISOString());
            } else if (nodeType === 'Metric') {
                const metricStmt = this.db.prepare(`
                    INSERT INTO metrics (key, value, updatedAt)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updatedAt = excluded.updatedAt
                `);
                metricStmt.run(key, value, new Date().toISOString());
            } else if (nodeType === 'Lesson') {
                const lessonStmt = this.db.prepare(`
                    INSERT INTO lessons (id, value, updatedAt)
                    VALUES (?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                    value = excluded.value,
                    updatedAt = excluded.updatedAt
                `);
                lessonStmt.run(key, value, new Date().toISOString());
            }

        } catch (err: any) {
            console.error(`[SEMANTIC] Fact insertion failed: ${err.message}`);
        }
    }

    async getFact(key: string): Promise<string | null> {
        if (!this.db) return null;
        const startTime = Date.now();
        try {
            const stmt = this.db.prepare('SELECT value FROM facts WHERE key = ? LIMIT 1');
            const result = stmt.get(key) as { value: string } | undefined;
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('semantic', latency, 'success');
            return result ? result.value : null;
        } catch (err: any) {
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('semantic', latency, 'error');
            console.error(`[SEMANTIC] Get fact failed: ${err.message}`);
            return null;
        }
    }

    async getCompanyContext(): Promise<CompanyContext> {
        if (!this.db) {
            return { goals: [], metrics: {}, lessons: [], founderLanguage: 'en' };
        }
        const startTime = Date.now();
        try {
            const goalsRows = this.db.prepare('SELECT text, objective FROM goals').all() as any[];
            const metricsRows = this.db.prepare('SELECT key, value FROM metrics LIMIT 10').all() as any[];
            const lessonsRows = this.db.prepare('SELECT value FROM lessons ORDER BY updatedAt DESC LIMIT 5').all() as any[];

            const lang = await this.getFact('founderLanguage') || 'en';

            const goals = goalsRows.map(r => r.text || r.objective).filter(Boolean);
            const metrics: Record<string, string> = {};
            metricsRows.forEach(r => metrics[r.key] = r.value);
            const lessons = lessonsRows.map(r => r.value);

            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('semantic', latency, 'success');

            return { goals, metrics, lessons, founderLanguage: lang };
        } catch (err: any) {
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('semantic', latency, 'error');
            console.error(`[SEMANTIC] Context retrieval failed: ${err.message}`);
            return { goals: [], metrics: {}, lessons: [], founderLanguage: 'en' };
        }
    }

    async extractAndStoreFacts(mission: Mission): Promise<void> {
        if (!this.db) return;
        if (mission.status !== 'DONE' || (mission.qualityScore && mission.qualityScore < 75)) return;

        try {
            const prompt = `Extract 3-5 key facts from this mission result. 
Return ONLY valid JSON array:
[{ "key": string, "value": string, "nodeType": "Metric"|"Lesson"|"Risk" }]
Mission result: ${mission.result?.slice(0, 2000)}`;

            const response = await queryLLM("System: You are an expert data extractor.", prompt);

            // Clean markdown block if present
            const jsonStr = response.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
            const facts = JSON.parse(jsonStr);

            if (Array.isArray(facts)) {
                for (const fact of facts) {
                    // Generate a unique key for lessons/risks if not distinctly provided
                    let key = fact.key;
                    if (fact.nodeType === 'Lesson' || fact.nodeType === 'Risk') {
                        key = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    }
                    await this.setFact(key, fact.value, fact.nodeType);
                }
                console.log(`[SEMANTIC] Extracted and stored ${facts.length} facts from mission ${mission.id}`);
            }
        } catch (err: any) {
            console.error(`[SEMANTIC] Fact extraction failed: ${err.message}`);
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
