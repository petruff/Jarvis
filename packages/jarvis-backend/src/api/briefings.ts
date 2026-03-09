/**
 * Briefings API — Phase 3.3
 *
 * REST API for briefing management:
 * - Generate on-demand briefings
 * - Retrieve briefing history
 * - Get system health and operationality score
 * - Include DNA mutations and metrics insights
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsCollector } from '../instrumentation/metricsCollector';
import { dnaTracker } from '../agents/dna-tracker';
import { mutationStore } from '../agents/mutationStore';
import { BriefingGenerator } from '../briefing/generator';

// In-memory briefing storage (can be persisted to DB later)
const briefingHistory: any[] = [];

export async function registerBriefingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/briefings/health
   * Returns comprehensive system health status and operationality score
   */
  fastify.get<{ Params: {} }>(
    '/api/briefings/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metricsSnapshot = metricsCollector.getSnapshot();
        const healthStatus = metricsCollector.getHealthStatus();
        const dnaSummary = dnaTracker.getSummary();

        // Calculate operationality score
        let score = 50;
        if (healthStatus.oodaCycleOk) score += 20;
        else score -= 5;
        if (healthStatus.memoryOk) score += 15;
        else score -= 10;
        if (healthStatus.reActSuccessRateOk) score += 20;
        else score -= 15;
        if (healthStatus.squadRoutingOk) score += 15;
        else score -= 10;
        if (healthStatus.qualityGateOk) score += 15;
        else score -= 10;
        if (healthStatus.redisStreamOk) score += 5;
        else score -= 5;
        if (dnaSummary.averageQuality >= 85) score += 5;
        else if (dnaSummary.averageQuality >= 75) score += 3;

        const operationalityScore = Math.min(100, Math.max(0, score));

        return reply.send({
          success: true,
          timestamp: new Date().toISOString(),
          operationalityScore: operationalityScore.toFixed(1),
          targetScore: '95.0',
          healthStatus: {
            oodaCycle: healthStatus.oodaCycleOk,
            memorySystems: healthStatus.memoryOk,
            reActSuccessRate: healthStatus.reActSuccessRateOk,
            squadRouting: healthStatus.squadRoutingOk,
            qualityGates: healthStatus.qualityGateOk,
            redisStreams: healthStatus.redisStreamOk
          },
          metrics: {
            autonomy: metricsSnapshot.metrics.autonomy,
            agent: metricsSnapshot.metrics.agent,
            squad: metricsSnapshot.metrics.squad,
            quality: metricsSnapshot.metrics.quality
          },
          dna: {
            agentsTracked: dnaSummary.totalAgentsTracked,
            variantsTracked: dnaSummary.totalVariantsTracked,
            averageQuality: dnaSummary.averageQuality.toFixed(1),
            agentsNeedingMutation: dnaSummary.agentsNeedingMutation
          },
          mutations: {
            pending: mutationStore.getPendingMutations().length,
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
   * GET /api/briefings/current
   * Returns the latest briefing
   */
  fastify.get<{ Params: {} }>(
    '/api/briefings/current',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (briefingHistory.length === 0) {
          return reply.status(404).send({
            success: false,
            message: 'No briefings generated yet'
          });
        }

        const latest = briefingHistory[briefingHistory.length - 1];
        return reply.send({
          success: true,
          briefing: latest
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
   * GET /api/briefings/history?limit=10
   * Returns briefing history
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/briefings/history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const limit = Math.min(parseInt((request.query as any).limit || '10'), 100);
        const history = briefingHistory.slice(-limit).reverse();

        return reply.send({
          success: true,
          count: history.length,
          briefings: history
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
   * POST /api/briefings/generate
   * Generates a briefing immediately (on-demand)
   */
  fastify.post<{ Params: {} }>(
    '/api/briefings/generate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metricsSnapshot = metricsCollector.getSnapshot();
        const healthStatus = metricsCollector.getHealthStatus();
        const dnaSummary = dnaTracker.getSummary();
        const pendingMutations = mutationStore.getPendingMutations();

        // Calculate operationality score
        let score = 50;
        if (healthStatus.oodaCycleOk) score += 20;
        else score -= 5;
        if (healthStatus.memoryOk) score += 15;
        else score -= 10;
        if (healthStatus.reActSuccessRateOk) score += 20;
        else score -= 15;
        if (healthStatus.squadRoutingOk) score += 15;
        else score -= 10;
        if (healthStatus.qualityGateOk) score += 15;
        else score -= 10;
        if (healthStatus.redisStreamOk) score += 5;
        else score -= 5;
        if (dnaSummary.averageQuality >= 85) score += 5;
        else if (dnaSummary.averageQuality >= 75) score += 3;

        const operationalityScore = Math.min(100, Math.max(0, score));

        const briefing = {
          id: `briefing-${Date.now()}`,
          timestamp: new Date().toISOString(),
          operationalityScore: operationalityScore.toFixed(1),
          sections: [
            {
              title: '⚡ Executive Summary',
              content: `System Operationality: **${operationalityScore.toFixed(1)}/100** (Target: 95.0)\n\nHealth Status: ${[
                healthStatus.oodaCycleOk && '✓ OODA',
                healthStatus.memoryOk && '✓ Memory',
                healthStatus.reActSuccessRateOk && '✓ ReAct',
                healthStatus.squadRoutingOk && '✓ Routing',
                healthStatus.qualityGateOk && '✓ Quality'
              ].filter(Boolean).join(' | ')}\n\nDNA Evolution: **${dnaSummary.averageQuality.toFixed(1)}/100** avg quality across ${dnaSummary.totalVariantsTracked} variants`
            },
            {
              title: '🧬 DNA Mutations',
              content: `${pendingMutations.length} mutations pending approval\n\nAgents needing improvement: ${dnaSummary.agentsNeedingMutation.join(', ') || 'None'}`
            },
            {
              title: '📊 Operational Metrics',
              content: `- Avg ReAct Success: ${(metricsSnapshot.metrics.agent.reActSuccessRate || 0).toFixed(1)}%\n- Routing Accuracy: ${(metricsSnapshot.metrics.squad.routingAccuracy || 0).toFixed(1)}%\n- Quality Pass Rate: ${(metricsSnapshot.metrics.quality.passRate || 0).toFixed(1)}%\n- Avg Quality Score: ${(metricsSnapshot.metrics.quality.averageScore || 0).toFixed(1)}/100`
            }
          ],
          health: healthStatus,
          metrics: metricsSnapshot.metrics,
          dna: dnaSummary,
          mutations: {
            pending: pendingMutations.length,
            allTime: mutationStore.getAllMutations().length
          }
        };

        briefingHistory.push(briefing);

        return reply.send({
          success: true,
          briefing
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
   * GET /api/briefings/operationality
   * Returns just the operationality score with detailed breakdown
   */
  fastify.get<{ Params: {} }>(
    '/api/briefings/operationality',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const healthStatus = metricsCollector.getHealthStatus();
        const dnaSummary = dnaTracker.getSummary();

        const components = {
          oodaCycle: { value: healthStatus.oodaCycleOk ? 20 : -5, weight: 0.20 },
          memory: { value: healthStatus.memoryOk ? 15 : -10, weight: 0.15 },
          reAct: { value: healthStatus.reActSuccessRateOk ? 20 : -15, weight: 0.20 },
          routing: { value: healthStatus.squadRoutingOk ? 15 : -10, weight: 0.15 },
          quality: { value: healthStatus.qualityGateOk ? 15 : -10, weight: 0.15 },
          redis: { value: healthStatus.redisStreamOk ? 5 : -5, weight: 0.05 },
          dna: { value: dnaSummary.averageQuality >= 85 ? 5 : (dnaSummary.averageQuality >= 75 ? 3 : 0), weight: 0.05 }
        };

        let totalScore = 50;
        for (const [key, component] of Object.entries(components)) {
          totalScore += component.value;
        }
        const score = Math.min(100, Math.max(0, totalScore));

        return reply.send({
          success: true,
          operationalityScore: score.toFixed(1),
          targetScore: '95.0',
          gapToTarget: (95 - score).toFixed(1),
          components,
          breakdown: {
            totalScore: score,
            baseScore: 50,
            adjustments: totalScore - 50
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
}
