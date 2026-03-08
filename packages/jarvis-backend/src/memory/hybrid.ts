import * as lancedb from 'vectordb';
import OpenAI from 'openai';
import { config } from '../config/loader';
import * as path from 'path';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const HYBRID_TABLE_NAME = 'jarvis_knowledge_base';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small size

export interface DocumentChunk {
    id: string;
    text: string;
    bucket: 'PERSONAL' | 'WORKSPACE' | 'KNOWLEDGE';
    metadata: Record<string, any>;
}

export class HybridMemory {
    private db: lancedb.Connection | null = null;
    private table: lancedb.Table | null = null;
    private openai: OpenAI | null = null;

    async initialize(): Promise<void> {
        if (!config.llm.openai_api_key) {
            console.warn('[HybridMemory] No OpenAI key found. LanceDB RAG offline.');
            return;
        }

        this.openai = new OpenAI({ apiKey: config.llm.openai_api_key });

        try {
            const dbPath = path.resolve(process.cwd(), 'data', 'hybrid');
            console.log(`[HybridMemory] Connecting to LanceDB at ${dbPath}...`);
            this.db = await lancedb.connect(dbPath);

            const tableNames = await this.db.tableNames();

            if (tableNames.includes(HYBRID_TABLE_NAME)) {
                this.table = await this.db.openTable(HYBRID_TABLE_NAME);
                console.log(`[HybridMemory] LanceDB Online. Knowledge collection loaded.`);
            } else {
                console.log(`[HybridMemory] Creating table: ${HYBRID_TABLE_NAME}`);
                const dummyVector = Array(VECTOR_SIZE).fill(0);
                this.table = await this.db.createTable(HYBRID_TABLE_NAME, [
                    {
                        id: 'schema_init_id',
                        vector: dummyVector,
                        text: '',
                        docId: '',
                        bucket: 'KNOWLEDGE',
                        chunkIndex: 0
                    }
                ]);
                await this.table.delete("id = 'schema_init_id'");
                console.log(`[HybridMemory] LanceDB Online. Knowledge collection initialized with bucket partitioning.`);
            }
        } catch (error: any) {
            console.error(`[HybridMemory] Initialization failed.`, error.message);
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

    /**
     * Chunk a large document into manageable overlapped pieces 
     */
    private chunkText(text: string, maxTokens: number = 800, overlap: number = 200): string[] {
        const maxChars = maxTokens * 4;
        const overlapChars = overlap * 4;
        const chunks: string[] = [];

        let pointer = 0;
        while (pointer < text.length) {
            let end = pointer + maxChars;
            if (end > text.length) end = text.length;
            chunks.push(text.slice(pointer, end));
            pointer += (maxChars - overlapChars);
            if (pointer >= text.length) break;
        }
        return chunks;
    }

    /**
     * Ingests a large document, splits it, embeds it, and stores it into LanceDB
     */
    async encodeDocument(docId: string, text: string, bucket: 'PERSONAL' | 'WORKSPACE' | 'KNOWLEDGE' = 'WORKSPACE', metadata: Record<string, any> = {}): Promise<void> {
        if (!this.table) throw new Error('LanceDB table offline.');
        console.log(`[HybridMemory] Encoding document ${docId} into bucket ${bucket}...`);

        const chunks = this.chunkText(text);
        const embeddings = await Promise.all(chunks.map(c => this.embed(c)));

        const records = chunks.map((chunk, i) => ({
            id: `${docId}_chunk_${i}`,
            vector: embeddings[i],
            text: chunk,
            docId: docId,
            bucket: bucket,
            chunkIndex: i
        }));

        try {
            // Overwrite existing chunks for this docId (crude approach for now)
            await this.table.delete(`docId = '${docId}'`);
        } catch (e) {
            // ignore if nothing to delete
        }

        await this.table.add(records);
        console.log(`[HybridMemory] Successfully encoded ${chunks.length} chunks into [${bucket}] knowledge base.`);
    }

    /**
     * Search the knowledge base for semantic similarities, optionally filtered by bucket
     */
    async searchKnowledge(query: string, nResults: number = 3, bucket?: 'PERSONAL' | 'WORKSPACE' | 'KNOWLEDGE'): Promise<DocumentChunk[]> {
        if (!this.table) throw new Error('LanceDB table offline.');

        const queryEmbedding = await this.embed(query);
        let search = this.table.search(queryEmbedding);

        if (bucket) {
            console.log(`[HybridMemory] Filtering search for bucket: ${bucket}`);
            search = search.where(`bucket = '${bucket}'`);
        }

        const results = await search.limit(nResults).execute();

        return results.map((res: any) => ({
            id: res.id,
            text: res.text,
            bucket: res.bucket,
            metadata: {
                docId: res.docId,
                chunkIndex: res.chunkIndex,
                distance: res._distance
            }
        }));
    }
}
