/**
 * Mind Clones Distributed API Endpoints — Phase 5 Implementation
 *
 * Routes for:
 * - Clone registry management (create, update, version)
 * - Distributed consensus (load-balanced, multi-clone)
 * - Performance metrics and optimization
 * - Clone health and monitoring
 */

import { FastifyInstance } from 'fastify';
import { MindCloneService } from '../mindclones/mindCloneService';
import { CloneRegistry } from '../mindclones/cloneRegistry';
import { ConsensusCoordinator } from '../mindclones/consensusCoordinator';
import { PerformanceOptimizer } from '../mindclones/performanceOptimizer';
import { Pool } from 'pg';
import { RedisClient } from '../mindclones/types';

export async function registerMindClonesDistributedRoutes(
  fastify: FastifyInstance,
  mindCloneService: MindCloneService,
  db: Pool,
  cache: RedisClient
) {
  const registry = new CloneRegistry(db, cache);
  const coordinator = new ConsensusCoordinator(mindCloneService, cache, db);
  const optimizer = new PerformanceOptimizer(cache);

  // Initialize registry schema
  await registry.initialize();

  // ========== PHASE 5: Distributed Execution & Scaling ==========

  /**
   * POST /api/mindclones/distributed/consensus
   * Execute consensus with load-balanced clone selection
   */
  fastify.post<{ Body: { query: string; domain?: string; minClones?: number; maxClones?: number } }>(
    '/api/mindclones/distributed/consensus',
    async (request, reply) => {
      try {
        const { query, domain, minClones = 3, maxClones = 10 } = request.body;

        if (!query) {
          return reply.code(400).send({
            status: 'error',
            message: 'Query is required',
          });
        }

        const consensus = await coordinator.getDistributedConsensus({
          query,
          domain,
          minClones,
          maxClones,
          timeoutMs: 5000,
          conflictResolution: 'weighted',
        });

        if (!consensus) {
          return reply.code(500).send({
            status: 'error',
            message: 'Failed to generate distributed consensus',
          });
        }

        reply.send({
          status: 'success',
          data: {
            id: consensus.id,
            query: consensus.query,
            decision: consensus.decision,
            reasoning: consensus.reasoning,
            confidence: (consensus.confidence * 100).toFixed(1) + '%',
            expertsConsulted: consensus.profile.cloneIds.length,
            conflictResolution: consensus.profile.conflictResolution,
            evidenceItems: consensus.evidence.length,
            timestamp: consensus.timestamp,
          },
        });
      } catch (error) {
        console.error('[MindClones Distributed API] Consensus error:', error);
        reply.code(500).send({
          status: 'error',
          message: `Failed to get distributed consensus: ${error instanceof Error ? error.message : 'Unknown'}`,
        });
      }
    }
  );

  /**
   * POST /api/mindclones/distributed/register
   * Register a new clone in distributed registry
   */
  fastify.post<{ Body: { cloneId: string; expertName: string; domain: string } }>(
    '/api/mindclones/distributed/register',
    async (request, reply) => {
      try {
        const { cloneId, expertName, domain } = request.body;

        if (!cloneId || !expertName || !domain) {
          return reply.code(400).send({
            status: 'error',
            message: 'cloneId, expertName, and domain are required',
          });
        }

        const clone = mindCloneService.getClone(cloneId);
        if (!clone) {
          return reply.code(404).send({
            status: 'error',
            message: `Clone not found: ${cloneId}`,
          });
        }

        await registry.createClone(clone, clone.dna);

        reply.send({
          status: 'success',
          data: {
            cloneId,
            expertName,
            domain,
            registered: true,
            message: 'Clone registered in distributed registry',
          },
        });
      } catch (error) {
        console.error('[MindClones Distributed API] Registration error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to register clone',
        });
      }
    }
  );

  /**
   * GET /api/mindclones/distributed/registry
   * Get clone registry statistics and health
   */
  fastify.get('/api/mindclones/distributed/registry', async (_request, reply) => {
    try {
      const stats = await registry.getStats();
      const coordinatorHealth = await coordinator.getHealth();

      reply.send({
        status: 'success',
        data: {
          registry: stats,
          coordinator: coordinatorHealth,
          metrics: optimizer.getStats(),
        },
      });
    } catch (error) {
      console.error('[MindClones Distributed API] Registry stats error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get registry statistics',
      });
    }
  });

  /**
   * GET /api/mindclones/distributed/performance
   * Get performance metrics and optimization stats
   */
  fastify.get('/api/mindclones/distributed/performance', async (_request, reply) => {
    try {
      const stats = optimizer.getStats();
      const loadMetrics = optimizer.getLoadMetrics();

      reply.send({
        status: 'success',
        data: {
          caching: {
            hitRate: stats.hitRate.toFixed(2) + '%',
            cacheHits: stats.cacheHits,
            cacheMisses: stats.cacheMisses,
          },
          performance: {
            avgQueryTime: stats.avgQueryTime.toFixed(0) + 'ms',
            batchProcessed: stats.batchProcessed,
            deduplicatedRequests: stats.deduplicatedRequests,
          },
          loadMetrics: loadMetrics.map((m) => ({
            cloneId: m.cloneId,
            responseTime: m.responseTime.toFixed(0) + 'ms',
            successRate: (m.successRate * 100).toFixed(1) + '%',
            lastUsed: new Date(m.lastUsed).toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error('[MindClones Distributed API] Performance stats error:', error);
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get performance metrics',
      });
    }
  });

  /**
   * GET /api/mindclones/distributed/versions/:cloneId
   * Get version history for a clone
   */
  fastify.get<{ Params: { cloneId: string } }>(
    '/api/mindclones/distributed/versions/:cloneId',
    async (request, reply) => {
      try {
        const { cloneId } = request.params;
        const versions = await registry.getVersionHistory(cloneId);

        reply.send({
          status: 'success',
          data: {
            cloneId,
            versionCount: versions.length,
            versions: versions.map((v) => ({
              version: v.version,
              reason: v.reason,
              timestamp: new Date(v.timestamp).toISOString(),
              metrics: v.metrics,
            })),
          },
        });
      } catch (error) {
        console.error('[MindClones Distributed API] Version history error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to get version history',
        });
      }
    }
  );

  /**
   * POST /api/mindclones/distributed/rollback/:cloneId/:version
   * Rollback clone to previous version
   */
  fastify.post<{ Params: { cloneId: string; version: string } }>(
    '/api/mindclones/distributed/rollback/:cloneId/:version',
    async (request, reply) => {
      try {
        const { cloneId, version: versionStr } = request.params;
        const version = parseInt(versionStr);

        if (isNaN(version)) {
          return reply.code(400).send({
            status: 'error',
            message: 'Invalid version number',
          });
        }

        const dna = await registry.rollbackToVersion(cloneId, version);

        // Invalidate cache for this clone
        const clone = mindCloneService.getClone(cloneId);
        if (clone) {
          clone.dna = dna;
          clone.updatedAt = Date.now();
        }

        reply.send({
          status: 'success',
          data: {
            cloneId,
            rolledBackToVersion: version,
            message: `Clone rolled back to version ${version}`,
          },
        });
      } catch (error) {
        console.error('[MindClones Distributed API] Rollback error:', error);
        reply.code(500).send({
          status: 'error',
          message: `Failed to rollback clone: ${error instanceof Error ? error.message : 'Unknown'}`,
        });
      }
    }
  );

  /**
   * POST /api/mindclones/distributed/archive/:cloneId
   * Archive a clone (preserve but don't use)
   */
  fastify.post<{ Body: { reason?: string }; Params: { cloneId: string } }>(
    '/api/mindclones/distributed/archive/:cloneId',
    async (request, reply) => {
      try {
        const { cloneId } = request.params;
        const { reason = 'User requested archival' } = request.body || {};

        await registry.archiveClone(cloneId, reason);

        reply.send({
          status: 'success',
          data: {
            cloneId,
            archived: true,
            reason,
            message: 'Clone archived successfully',
          },
        });
      } catch (error) {
        console.error('[MindClones Distributed API] Archive error:', error);
        reply.code(500).send({
          status: 'error',
          message: 'Failed to archive clone',
        });
      }
    }
  );

  /**
   * GET /api/mindclones/distributed/health
   * Distributed system health check
   */
  fastify.get('/api/mindclones/distributed/health', async (_request, reply) => {
    try {
      const stats = await registry.getStats();
      const coordinatorHealth = await coordinator.getHealth();
      const performanceStats = optimizer.getStats();

      const systemHealthy = coordinatorHealth.healthy > 0 && performanceStats.hitRate > 20;

      reply.send({
        status: 'success',
        data: {
          systemStatus: systemHealthy ? 'HEALTHY' : 'DEGRADED',
          timestamp: new Date().toISOString(),
          registry: {
            totalClones: stats.totalClones,
            activeClones: stats.activeClones,
            averageSuccessRate: (stats.averageSuccessRate * 100).toFixed(1) + '%',
          },
          coordinator: {
            healthyClones: coordinatorHealth.healthy,
            unhealthyClones: coordinatorHealth.unhealthy,
            circuitBreakersOpen: coordinatorHealth.circuitBreakerOpen,
            avgResponseTime: coordinatorHealth.avgResponseTime.toFixed(0) + 'ms',
          },
          performance: {
            cacheHitRate: performanceStats.hitRate.toFixed(1) + '%',
            avgQueryTime: performanceStats.avgQueryTime.toFixed(0) + 'ms',
          },
          capabilities: [
            'distributed_consensus',
            'clone_versioning',
            'performance_optimization',
            'circuit_breaking',
            'load_balancing',
            'intelligent_caching',
          ],
        },
      });
    } catch (error) {
      console.error('[MindClones Distributed API] Health check error:', error);
      reply.code(503).send({
        status: 'error',
        data: {
          systemStatus: 'OFFLINE',
          message: 'Distributed system unavailable',
        },
      });
    }
  });
}
