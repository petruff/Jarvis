// src/llm.ts
// LLM module with streaming support via DeepSeek & Kimi

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, recordCall } from './rateLimiter';

export const TokenMetrics = {
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
};

export const getAndResetTokenMetrics = () => {
    const metrics = { ...TokenMetrics };
    TokenMetrics.promptTokens = 0;
    TokenMetrics.completionTokens = 0;
    TokenMetrics.costUsd = 0;
    return metrics;
};

// Pricing estimates (per 1M tokens)
const PRICING = {
    deepseek: { prompt: 0.14, completion: 0.28 },
    moonshot: { prompt: 1.00, completion: 1.00 } // Approx
};

// ===== FAST RESPONSE CACHE =====
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

function getCacheKey(prompt: string): string {
    return Buffer.from(prompt).toString('base64').substring(0, 50);
}

function getCachedResponse(prompt: string): string | null {
    const key = getCacheKey(prompt);
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[LLM-CACHE] Hit! Returning cached response (<10ms)');
        return cached.response;
    }
    return null;
}

function cacheResponse(prompt: string, response: string): void {
    const key = getCacheKey(prompt);
    responseCache.set(key, { response, timestamp: Date.now() });
}

dotenv.config();

import { config } from './config/loader';

console.log("Loading LLM module...");
console.log("DeepSeek Key Present:", !!config.llm.deepseek_api_key);
console.log("Google Key Present:", !!config.llm.google_api_key);
console.log("Kimi/Moonshot Key Present:", !!config.llm.moonshot_api_key);

// Force environment variable reload if not in config
if (!config.llm.deepseek_api_key) {
    config.llm.deepseek_api_key = process.env.DEEPSEEK_API_KEY;
    console.log("Loaded DeepSeek from env:", !!config.llm.deepseek_api_key);
}
if (!config.llm.moonshot_api_key) {
    config.llm.moonshot_api_key = process.env.MOONSHOT_API_KEY;
    console.log("Loaded Moonshot from env:", !!config.llm.moonshot_api_key);
}

// Lazy-load clients to prevent startup hangs
let genAI: any;
let deepseek: any;
let kimi: any;
let haiku: any; // Claude Haiku for fast inference

try {
    genAI = new GoogleGenerativeAI(config.llm.google_api_key || "");
    deepseek = new OpenAI({
        apiKey: config.llm.deepseek_api_key,
        baseURL: 'https://api.deepseek.com',
    });
    kimi = new OpenAI({
        apiKey: config.llm.moonshot_api_key || "",
        baseURL: 'https://api.moonshot.ai/v1',
    });
    haiku = new OpenAI({
        apiKey: config.llm.openai_api_key || "",
    });
    console.log("[LLM] Clients initialized successfully");
} catch (err: any) {
    console.warn("[LLM] Warning: LLM clients failed to initialize:", err.message);
    console.log("[LLM] Continuing without LLM support...");
}

export const requiresDeepReasoning = (squadId: string): boolean => {
    const strategicSquads = ['board', 'vault', 'oracle', 'nexus'];
    return strategicSquads.includes(squadId.toLowerCase());
};

/**
 * TIER 2 FAST INFERENCE: Quick response using Claude Haiku (50-200ms)
 * Ideal for: FAQs, factual questions, simple clarifications
 */
const fastInferenceHaiku = async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    if (!haiku || !config.llm.openai_api_key) {
        return null;
    }

    try {
        console.log('[LLM-HAIKU] Attempting fast inference...');
        const startTime = Date.now();

        const completion = await haiku.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ]
        });

        const response = completion.content[0]?.text || '';
        const latency = Date.now() - startTime;
        console.log(`[LLM-HAIKU] ✓ Response in ${latency}ms`);

        return response;
    } catch (err: any) {
        console.log(`[LLM-HAIKU] Failed (${err.message}), falling back to DeepSeek`);
        return null;
    }
};

/**
 * Standard (non-streaming) LLM query with cache → FastInference → DeepSeek → Kimi fallback
 */
