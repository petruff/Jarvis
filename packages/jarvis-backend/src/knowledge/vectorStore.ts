/**
 * Vector Store — Semantic Search & Retrieval
 *
 * Uses LanceDB for in-process vector storage with:
 * - Similarity search (cosine distance)
 * - Metadata filtering
 * - Hybrid keyword + semantic search
 */

import lancedb, { DBConnection, Table } from 'lancedb';
import { DocumentChunk } from './documentProcessor';
import Fuse from 'fuse.js';

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number; // 0-1 score
  source: 'semantic' | 'keyword' | 'hybrid';
}

export class VectorStore {
  private db: DBConnection;
  private table: Table | null = null;
  private keyword_index: Fuse<DocumentChunk> | null = null;
  private chunks: Map<string, DocumentChunk> = new Map();

  constructor() {
    this.db = lancedb.connect('.vectorstore');
  }

  /**
   * Store a document chunk with embedding
   */
  async storeChunk(chunk: DocumentChunk): Promise<void> {
    try {
      if (!this.table) {
        // Initialize table on first insert
        this.table = await this.db.createTable('documents', [
          {
            id: chunk.id,
            content: chunk.content,
            embedding: chunk.embedding || [],
            source: chunk.metadata.source,
            title: chunk.metadata.title,
            url: chunk.metadata.url,
            language: chunk.metadata.language,
            processedAt: chunk.metadata.processedAt,
            chunkIndex: chunk.chunkIndex,
            tokens: chunk.tokens,
          },
        ]);
      } else {
        // Add to existing table
        await this.table.add([
          {
            id: chunk.id,
            content: chunk.content,
            embedding: chunk.embedding || [],
            source: chunk.metadata.source,
            title: chunk.metadata.title,
            url: chunk.metadata.url,
            language: chunk.metadata.language,
            processedAt: chunk.metadata.processedAt,
            chunkIndex: chunk.chunkIndex,
            tokens: chunk.tokens,
          },
        ]);
      }

      // Store locally for keyword search
      this.chunks.set(chunk.id, chunk);

      // Rebuild keyword index
      this.rebuildKeywordIndex();

      console.log(`[VectorStore] Stored chunk: ${chunk.id}`);
    } catch (error) {
      console.error('[VectorStore] Storage error:', error);
      throw new Error(`Failed to store chunk: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(
    queryEmbedding: number[],
    topK: number = 5,
    filters?: { source?: string; title?: string }
  ): Promise<SearchResult[]> {
    try {
      if (!this.table) {
        return [];
      }

      let query = this.table.search(queryEmbedding);

      // Apply filters
      if (filters?.source) {
        query = query.where(`source = '${filters.source}'`);
      }
      if (filters?.title) {
        query = query.where(`title = '${filters.title}'`);
      }

      const results = await query.limit(topK).toArray() as any[];

      return results.map((result: any) => ({
        chunk: {
          id: result.id,
          content: result.content,
          metadata: {
            source: result.source,
            title: result.title,
            url: result.url,
            language: result.language,
            processedAt: result.processedAt,
          },
          chunkIndex: result.chunkIndex,
          tokens: result.tokens,
          embedding: result.embedding,
        },
        similarity: 1 - this.cosineSimilarity(queryEmbedding, result.embedding), // Convert to similarity (0-1)
        source: 'semantic',
      }));
    } catch (error) {
      console.error('[VectorStore] Semantic search error:', error);
      return [];
    }
  }

  /**
   * Keyword search using Fuse.js
   */
  keywordSearch(query: string, topK: number = 5): SearchResult[] {
    try {
      if (!this.keyword_index) {
        return [];
      }

      const results = this.keyword_index.search(query).slice(0, topK);

      return results.map((result) => ({
        chunk: result.item,
        similarity: result.score ? 1 - result.score : 0.5, // Fuse score to similarity
        source: 'keyword',
      }));
    } catch (error) {
      console.error('[VectorStore] Keyword search error:', error);
      return [];
    }
  }

  /**
   * Hybrid search (semantic + keyword)
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    topK: number = 5,
    semanticWeight: number = 0.7 // 70% semantic, 30% keyword
  ): Promise<SearchResult[]> {
    try {
      // Run both searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(queryEmbedding, topK),
        Promise.resolve(this.keywordSearch(query, topK)),
      ]);

      // Merge results with weighted scoring
      const merged = new Map<string, SearchResult>();

      for (const result of semanticResults) {
        merged.set(result.chunk.id, {
          ...result,
          similarity: result.similarity * semanticWeight,
        });
      }

      for (const result of keywordResults) {
        const existing = merged.get(result.chunk.id);
        if (existing) {
          // Combine scores
          existing.similarity = existing.similarity + result.similarity * (1 - semanticWeight);
          existing.source = 'hybrid';
        } else {
          merged.set(result.chunk.id, {
            ...result,
            similarity: result.similarity * (1 - semanticWeight),
            source: 'hybrid',
          });
        }
      }

      // Sort by similarity and return top K
      return Array.from(merged.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      console.error('[VectorStore] Hybrid search error:', error);
      return [];
    }
  }

  /**
   * Get chunk by ID
   */
  getChunk(id: string): DocumentChunk | undefined {
    return this.chunks.get(id);
  }

  /**
   * Get all chunks for a source
   */
  getChunksBySource(source: string): DocumentChunk[] {
    return Array.from(this.chunks.values()).filter((c) => c.metadata.source === source);
  }

  /**
   * Get all chunks for a title
   */
  getChunksByTitle(title: string): DocumentChunk[] {
    return Array.from(this.chunks.values()).filter((c) => c.metadata.title === title);
  }

  /**
   * Delete chunks by title
   */
  async deleteByTitle(title: string): Promise<void> {
    try {
      if (!this.table) return;

      const ids = Array.from(this.chunks.values())
        .filter((c) => c.metadata.title === title)
        .map((c) => c.id);

      for (const id of ids) {
        this.chunks.delete(id);
      }

      // Rebuild index
      this.rebuildKeywordIndex();

      console.log(`[VectorStore] Deleted ${ids.length} chunks with title: ${title}`);
    } catch (error) {
      console.error('[VectorStore] Delete error:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalChunks: number;
    chunksBySource: Record<string, number>;
    chunksByTitle: Record<string, number>;
  } {
    const chunksBySource: Record<string, number> = {};
    const chunksByTitle: Record<string, number> = {};

    for (const chunk of this.chunks.values()) {
      chunksBySource[chunk.metadata.source] = (chunksBySource[chunk.metadata.source] || 0) + 1;
      chunksByTitle[chunk.metadata.title] = (chunksByTitle[chunk.metadata.title] || 0) + 1;
    }

    return {
      totalChunks: this.chunks.size,
      chunksBySource,
      chunksByTitle,
    };
  }

  /**
   * Rebuild keyword search index
   */
  private rebuildKeywordIndex(): void {
    const chunks = Array.from(this.chunks.values());
    this.keyword_index = new Fuse(chunks, {
      keys: ['content', 'metadata.title'],
      threshold: 0.3,
      includeScore: true,
    });
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, x, i) => sum + x * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export default VectorStore;
