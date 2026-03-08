/**
 * ElevenLabs TTS Client with Streaming & Prosody Support
 *
 * Handles:
 * - Text-to-speech generation with ElevenLabs API
 * - Voice cloning for British butler tone
 * - Streaming audio for low-latency playback
 * - Emotion-aware voice selection
 */

import fetch from 'node-fetch';
import { Emotion, VoicePersonality } from './prosodyEngine';

interface ElevenLabsConfig {
    apiKey: string;
    voiceId: string; // Default voice ID
    modelId: string; // Model (turbo, multilingual, etc.)
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    streamAudio: boolean;
}

interface VoiceProfile {
    voiceId: string;
    personality: VoicePersonality;
    description: string;
}

class ElevenLabsClient {
    private config: ElevenLabsConfig;
    private voiceProfiles: Map<Emotion, VoiceProfile> = new Map();
    private readonly apiBaseUrl = 'https://api.elevenlabs.io/v1';

    constructor(apiKey: string, config: Partial<ElevenLabsConfig> = {}) {
        this.config = {
            apiKey,
            voiceId: 'nT9vBXLB00T54p0x5vG9', // Brian (Premium Bilingual)
            modelId: 'eleven_multilingual_v2', // High fidelity multilingual
            stability: 0.45,
            similarityBoost: 0.8,
            streamAudio: true,
            ...config,
        };

        this.initializeVoiceProfiles();
    }

    private initializeVoiceProfiles(): void {
        const bilingualVoiceId = 'nT9vBXLB00T54p0x5vG9'; // Brian

        // Map emotions to voice characteristics
        this.voiceProfiles.set('neutral', {
            voiceId: bilingualVoiceId,
            personality: 'british-butler',
            description: 'Professional, neutral tone',
        });

        this.voiceProfiles.set('confident', {
            voiceId: bilingualVoiceId,
            personality: 'military-commander',
            description: 'Authoritative, confident',
        });

        this.voiceProfiles.set('curious', {
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Chris (alternative)
            personality: 'scientist',
            description: 'Thoughtful, inquisitive',
        });

        this.voiceProfiles.set('concerned', {
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Aria with lower stability
            personality: 'british-butler',
            description: 'Cautious, serious',
        });

        this.voiceProfiles.set('excited', {
            voiceId: 'nPczCjzI2devNBz1zQrb', // Rachel (energetic)
            personality: 'mentor',
            description: 'Enthusiastic, energetic',
        });

        this.voiceProfiles.set('calm', {
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Aria (already calm)
            personality: 'mentor',
            description: 'Relaxed, soothing',
        });
    }

    /**
     * Get voice ID for emotion
     */
    getVoiceForEmotion(emotion: Emotion): string {
        const profile = this.voiceProfiles.get(emotion);
        return profile?.voiceId || this.config.voiceId;
    }

    /**
     * Generate speech from text with emotion-aware voice selection
     */
    async synthesize(
        text: string,
        emotion?: Emotion,
        language: 'en' | 'pt-BR' = 'en'
    ): Promise<Buffer> {
        if (!text?.trim()) {
            throw new Error('Text cannot be empty');
        }

        const voiceId = emotion ? this.getVoiceForEmotion(emotion) : this.config.voiceId;

        // Adjust parameters based on emotion
        let stability = this.config.stability;
        let similarityBoost = this.config.similarityBoost;

        if (emotion === 'excited') {
            stability = Math.min(stability + 0.1, 1.0);
            similarityBoost = Math.min(similarityBoost + 0.1, 1.0);
        } else if (emotion === 'calm') {
            stability = Math.min(stability + 0.15, 1.0);
            similarityBoost = Math.max(similarityBoost - 0.1, 0.0);
        }

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.config.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text.substring(0, 500),
                        model_id: language === 'pt-BR' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability,
                            similarity_boost: similarityBoost,
                            use_speaker_boost: true,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(
                    `ElevenLabs API error: ${response.status} - ${error}`
                );
            }

            return await response.buffer();
        } catch (error) {
            console.error('[ElevenLabs] Synthesis error:', error);
            throw error;
        }
    }

    /**
     * Stream speech (returns stream instead of buffered audio)
     */
    async synthesizeStream(text: string, emotion?: Emotion) {
        if (!text?.trim()) {
            throw new Error('Text cannot be empty');
        }

        const voiceId = emotion ? this.getVoiceForEmotion(emotion) : this.config.voiceId;

        let stability = this.config.stability;
        let similarityBoost = this.config.similarityBoost;

        if (emotion === 'excited') {
            stability = Math.min(stability + 0.1, 1.0);
        } else if (emotion === 'calm') {
            stability = Math.min(stability + 0.15, 1.0);
        }

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/text-to-speech/${voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.config.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text.substring(0, 500),
                        model_id: this.config.modelId,
                        voice_settings: {
                            stability,
                            similarity_boost: similarityBoost,
                            use_speaker_boost: true,
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `ElevenLabs Stream error: ${response.status}`
                );
            }

            return response; // Return response as stream
        } catch (error) {
            console.error('[ElevenLabs] Stream error:', error);
            throw error;
        }
    }

    /**
     * Get list of available voices
     */
    async getVoices(): Promise<any[]> {
        try {
            const response = await fetch(`${this.apiBaseUrl}/voices`, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.config.apiKey,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch voices: ${response.status}`);
            }

            const data: any = await response.json();
            return data.voices || [];
        } catch (error) {
            console.error('[ElevenLabs] Get voices error:', error);
            return [];
        }
    }

    /**
     * Get account usage/limits
     */
    async getUsage(): Promise<{
        characterLimit: number;
        characterCount: number;
        requestCountMonthToDate: number;
        requestLimitMonthToDate: number;
    } | null> {
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/subscription`, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.config.apiKey,
                },
            });

            if (!response.ok) {
                return null;
            }

            return await response.json() as any;
        } catch (error) {
            console.error('[ElevenLabs] Usage error:', error);
            return null;
        }
    }

    /**
     * Convert audio buffer to base64
     */
    bufferToBase64(buffer: Buffer): string {
        return buffer.toString('base64');
    }

    /**
     * Test connection and API key validity
     */
    async testConnection(): Promise<boolean> {
        try {
            const voices = await this.getVoices();
            return voices.length > 0;
        } catch {
            return false;
        }
    }
}

export default ElevenLabsClient;
