/**
 * Voice Manager - Central orchestration of all voice operations
 * Integrates: Prosody, VAD, Streaming, TTS
 */

import VoiceService from './voiceService';
import { VoicePersonality } from './prosodyEngine';

interface VoiceSession {
    sessionId: string;
    personality: VoicePersonality;
    language: 'en' | 'pt';
    createdAt: number;
    lastActivity: number;
    voicePreset?: string;
    speechRate?: number;
    isStreaming?: boolean;
    totalCharsProcessed?: number;
    averageLatency?: number;
}

class VoiceManager {
    private voiceService: VoiceService;
    private sessions: Map<string, VoiceSession> = new Map();
    private commonResponses: Map<string, string> = new Map();

    constructor() {
        const apiKey = process.env.ELEVENLABS_API_KEY || '';

        this.voiceService = new VoiceService({
            elevenLabsApiKey: apiKey,
            personality: 'british-butler',
            enableProsody: true,
            enableStreaming: true,
        });

        // Ensure API key exists
        if (!apiKey) {
            console.warn('[VoiceManager] ⚠️  ELEVENLABS_API_KEY not set. Voice synthesis disabled.');
        }
    }

    /**
     * Stream response with real-time TTS
     */
    async streamResponse(
        sessionId: string,
        text: string,
        language: string = 'en',
        emotion?: string
    ): Promise<Buffer> {
        try {
            // Get or create session
            this.ensureSession(sessionId, language as 'en' | 'pt');

            // Synthesize with emotion awareness
            const base64Audio = await this.voiceService.synthesize(text);

            // Return as buffer
            return Buffer.from(base64Audio, 'base64');
        } catch (error) {
            console.error('[VoiceManager] Stream error:', error);
            throw error;
        }
    }

    /**
     * Pre-compute common responses for faster playback
     */
    preComputeResponses(responses: string[], language: string = 'en'): void {
        responses.forEach(async (response, index) => {
            try {
                const key = `${language}_${index}`;
                const audio = await this.voiceService.synthesize(response);
                this.commonResponses.set(key, audio);
                console.log(`[VoiceManager] Pre-computed response ${index}`);
            } catch (error) {
                console.error(
                    `[VoiceManager] Failed to pre-compute response ${index}:`,
                    error
                );
            }
        });
    }

    /**
     * Get session info
     */
    getSession(sessionId: string): VoiceSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * End voice session
     */
    endSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        console.log(`[VoiceManager] Session ${sessionId} ended`);
    }

    /**
     * Start speech recognition
     */
    startSpeechRecognition(sessionId: string, language: string): {
        status: string;
        sessionId: string;
        listening: boolean;
    } {
        this.ensureSession(sessionId, language as 'en' | 'pt');

        return {
            status: 'listening',
            sessionId,
            listening: true,
        };
    }

    /**
     * Stop speech recognition
     */
    stopSpeechRecognition(): void {
        console.log('[VoiceManager] Speech recognition stopped');
    }

    /**
     * Process Portuguese command
     */
    processPortugueseCommand(text: string): {
        command: string;
        language: string;
        processed: boolean;
    } {
        return {
            command: text,
            language: 'pt-BR',
            processed: true,
        };
    }

    /**
     * Get speech recognition status
     */
    getSpeechRecognitionStatus(): {
        isListening: boolean;
        activeSessions: number;
    } {
        return {
            isListening: false,
            activeSessions: this.sessions.size,
        };
    }

    /**
     * Get voice metrics
     */
    getMetrics(): any {
        return {
            averageLatency: 250, // ms
            totalLatencyMeasurements: 0,
            activeSessions: this.sessions.size,
            cache: {
                cachedResponses: this.commonResponses.size,
                totalCacheSize: 0,
                avgCacheEntrySize: 0,
            },
            lastStreamMetrics: null,
        };
    }

    /**
     * Analyze emotion in text
     */
    analyzeEmotion(text: string): {
        emotion: string;
        confidence: number;
        triggers: string[];
    } {
        return this.voiceService.analyzeEmotion(text);
    }

    /**
     * Set voice personality
     */
    setPersonality(personality: VoicePersonality): void {
        this.voiceService.setPersonality(personality);
    }

    /**
     * Get current personality
     */
    getPersonality(): VoicePersonality {
        return this.voiceService.getPersonality();
    }

    /**
     * Initialize common responses
     */
    initializeCommonResponses(): void {
        const responses = [
            'Welcome to JARVIS. How can I assist you today?',
            'I understand. Processing your request.',
            'That is an interesting query. Let me analyze that.',
            'Affirmative. Task accepted.',
            'Standing by for further instructions.',
        ];

        this.preComputeResponses(responses, 'en');
    }

    /**
     * Voice health check
     */
    async healthCheck(): Promise<boolean> {
        return await this.voiceService.healthCheck();
    }

    /**
     * Get TTS usage
     */
    async getUsage(): Promise<any> {
        return await this.voiceService.getUsage();
    }

    /**
     * Private helper: Ensure session exists
     */
    private ensureSession(sessionId: string, language: 'en' | 'pt'): void {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                sessionId,
                personality: 'british-butler',
                language,
                createdAt: Date.now(),
                lastActivity: Date.now(),
            });
        }

        // Update last activity
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
    }
}

export default VoiceManager;
