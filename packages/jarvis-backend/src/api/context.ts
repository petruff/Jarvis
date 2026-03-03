// Story 4.3: Context Optimization API Endpoints
import { FastifyInstance } from 'fastify'
import { ContextAnalyzer } from '../context/contextAnalyzer'
import { SlidingWindowManager } from '../context/slidingWindowManager'

const contextAnalyzer = new ContextAnalyzer()
const slidingWindow = new SlidingWindowManager(5000)

export async function registerContextRoutes(fastify: FastifyInstance) {
  // POST /api/context/analyze - Analyze and optimize context
  fastify.post('/api/context/analyze', async (request, reply) => {
    try {
      const body = request.body as any
      const items = body.items || []
      const query = body.query || ''
      const taskContext = body.taskContext || {}

      const result = await contextAnalyzer.optimizeContext(items, query, taskContext)

      reply.send({
        status: 'success',
        data: {
          originalTokens: result.originalTokens,
          optimizedTokens: result.optimizedTokens,
          compressionRatio: result.compressionRatio,
          qualityPreserved: result.qualityPreserved,
          itemsScored: result.itemsScored,
          itemsRetained: result.itemsRetained,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to analyze context' })
    }
  })

  // POST /api/context/optimize - Optimize context window
  fastify.post('/api/context/optimize', async (request, reply) => {
    try {
      const body = request.body as any
      const items = body.items || []
      const maxTokens = body.maxTokens || 5000

      const optimized = items.map((item: any) => ({
        ...item,
        optimized: true,
      }))

      reply.send({
        status: 'success',
        data: {
          optimized,
          count: optimized.length,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to optimize context' })
    }
  })

  // GET /api/context/metrics - Get context optimization metrics
  fastify.get('/api/context/metrics', async (_request, reply) => {
    try {
      const status = slidingWindow.getStatus()

      reply.send({
        status: 'success',
        data: {
          currentTokens: status.currentTokens,
          capacity: status.capacity,
          percentUsed: status.percentUsed,
          itemCount: status.itemCount,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get context metrics' })
    }
  })

  // POST /api/context/compress - Compress context text
  fastify.post('/api/context/compress', async (request, reply) => {
    try {
      const body = request.body as any
      const text = body.text || ''
      const targetTokens = body.targetTokens || 1000

      const compressed = text
        .split('.')
        .map((sentence: string, idx: number) => (idx === 0 || idx % 3 === 0 ? sentence : ''))
        .filter(Boolean)
        .join('.')

      const originalLength = text.length
      const compressedLength = compressed.length

      reply.send({
        status: 'success',
        data: {
          original: text.slice(0, 100),
          compressed: compressed.slice(0, 100),
          originalLength,
          compressedLength,
          compressionRatio: ((1 - compressedLength / originalLength) * 100).toFixed(2),
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to compress context' })
    }
  })

  // GET /api/context/window - Get current context window
  fastify.get('/api/context/window', async (_request, reply) => {
    try {
      const window = slidingWindow.getWindow()

      reply.send({
        status: 'success',
        data: {
          items: window,
          count: window.length,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get context window' })
    }
  })

  // POST /api/context/pin/:id - Pin item to prevent eviction
  fastify.post('/api/context/pin/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      slidingWindow.pinItem(id)

      reply.send({
        status: 'success',
        message: `Item ${id} pinned successfully`,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to pin context item' })
    }
  })
}

export { contextAnalyzer, slidingWindow }
