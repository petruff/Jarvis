/**
 * Mind Clones API Endpoints — Phase 4 Implementation
 *
 * Routes for:
 * - Clone creation and management
 * - Expert insight retrieval
 * - Consensus reasoning
 * - Clone statistics
 */

import { FastifyInstance } from 'fastify';
import MindCloneService from '../mindclones/mindCloneService';

const mindCloneService = new MindCloneService();

export async function registerMindCloneRoutes(fastify: FastifyInstance) {
  // ========== PHASE 4: Mind Clones ==========

  /**
   * POST /api/mindclones/create
   * Create a new mind clone from expert knowledge
   */
  fastify.post('/api/mindclones/create', async (request, reply) => {
    try {
      const body = request.body as any;
      const expertName = body.expertName || '';
      const domain = body.domain || '';
      const sourceDocuments = body.sourceDocuments || [];

      if (!expertName || !domain) {
        return reply.code(400).send({
          status: 'error',
          message: 'expertName and domain are required',
        });
      }

      const clone = await mindCloneService.createMindClone(expertName, domain, sourceDocuments);

      reply.send({
        status: 'success',
        data: {
          cloneId: clone.id,
          expertName: clone.dna.expertName,
          domain: clone.dna.domain,
          expertiseLevel: clone.dna.expertise_level,
          patterns: clone.dna.mentalModels.length,
          rules: clone.dna.decisionRules.length,
          message: `Mind clone created: ${clone.cloneId}`,
        },
      });
    } catch (error) {
      console.error('[MindClones API] Clone creation error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to create mind clone',
      });
    }
  });

  /**
   * GET /api/mindclones/:cloneId
   * Get clone details
   */
  fastify.get<{ Params: { cloneId: string } }>('/api/mindclones/:cloneId', async (request, reply) => {
    try {
      const { cloneId } = request.params;
      const clone = mindCloneService.getClone(cloneId);

      if (!clone) {
        return reply.code(404).send({
          status: 'error',
          message: `Clone not found: ${cloneId}`,
        });
      }

      reply.send({
        status: 'success',
        data: {
          cloneId: clone.id,
          expertName: clone.dna.expertName,
          domain: clone.dna.domain,
          expertiseLevel: clone.dna.expertise_level,
          mentalModels: clone.dna.mentalModels.length,
          decisionRules: clone.dna.decisionRules.length,
          knowledge: clone.dna.knowledgeBase.length,
          coreBeliefs: clone.dna.coreBeliefs,
          communicationStyle: clone.dna.communicationStyle,
          activationCount: clone.activationCount,
          successRate: (clone.successRate * 100).toFixed(1) + '%',
          createdAt: new Date(clone.createdAt).toISOString(),
        },
      });
    } catch (error) {
      console.error('[MindClones API] Get clone error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get clone',
      });
    }
  });

  /**
   * GET /api/mindclones
   * List all clones
   */
  fastify.get<{ Querystring: { domain?: string } }>('/api/mindclones', async (request, reply) => {
    try {
      const { domain } = request.query;
      const clones = mindCloneService.listClones(domain as string | undefined);

      reply.send({
        status: 'success',
        data: {
          totalClones: clones.length,
          clones: clones.map((c) => ({
            cloneId: c.id,
            expertName: c.dna.expertName,
            domain: c.dna.domain,
            expertiseLevel: c.dna.expertise_level,
            activationCount: c.activationCount,
            successRate: (c.successRate * 100).toFixed(1) + '%',
          })),
        },
      });
    } catch (error) {
      console.error('[MindClones API] List clones error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to list clones',
      });
    }
  });

  /**
   * POST /api/mindclones/:cloneId/insight
   * Get expert insight from a clone
   */
  fastify.post<{ Params: { cloneId: string }; Body: { query: string } }>(
    '/api/mindclones/:cloneId/insight',
    async (request, reply) => {
      try {
        const { cloneId } = request.params;
        const body = request.body as any;
        const query = body.query || '';

        if (!query) {
          return reply.code(400).send({
            status: 'error',
            message: 'Query is required',
          });
        }

        const insight = await mindCloneService.getExpertInsight(cloneId, query);

        if (!insight) {
          return reply.code(404).send({
            status: 'error',
            message: `Clone not found or insight generation failed: ${cloneId}`,
          });
        }

        reply.send({
          status: 'success',
          data: {
            expertName: insight.expertName,
            domain: insight.domain,
            query: insight.claim,
            reasoning: insight.reasoning,
            confidence: (insight.confidence * 100).toFixed(1) + '%',
            relevantRules: insight.relevantRules.length,
            supportingEvidence: insight.supportingEvidence.length,
            uncertainties: insight.uncertainties.slice(0, 3),
          },
        });
      } catch (error) {
        console.error('[MindClones API] Expert insight error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to get expert insight',
        });
      }
    }
  );

  /**
   * POST /api/mindclones/consensus
   * Get consensus decision from multiple clones
   */
  fastify.post<{ Body: { query: string; cloneIds: string[]; conflictResolution?: string } }>(
    '/api/mindclones/consensus',
    async (request, reply) => {
      try {
        const body = request.body as any;
        const query = body.query || '';
        const cloneIds = body.cloneIds || [];
        const conflictResolution = body.conflictResolution || 'weighted';

        if (!query || cloneIds.length === 0) {
          return reply.code(400).send({
            status: 'error',
            message: 'Query and cloneIds are required',
          });
        }

        const consensus = await mindCloneService.getConsensusDecision(
          query,
          cloneIds,
          conflictResolution as any
        );

        if (!consensus) {
          return reply.code(500).send({
            status: 'error',
            message: 'Failed to generate consensus decision',
          });
        }

        reply.send({
          status: 'success',
          data: {
            query: consensus.query,
            decision: consensus.decision,
            reasoning: consensus.reasoning,
            confidence: (consensus.confidence * 100).toFixed(1) + '%',
            expertsConsulted: consensus.profile.cloneIds.length,
            conflictResolution: consensus.profile.conflictResolution,
            evidenceItems: consensus.evidence.length,
          },
        });
      } catch (error) {
        console.error('[MindClones API] Consensus error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to get consensus decision',
        });
      }
    }
  );

  /**
   * GET /api/mindclones/stats
   * Get mind clone statistics
   */
  fastify.get('/api/mindclones/stats', async (_request, reply) => {
    try {
      const stats = mindCloneService.getStats();

      reply.send({
        status: 'success',
        data: {
          totalClones: stats.totalClones,
          clonesByDomain: stats.clonesByDomain,
          totalActivations: stats.totalActivations,
          averageSuccessRate: (stats.averageSuccessRate * 100).toFixed(1) + '%',
        },
      });
    } catch (error) {
      console.error('[MindClones API] Stats error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get statistics',
      });
    }
  });

  /**
   * GET /api/mindclones/health
   * Mind clone system health check
   */
  fastify.get('/api/mindclones/health', async (_request, reply) => {
    try {
      const stats = mindCloneService.getStats();

      reply.send({
        status: 'success',
        data: {
          systemStatus: 'OPERATIONAL',
          totalClones: stats.totalClones,
          domains: Object.keys(stats.clonesByDomain),
          capabilities: [
            'expert_extraction',
            'expert_insight',
            'consensus_reasoning',
            'evidence_linking',
            'multi_domain_synthesis',
          ],
        },
      });
    } catch (error) {
      console.error('[MindClones API] Health check error:', error);
      reply.code(503).send({
        status: 'error',
        data: {
          systemStatus: 'OFFLINE',
          message: 'Mind clone system unavailable',
        },
      });
    }
  });

  /**
   * DELETE /api/mindclones/:cloneId
   * Delete a mind clone
   */
  fastify.delete<{ Params: { cloneId: string } }>('/api/mindclones/:cloneId', async (request, reply) => {
    try {
      const { cloneId } = request.params;
      const success = mindCloneService.deleteClone(cloneId);

      if (!success) {
        return reply.code(404).send({
          status: 'error',
          message: `Clone not found: ${cloneId}`,
        });
      }

      reply.send({
        status: 'success',
        message: `Clone deleted: ${cloneId}`,
      });
    } catch (error) {
      console.error('[MindClones API] Delete error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to delete clone',
      });
    }
  });
}

export { mindCloneService };