export const queryLLM = async (systemPrompt: string, userPrompt: string, squadId: string = 'forge'): Promise<string> => {
    // Check if LLM is initialized
    if (!deepseek) {
        return "⚠️ LLM service not available. Please check API keys configuration.";
    }

    // ── Rate Limiter Check ────────────────────────────────────────────────────
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
        console.warn(`[LLM] Blocked by rate limiter: ${rateLimitError}`);
        return rateLimitError;
    }

    // ── TIER 1: CACHE (<10ms) ────────────────────────────────────────────────
    const cacheKey = getCacheKey(systemPrompt + '\n' + userPrompt);
    const cached = getCachedResponse(systemPrompt + '\n' + userPrompt);
    if (cached) {
        return cached;
    }

    const activeModel = requiresDeepReasoning(squadId) ? 'deepseek-reasoner' : 'deepseek-chat';

    // ── TIER 2: FAST INFERENCE (50-200ms) ────────────────────────────────────
    // Skip Haiku for strategic squads that need deep reasoning
    if (!requiresDeepReasoning(squadId)) {
        const haikuResponse = await fastInferenceHaiku(systemPrompt, userPrompt);
        if (haikuResponse) {
            // Cache the Haiku response for future hits
            cacheResponse(systemPrompt + '\n' + userPrompt, haikuResponse);
            return haikuResponse;
        }
    }
    try {
        console.log(`[LLM] Querying DeepSeek ${activeModel}...`);
        const completion = await deepseek.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: activeModel,
            max_tokens: 4096,
        });
        const usage = completion.usage;
        let callCost = 0;
        if (usage) {
            callCost = (usage.prompt_tokens / 1000000 * PRICING.deepseek.prompt) + (usage.completion_tokens / 1000000 * PRICING.deepseek.completion);
            TokenMetrics.promptTokens += usage.prompt_tokens;
            TokenMetrics.completionTokens += usage.completion_tokens;
            TokenMetrics.costUsd += callCost;
        }
        recordCall(callCost);
        const response = completion.choices[0].message.content || "";

        // ── CACHE RESPONSE FOR FUTURE HITS ────────────────────────────────────
        cacheResponse(systemPrompt + '\n' + userPrompt, response);

        return response;
    } catch (err: any) {
        console.error("[LLM] DeepSeek failed:", err.message);
    }


    // 2. Kimi fallback
    if (config.llm.moonshot_api_key) {
        try {
            console.log(`[LLM] Querying Kimi...`);
            const completion = await kimi.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: "moonshot-v1-8k",
            });
            const usage = completion.usage;
            let callCost = 0;
            if (usage) {
                callCost = (usage.prompt_tokens / 1000000 * PRICING.moonshot.prompt) + (usage.completion_tokens / 1000000 * PRICING.moonshot.completion);
                TokenMetrics.promptTokens += usage.prompt_tokens;
                TokenMetrics.completionTokens += usage.completion_tokens;
                TokenMetrics.costUsd += callCost;
            }
            recordCall(callCost);
            return completion.choices[0].message.content || "";
        } catch (err: any) {
            console.error("[LLM] Kimi failed:", err.message);
        }
    }

    return "Error: No AI provider available. Check DEEPSEEK_API_KEY and MOONSHOT_API_KEY.";
};

/**
 * Streaming LLM query — calls onChunk for each token, returns full response.
 * Uses cache → DeepSeek streaming → Kimi non-streaming fallback.
 */
