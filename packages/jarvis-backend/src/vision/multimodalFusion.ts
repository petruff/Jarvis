/**
 * Multimodal Fusion Engine
 *
 * Combines:
 * - Voice (emotion, tone, content)
 * - Vision (gestures, scene, text)
 * - Context (conversation history, goals)
 *
 * Produces unified understanding for responses
 */

import { VisionAnalysis } from './visionModel';
import { Gesture } from './gestureRecognizer';
import { Emotion } from '../voice/prosodyEngine';

export interface MultimodalContext {
    // Voice modality
    voiceEmotion: Emotion;
    voiceConfidence: number;
    transcript: string;

    // Vision modality
    scene: string;
    objects: string[];
    gestures: Gesture[];
    detectedText: string[];

    // Fusion
    primaryIntent: string;
    secondaryIntents: string[];
    confidence: number;
    recommendation: string;
    timestamp: number;
}

export interface ResponseConfig {
    tone: Emotion;
    personality: string;
    formality: 'casual' | 'professional' | 'formal';
    language: 'en' | 'pt';
    modality: 'voice' | 'text' | 'both';
}

class MultimodalFusionEngine {
    /**
     * Fuse voice and vision contexts
     */
    fuseContexts(
        voiceEmotion: Emotion,
        voiceConfidence: number,
        transcript: string,
        visionAnalysis: VisionAnalysis,
        gestures: Gesture[]
    ): MultimodalContext {
        // Extract intent from voice
        const voiceIntent = this.extractVoiceIntent(transcript);

        // Extract intent from vision
        const visionIntent = this.extractVisionIntent(
            visionAnalysis,
            gestures
        );

        // Fuse intents
        const { primary, secondary, confidence } = this.fuseIntents(
            voiceIntent,
            visionIntent,
            voiceConfidence
        );

        // Generate recommendation
        const recommendation = this.generateRecommendation(
            primary,
            voiceEmotion,
            gestures,
            visionAnalysis
        );

        return {
            voiceEmotion,
            voiceConfidence,
            transcript,
            scene: visionAnalysis.description,
            objects: visionAnalysis.objects,
            gestures,
            detectedText: visionAnalysis.text,
            primaryIntent: primary,
            secondaryIntents: secondary,
            confidence,
            recommendation,
            timestamp: Date.now(),
        };
    }

    /**
     * Extract intent from voice transcript
     */
    private extractVoiceIntent(transcript: string): {
        intent: string;
        entities: string[];
        confidence: number;
    } {
        const text = transcript.toLowerCase();

        // Intent patterns
        const intents: Array<[RegExp, string]> = [
            [/show|display|look at|see/, 'observation'],
            [/tell|explain|describe/, 'explanation'],
            [/do|execute|perform|run/, 'action'],
            [/go|move|navigate/, 'navigation'],
            [/take|grab|pick up|hold/, 'manipulation'],
            [/listen|hear|sound/, 'audio'],
            [/read|text|write/, 'text_processing'],
            [/help|assist|support/, 'assistance'],
            [/analyze|check|examine/, 'analysis'],
            [/remember|save|store/, 'memory'],
        ];

        for (const [pattern, intent] of intents) {
            if (pattern.test(text)) {
                return {
                    intent,
                    entities: this.extractEntities(text),
                    confidence: 0.8,
                };
            }
        }

        return {
            intent: 'unknown',
            entities: [],
            confidence: 0.3,
        };
    }

    /**
     * Extract intent from vision
     */
    private extractVisionIntent(
        vision: VisionAnalysis,
        gestures: Gesture[]
    ): {
        intent: string;
        entities: string[];
        confidence: number;
    } {
        // Map gestures to intents
        const gestureIntents: Record<string, string> = {
            open_hand: 'stop',
            thumbs_up: 'approval',
            thumbs_down: 'rejection',
            pointing: 'reference',
            wave: 'greeting',
            swipe_left: 'previous',
            swipe_right: 'next',
            circle: 'repeat',
        };

        if (gestures.length > 0) {
            const gesture = gestures[gestures.length - 1]; // Last gesture
            const intent = gestureIntents[gesture.type] || 'gesture';

            return {
                intent,
                entities: [gesture.type],
                confidence: gesture.confidence,
            };
        }

        // Map objects to intents
        const intent = vision.objects.length > 0 ? 'observation' : 'passive';

        return {
            intent,
            entities: vision.objects,
            confidence: vision.confidence,
        };
    }

