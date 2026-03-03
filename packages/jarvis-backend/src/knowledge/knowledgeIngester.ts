/**
 * Knowledge Ingester — Orchestrate Content Ingestion
 *
 * Handles:
 * - URL validation and content type detection
 * - Multi-source document processing
 * - Embedding generation and storage
 * - Duplicate detection and deduplication
 */

import DocumentProcessor, { DocumentChunk } from './documentProcessor';
import { VectorStore } from './vectorStore';
import OpenAI from 'openai';
import crypto from 'crypto';

export interface IngestionJob {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  contentType: 'pdf' | 'video' | 'podcast' | 'article' | 'unknown';
  progress: number; // 0-100
  chunksProcessed: number;
  chunksStored: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export class KnowledgeIngester {
  private processor: DocumentProcessor;
  private vectorStore: VectorStore;
  private openai: OpenAI;
  private jobs: Map<string, IngestionJob> = new Map();
  private duplicateCache: Set<string> = new Set(); // SHA256 hashes of content chunks

  constructor() {
    this.processor = new DocumentProcessor();
    this.vectorStore = new VectorStore();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Ingest content from URL
   */
  async ingestFromUrl(url: string, title?: string): Promise<IngestionJob> {
    const jobId = crypto.randomUUID();
    const contentType = this.detectContentType(url);

    const job: IngestionJob = {
      id: jobId,
      url,
      status: 'pending',
      contentType,
      progress: 0,
      chunksProcessed: 0,
      chunksStored: 0,
      startedAt: Date.now(),
    };

    this.jobs.set(jobId, job);

    // Process asynchronously
    this.processIngestion(job, title).catch((error) => {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[KnowledgeIngester] Ingestion error:', error);
    });

    return job;
  }

  /**
   * Process ingestion and generate embeddings
   */
  private async processIngestion(job: IngestionJob, title?: string): Promise<void> {
    job.status = 'processing';

    try {
      let chunks: DocumentChunk[];

      // Process based on content type
      switch (job.contentType) {
        case 'pdf': {
          const result = await this.processor.processPDF(job.url, title || 'PDF Document');
          chunks = result.chunks;
          break;
        }
        case 'video': {
          const result = await this.processor.processVideo(job.url, title || 'Video');
          chunks = result.chunks;
          break;
        }
        case 'podcast': {
          const result = await this.processor.processPodcast(job.url, title || 'Podcast');
          chunks = result.chunks;
          break;
        }
        case 'article':
        default: {
          const result = await this.processor.processArticle(job.url, title);
          chunks = result.chunks;
          break;
        }
      }

      job.chunksProcessed = chunks.length;
      job.progress = 25;

      // Generate embeddings for each chunk
      let storedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Deduplication check
        const hash = this.hashContent(chunk.content);
        if (this.duplicateCache.has(hash)) {
          console.log(`[KnowledgeIngester] Skipping duplicate chunk: ${chunk.id}`);
          continue;
        }

        try {
          // Generate embedding
          const embedding = await this.generateEmbedding(chunk.content);
          chunk.embedding = embedding;

          // Store in vector database
          await this.vectorStore.storeChunk(chunk);
          this.duplicateCache.add(hash);
          storedCount++;

          // Update progress
          job.progress = 25 + (i / chunks.length) * 75;
        } catch (error) {
          console.error(`[KnowledgeIngester] Failed to process chunk ${chunk.id}:`, error);
        }
      }

      job.chunksStored = storedCount;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = Date.now();

      console.log(
        `[KnowledgeIngester] Ingestion complete: ${job.id} | ${storedCount} chunks stored | ${(Date.now() - job.startedAt) / 1000}s`
      );
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Generate embedding for text chunk
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[KnowledgeIngester] Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Detect content type from URL
   */
  private detectContentType(url: string): 'pdf' | 'video' | 'podcast' | 'article' | 'unknown' {
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) return 'video';
    if (
      url.includes('spotify.com') ||
      url.includes('podcasts.google.com') ||
      url.endsWith('.mp3') ||
      url.endsWith('.m4a')
    )
      return 'podcast';
    if (url.includes('medium.com') || url.includes('dev.to') || url.includes('blog')) return 'article';

    return 'unknown';
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(filter?: 'pending' | 'processing' | 'completed' | 'failed'): IngestionJob[] {
    const jobs = Array.from(this.jobs.values());
    return filter ? jobs.filter((j) => j.status === filter) : jobs;
  }

  /**
   * Get knowledge ingestion statistics
   */
  getStats(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalChunksStored: number;
    averageProcessingTime: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const failedJobs = jobs.filter((j) => j.status === 'failed');

    const avgProcessingTime =
      completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + ((j.completedAt || 0) - j.startedAt), 0) / completedJobs.length
        : 0;

    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      totalChunksStored: jobs.reduce((sum, j) => sum + j.chunksStored, 0),
      averageProcessingTime: avgProcessingTime / 1000, // seconds
    };
  }
}

export default KnowledgeIngester;
