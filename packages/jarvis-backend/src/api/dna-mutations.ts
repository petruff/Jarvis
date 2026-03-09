/**
 * DNA Mutations API — Phase 3.3
 *
 * REST API for managing DNA mutations:
 * - View pending mutations with analysis
 * - Approve/reject mutations
 * - View mutation history and impact
 * - Generate mutation candidates from DNA performance data
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mutationStore } from '../agents/mutationStore';
import { dnaTracker } from '../agents/dna-tracker';
import { agentRegistry } from '../agents/registry';

export async function registerDNAMutationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/dna/mutations/pending
   * Returns all pending mutations awaiting founder approval
   */
  fastify.get<{ Params: {} }>(
    '/api/dna/mutations/pending',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const pending = mutationStore.getPendingMutations();
        const enriched = pending.map(m => {
          const agent = agentRegistry.getAgent(m.agentId);
          return {
            ...m,
            agentName: agent?.name || m.agentId,
            currentDNA: agent?.dna || '(not found)',
            squadId: agent?.squadId || 'unknown'
          };
        });

        return reply.send({
          success: true,
          count: enriched.length,
          mutations: enriched
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dna/mutations/history
   * Returns all mutations (pending, approved, rejected) with their history
   */
  fastify.get<{ Params: {} }>(
    '/api/dna/mutations/history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const all = mutationStore.getAllMutations();
        const grouped = {
          pending: all.filter(m => m.status === 'pending'),
          approved: all.filter(m => m.status === 'approved'),
          rejected: all.filter(m => m.status === 'rejected')
        };

        return reply.send({
          success: true,
          summary: {
            pending: grouped.pending.length,
            approved: grouped.approved.length,
            rejected: grouped.rejected.length
          },
          mutations: grouped
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dna/mutations/:id
   * Returns details for a specific mutation
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/dna/mutations/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const mutation = mutationStore.getMutationById(params.id);
        if (!mutation) {
          return reply.status(404).send({
            success: false,
            error: `Mutation ${params.id} not found`
          });
        }

        const agent = agentRegistry.getAgent(mutation.agentId);
        const variantHistory = dnaTracker.getVariantHistory(mutation.agentId || '');

        return reply.send({
          success: true,
          mutation: {
            ...mutation,
            agentName: agent?.name || mutation.agentId,
            agentSquad: agent?.squadId || 'unknown'
          },
          variantHistory
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dna/mutations/:id/approve
   * Approve and apply a pending mutation
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/dna/mutations/:id/approve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const mutation = mutationStore.getMutationById(params.id);
        if (!mutation) {
          return reply.status(404).send({
            success: false,
            error: `Mutation ${params.id} not found`
          });
        }

        if (mutation.status !== 'pending') {
          return reply.status(400).send({
            success: false,
            error: `Mutation is already ${mutation.status}, cannot approve`
          });
        }

        const result = mutationStore.applyMutation(params.id);

        if (result.success) {
          // Record in DNA tracker that a mutation was applied
          dnaTracker.recordMutationApplied(
            mutation.agentId || '',
            mutation.currentValue,
            mutation.proposedChange,
            mutation.reason
          );

          return reply.send({
            success: true,
            message: result.message,
            mutationId: params.id,
            appliedAt: new Date().toISOString()
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: result.message
          });
        }
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dna/mutations/:id/reject
   * Reject a pending mutation
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/dna/mutations/:id/reject',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const result = mutationStore.rejectMutation(params.id);

        if (result.success) {
          return reply.send({
            success: true,
            message: result.message,
            rejectedAt: new Date().toISOString()
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: result.message
          });
        }
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dna/mutations/approve-all
   * Approve all pending mutations at once (founder bulk action)
   */
  fastify.post<{ Params: {} }>(
    '/api/dna/mutations/approve-all',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = mutationStore.applyAllPending();

        return reply.send({
          success: true,
          applied: result.applied,
          failed: result.failed,
          errors: result.errors,
          appliedAt: new Date().toISOString()
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dna/analysis/:agentId
   * Returns DNA performance analysis for an agent
   */
  fastify.get<{ Params: { agentId: string } }>(
    '/api/dna/analysis/:agentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { agentId: string };
        const analysis = dnaTracker.analyzeAgentDNA(params.agentId);
        const candidates = dnaTracker.generateMutationCandidates(params.agentId);
        const history = dnaTracker.getVariantHistory(params.agentId);

        const agent = agentRegistry.getAgent(params.agentId);

        return reply.send({
          success: true,
          agent: {
            id: params.agentId,
            name: agent?.name || params.agentId,
            squad: agent?.squadId || 'unknown'
          },
          analysis: {
            bestVariant: analysis.bestVariant,
            performanceSpread: analysis.performanceSpread,
            recommendMutation: analysis.recommendMutation,
            allVariants: analysis.allVariants
          },
          mutationCandidates: candidates,
          variantHistory: history
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dna/summary
   * Returns summary of DNA tracking across all agents
   */
  fastify.get<{ Params: {} }>(
    '/api/dna/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const summary = dnaTracker.getSummary();
        const pendingMutations = mutationStore.getPendingMutations();

        const agentAnalyses = summary.agentsNeedingMutation.map(agentId => {
          const analysis = dnaTracker.analyzeAgentDNA(agentId);
          const agent = agentRegistry.getAgent(agentId);
          return {
            agentId,
            agentName: agent?.name || agentId,
            squad: agent?.squadId || 'unknown',
            bestQuality: analysis.bestVariant?.averageQuality || 0,
            performanceSpread: analysis.performanceSpread,
            mutationCandidates: dnaTracker.generateMutationCandidates(agentId).length
          };
        });

        return reply.send({
          success: true,
          dnaTracking: {
            totalAgentsTracked: summary.totalAgentsTracked,
            totalVariantsTracked: summary.totalVariantsTracked,
            averageQuality: summary.averageQuality.toFixed(1),
            agentsNeedingMutation: agentAnalyses
          },
          mutations: {
            pending: pendingMutations.length,
            allTime: mutationStore.getAllMutations().length
          }
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dna/mutations-summary
   * Human-readable pending mutations summary for morning briefing
   */
  fastify.get<{ Params: {} }>(
    '/api/dna/mutations-summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const summary = mutationStore.getPendingSummary();

        return reply.send({
          success: true,
          summary
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );
}