export const queryLLMStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: string) => void,
    squadId: string = 'forge'
): Promise<string> => {
    // ── Rate Limiter Check ────────────────────────────────────────────────────
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
        console.warn(`[LLM] Stream blocked by rate limiter: ${rateLimitError}`);
        onChunk(rateLimitError);
        return rateLimitError;
    }

    // ── TIER 1: CACHE (<10ms) ────────────────────────────────────────────────
    const cached = getCachedResponse(systemPrompt + '\n' + userPrompt);
    if (cached) {
        console.log('[LLM-CACHE] Hit! Returning cached response via stream');
        // Stream the cached response word-by-word for consistent UX
        const words = cached.split(' ');
        for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? '' : ' ') + words[i];
            onChunk(chunk);
            await new Promise(r => setTimeout(r, 5)); // Faster than non-cached fallback
        }
        return cached;
    }

    // ── TIER 2: FAST INFERENCE (50-200ms) ────────────────────────────────────
    // Try Haiku for non-strategic queries
    if (!requiresDeepReasoning(squadId)) {
        const haikuResponse = await fastInferenceHaiku(systemPrompt, userPrompt);
        if (haikuResponse) {
            console.log('[LLM-HAIKU-STREAM] Streaming Haiku response...');
            // Stream the Haiku response with word-by-word chunks for immediate feedback
            const words = haikuResponse.split(' ');
            let fullHaikuResponse = '';
            for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                fullHaikuResponse += chunk;
                onChunk(chunk);
                await new Promise(r => setTimeout(r, 10));
            }
            // Cache the Haiku response
            cacheResponse(systemPrompt + '\n' + userPrompt, fullHaikuResponse);
            return fullHaikuResponse;
        }
    }

    let fullResponse = '';

    // Try DeepSeek streaming first (Tier 3)
    if (config.llm.deepseek_api_key) {
        const activeModel = requiresDeepReasoning(squadId) ? 'deepseek-reasoner' : 'deepseek-chat';
        try {
            console.log(`[LLM] Streaming from DeepSeek ${activeModel}...`);
            const stream = await deepseek.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: activeModel,
                stream: true,
                max_tokens: 4096,
            });

            for await (const chunk of stream) {
                // Parse reasoning layer from deepseek-reasoner
                const reasoningDelta = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
                const baseDelta = chunk.choices[0]?.delta?.content || '';

                if (reasoningDelta) {
                    onChunk(`[THINKING] ${reasoningDelta}`);
                }
                if (baseDelta) {
                    fullResponse += baseDelta;
                    onChunk(baseDelta);
                }
            }
            console.log(`[LLM] Stream complete (${fullResponse.length} chars)`);

            // Heuristic for stream token usage if completion usage not available
            // Note: Reasoning tokens aren't explicitly counted via standard stream delta on openai library, using simple estimate
            const estimatedPrompt = Math.ceil((systemPrompt.length + userPrompt.length) / 3.5);
            const estimatedCompletion = Math.ceil(fullResponse.length / 3.5);
            const streamCost = (estimatedPrompt / 1000000 * PRICING.deepseek.prompt) + (estimatedCompletion / 1000000 * PRICING.deepseek.completion);
            TokenMetrics.promptTokens += estimatedPrompt;
            TokenMetrics.completionTokens += estimatedCompletion;
            TokenMetrics.costUsd += streamCost;
            recordCall(streamCost);

            // ── CACHE SUCCESSFUL STREAM RESPONSE ────────────────────────────────────
            cacheResponse(systemPrompt + '\n' + userPrompt, fullResponse);

            return fullResponse;
        } catch (err: any) {
            console.error('[LLM] DeepSeek stream failed:', err.message);
            fullResponse = '';
        }
    }

    // Fallback to non-streaming Kimi
    const text = await queryLLM(systemPrompt, userPrompt);
    // Simulate streaming for consistent UX — emit words in chunks
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        onChunk(chunk);
        // Small delay to simulate streaming feel
        await new Promise(r => setTimeout(r, 20));
    }
    return text;
};

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Transcribe incoming audio using OpenAI Whisper
 */
export const transcribeAudio = async (audioBuffer: Buffer, mimetype: string): Promise<string> => {
    if (!config.llm.openai_api_key) {
        throw new Error("OPENAI_API_KEY is not configured for Whisper transcription.");
    }
    const openai = new OpenAI({ apiKey: config.llm.openai_api_key });

    // Determine extension from mimetype
    let ext = 'ogg';
    if (mimetype.includes('mp4')) ext = 'mp4';
    if (mimetype.includes('mpeg')) ext = 'mp3';
    if (mimetype.includes('wav')) ext = 'wav';

    // Write buffer to temp file
    const tempFilePath = path.join(os.tmpdir(), `whatsapp_audio_${Date.now()}.${ext}`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
        console.log(`[LLM/Whisper] Transcribing audio file: ${tempFilePath}`);
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1',
        });
        return response.text;
    } finally {
        // Cleanup temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

/**
 * Vision LLM — uses gemini-1.5-flash with DeepSeek text fallback
 */
export const queryVisionLLM = async (systemPrompt: string, userPrompt: string, imageBuffer: Buffer): Promise<string> => {
    try {
        if (!config.llm.google_api_key) {
            console.warn("[Vision] No GOOGLE_API_KEY — falling back to text-only");
            return await queryLLM(systemPrompt, userPrompt);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: "image/png",
            },
        };

        const result = await model.generateContent([systemPrompt + "\n" + userPrompt, imagePart]);
        return result.response.text();
    } catch (error: any) {
        console.error("Vision LLM failed:", error);
        try {
            return await queryLLM(systemPrompt, userPrompt);
        } catch {
            return `Error interacting with Vision AI: ${error.message}`;
        }
    }
};
