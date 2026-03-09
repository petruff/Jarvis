/**
 * DomCortex API — Phase 4: Browser Automation & DOM Interaction
 *
 * REST API for the DomCortex "Ghost Hand" browser automation system.
 * Allows JARVIS to navigate, interact, and screenshot web environments.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { domCortex } from '../autonomy/domCortex';
import logger from '../logger';

export async function registerDomCortexRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/dom-cortex/initialize
   * Initialize the browser
   */
  fastify.post(
    '/api/dom-cortex/initialize',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('[DomCortex API] Initializing browser');
        await domCortex.initialize();

        return reply.send({
          success: true,
          message: 'Browser initialized',
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[DomCortex API] Init failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dom-cortex/navigate
   * Navigate to a URL
   */
  fastify.post<{ Body: { url: string } }>(
    '/api/dom-cortex/navigate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { url } = request.body as { url: string };

        if (!url) {
          return reply.code(400).send({
            success: false,
            error: 'URL is required'
          });
        }

        logger.info(`[DomCortex API] Navigating to: ${url}`);
        const result = await domCortex.navigate(url);

        return reply.send({
          success: true,
          message: result,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[DomCortex API] Navigation failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dom-cortex/click
   * Click an element
   */
  fastify.post<{ Body: { selector: string } }>(
    '/api/dom-cortex/click',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { selector } = request.body as { selector: string };

        if (!selector) {
          return reply.code(400).send({
            success: false,
            error: 'Selector is required'
          });
        }

        logger.info(`[DomCortex API] Clicking: ${selector}`);
        const result = await domCortex.click(selector);

        return reply.send({
          success: true,
          message: result,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[DomCortex API] Click failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/dom-cortex/type
   * Type text into an element
   */
  fastify.post<{ Body: { selector: string; text: string } }>(
    '/api/dom-cortex/type',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { selector, text } = request.body as { selector: string; text: string };

        if (!selector || !text) {
          return reply.code(400).send({
            success: false,
            error: 'Selector and text are required'
          });
        }

        logger.info(`[DomCortex API] Typing into: ${selector}`);
        const result = await domCortex.type(selector, text);

        return reply.send({
          success: true,
          message: result,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[DomCortex API] Type failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/dom-cortex/screenshot
   * Take a screenshot
   */
  fastify.get('/api/dom-cortex/screenshot', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[DomCortex API] Taking screenshot');
      const screenshot = await domCortex.takeScreenshot();

      if (!screenshot) {
        return reply.code(400).send({
          success: false,
          error: 'No page loaded'
        });
      }

      return reply
        .type('image/jpeg')
        .send(screenshot);
    } catch (err: any) {
      logger.error(`[DomCortex API] Screenshot failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/dom-cortex/page-source
   * Get current page HTML
   */
  fastify.get('/api/dom-cortex/page-source', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[DomCortex API] Fetching page source');
      const source = await domCortex.getPageSource();

      return reply.send({
        success: true,
        html: source,
        size: source.length,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[DomCortex API] Page source failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * POST /api/dom-cortex/close
   * Close the browser
   */
  fastify.post('/api/dom-cortex/close', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('[DomCortex API] Closing browser');
      await domCortex.close();

      return reply.send({
        success: true,
        message: 'Browser closed',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error(`[DomCortex API] Close failed: ${err.message}`);
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * GET /api/dom-cortex/health
   * Health check for DomCortex
   */
  fastify.get('/api/dom-cortex/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      status: 'OPERATIONAL',
      components: {
        browserEngine: 'ACTIVE',
        domInteraction: 'ACTIVE',
        screenshot: 'ACTIVE',
        pageAnalysis: 'ACTIVE'
      },
      timestamp: new Date().toISOString()
    });
  });
}
