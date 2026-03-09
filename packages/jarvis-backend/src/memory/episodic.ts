import * as lancedb from 'vectordb';
import OpenAI from 'openai';
import { Mission } from '../types/mission';
import * as path from 'path';
import { metricsCollector } from '../instrumentation/metricsCollector';

const TABLE_NAME = 'jarvis_episodes';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_SIZE = 1536;
const RECALL_DISTANCE_THRESHOLD = 0.22; // Equivalent to Cosine Similarity >= 0.78
const RECALL_TOP_K = 5;

export interface Episode {
    id: string;
    prompt: string;
    result: string;
    squad: string;
    source: string;
    lang?: string;
    qualityScore: number | null;
    timestamp: string;
    status: string;
}

export class EpisodicMemory {
    private db: lancedb.Connection | null = null;
    private table: lancedb.Table | null = null;
    private openai: OpenAI | null = null;

    async initialize(): Promise<void> {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        try {
            const dbPath = path.resolve(process.cwd(), 'data', 'episodic');
            this.db = await lancedb.connect(dbPath);

            const tableNames = await this.db.tableNames();

            if (tableNames.includes(TABLE_NAME)) {
                this.table = await this.db.openTable(TABLE_NAME);
            } else {
                console.log(`[EPISODIC] Creating table: ${TABLE_NAME}`);
                // Create table with a dummy row to define schema
                // LanceDB infers schema from the first inserted record
                const dummyVector = Array(VECTOR_SIZE).fill(0);
                this.table = await this.db.createTable(TABLE_NAME, [
                    {
                        id: 'schema_init_id',
                        vector: dummyVector,
                        missionId: 'schema_init',
                        prompt: '',
                        result: '',
                        squad: '',
                        source: '',
                        lang: '',
                        qualityScore: 0,
                        durationMs: 0,
                        status: '',
                        completedAt: new Date().toISOString()
                    }
                ]);
                // Delete the dummy record immediately
                await this.table.delete("id = 'schema_init_id'");
            }

            console.log(`[EPISODIC] Memory online — LanceDB local`);
        } catch (err: any) {
            console.error(`[EPISODIC] Initialization failed: ${err.message}`);
        }
    }

    async embed(text: string): Promise<number[]> {
        if (!this.openai) throw new Error('OpenAI client not initialized');

        const response = await this.openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text.slice(0, 8000)
        });

        return response.data[0].embedding;
    }

    async recall(prompt: string, squadId?: string): Promise<Episode[]> {
        if (!this.table) return [];

        const startTime = Date.now();
        try {
            const vector = await this.embed(prompt);

            let query = this.table.search(vector).limit(10);

            if (squadId) {
                query = query.filter(`squad = '${squadId}'`);
            }

            const results = await query.execute();
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('episodic', latency, 'success');

            // Explicitly filter by distance and take top K
            const filteredResults = results
                .filter(res => (res._distance as number) <= RECALL_DISTANCE_THRESHOLD)
                .slice(0, RECALL_TOP_K);

            if (filteredResults.length === 0) return [];

            return filteredResults.map((res: any) => ({
                id: res.id,
                prompt: res.prompt,
                result: res.result,
                squad: res.squad,
                source: res.source,
                lang: res.lang,
                qualityScore: res.qualityScore,
                timestamp: res.completedAt,
                status: res.status
            }));
        } catch (err: any) {
            const latency = Date.now() - startTime;
            metricsCollector.recordMemoryQueryLatency('episodic', latency, 'error');
            console.error(`[EPISODIC] Recall failed: ${err.message}`);
            return [];
        }
    }

    async consolidate(mission: Mission): Promise<void> {
        if (!this.table) return;

        try {
            const content = `${mission.prompt} ${mission.result ?? ''}`;
            const vector = await this.embed(content);

            const record = {
                id: mission.id, // LanceDB accepts strings for id
                vector,
                missionId: mission.id,
                prompt: mission.prompt.slice(0, 500),
                result: (mission.result ?? '').slice(0, 2000),
                squad: mission.squad,
                source: mission.source,
                lang: mission.lang || '',
                qualityScore: mission.qualityScore ?? 0,
                durationMs: mission.durationMs ?? 0,
                status: mission.status,
                completedAt: mission.completedAt || new Date().toISOString()
            };

            // LanceDB doesn't have a native upsert by string ID yet in this older version (0.21.2)
            // So we delete existing then add
            try {
                await this.table.delete(`id = '${mission.id}'`);
            } catch (e) {
                // Ignore delete errors if it doesn't exist
            }

            await this.table.add([record]);

            console.log(`[EPISODIC] Mission ${mission.id} consolidated (LanceDB)`);

            // Wire Fact Extraction if possible
            const { semanticMemory } = require('../index');
            if (semanticMemory) {
                await semanticMemory.extractAndStoreFacts(mission);
            }
        } catch (err: any) {
            console.error(`[EPISODIC] Consolidation failed: ${err.message}`);
            if (err.data) console.error(`[EPISODIC] Error Data: ${JSON.stringify(err.data)}`);
        }
    }

    async getRecentHistory(hours: number, squadId?: string): Promise<Episode[]> {
        if (!this.table) return [];

        try {
            const startTime = new Date(Date.now() - hours * 3600000).toISOString();

            let filterStr = `\"completedAt\" >= '${startTime}'`;
            if (squadId) {
                filterStr += ` AND squad = '${squadId}'`;
            }

            // Using select to get records without searching vectors (requires fallback or pure filter)
            // Note: LanceDB search is vector-first.  To just get latest, we might have to use a dummy search or Native JS filter if tables are small.
            // For now, in vectordb (lancedb JS API), we can fetch all and filter in memory if needed, or use a dummy vector.
            // To properly filter without vector search, we can search with a zero vector but large limit, then filter.
            const dummyVector = Array(VECTOR_SIZE).fill(0);

            const results = await this.table.search(dummyVector)
                .filter(filterStr)
                .limit(50)
                .execute();

            return results.map((res: any) => ({
                id: res.id,
                prompt: res.prompt,
                result: res.result,
                squad: res.squad,
                source: res.source,
                lang: res.lang,
                qualityScore: res.qualityScore,
                timestamp: res.completedAt,
                status: res.status
            })).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        } catch (err: any) {
            console.error(`[EPISODIC] History retrieval failed: ${err.message}`);
            return [];
        }
    }
}
