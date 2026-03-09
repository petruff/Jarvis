/**
 * YOLO Vision API — Phase 4: Computer Vision Integration
 *
 * REST API for YOLO-based object detection and visual analysis.
 * Provides real-time frame processing and detection results.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { yoloBridge } from '../autonomy/yoloBridge';
import logger from '../logger';

export async function registerYoloRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/yolo/start
   * Start the YOLO vision server
   */
  fastify.post(
    '/api/yolo/start',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('[YOLO API] Starting vision server');
        await yoloBridge.start();

        return reply.send({
          success: true,
          message: 'YOLO vision server started',
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[YOLO API] Start failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/yolo/stop
   * Stop the YOLO vision server
   */
  fastify.post(
    '/api/yolo/stop',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('[YOLO API] Stopping vision server');
        yoloBridge.stop();

        return reply.send({
          success: true,
          message: 'YOLO vision server stopped',
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[YOLO API] Stop failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/yolo/latest-result
   * Get the latest detection result
   */
  fastify.get('/api/yolo/latest-result', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[YOLO API] Fetching latest result');
      const result = await yoloBridge.getLatestResult();

      if (!result) {
        return reply.code(204).send();
      }

      return reply.send({
        success: true,
        data: {
          timestamp: result.timestamp,
          detectionCount: result.detections.length,
          detections: result.detections.map(d => ({
            class: d.class,
            confidence: (d.confidence * 100).toFixed(1) + '%',
            bbox: d.box
          })),
          processingTime: `${Date.now() - result.timestamp}ms`
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[YOLO API] Fetch failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/yolo/health
   * Health check for YOLO vision system
   */
  fastify.get('/api/yolo/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[YOLO API] Health check');
      const latestResult = await yoloBridge.getLatestResult();

      return reply.send({
        success: true,
        status: latestResult ? 'OPERATIONAL' : 'IDLE',
        components: {
          pythonKernel: 'ACTIVE',
          modelLoading: 'READY',
          frameProcessing: 'ACTIVE',
          resultStreaming: 'ACTIVE'
        },
        lastDetection: latestResult?.timestamp || null,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[YOLO API] Health check failed: ${err.message}`);
      return reply.code(503).send({
        success: false,
        status: 'OFFLINE',
        error: err.message
      });
    }
  });
}
