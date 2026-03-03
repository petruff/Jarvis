/**
 * JARVIS Voice Service
 *
 * Central orchestration for all voice operations:
 * - Text analysis and emotion detection
 * - Prosody generation
 * - TTS synthesis with emotion awareness
 * - Real-time streaming
 */

import ElevenLabsClient from './elevenLabsClient';
import ProsodyEngine, { Emotion, VoicePersonality } from './prosodyEngine';
import { StreamingHandler, StreamChunkQueue } from './streamingHandler';
import { Socket } from 'socket.io';

interface VoiceServiceConfig {
    elevenLabsApiKey: string;
    personality?: VoicePersonality;
    enableProsody?: boolean;
    enableStreaming?: boolean;
}

class VoiceService {
    private ttsClient: ElevenLabsClient;
    private prosodyEngine: ProsodyEngine;
    private streamingHandler: StreamingHandler;
    private personality: VoicePersonality;
    private enableProsody: boolean;
    private enableStreaming: boolean;

    constructor(config: VoiceServiceConfig) {
        this.ttsClient = new ElevenLabsClient(config.elevenLabsApiKey);
        this.prosodyEngine = new ProsodyEngine();
        this.streamingHandler = new StreamingHandler({
            maxQueueSize: 10,
            chunkSize: 50,
            ttsTcpTimeout: 3000,
            enableBuffering: true,
        });

        this.personality = config.personality || 'british-butler';
        this.enableProsody = config.enableProsody !== false;
        this.enableStreaming = config.enableStreaming !== false;

        console.log('[VoiceService] Initialized', {
            personality: this.personality,
            prosodyEnabled: this.enableProsody,
            streamingEnabled: this.enableStreaming,
        });
    }

    /**
     * Synthesize speech with full pipeline
     * Returns base64-encoded audio
     */
    async synthesize(text: string): Promise<string> {
        try {
            // Analyze text for emotion
            const analysis = this.prosodyEngine.analyzeSpeech(text, this.personality);

            console.log('[VoiceService] Analyzing speech', {
                emotion: analysis.emotion,
                confidence: analysis.confidence.toFixed(2),
            });

            // Generate audio with emotion-aware voice
            const audioBuffer = await this.ttsClient.synthesize(
                text,
                this.enableProsody ? analysis.emotion : undefined
            );

            // Return base64 for transmission
            return this.ttsClient.bufferToBase64(audioBuffer);
        } catch (error) {
            console.error('[VoiceService] Synthesis error:', error);
            throw error;
        }
    }

    /**
     * Stream response with real-time audio generation
     * Starts parallel TTS generation as tokens arrive
     */
    async streamResponse(
        socket: Socket,
        streamId: string,
        responseText: string,
        chunkSize: number = 50 // tokens per chunk
    ): Promise<void> {
        try {
            // Create stream queue
            const queue = await this.streamingHandler.startStream(
                socket,
                streamId,
                async (chunk) => {
                    // TTS handler called for each chunk
                    return await this.synthesize(chunk);
                }
            );

            // Split response into chunks and enqueue
            const tokens = responseText.split(/\s+/);
            let buffer = '';
            let chunkCount = 0;

            for (const token of tokens) {
                buffer += token + ' ';

                if (buffer.split(/\s+/).length >= chunkSize) {
                    await queue.enqueue(buffer.trim());
                    buffer = '';
                    chunkCount++;
                }
            }

            // Send remaining buffer
            if (buffer.trim()) {
                await queue.enqueue(buffer.trim());
                chunkCount++;
            }

            // Mark stream as complete
            this.streamingHandler.completeStream(streamId, responseText);

            console.log('[VoiceService] Streamed response', {
                streamId,
                chunks: chunkCount,
                tokens: tokens.length,
            });
        } catch (error) {
            console.error('[VoiceService] Stream error:', error);
            this.streamingHandler.cancelStream(streamId);
            throw error;
        }
    }

    /**
     * Get emotion analysis without synthesis
     */
    analyzeEmotion(text: string): {
        emotion: Emotion;
        confidence: number;
        triggers: string[];
    } {
        const result = this.prosodyEngine.detectEmotion(text);
        return {
            emotion: result.emotion,
            confidence: result.confidence,
            triggers: result.triggers,
        };
    }

    /**
     * Change voice personality
     */
    setPersonality(personality: VoicePersonality): void {
        this.personality = personality;
        console.log('[VoiceService] Personality changed to:', personality);
    }

    /**
     * Get current personality
     */
    getPersonality(): VoicePersonality {
        return this.personality;
    }

    /**
     * Check TTS service health
     */
    async healthCheck(): Promise<boolean> {
        try {
            return await this.ttsClient.testConnection();
        } catch {
            return false;
        }
    }

    /**
     * Get TTS usage stats
     */
    async getUsage() {
        return await this.ttsClient.getUsage();
    }

    /**
     * Cancel active stream
     */
    cancelStream(streamId: string): void {
        this.streamingHandler.cancelStream(streamId);
    }

    /**
     * Get stream statistics
     */
    getStreamStats(streamId: string) {
        return this.streamingHandler.getStats(streamId);
    }
}

// Export singleton (will be initialized in index.ts)
export default VoiceService;
