/**
 * JARVIS Voice Prosody Engine
 *
 * Handles emotional tone variation in speech output:
 * - Emotion detection from text sentiment
 * - Pitch variation based on emotion
 * - Speech rate adjustment for naturalness
 * - Pause insertion for dramatic effect
 */

export type Emotion = 'neutral' | 'confident' | 'curious' | 'concerned' | 'excited' | 'calm';
export type VoicePersonality = 'british-butler' | 'military-commander' | 'scientist' | 'mentor';

interface ProsodySettings {
    pitch: number; // 0.5 - 2.0
    rate: number; // 0.5 - 2.0
    pauseMs: number; // 0 - 1000
    emotion: Emotion;
}

interface EmotionDetectionResult {
    emotion: Emotion;
    confidence: number;
    triggers: string[];
}

class ProsodyEngine {
    private emotionPatterns: Map<Emotion, RegExp[]> = new Map();
    private voiceProfiles: Map<VoicePersonality, Partial<ProsodySettings>> = new Map();

    constructor() {
        this.initializeEmotionPatterns();
        this.initializeVoiceProfiles();
    }

    private initializeEmotionPatterns(): void {
        // Confident patterns
        this.emotionPatterns.set('confident', [
            /\b(certainly|absolutely|definitely|of course|without a doubt)\b/gi,
            /\b(will|can|must|should)\b.*\b(be done|happen|occur)\b/gi,
            /\b(proven|verified|confirmed|established)\b/gi,
        ]);

        // Curious patterns
        this.emotionPatterns.set('curious', [
            /\b(interesting|fascinating|wonder|curious|what if)\b/gi,
            /\?(?!\s*$)/g, // Questions in middle of text
            /\b(perhaps|maybe|potentially|could be)\b/gi,
        ]);

        // Concerned patterns
        this.emotionPatterns.set('concerned', [
            /\b(warning|alert|caution|dangerous|risk|threat)\b/gi,
            /\b(unfortunately|regrettably|unfortunately)\b/gi,
            /\b(failure|error|failed|critical|urgent)\b/gi,
        ]);

        // Excited patterns
        this.emotionPatterns.set('excited', [
            /![!]+/g, // Multiple exclamation marks
            /\b(amazing|incredible|fantastic|excellent|wonderful|thrilled)\b/gi,
            /\b(breakthrough|success|completed|achieved)\b/gi,
        ]);

        // Calm patterns
        this.emotionPatterns.set('calm', [
            /\b(simply|just|relax|take your time|breathe)\b/gi,
            /\b(steady|controlled|measured|peaceful)\b/gi,
            /\.\s+[A-Z]/g, // Well-formed sentences
        ]);

        // Neutral (no specific patterns)
        this.emotionPatterns.set('neutral', []);
    }

    private initializeVoiceProfiles(): void {
        // British Butler (professional, controlled, sophisticated)
        this.voiceProfiles.set('british-butler', {
            pitch: 1.0,
            rate: 0.95,
            pauseMs: 100,
        });

        // Military Commander (authoritative, clear, direct)
        this.voiceProfiles.set('military-commander', {
            pitch: 0.9,
            rate: 0.9,
            pauseMs: 150,
        });

        // Scientist (precise, thoughtful, measured)
        this.voiceProfiles.set('scientist', {
            pitch: 1.1,
            rate: 0.85,
            pauseMs: 200,
        });

        // Mentor (warm, encouraging, personable)
        this.voiceProfiles.set('mentor', {
            pitch: 1.05,
            rate: 0.9,
            pauseMs: 120,
        });
    }

    /**
     * Detect emotion from text content
     */
    detectEmotion(text: string): EmotionDetectionResult {
        const emotions: Map<Emotion, number> = new Map();
        const triggers: string[] = [];

        // Score each emotion
        for (const [emotion, patterns] of this.emotionPatterns.entries()) {
            let score = 0;
            const emotionTriggers: string[] = [];

            for (const pattern of patterns) {
                const matches = text.match(pattern);
                if (matches) {
                    score += matches.length;
                    emotionTriggers.push(...matches);
                }
            }

            if (score > 0) {
                emotions.set(emotion, score);
                triggers.push(...emotionTriggers);
            }
        }

        // Find highest scoring emotion, default to neutral
        let topEmotion: Emotion = 'neutral';
        let topScore = 0;
        for (const [emotion, score] of emotions.entries()) {
            if (score > topScore) {
                topScore = score;
                topEmotion = emotion;
            }
        }

        const totalMatches = Array.from(emotions.values()).reduce((a, b) => a + b, 0);
        const confidence = totalMatches > 0 ? Math.min(totalMatches / 10, 1.0) : 0;

        return {
            emotion: topEmotion,
            confidence,
            triggers: Array.from(new Set(triggers)).slice(0, 5),
        };
    }

