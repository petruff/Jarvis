/**
 * Cost Tracking API — Phase 3.4
 *
 * REST API for cost tracking and optimization:
 * - View cost breakdowns
 * - Get optimization recommendations
 * - Track daily/monthly costs
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { costTracker } from '../cost/tracker';

export async function registerCostTrackingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/costs/breakdown?hours=24
   * Returns cost breakdown by category
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/costs/breakdown',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const hours = Math.min(parseInt((request.query as any).hours || '24'), 720);
        const breakdown = costTracker.getCostBreakdown(hours);
        const detailed = costTracker.getDetailedBreakdown(hours);

        return reply.send({
          success: true,
          breakdown,
          detailed,
          timeframe: `${hours}h`
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
   * GET /api/costs/stats?hours=24
   * Returns cost statistics and projections
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/costs/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const hours = Math.min(parseInt((request.query as any).hours || '24'), 720);
        const stats = costTracker.getStats(hours);

        return reply.send({
          success: true,
          stats,
          projections: {
            daily: stats.estimatedDailyCost.toFixed(2),
            weekly: (stats.estimatedDailyCost * 7).toFixed(2),
            monthly: stats.estimatedMonthlyCost.toFixed(2),
            yearly: (stats.estimatedMonthlyCost * 12).toFixed(2)
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
   * GET /api/costs/recommendations
   * Returns optimization recommendations based on cost analysis
   */
  fastify.get<{ Params: {} }>(
    '/api/costs/recommendations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const recommendations = costTracker.generateRecommendations();
        const stats = costTracker.getStats(24);

        const potentialSavings = recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0);

        return reply.send({
          success: true,
          count: recommendations.length,
          recommendations,
          analysis: {
            currentDailyCost: stats.estimatedDailyCost.toFixed(2),
            potentialDailySavings: potentialSavings.toFixed(2),
            potentialMonthlySavings: (potentialSavings * 30).toFixed(2),
            savingsPercentage: ((potentialSavings / stats.estimatedDailyCost) * 100).toFixed(1)
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
   * POST /api/costs/record
   * Record a cost event (internal use by other systems)
   */
  fastify.post<{ Body: { category: string; operation: string; costUSD: number; metadata?: any } }>(
    '/api/costs/record',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { category, operation, costUSD, metadata } = request.body as any;

        if (!category || !operation || costUSD === undefined) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: category, operation, costUSD'
          });
        }

        costTracker.recordCost(
          category as any,
          operation,
          costUSD,
          metadata
        );

        return reply.send({
          success: true,
          recorded: {
            category,
            operation,
            costUSD,
            timestamp: new Date().toISOString()
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
   * GET /api/costs/summary
   * Returns executive cost summary
   */
  fastify.get<{ Params: {} }>(
    '/api/costs/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats24h = costTracker.getStats(24);
        const stats7d = costTracker.getStats(168);
        const stats30d = costTracker.getStats(720);
        const recommendations = costTracker.generateRecommendations();

        return reply.send({
          success: true,
          summary: {
            period24h: {
              cost: stats24h.estimatedDailyCost.toFixed(2),
              topCategories: stats24h.topCategories.slice(0, 3)
            },
            period7d: {
              cost: (stats7d.estimatedDailyCost * 7).toFixed(2),
              trendPerDay: stats7d.estimatedDailyCost.toFixed(2)
            },
            period30d: {
              cost: stats30d.estimatedMonthlyCost.toFixed(2),
              trendPerDay: stats30d.estimatedDailyCost.toFixed(2)
            },
            optimization: {
              recommendationsCount: recommendations.length,
              highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
              potentialSavings: (recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0) * 30).toFixed(2)
            }
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
