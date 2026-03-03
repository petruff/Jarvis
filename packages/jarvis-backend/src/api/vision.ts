/**
 * Vision API Endpoints — Phase 2 Implementation
 *
 * Routes for:
 * - Frame processing
 * - Gesture detection
 * - OCR/text extraction
 * - Multimodal analysis
 */

import { FastifyInstance } from 'fastify';
import VisionService from '../vision/visionService';

const visionService = new VisionService(process.env.OPENAI_API_KEY);

export async function registerVisionRoutes(fastify: FastifyInstance) {
    // ========== PHASE 2: Vision & Multimodal Input ==========

    /**
     * POST /api/vision/process-frame
     * Process video frame with emotion context
     */
    fastify.post('/api/vision/process-frame', async (request, reply) => {
        try {
            const body = request.body as any;
            const frameBase64 = body.frame || '';
            const sessionId = body.sessionId || `session_${Date.now()}`;
            const voiceEmotion = body.emotion || 'neutral';
            const voiceConfidence = body.voiceConfidence || 0.5;
            const transcript = body.transcript || '';

            if (!frameBase64) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'Frame data is required',
                });
            }

            const context = await visionService.processFrame(
                frameBase64,
                sessionId,
                voiceEmotion as any,
                voiceConfidence,
                transcript
            );

            reply.send({
                status: 'success',
                data: {
                    sessionId,
                    context,
                    caption: context
                        ? visionService['multimodalEngine'].generateCaption(
                              context
                          )
                        : 'Processing...',
                },
            });
        } catch (error) {
            console.error('[Vision API] Frame processing error:', error);
            reply.code(500).send({
                status: 'error',
                message: 'Failed to process frame',
            });
        }
    });

    /**
     * POST /api/vision/extract-text
     * OCR - Extract text from image
     */
    fastify.post('/api/vision/extract-text', async (request, reply) => {
        try {
            const body = request.body as any;
            const imageBase64 = body.image || '';

            if (!imageBase64) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'Image data is required',
                });
            }

            const result = await visionService.extractText(imageBase64);

            reply.send({
                status: 'success',
                data: {
                    text: result.text,
                    confidence: result.confidence,
                    wordCount: result.text.split(/\s+/).length,
                },
            });
        } catch (error) {
            console.error('[Vision API] Text extraction error:', error);
            reply.code(500).send({
                status: 'error',
                message: 'Failed to extract text',
            });
        }
    });

    /**
     * POST /api/vision/detect-gestures
     * Detect hand gestures and poses
     */
    fastify.post('/api/vision/detect-gestures', async (request, reply) => {
        try {
            const body = request.body as any;
            const imageBase64 = body.image || '';

            if (!imageBase64) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'Image data is required',
                });
            }

            const analysis = await visionService.analyzeAspect(
                imageBase64,
                'gesture'
            );

            reply.send({
                status: 'success',
                data: {
                    gestures: analysis?.gestures || [],
                    confidence: analysis?.confidence || 0,
                    description: analysis?.description || '',
                },
            });
        } catch (error) {
            console.error('[Vision API] Gesture detection error:', error);
            reply.code(500).send({
                status: 'error',
                message: 'Failed to detect gestures',
            });
        }
    });

    /**
     * POST /api/vision/analyze-scene
     * Analyze scene/objects in image
     */
    fastify.post('/api/vision/analyze-scene', async (request, reply) => {
        try {
            const body = request.body as any;
            const imageBase64 = body.image || '';

            if (!imageBase64) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'Image data is required',
                });
            }

            const analysis = await visionService.analyzeAspect(
                imageBase64,
                'scene'
            );

            reply.send({
                status: 'success',
                data: {
                    description: analysis?.description || '',
                    objects: analysis?.objects || [],
                    scenes: analysis?.scenes || [],
                    confidence: analysis?.confidence || 0,
                },
            });
        } catch (error) {
            console.error('[Vision API] Scene analysis error:', error);
            reply.code(500).send({
                status: 'error',
                message: 'Failed to analyze scene',
            });
        }
    });

    /**
     * GET /api/vision/session/:id/history
     * Get session history
     */
    fastify.get<{ Params: { id: string } }>(
        '/api/vision/session/:id/history',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const history = visionService.getSessionHistory(id);

                reply.send({
                    status: 'success',
                    data: {
                        sessionId: id,
                        frames: history.length,
                        contexts: history.slice(-10), // Last 10
                    },
                });
            } catch (error) {
                console.error('[Vision API] History error:', error);
                reply.code(500).send({
                    status: 'error',
                    message: 'Failed to get history',
                });
            }
        }
    );

    /**
     * GET /api/vision/session/:id/stats
     * Get session statistics
     */
    fastify.get<{ Params: { id: string } }>(
        '/api/vision/session/:id/stats',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const stats = visionService.getSessionStats(id);

                reply.send({
                    status: 'success',
                    data: {
                        sessionId: id,
                        ...stats,
                        durationSeconds: Math.floor(stats.duration / 1000),
                    },
                });
            } catch (error) {
                console.error('[Vision API] Stats error:', error);
                reply.code(500).send({
                    status: 'error',
                    message: 'Failed to get stats',
                });
            }
        }
    );

    /**
     * POST /api/vision/session/:id/end
     * End vision session
     */
    fastify.post<{ Params: { id: string } }>(
        '/api/vision/session/:id/end',
        async (request, reply) => {
            try {
                const { id } = request.params;
                visionService.clearSession(id);

                reply.send({
                    status: 'success',
                    message: `Session ${id} ended`,
                });
            } catch (error) {
                console.error('[Vision API] Session end error:', error);
                reply.code(500).send({
                    status: 'error',
                    message: 'Failed to end session',
                });
            }
        }
    );

    /**
     * GET /api/vision/health
     * Vision system health check
     */
    fastify.get('/api/vision/health', async (_request, reply) => {
        try {
            const cacheStats = visionService.getCacheStats();

            reply.send({
                status: 'success',
                data: {
                    systemStatus: 'OPERATIONAL',
                    provider: 'GPT-4V',
                    modules: {
                        imageProcessing: 'ACTIVE',
                        visionModel: 'ACTIVE',
                        gestureRecognizer: 'ACTIVE',
                        multimodalFusion: 'ACTIVE',
                    },
                    cacheUtilization:
                        (cacheStats.utilization * 100).toFixed(1) + '%',
                    capabilities: [
                        'frame_processing',
                        'gesture_detection',
                        'text_extraction',
                        'scene_analysis',
                        'multimodal_fusion',
                    ],
                },
            });
        } catch (error) {
            console.error('[Vision API] Health check error:', error);
            reply.code(503).send({
                status: 'error',
                data: {
                    systemStatus: 'OFFLINE',
                    message: 'Vision system unavailable',
                },
            });
        }
    });
}

export { visionService };