    /**
     * Generate prosody settings based on emotion and personality
     */
    generateProsody(
        emotion: Emotion,
        personality: VoicePersonality = 'british-butler',
        baseSettings?: Partial<ProsodySettings>
    ): ProsodySettings {
        const voiceBase = this.voiceProfiles.get(personality) || {};
        const defaults: ProsodySettings = {
            pitch: 1.0,
            rate: 1.0,
            pauseMs: 100,
            emotion: 'neutral',
        };

        const settings = { ...defaults, ...voiceBase, ...baseSettings, emotion };

        // Adjust based on emotion
        switch (emotion) {
            case 'excited':
                settings.pitch = Math.min(settings.pitch * 1.15, 2.0);
                settings.rate = Math.min(settings.rate * 1.2, 2.0);
                settings.pauseMs = Math.max(settings.pauseMs - 50, 0);
                break;
            case 'concerned':
                settings.pitch = Math.max(settings.pitch * 0.85, 0.5);
                settings.rate = Math.min(settings.rate * 0.85, 2.0);
                settings.pauseMs = Math.min(settings.pauseMs + 100, 1000);
                break;
            case 'curious':
                settings.pitch = Math.min(settings.pitch * 1.1, 2.0);
                settings.rate = Math.min(settings.rate * 1.05, 2.0);
                settings.pauseMs = Math.min(settings.pauseMs + 50, 1000);
                break;
            case 'calm':
                settings.pitch = Math.max(settings.pitch * 0.95, 0.5);
                settings.rate = Math.max(settings.rate * 0.9, 0.5);
                settings.pauseMs = Math.min(settings.pauseMs + 150, 1000);
                break;
            case 'confident':
                // Confident: slight pitch increase, faster rate
                settings.pitch = Math.min(settings.pitch * 1.05, 2.0);
                settings.rate = Math.min(settings.rate * 1.05, 2.0);
                settings.pauseMs = Math.max(settings.pauseMs - 30, 0);
                break;
            case 'neutral':
            default:
                // No adjustment
                break;
        }

        return settings;
    }

    /**
     * Insert prosodic breaks (pauses) for natural speech
     * Inserts SSML <break> tags for supported TTS engines
     */
    insertProsodyBreaks(text: string, pauseMs: number): string {
        if (pauseMs === 0) return text;

        // Add breaks after sentences for natural pausing
        const breakTag = `<break time="${pauseMs}ms"/>`;
        return text
            .replace(/([.!?])\s+/g, `$1${breakTag} `)
            .replace(/,\s+/g, `, <break time="${Math.floor(pauseMs / 2)}ms"/> `);
    }

    /**
     * Create SSML wrapper with prosody parameters
     */
    wrapInSSML(
        text: string,
        settings: ProsodySettings,
        voiceId: string = 'Aria' // ElevenLabs voice name
    ): string {
        // Format: SSML with pitch and rate adjustments
        const pitchSemitones = Math.round(Math.log2(settings.pitch) * 12);
        const ratePercent = Math.round(settings.rate * 100);

        return `<speak>
            <voice name="${voiceId}">
                <prosody pitch="${pitchSemitones > 0 ? '+' : ''}${pitchSemitones}st" rate="${ratePercent}%">
                    ${this.insertProsodyBreaks(text, settings.pauseMs)}
                </prosody>
            </voice>
        </speak>`;
    }

    /**
     * Analyze text and generate complete speech configuration
     */
    analyzeSpeech(
        text: string,
        personality: VoicePersonality = 'british-butler'
    ): {
        emotion: Emotion;
        confidence: number;
        prosody: ProsodySettings;
        ssml: string;
    } {
        const emotionResult = this.detectEmotion(text);
        const prosody = this.generateProsody(
            emotionResult.emotion,
            personality
        );
        const ssml = this.wrapInSSML(text, prosody);

        return {
            emotion: emotionResult.emotion,
            confidence: emotionResult.confidence,
            prosody,
            ssml,
        };
    }
}

// Export singleton
export const prosodyEngine = new ProsodyEngine();

export default ProsodyEngine;
