/**
 * Knowledge Service — Central Knowledge Management
 *
 * Coordinates:
 * - Document ingestion
 * - Semantic search
 * - Context assembly for RAG
 * - Knowledge-augmented reasoning
 */

import KnowledgeIngester, { IngestionJob } from './knowledgeIngester';
import { VectorStore, SearchResult } from './vectorStore';
import DocumentProcessor from './documentProcessor';
import OpenAI from 'openai';

export interface KnowledgeContext {
  query: string;
  results: SearchResult[];
  assembledContext: string;
  confidence: number;
}

export class KnowledgeService {
  private ingester: KnowledgeIngester;
  private vectorStore: VectorStore;
  private processor: DocumentProcessor;
  private openai: OpenAI;

  constructor() {
    this.ingester = new KnowledgeIngester();
    this.vectorStore = new VectorStore();
    this.processor = new DocumentProcessor();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Ingest knowledge from multiple sources
   */
  async ingestKnowledge(url: string, title?: string): Promise<IngestionJob> {
    console.log(`[KnowledgeService] Ingesting knowledge from: ${url}`);
    return await this.ingester.ingestFromUrl(url, title);
  }

  /**
   * Search knowledge base
   */
  async search(
    query: string,
    mode: 'semantic' | 'keyword' | 'hybrid' = 'hybrid',
    topK: number = 5
  ): Promise<KnowledgeContext> {
    try {
      // Generate query embedding for semantic search
      let embedding: number[] = [];
      if (mode !== 'keyword') {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        embedding = response.data[0].embedding;
      }

      // Execute search based on mode
      let results: SearchResult[] = [];
      if (mode === 'semantic') {
        results = await this.vectorStore.semanticSearch(embedding, topK);
      } else if (mode === 'keyword') {
        results = this.vectorStore.keywordSearch(query, topK);
      } else {
        results = await this.vectorStore.hybridSearch(query, embedding, topK);
      }

      // Assemble context from results
      const assembledContext = this.assembleContext(query, results);
      const confidence = results.length > 0 ? results[0].similarity : 0;

      return {
        query,
        results,
        assembledContext,
        confidence,
      };
    } catch (error) {
      console.error('[KnowledgeService] Search error:', error);
      return {
        query,
        results: [],
        assembledContext: '',
        confidence: 0,
      };
    }
  }

  /**
   * Get knowledge-augmented context for agent reasoning
   */
  async getAugmentedContext(
    userQuery: string,
    conversationHistory: { role: string; content: string }[] = [],
    topK: number = 3
  ): Promise<{ context: string; sources: string[] }> {
    try {
      // Search knowledge base with user query
      const searchResult = await this.search(userQuery, 'hybrid', topK);

      // Build knowledge-augmented prompt
      let context = 'Knowledge Base Context:\n\n';
      const sources = new Set<string>();

      for (const result of searchResult.results) {
        context += `[${result.chunk.metadata.source.toUpperCase()}] ${result.chunk.metadata.title}\n`;
        context += `"${result.chunk.content}"\n`;
        context += `Relevance: ${(result.similarity * 100).toFixed(0)}%\n\n`;

        if (result.chunk.metadata.url) {
          sources.add(result.chunk.metadata.url);
        }
      }

      // Add conversation history context
      if (conversationHistory.length > 0) {
        context += 'Conversation History:\n';
        for (const msg of conversationHistory.slice(-3)) {
          context += `${msg.role}: ${msg.content}\n`;
        }
      }

      return {
        context,
        sources: Array.from(sources),
      };
    } catch (error) {
      console.error('[KnowledgeService] Augmented context error:', error);
      return {
        context: '',
        sources: [],
      };
    }
  }

  /**
   * Get job status
   */
  getIngestionStatus(jobId: string): IngestionJob | undefined {
    return this.ingester.getJobStatus(jobId);
  }

  /**
   * List ingestion jobs
   */
  listJobs(filter?: 'pending' | 'processing' | 'completed' | 'failed'): IngestionJob[] {
    return this.ingester.listJobs(filter);
  }

  /**
   * Get knowledge base statistics
   */
  getStats(): {
    ingestion: {
      totalJobs: number;
      completedJobs: number;
      failedJobs: number;
      totalChunksStored: number;
      averageProcessingTime: number;
    };
    vectorStore: {
      totalChunks: number;
      chunksBySource: Record<string, number>;
      chunksByTitle: Record<string, number>;
    };
  } {
    return {
      ingestion: this.ingester.getStats(),
      vectorStore: this.vectorStore.getStats(),
    };
  }

  /**
   * Assemble context from search results
   */
  private assembleContext(query: string, results: SearchResult[]): string {
    if (results.length === 0) {
      return `No relevant knowledge found for query: "${query}"`;
    }

    let context = `Knowledge Retrieved for: "${query}"\n\n`;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const relevanceBar = '█'.repeat(Math.round(result.similarity * 10)) + '░'.repeat(10 - Math.round(result.similarity * 10));

      context += `${i + 1}. [${result.chunk.metadata.title}] (${(result.similarity * 100).toFixed(0)}% ${relevanceBar})\n`;
      context += `   Source: ${result.chunk.metadata.source}\n`;
      context += `   "${result.chunk.content.substring(0, 200)}..."\n\n`;
    }

    return context;
  }
}

export default KnowledgeService;