    /**
     * Fuse voice and vision intents
     */
    private fuseIntents(
        voiceIntent: { intent: string; entities: string[]; confidence: number },
        visionIntent: { intent: string; entities: string[]; confidence: number },
        voiceConfidence: number
    ): {
        primary: string;
        secondary: string[];
        confidence: number;
    } {
        // Weight voice higher (assumes user is primary input)
        const voiceWeight = 0.7;
        const visionWeight = 0.3;

        const combinedConfidence =
            voiceIntent.confidence * voiceWeight * voiceConfidence +
            visionIntent.confidence * visionWeight;

        // If voice and vision agree, boost confidence
        let primary = voiceIntent.intent;
        let secondary: string[] = [];

        if (voiceIntent.intent === visionIntent.intent) {
            // Aligned intents
            primary = voiceIntent.intent;
            secondary = [];
        } else if (combinedConfidence > 0.7) {
            // Use higher confidence
            primary =
                voiceIntent.confidence * voiceConfidence >
                visionIntent.confidence
                    ? voiceIntent.intent
                    : visionIntent.intent;
            secondary = [
                voiceIntent.confidence * voiceConfidence >
                visionIntent.confidence
                    ? visionIntent.intent
                    : voiceIntent.intent,
            ];
        } else {
            // Lower confidence - include both
            primary = voiceIntent.intent;
            secondary = [visionIntent.intent];
        }

        return {
            primary,
            secondary,
            confidence: Math.min(combinedConfidence, 1.0),
        };
    }

    /**
     * Generate response configuration based on fusion
     */
    generateResponseConfig(
        context: MultimodalContext,
        defaultPersonality: string = 'british-butler'
    ): ResponseConfig {
        // Determine formality from emotion
        const formalityMap: Record<Emotion, 'casual' | 'professional' | 'formal'> = {
            neutral: 'professional',
            confident: 'professional',
            curious: 'casual',
            concerned: 'formal',
            excited: 'casual',
            calm: 'professional',
        };

        return {
            tone: context.voiceEmotion,
            personality: defaultPersonality,
            formality: formalityMap[context.voiceEmotion],
            language: this.detectLanguage(context.transcript),
            modality: context.gestures.length > 0 ? 'both' : 'voice',
        };
    }

    /**
     * Generate contextual recommendation
     */
    private generateRecommendation(
        intent: string,
        emotion: Emotion,
        gestures: Gesture[],
        vision: VisionAnalysis
    ): string {
        const parts: string[] = [];

        // Intent-based
        switch (intent) {
            case 'observation':
                parts.push(
                    `The scene shows ${vision.objects.slice(0, 3).join(', ')}`
                );
                break;
            case 'action':
                parts.push('I will execute the requested action');
                break;
            case 'gesture':
                if (gestures.length > 0) {
                    parts.push(`You made a ${gestures[0].type} gesture`);
                }
                break;
        }

        // Emotion-based adjustment
        if (emotion === 'curious') {
            parts.push('I sense curiosity in your tone');
        } else if (emotion === 'concerned') {
            parts.push('I detect concern - I will be careful');
        } else if (emotion === 'excited') {
            parts.push('Your enthusiasm is clear');
        }

        return parts.length > 0
            ? parts.join('. ')
            : 'Processing your request...';
    }

    /**
     * Extract entities from text (people, places, objects)
     */
    private extractEntities(text: string): string[] {
        // Simple entity extraction (could be enhanced with NER)
        const entities: string[] = [];

        // Common object keywords
        const objectKeywords = [
            'door',
            'window',
            'table',
            'chair',
            'phone',
            'computer',
            'screen',
            'person',
            'person',
            'room',
        ];

        objectKeywords.forEach((keyword) => {
            if (text.includes(keyword)) {
                entities.push(keyword);
            }
        });

        return entities;
    }

    /**
     * Detect language from text
     */
    private detectLanguage(text: string): 'en' | 'pt' {
        // Simple heuristic: Portuguese-specific characters
        const ptPattern = /ã|õ|ç|ó|é|á/i;

        // Portuguese word patterns
        const ptWords = /\b(o|a|é|você|não|sim|obrigado|pode|fazer|dar)\b/i;

        return ptPattern.test(text) || ptWords.test(text) ? 'pt' : 'en';
    }

    /**
     * Generate contextual caption for UI
     */
    generateCaption(context: MultimodalContext): string {
        const parts: string[] = [];

        // Voice info
        if (context.voiceEmotion !== 'neutral') {
            parts.push(`[${context.voiceEmotion}]`);
        }

        // Gesture info
        if (context.gestures.length > 0) {
            const gesture = context.gestures[context.gestures.length - 1];
            parts.push(`🖐️ ${gesture.type}`);
        }

        // Intent
        parts.push(`Intent: ${context.primaryIntent}`);

        // Confidence
        parts.push(`(${(context.confidence * 100).toFixed(0)}%)`);

        return parts.join(' | ');
    }
}

export default MultimodalFusionEngine;
