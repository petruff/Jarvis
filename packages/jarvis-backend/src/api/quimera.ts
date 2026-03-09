/**
 * Quimera API — Phase 4: Deep Synthesis Engine
 *
 * Combines Vector RAG with Knowledge Graph traversals for non-obvious insights.
 * REST API for the QuimeraEngine reasoning core.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { quimera } from '../intelligence/quimera';
import { knowledgeGraph, GraphNode, GraphEdge } from '../memory/graph';
import logger from '../logger';

export async function registerQuimeraRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/quimera/analyze
   * Run Quimera synthesis on a query
   */
  fastify.post<{ Body: { query: string } }>(
    '/api/quimera/analyze',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query } = request.body as { query: string };

        if (!query) {
          return reply.code(400).send({
            success: false,
            error: 'Query is required'
          });
        }

        logger.info(`[Quimera API] Analyzing: ${query}`);
        const result = await quimera.analyze(query);

        return reply.send({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Analysis failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/quimera/feed
   * Ingest a fact/entity into the Quimera Graph
   */
  fastify.post<{ Body: { node: GraphNode; edges: GraphEdge[] } }>(
    '/api/quimera/feed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { node, edges } = request.body as { node: GraphNode; edges: GraphEdge[] };

        if (!node || !node.id) {
          return reply.code(400).send({
            success: false,
            error: 'Node with ID is required'
          });
        }

        logger.info(`[Quimera API] Feeding node: ${node.id}`);
        await quimera.feed(node, edges || []);

        return reply.send({
          success: true,
          message: `Ingested node ${node.id}`,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Feed failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/quimera/graph/neighborhood/:entityId
   * Get neighborhood of an entity in the knowledge graph
   */
  fastify.get<{ Params: { entityId: string } }>(
    '/api/quimera/graph/neighborhood/:entityId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { entityId: string };
        const { entityId } = params;

        logger.info(`[Quimera API] Getting neighborhood for: ${entityId}`);
        const neighborhood = await knowledgeGraph.getNeighborhood(entityId);

        return reply.send({
          success: true,
          data: {
            entityId,
            nodes: neighborhood.nodes,
            edges: neighborhood.edges,
            nodeCount: neighborhood.nodes.length,
            edgeCount: neighborhood.edges.length
          },
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Neighborhood lookup failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/quimera/graph/connections/:entityId
   * Find Quimera connections (traversal paths)
   */
  fastify.get<{ Params: { entityId: string }; Querystring: { depth?: string } }>(
    '/api/quimera/graph/connections/:entityId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { entityId: string };
        const { entityId } = params;
        const depth = parseInt((request.query as any).depth || '2');

        logger.info(`[Quimera API] Finding connections for: ${entityId} (depth=${depth})`);
        const connections = await knowledgeGraph.findQuimeraConnections(entityId, depth);

        return reply.send({
          success: true,
          data: {
            entityId,
            depth,
            connections,
            connectionCount: connections.length
          },
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Connection lookup failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/quimera/graph/upsert-node
   * Upsert a node into the knowledge graph
   */
  fastify.post<{ Body: { node: GraphNode } }>(
    '/api/quimera/graph/upsert-node',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { node } = request.body as { node: GraphNode };

        if (!node || !node.id) {
          return reply.code(400).send({
            success: false,
            error: 'Node with ID is required'
          });
        }

        logger.info(`[Quimera API] Upserting node: ${node.id}`);
        await knowledgeGraph.upsertNode(node);

        return reply.send({
          success: true,
          message: `Upserted node ${node.id}`,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Node upsert failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/quimera/graph/add-edge
   * Add an edge between nodes
   */
  fastify.post<{ Body: { edge: GraphEdge } }>(
    '/api/quimera/graph/add-edge',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { edge } = request.body as { edge: GraphEdge };

        if (!edge || !edge.from || !edge.to) {
          return reply.code(400).send({
            success: false,
            error: 'Edge with from/to is required'
          });
        }

        logger.info(`[Quimera API] Adding edge: ${edge.from} -> ${edge.to}`);
        await knowledgeGraph.addEdge(edge);

        return reply.send({
          success: true,
          message: `Added edge ${edge.from} -> ${edge.to}`,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.error(`[Quimera API] Edge add failed: ${err.message}`);
        return reply.code(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/quimera/health
   * Health check for Quimera system
   */
  fastify.get('/api/quimera/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      status: 'OPERATIONAL',
      components: {
        vectorRag: 'ACTIVE',
        knowledgeGraph: 'ACTIVE',
        synthesis: 'ACTIVE'
      },
      timestamp: new Date().toISOString()
    });
  });
}
