import { FastifyInstance } from 'fastify';

export async function registerTestRoutes(fastify: FastifyInstance) {
    console.log('[TEST-PLUGIN] Registering test routes...');

    fastify.get('/api/test-plugin-route-1', async (request, reply) => {
        return reply.send({ status: 'test-plugin-route-1-works' });
    });

    fastify.get('/api/test-plugin-route-2', async (request, reply) => {
        return reply.send({ status: 'test-plugin-route-2-works' });
    });

    fastify.post('/api/test-plugin-post', async (request, reply) => {
        return reply.send({ status: 'test-plugin-post-works' });
    });

    console.log('[TEST-PLUGIN] ✓ All test routes registered');
}
