/**
 * WorldMonitor API — Phase 4: Global Surveillance & Monitoring
 *
 * REST API for the WorldMonitor system that tracks global state:
 * - Aviation (active flights, events)
 * - Maritime (vessel counts, port congestion)
 * - Geopolitics (headlines, critical alerts)
 * - Commodities (prices, trends)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { worldMonitor } from '../intelligence/worldMonitor';
import logger from '../logger';

export async function registerWorldMonitorRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/monitor/state
   * Get current global state
   */
  fastify.get('/api/monitor/state', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Fetching global state');
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        data: state,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] State fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/monitor/aviation
   * Get aviation domain state
   */
  fastify.get('/api/monitor/aviation', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Fetching aviation state');
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        data: {
          domain: 'aviation',
          ...state.aviation,
          timestamp: state.timestamp
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] Aviation fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/monitor/maritime
   * Get maritime domain state
   */
  fastify.get('/api/monitor/maritime', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Fetching maritime state');
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        data: {
          domain: 'maritime',
          ...state.maritime,
          timestamp: state.timestamp
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] Maritime fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/monitor/geopolitics
   * Get geopolitics domain state
   */
  fastify.get('/api/monitor/geopolitics', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Fetching geopolitics state');
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        data: {
          domain: 'geopolitics',
          headlines: state.geopolitics.top_headlines.slice(0, 5),
          critical_alerts: state.geopolitics.critical_alerts,
          timestamp: state.timestamp
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] Geopolitics fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/monitor/commodities
   * Get commodities market state
   */
  fastify.get('/api/monitor/commodities', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Fetching commodities state');
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        data: {
          domain: 'commodities',
          ...state.commodities,
          timestamp: state.timestamp
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] Commodities fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * POST /api/monitor/start
   * Start the WorldMonitor polling
   */
  fastify.post<{ Body?: { intervalMs?: number } }>(
    '/api/monitor/start',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as { intervalMs?: number } | undefined;
        const intervalMs = body?.intervalMs || 600000; // Default 10 minutes

        logger.info(`[WorldMonitor API] Starting monitoring (interval=${intervalMs}ms)`);
        worldMonitor.start(intervalMs);

        return reply.send({
          success: true,
          message: `WorldMonitor started with ${intervalMs}ms interval`,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[WorldMonitor API] Start failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/monitor/stop
   * Stop the WorldMonitor polling
   */
  fastify.post('/api/monitor/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[WorldMonitor API] Stopping monitoring');
      worldMonitor.stop();

      return reply.send({
        success: true,
        message: 'WorldMonitor stopped',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[WorldMonitor API] Stop failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/monitor/health
   * Health check for WorldMonitor
   */
  fastify.get('/api/monitor/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = worldMonitor.getState();

      return reply.send({
        success: true,
        status: 'OPERATIONAL',
        components: {
          aviationTracking: 'ACTIVE',
          maritimeTracking: 'ACTIVE',
          geopoliticsMonitoring: 'ACTIVE',
          commoditiesTracking: 'ACTIVE'
        },
        lastUpdate: state.timestamp,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });
}
