/**
 * Knowledge API Endpoints — Phase 3 Implementation
 *
 * Routes for:
 * - Knowledge ingestion from URLs
 * - Semantic search
 * - RAG context retrieval
 * - Knowledge statistics
 */

import { FastifyInstance } from 'fastify';
import KnowledgeService from '../knowledge/knowledgeService';

const knowledgeService = new KnowledgeService();

export async function registerKnowledgeRoutes(fastify: FastifyInstance) {
  // ========== PHASE 3: Knowledge Pipeline ==========

  /**
   * POST /api/knowledge/ingest
   * Start ingestion job from URL
   */
  fastify.post('/api/knowledge/ingest', async (request, reply) => {
    try {
      const body = request.body as any;
      const url = body.url || '';
      const title = body.title || undefined;

      if (!url) {
        return reply.code(400).send({
          status: 'error',
          message: 'URL is required',
        });
      }

      const job = await knowledgeService.ingestKnowledge(url, title);

      reply.send({
        status: 'success',
        data: {
          jobId: job.id,
          url: job.url,
          contentType: job.contentType,
          status: job.status,
          progress: job.progress,
          message: `Ingestion started. Job ID: ${job.id}`,
        },
      });
    } catch (error) {
      console.error('[Knowledge API] Ingestion error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to start ingestion',
      });
    }
  });

  /**
   * GET /api/knowledge/ingest/:jobId
   * Get ingestion job status
   */
  fastify.get<{ Params: { jobId: string } }>('/api/knowledge/ingest/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params;
      const job = knowledgeService.getIngestionStatus(jobId);

      if (!job) {
        return reply.code(404).send({
          status: 'error',
          message: `Job not found: ${jobId}`,
        });
      }

      reply.send({
        status: 'success',
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          chunksProcessed: job.chunksProcessed,
          chunksStored: job.chunksStored,
          error: job.error,
          processingTime: job.completedAt ? (job.completedAt - job.startedAt) / 1000 : null,
        },
      });
    } catch (error) {
      console.error('[Knowledge API] Status error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get job status',
      });
    }
  });

  /**
   * GET /api/knowledge/jobs
   * List all ingestion jobs
   */
  fastify.get<{ Querystring: { filter?: string } }>('/api/knowledge/jobs', async (request, reply) => {
    try {
      const { filter } = request.query;
      const jobs = knowledgeService.listJobs(filter as any);

      reply.send({
        status: 'success',
        data: {
          totalJobs: jobs.length,
          jobs: jobs.map((j) => ({
            jobId: j.id,
            status: j.status,
            progress: j.progress,
            chunksStored: j.chunksStored,
            url: j.url,
          })),
        },
      });
    } catch (error) {
      console.error('[Knowledge API] Jobs list error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to list jobs',
      });
    }
  });

  /**
   * POST /api/knowledge/search
   * Search knowledge base
   */
  fastify.post<{ Body: { query: string; mode?: string; topK?: number } }>(
    '/api/knowledge/search',
    async (request, reply) => {
      try {
        const body = request.body as any;
        const query = body.query || '';
        const mode = body.mode || 'hybrid'; // semantic | keyword | hybrid
        const topK = body.topK || 5;

        if (!query) {
          return reply.code(400).send({
            status: 'error',
            message: 'Query is required',
          });
        }

        const result = await knowledgeService.search(query, mode, topK);

        reply.send({
          status: 'success',
          data: {
            query: result.query,
            confidence: result.confidence,
            resultsCount: result.results.length,
            results: result.results.map((r) => ({
              title: r.chunk.metadata.title,
              source: r.chunk.metadata.source,
              similarity: (r.similarity * 100).toFixed(0) + '%',
              content: r.chunk.content.substring(0, 300) + '...',
              url: r.chunk.metadata.url,
            })),
            context: result.assembledContext,
          },
        });
      } catch (error) {
        console.error('[Knowledge API] Search error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to search knowledge base',
        });
      }
    }
  );

  /**
   * POST /api/knowledge/augment-context
   * Get RAG-augmented context for agent reasoning
   */
  fastify.post<{ Body: { query: string; history?: any[]; topK?: number } }>(
    '/api/knowledge/augment-context',
    async (request, reply) => {
      try {
        const body = request.body as any;
        const query = body.query || '';
        const history = body.history || [];
        const topK = body.topK || 3;

        if (!query) {
          return reply.code(400).send({
            status: 'error',
            message: 'Query is required',
          });
        }

        const augmented = await knowledgeService.getAugmentedContext(query, history, topK);

        reply.send({
          status: 'success',
          data: {
            query,
            augmentedContext: augmented.context,
            sources: augmented.sources,
            sourceCount: augmented.sources.length,
          },
        });
      } catch (error) {
        console.error('[Knowledge API] Augment context error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to augment context',
        });
      }
    }
  );

  /**
   * GET /api/knowledge/stats
   * Get knowledge base statistics
   */
  fastify.get('/api/knowledge/stats', async (_request, reply) => {
    try {
      const stats = knowledgeService.getStats();

      reply.send({
        status: 'success',
        data: {
          ingestion: {
            totalJobs: stats.ingestion.totalJobs,
            completedJobs: stats.ingestion.completedJobs,
            failedJobs: stats.ingestion.failedJobs,
            totalChunksStored: stats.ingestion.totalChunksStored,
            averageProcessingTimeSeconds: stats.ingestion.averageProcessingTime.toFixed(2),
          },
          vectorStore: {
            totalChunks: stats.vectorStore.totalChunks,
            chunksBySource: stats.vectorStore.chunksBySource,
            chunksByTitle: stats.vectorStore.chunksByTitle,
          },
        },
      });
    } catch (error) {
      console.error('[Knowledge API] Stats error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get statistics',
      });
    }
  });

  /**
   * GET /api/knowledge/health
   * Knowledge system health check
   */
  fastify.get('/api/knowledge/health', async (_request, reply) => {
    try {
      const stats = knowledgeService.getStats();

      reply.send({
        status: 'success',
        data: {
          systemStatus: 'OPERATIONAL',
          knowledgeBase: {
            totalChunks: stats.vectorStore.totalChunks,
            sources: Object.keys(stats.vectorStore.chunksBySource),
          },
          ingestion: {
            activeJobs: stats.ingestion.totalJobs - stats.ingestion.completedJobs - stats.ingestion.failedJobs,
            completionRate: stats.ingestion.totalJobs > 0 ? ((stats.ingestion.completedJobs / stats.ingestion.totalJobs) * 100).toFixed(1) + '%' : 'N/A',
          },
          capabilities: [
            'pdf_ingestion',
            'video_transcript_extraction',
            'podcast_transcription',
            'web_article_parsing',
            'semantic_search',
            'keyword_search',
            'hybrid_search',
            'rag_context_augmentation',
          ],
        },
      });
    } catch (error) {
      console.error('[Knowledge API] Health check error:', error);
      reply.code(503).send({
        status: 'error',
        data: {
          systemStatus: 'OFFLINE',
          message: 'Knowledge system unavailable',
        },
      });
    }
  });
}

export { knowledgeService };
