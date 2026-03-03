/**
 * Vision Service — Central Orchestration
 *
 * Coordinates:
 * - Image processing
 * - Vision model analysis
 * - Gesture recognition
 * - Multimodal fusion
 */

import ImageProcessor, { ProcessedImage } from './imageProcessor';
import VisionModel, { VisionAnalysis } from './visionModel';
import GestureRecognizer, { Gesture, GestureType } from './gestureRecognizer';
import MultimodalFusionEngine, { MultimodalContext } from './multimodalFusion';
import { Emotion } from '../voice/prosodyEngine';

interface VisionSession {
    sessionId: string;
    contexts: MultimodalContext[];
    gestures: Gesture[];
    frames: number;
    createdAt: number;
}

class VisionService {
    private imageProcessor: ImageProcessor;
    private visionModel: VisionModel;
    private gestureRecognizer: GestureRecognizer;
    private multimodalEngine: MultimodalFusionEngine;
    private sessions: Map<string, VisionSession> = new Map();

    constructor(apiKey?: string) {
        this.imageProcessor = new ImageProcessor();
        this.visionModel = new VisionModel(apiKey);
        this.gestureRecognizer = new GestureRecognizer();
        this.multimodalEngine = new MultimodalFusionEngine();

        console.log('[VisionService] Initialized');
    }

    /**
     * Process image frame from base64
     */
    async processFrame(
        base64: string,
        sessionId: string,
        voiceEmotion: Emotion = 'neutral',
        voiceConfidence: number = 0.5,
        transcript: string = ''
    ): Promise<MultimodalContext | null> {
        try {
            // Process image
            const processed = await this.imageProcessor.processBase64(base64);

            // Analyze with vision model
            const analysis = await this.visionModel.analyzeImage(
                processed.base64,
                'general'
            );

            // Detect gestures
            const gestureAnalysis = await this.visionModel.detectGestures(
                processed.base64
            );

            const gesture = await this.gestureRecognizer.recognizeGesture(
                gestureAnalysis.description,
                { x: 0.5, y: 0.5 },
                'right'
            );

            const gestures = gesture ? [gesture] : [];

            // Fuse contexts
            const context = this.multimodalEngine.fuseContexts(
                voiceEmotion,
                voiceConfidence,
                transcript,
                analysis,
                gestures
            );

            // Store in session
            this.updateSession(sessionId, context, gestures);

            return context;
        } catch (error) {
            console.error('[VisionService] Frame processing error:', error);
            return null;
        }
    }

    /**
     * Extract text from image
     */
    async extractText(base64: string): Promise<{
        text: string;
        confidence: number;
    }> {
        try {
            const result = await this.visionModel.extractText(base64);

            return {
                text: result.text,
                confidence:
                    result.blocks.reduce((a, b) => a + b.confidence, 0) /
                    result.blocks.length,
            };
        } catch (error) {
            console.error('[VisionService] Text extraction error:', error);
            return { text: '', confidence: 0 };
        }
    }

    /**
     * Analyze specific aspect of image
     */
    async analyzeAspect(
        base64: string,
        aspect: 'gesture' | 'text' | 'objects' | 'scene'
    ): Promise<any> {
        try {
            switch (aspect) {
                case 'gesture':
                    return await this.visionModel.detectGestures(base64);

                case 'text':
                    return await this.visionModel.extractText(base64);

                case 'objects':
                case 'scene':
                default:
                    return await this.visionModel.analyzeImage(base64, aspect);
            }
        } catch (error) {
            console.error(
                `[VisionService] ${aspect} analysis error:`,
                error
            );
            return null;
        }
    }

    /**
     * Get movement/gesture sequence
     */
    getMovementSequence(): {
        type: string;
        velocity: number;
        direction: { x: number; y: number };
    } {
        return this.gestureRecognizer.detectMovement();
    }

    /**
     * Get session history
     */
    getSessionHistory(sessionId: string): MultimodalContext[] {
        const session = this.sessions.get(sessionId);
        return session?.contexts || [];
    }

    /**
     * Get gesture history
     */
    getGestureHistory(sessionId: string): Gesture[] {
        const session = this.sessions.get(sessionId);
        return session?.gestures || [];
    }

    /**
     * Get session statistics
     */
    getSessionStats(sessionId: string): {
        totalFrames: number;
        totalGestures: number;
        averageConfidence: number;
        dominantGestureType: GestureType;
        duration: number;
    } {
        const session = this.sessions.get(sessionId);

        if (!session) {
            return {
                totalFrames: 0,
                totalGestures: 0,
                averageConfidence: 0,
                dominantGestureType: 'unknown',
                duration: 0,
            };
        }

        const gestures = session.gestures;
        const contexts = session.contexts;

        // Calculate dominant gesture
        const gestureMap = new Map<GestureType, number>();
        gestures.forEach((g) => {
            gestureMap.set(g.type, (gestureMap.get(g.type) || 0) + 1);
        });

        const dominantGesture = Array.from(gestureMap.entries()).sort(
            (a, b) => b[1] - a[1]
        )[0]?.[0] || 'unknown';

        return {
            totalFrames: session.frames,
            totalGestures: gestures.length,
            averageConfidence:
                contexts.reduce((a, c) => a + c.confidence, 0) /
                Math.max(contexts.length, 1),
            dominantGestureType: dominantGesture,
            duration: Date.now() - session.createdAt,
        };
    }

    /**
     * Clear session
     */
    clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        this.gestureRecognizer.clearHistory();
        this.visionModel.clearCache();

        console.log(`[VisionService] Session ${sessionId} cleared`);
    }

    /**
     * Update session
     */
    private updateSession(
        sessionId: string,
        context: MultimodalContext,
        gestures: Gesture[]
    ): void {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                sessionId,
                contexts: [],
                gestures: [],
                frames: 0,
                createdAt: Date.now(),
            });
        }

        const session = this.sessions.get(sessionId)!;
        session.contexts.push(context);
        session.gestures.push(...gestures);
        session.frames++;

        // Keep history bounded
        if (session.contexts.length > 100) {
            session.contexts.shift();
        }
        if (session.gestures.length > 100) {
            session.gestures.shift();
        }
    }

    /**
     * Get vision model cache stats
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        utilization: number;
    } {
        return this.visionModel.getCacheStats();
    }
}

export default VisionService;
