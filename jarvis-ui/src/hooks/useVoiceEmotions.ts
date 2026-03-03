/**
 * useVoiceEmotions Hook — Phase 1 Integration
 *
 * Handles emotion detection and emotional text-to-speech
 * - Real-time emotion analysis
 * - Emotional voice synthesis
 * - Voice personality control
 * - Streaming integration
 */

import { useState, useCallback, useRef } from 'react';

type Emotion = 'neutral' | 'confident' | 'curious' | 'concerned' | 'excited' | 'calm';
type VoicePersonality = 'british-butler' | 'military-commander' | 'scientist' | 'mentor';

interface EmotionAnalysis {
    emotion: Emotion;
    confidence: number;
    triggers: string[];
}

interface VoiceConfig {
    personality: VoicePersonality;
    enableEmotionalSpeech: boolean;
    enableStreaming: boolean;
    targetLatencyMs: number;
}

export const useVoiceEmotions = (
    apiHost: string = `http://${window.location.hostname}:3000`
) => {
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
    const [currentPersonality, setCurrentPersonality] = useState<VoicePersonality>(
        'british-butler'
    );
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [latencyMs, setLatencyMs] = useState(0);
    const [emotionHistory, setEmotionHistory] = useState<EmotionAnalysis[]>([]);

    const sessionRef = useRef(
        `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    );

    /**
     * Analyze emotion in text
     */
    const analyzeEmotion = useCallback(
        async (text: string): Promise<EmotionAnalysis | null> => {
            if (!text.trim()) return null;

            setIsAnalyzing(true);
            try {
                const response = await fetch(`${apiHost}/api/voice/analyze-emotion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                });

                if (!response.ok) throw new Error('Analysis failed');

                const data: any = await response.json();
                const analysis: EmotionAnalysis = {
                    emotion: data.data.emotion,
                    confidence: data.data.confidence,
                    triggers: data.data.triggers,
                };

                setCurrentEmotion(analysis.emotion);
                setEmotionHistory((prev) => [analysis, ...prev].slice(0, 50));

                return analysis;
            } catch (error) {
                console.error('[useVoiceEmotions] Analysis error:', error);
                return null;
            } finally {
                setIsAnalyzing(false);
            }
        },
        [apiHost]
    );

    /**
     * Synthesize speech with emotion awareness
     */
    const synthesizeEmotional = useCallback(
        async (
            text: string,
            emotion?: Emotion
        ): Promise<{ audio: Blob; emotion: Emotion; latency: number } | null> => {
            if (!text.trim()) return null;

            setIsSynthesizing(true);
            const startTime = Date.now();

            try {
                // If emotion not specified, analyze text first
                let targetEmotion = emotion || currentEmotion;
                if (!emotion) {
                    const analysis = await analyzeEmotion(text);
                    if (analysis) {
                        targetEmotion = analysis.emotion;
                    }
                }

                const response = await fetch(
                    `${apiHost}/api/voice/synthesize-emotional`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text,
                            emotion: targetEmotion,
                            sessionId: sessionRef.current,
                        }),
                    }
                );

                if (!response.ok) throw new Error('Synthesis failed');

                const blob = await response.blob();
                const latency = Date.now() - startTime;

                setLatencyMs(latency);
                setCurrentEmotion(targetEmotion);

                console.log('[useVoiceEmotions] Synthesis complete', {
                    emotion: targetEmotion,
                    latencyMs: latency,
                });

                return {
                    audio: blob,
                    emotion: targetEmotion,
                    latency,
                };
            } catch (error) {
                console.error('[useVoiceEmotions] Synthesis error:', error);
                return null;
            } finally {
                setIsSynthesizing(false);
            }
        },
        [apiHost, currentEmotion, analyzeEmotion]
    );

    /**
     * Change voice personality
     */
    const setPersonality = useCallback(
        async (personality: VoicePersonality): Promise<boolean> => {
            try {
                const response = await fetch(`${apiHost}/api/voice/set-personality`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ personality }),
                });

                if (response.ok) {
                    setCurrentPersonality(personality);
                    console.log('[useVoiceEmotions] Personality changed to:', personality);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('[useVoiceEmotions] Personality change error:', error);
                return false;
            }
        },
        [apiHost]
    );

    /**
     * Get current voice personality
     */
    const getPersonality = useCallback(async (): Promise<VoicePersonality | null> => {
        try {
            const response = await fetch(`${apiHost}/api/voice/personality`);
            if (response.ok) {
                const data: any = await response.json();
                return data.data.personality;
            }
            return null;
        } catch (error) {
            console.error('[useVoiceEmotions] Get personality error:', error);
            return null;
        }
    }, [apiHost]);

    /**
     * Get current latency
     */
    const getLatency = useCallback(async (): Promise<number | null> => {
        try {
            const response = await fetch(`${apiHost}/api/voice/latency`);
            if (response.ok) {
                const data: any = await response.json();
                return data.data.averageLatencyMs;
            }
            return null;
        } catch (error) {
            console.error('[useVoiceEmotions] Latency check error:', error);
            return null;
        }
    }, [apiHost]);

    /**
     * Play audio blob
     */
    const playAudio = useCallback(async (blob: Blob): Promise<void> => {
        try {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();

            // Cleanup
            audio.onended = () => URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[useVoiceEmotions] Playback error:', error);
        }
    }, []);

    /**
     * Full pipeline: analyze emotion → synthesize → play
     */
    const speakWithEmotion = useCallback(
        async (text: string): Promise<boolean> => {
            try {
                const result = await synthesizeEmotional(text);
                if (result) {
                    await playAudio(result.audio);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('[useVoiceEmotions] Speech error:', error);
                return false;
            }
        },
        [synthesizeEmotional, playAudio]
    );

    /**
     * Get emotion history
     */
    const getEmotionHistory = useCallback(
        (): EmotionAnalysis[] => emotionHistory,
        [emotionHistory]
    );

    /**
     * Clear history
     */
    const clearHistory = useCallback((): void => {
        setEmotionHistory([]);
    }, []);

    return {
        // State
        currentEmotion,
        currentPersonality,
        isAnalyzing,
        isSynthesizing,
        latencyMs,
        emotionHistory,

        // Methods
        analyzeEmotion,
        synthesizeEmotional,
        setPersonality,
        getPersonality,
        getLatency,
        playAudio,
        speakWithEmotion,
        getEmotionHistory,
        clearHistory,
    };
};

export type { EmotionAnalysis, VoiceConfig, Emotion, VoicePersonality };
