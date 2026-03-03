/**
 * Vision Model Integration — GPT-4V/Claude Vision Analysis
 *
 * Handles:
 * - Image description generation
 * - Object/scene detection
 * - Text extraction (OCR)
 * - Gesture/pose analysis
 * - Multimodal context fusion
 */

import OpenAI from 'openai';

export interface VisionAnalysis {
    description: string;
    objects: string[];
    scenes: string[];
    text: string[];
    gestures: string[];
    confidence: number;
    timestamp: number;
}

export interface VisionContext {
    imageBase64: string;
    analysisType: 'general' | 'gesture' | 'text' | 'objects' | 'scene';
    sessionId: string;
}

class VisionModel {
    private openai: OpenAI;
    private analysisCache: Map<string, VisionAnalysis> = new Map();
    private maxCacheSize = 100;

    constructor(apiKey: string = process.env.OPENAI_API_KEY || '') {
        this.openai = new OpenAI({ apiKey });
    }

    /**
     * Analyze image with GPT-4V
     */
    async analyzeImage(
        imageBase64: string,
        analysisType: 'general' | 'gesture' | 'text' | 'objects' | 'scene' = 'general'
    ): Promise<VisionAnalysis> {
        try {
            const cacheKey = `${imageBase64.slice(0, 50)}_${analysisType}`;

            // Check cache
            if (this.analysisCache.has(cacheKey)) {
                console.log('[VisionModel] Using cached analysis');
                return this.analysisCache.get(cacheKey)!;
            }

            // Generate analysis prompt based on type
            const prompt = this.generatePrompt(analysisType);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${imageBase64}`,
                                    detail: 'high',
                                },
                            },
                            {
                                type: 'text',
                                text: prompt,
                            },
                        ],
                    },
                ],
                max_tokens: 500,
                temperature: 0.7,
            });

            // Parse response
            const content = response.choices[0]?.message?.content || '';
            const analysis = this.parseAnalysis(content, analysisType);

            // Cache result
            this.updateCache(cacheKey, analysis);

            return analysis;
        } catch (error) {
            console.error('[VisionModel] Analysis error:', error);
            throw error;
        }
    }

    /**
     * Detect gestures from image
     */
    async detectGestures(imageBase64: string): Promise<{
        gestures: string[];
        confidence: number;
        description: string;
    }> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${imageBase64}`,
                                },
                            },
                            {
                                type: 'text',
                                text: `Analyze this image for human gestures and hand poses. List specific gestures detected (e.g., "open hand", "thumbs up", "pointing right"). Provide confidence level (0-1). Format response as JSON: {"gestures": [...], "confidence": 0.95, "description": "..."}`,
                            },
                        ],
                    },
                ],
                max_tokens: 300,
            });

            const content = response.choices[0]?.message?.content || '{}';

            try {
                return JSON.parse(content);
            } catch {
                return {
                    gestures: ['unknown'],
                    confidence: 0.3,
                    description: content,
                };
            }
        } catch (error) {
            console.error('[VisionModel] Gesture detection error:', error);
            throw error;
        }
    }

    /**
     * Extract text from image (OCR)
     */
    async extractText(imageBase64: string): Promise<{
        text: string;
        blocks: Array<{
            text: string;
            confidence: number;
            bounds: { x: number; y: number; width: number; height: number };
        }>;
    }> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${imageBase64}`,
                                },
                            },
                            {
                                type: 'text',
                                text: `Extract all text visible in this image. Return JSON format: {"text": "full concatenated text", "blocks": [{"text": "...", "confidence": 0.95}]}`,
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
            });

            const content = response.choices[0]?.message?.content || '{}';

            try {
                const parsed = JSON.parse(content);
                return {
                    text: parsed.text || '',
                    blocks: (parsed.blocks || []).map((block: any) => ({
                        text: block.text,
                        confidence: block.confidence || 0.8,
                        bounds: block.bounds || { x: 0, y: 0, width: 100, height: 100 },
                    })),
                };
            } catch {
                return {
                    text: content,
                    blocks: [{ text: content, confidence: 0.5, bounds: { x: 0, y: 0, width: 100, height: 100 } }],
                };
            }
        } catch (error) {
            console.error('[VisionModel] Text extraction error:', error);
            throw error;
        }
    }

    /**
     * Generate prompt based on analysis type
     */
    private generatePrompt(analysisType: string): string {
        switch (analysisType) {
            case 'gesture':
                return `Analyze this image for human gestures, hand poses, and body language. List specific gestures detected. Provide confidence.`;

            case 'text':
                return `Extract all readable text from this image. List text blocks and their positions.`;

            case 'objects':
                return `List all objects visible in this image. Describe their positions and relationships. Format: JSON with "objects" array.`;

            case 'scene':
                return `Describe the scene in detail. What is the setting? What activities are happening? List prominent objects and their arrangements.`;

            case 'general':
            default:
                return `Analyze this image. Describe what you see, including objects, people, actions, and text. Provide a comprehensive analysis.`;
        }
    }

    /**
     * Parse analysis response
     */
    private parseAnalysis(content: string, analysisType: string): VisionAnalysis {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);

            return {
                description: parsed.description || content,
                objects: parsed.objects || [],
                scenes: parsed.scenes || [parsed.scene || ''],
                text: parsed.text || [],
                gestures: parsed.gestures || [],
                confidence: parsed.confidence || 0.7,
                timestamp: Date.now(),
            };
        } catch {
            // Fallback: treat as plain text
            return {
                description: content,
                objects: [],
                scenes: [],
                text: [],
                gestures: [],
                confidence: 0.5,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Update cache with LRU eviction
     */
    private updateCache(key: string, analysis: VisionAnalysis): void {
        this.analysisCache.set(key, analysis);

        // LRU eviction
        if (this.analysisCache.size > this.maxCacheSize) {
            const firstKey = this.analysisCache.keys().next().value as string | undefined;
            if (firstKey) {
                this.analysisCache.delete(firstKey);
            }
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.analysisCache.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        utilization: number;
    } {
        return {
            size: this.analysisCache.size,
            maxSize: this.maxCacheSize,
            utilization: this.analysisCache.size / this.maxCacheSize,
        };
    }
}

export default VisionModel;
