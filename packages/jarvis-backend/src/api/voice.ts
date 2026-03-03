// Wave 3: Voice Streaming API Endpoints
import { FastifyInstance } from 'fastify'
import VoiceManager from '../voice/voiceManager'

const voiceManager = new VoiceManager()

export async function registerVoiceRoutes(fastify: FastifyInstance) {
  // Initialize common responses on startup
  voiceManager.initializeCommonResponses()

  // POST /api/voice/stream - Stream text-to-speech with lowest latency
  fastify.post('/api/voice/stream', async (request, reply) => {
    try {
      const body = request.body as any
      const sessionId = body.sessionId || 'default'
      const text = body.text || ''
      const language = body.language || 'en'
      const emotion = body.emotion || 'neutral'

      if (!text) {
        return reply.code(400).send({ status: 'error', message: 'Text is required' })
      }

      const audioBuffer = await voiceManager.streamResponse(sessionId, text, language, emotion)

      reply
        .type('audio/mpeg')
        .header('Content-Disposition', 'inline')
        .send(audioBuffer)
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to stream voice' })
    }
  })

  // POST /api/voice/precompute - Pre-compute responses for faster playback
  fastify.post('/api/voice/precompute', async (request, reply) => {
    try {
      const body = request.body as any
      const responses = body.responses || []
      const language = body.language || 'en'

      voiceManager.preComputeResponses(responses, language)

      reply.send({
        status: 'success',
        data: {
          responsesQueued: responses.length,
          language,
          message: 'Responses queued for pre-computation',
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to queue pre-computation' })
    }
  })

  // GET /api/voice/metrics - Get voice performance metrics
  fastify.get('/api/voice/metrics', async (_request, reply) => {
    try {
      const metrics = voiceManager.getMetrics()

      reply.send({
        status: 'success',
        data: {
          averageLatency: metrics.averageLatency,
          latencyUnit: 'ms',
          totalMeasurements: metrics.totalLatencyMeasurements || 0,
          activeSessions: metrics.activeSessions,
          cacheStats: {
            cachedResponses: metrics.cache.cachedResponses,
            totalCacheSize: metrics.cache.totalCacheSize,
            avgEntrySize: metrics.cache.avgCacheEntrySize,
          },
          lastStreamMetrics: metrics.lastStreamMetrics ? {
            firstBytesLatency: metrics.lastStreamMetrics.firstBytesTime,
            totalProcessingTime: metrics.lastStreamMetrics.totalProcessingTime,
            chunksStreamed: metrics.lastStreamMetrics.chunksStreamed,
          } : null,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get voice metrics' })
    }
  })

  // GET /api/voice/session/:id - Get session info
  fastify.get('/api/voice/session/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const session = voiceManager.getSession(id)

      if (!session) {
        return reply.code(404).send({ status: 'error', message: 'Session not found' })
      }

      reply.send({
        status: 'success',
        data: {
          sessionId: session.sessionId,
          language: session.language,
          voicePreset: session.voicePreset,
          speechRate: session.speechRate,
          isStreaming: session.isStreaming,
          totalCharsProcessed: session.totalCharsProcessed,
          averageLatency: session.averageLatency,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get session' })
    }
  })

  // POST /api/voice/session/:id/end - End voice session
  fastify.post('/api/voice/session/:id/end', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      voiceManager.endSession(id)

      reply.send({
        status: 'success',
        message: `Session ${id} ended`,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to end session' })
    }
  })

  // POST /api/voice/listen - Start real-time speech recognition
  fastify.post('/api/voice/listen', async (request, reply) => {
    try {
      const body = request.body as any
      const sessionId = body.sessionId || 'default'
      const language = body.language || 'pt-BR'

      const result = voiceManager.startSpeechRecognition(sessionId, language)

      reply.send({
        status: 'success',
        data: result,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to start speech recognition' })
    }
  })

  // POST /api/voice/process-command - Process Portuguese/English speech input
  fastify.post('/api/voice/process-command', async (request, reply) => {
    try {
      const body = request.body as any
      const text = body.text || ''

      if (!text) {
        return reply.code(400).send({ status: 'error', message: 'Text is required' })
      }

      const result = voiceManager.processPortugueseCommand(text)

      reply.send({
        status: 'success',
        data: result,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to process command' })
    }
  })

  // POST /api/voice/stop-listen - Stop speech recognition
  fastify.post('/api/voice/stop-listen', async (_request, reply) => {
    try {
      voiceManager.stopSpeechRecognition()

      reply.send({
        status: 'success',
        message: 'Speech recognition stopped',
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to stop speech recognition' })
    }
  })

  // GET /api/voice/listen-status - Get current listening status
  fastify.get('/api/voice/listen-status', async (_request, reply) => {
    try {
      const status = voiceManager.getSpeechRecognitionStatus()

      reply.send({
        status: 'success',
        data: status,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get listening status' })
    }
  })

  // GET /api/voice/health - Voice system health check
  fastify.get('/api/voice/health', async (_request, reply) => {
    try {
      const metrics = voiceManager.getMetrics()
      const isHealthy = metrics.averageLatency < 1000 && (metrics.totalLatencyMeasurements || 0) > 0

      reply.send({
        status: isHealthy ? 'success' : 'degraded',
        data: {
          systemStatus: isHealthy ? 'OPERATIONAL' : 'INITIALIZING',
          averageLatency: metrics.averageLatency,
          latencyTarget: '< 500ms',
          latencyStatus: metrics.averageLatency < 500 ? 'OPTIMAL' : 'ACCEPTABLE',
          provider: 'ElevenLabs',
          streamingEnabled: true,
          precomputationEnabled: true,
          cacheSize: metrics.cache.totalCacheSize,
        },
      })
    } catch (error) {
      reply.code(503).send({
        status: 'error',
        data: {
          systemStatus: 'OFFLINE',
          message: 'Voice system unavailable',
        },
      })
    }
  })

  // ========== PHASE 1: Voice I/O & Real-time Streaming ==========

  // POST /api/voice/analyze-emotion - Detect emotion in text
  fastify.post('/api/voice/analyze-emotion', async (request, reply) => {
    try {
      const body = request.body as any
      const text = body.text || ''

      if (!text) {
        return reply.code(400).send({ status: 'error', message: 'Text is required' })
      }

      const analysis = voiceManager.analyzeEmotion(text)

      reply.send({
        status: 'success',
        data: {
          text: text.substring(0, 100),
          emotion: analysis.emotion,
          confidence: analysis.confidence,
          triggers: analysis.triggers,
          prosodySettings: {
            pitch: 1.0,
            rate: 1.0,
            pauseMs: 100,
          },
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to analyze emotion' })
    }
  })

  // POST /api/voice/set-personality - Change voice personality (British Butler, Military, etc)
  fastify.post('/api/voice/set-personality', async (request, reply) => {
    try {
      const body = request.body as any
      const personality = body.personality || 'british-butler'
      const validPersonalities = ['british-butler', 'military-commander', 'scientist', 'mentor']

      if (!validPersonalities.includes(personality)) {
        return reply.code(400).send({
          status: 'error',
          message: `Invalid personality. Valid: ${validPersonalities.join(', ')}`,
        })
      }

      voiceManager.setPersonality(personality as any)

      reply.send({
        status: 'success',
        data: {
          personality,
          message: `Voice personality set to ${personality}`,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to set personality' })
    }
  })

  // GET /api/voice/personality - Get current voice personality
  fastify.get('/api/voice/personality', async (_request, reply) => {
    try {
      const personality = voiceManager.getPersonality()

      reply.send({
        status: 'success',
        data: {
          personality,
          description: `Currently using ${personality} voice profile`,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get personality' })
    }
  })

  // POST /api/voice/synthesize-emotional - TTS with emotion-aware prosody
  fastify.post('/api/voice/synthesize-emotional', async (request, reply) => {
    try {
      const body = request.body as any
      const text = body.text || ''
      const emotion = body.emotion || 'neutral'
      const sessionId = body.sessionId || 'default'

      if (!text) {
        return reply.code(400).send({ status: 'error', message: 'Text is required' })
      }

      const audioBuffer = await voiceManager.streamResponse(sessionId, text, 'en', emotion)

      reply
        .type('audio/mpeg')
        .header('Content-Disposition', 'inline')
        .header('X-Emotion', emotion)
        .header('X-Streaming', 'true')
        .send(audioBuffer)
    } catch (error) {
      console.error('[Voice API] Synthesis error:', error)
      reply.code(500).send({ status: 'error', message: 'Failed to synthesize speech' })
    }
  })

  // GET /api/voice/latency - Get real-time latency metrics
  fastify.get('/api/voice/latency', async (_request, reply) => {
    try {
      const metrics = voiceManager.getMetrics()

      reply.send({
        status: 'success',
        data: {
          averageLatencyMs: metrics.averageLatency,
          targetLatencyMs: 500,
          optimalFlag: metrics.averageLatency < 500,
          latencyStatus: metrics.averageLatency < 500 ? 'OPTIMAL' : 'ACCEPTABLE',
          streamingEnabled: true,
          realTimeProcessing: true,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get latency metrics' })
    }
  })
}

export { voiceManager }
