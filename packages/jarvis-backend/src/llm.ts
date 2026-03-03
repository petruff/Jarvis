// src/llm.ts
// LLM module — Claude (Anthropic) is PRIMARY. DeepSeek & Kimi are fallbacks.

import Anthropic from '@anthropic-ai/sdk';
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
    claude_sonnet: { prompt: 3.00, completion: 15.00 },
    claude_haiku: { prompt: 0.25, completion: 1.25 },
    deepseek: { prompt: 0.14, completion: 0.28 },
    moonshot: { prompt: 1.00, completion: 1.00 },
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

console.log("[LLM] Initializing providers...");
console.log("[LLM] Claude/Anthropic Key Present:", !!config.llm.anthropic_api_key);
console.log("[LLM] DeepSeek Key Present:", !!config.llm.deepseek_api_key);
console.log("[LLM] Google Key Present:", !!config.llm.google_api_key);
console.log("[LLM] Kimi/Moonshot Key Present:", !!config.llm.moonshot_api_key);
console.log("[LLM] Primary LLM:", config.llm.primary || 'claude');

// Force environment variable reload if not in config
if (!config.llm.anthropic_api_key) {
    config.llm.anthropic_api_key = process.env.ANTHROPIC_API_KEY;
}
if (!config.llm.deepseek_api_key) {
    config.llm.deepseek_api_key = process.env.DEEPSEEK_API_KEY;
}
if (!config.llm.moonshot_api_key) {
    config.llm.moonshot_api_key = process.env.MOONSHOT_API_KEY;
}

// ─── Lazy-load clients ────────────────────────────────────────────────────────
let claudeClient: Anthropic | null = null;
let deepseek: OpenAI | null = null;
let kimi: OpenAI | null = null;
let genAI: GoogleGenerativeAI | null = null;

try {
    if (config.llm.anthropic_api_key) {
        claudeClient = new Anthropic({ apiKey: config.llm.anthropic_api_key });
        console.log("[LLM] ✅ Claude (Anthropic) client initialized — PRIMARY");
    } else {
        console.warn("[LLM] ⚠️  No ANTHROPIC_API_KEY found. Claude will be unavailable.");
    }

    if (config.llm.deepseek_api_key) {
        deepseek = new OpenAI({
            apiKey: config.llm.deepseek_api_key,
            baseURL: 'https://api.deepseek.com',
        });
        console.log("[LLM] ✅ DeepSeek client initialized — FALLBACK #1");
    }

    if (config.llm.moonshot_api_key) {
        kimi = new OpenAI({
            apiKey: config.llm.moonshot_api_key,
            baseURL: 'https://api.moonshot.ai/v1',
        });
        console.log("[LLM] ✅ Kimi/Moonshot client initialized — FALLBACK #2");
    }

    if (config.llm.google_api_key) {
        genAI = new GoogleGenerativeAI(config.llm.google_api_key);
        console.log("[LLM] ✅ Google Gemini initialized — Vision only");
    }

} catch (err: any) {
    console.warn("[LLM] Warning: One or more LLM clients failed to initialize:", err.message);
}

// ─── Squad routing helpers ─────────────────────────────────────────────────────
export const requiresDeepReasoning = (squadId: string): boolean => {
    const strategicSquads = ['board', 'vault', 'oracle', 'nexus'];
    return strategicSquads.includes(squadId.toLowerCase());
};

// Model selection based on task type
const getClaudeModel = (squadId: string): string => {
    // Use override from config if set, otherwise pick by squad type
    if (config.llm.anthropic_model) return config.llm.anthropic_model;
    return requiresDeepReasoning(squadId)
        ? 'claude-opus-4-5'             // deep reasoning / strategic
        : 'claude-3-5-sonnet-20241022'; // default high-quality
};

const getDeepSeekModel = (squadId: string): string =>
    requiresDeepReasoning(squadId) ? 'deepseek-reasoner' : 'deepseek-chat';

// ─── PRIMARY: Claude (non-streaming) ──────────────────────────────────────────
const queryClaude = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string,
    maxTokens: number = 4096
): Promise<string | null> => {
    if (!claudeClient) return null;

    const model = getClaudeModel(squadId);
    try {
        console.log(`[LLM-CLAUDE] Querying ${model}...`);
        const startTime = Date.now();

        const completion = await claudeClient.messages.create({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const usage = completion.usage;
        const pricing = requiresDeepReasoning(squadId) ? PRICING.claude_sonnet : PRICING.claude_sonnet;
        const callCost = (usage.input_tokens / 1_000_000 * pricing.prompt) +
            (usage.output_tokens / 1_000_000 * pricing.completion);
        TokenMetrics.promptTokens += usage.input_tokens;
        TokenMetrics.completionTokens += usage.output_tokens;
        TokenMetrics.costUsd += callCost;
        recordCall(callCost);

        const response = (completion.content[0] as any)?.text || '';
        const latency = Date.now() - startTime;
        console.log(`[LLM-CLAUDE] ✓ Response in ${latency}ms (${usage.output_tokens} tokens)`);
        return response;
    } catch (err: any) {
        console.warn(`[LLM-CLAUDE] Failed: ${err.message}`);
        return null;
    }
};

// ─── FALLBACK #1: DeepSeek (non-streaming) ────────────────────────────────────
const queryDeepSeek = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string
): Promise<string | null> => {
    if (!deepseek || !config.llm.deepseek_api_key) return null;

    const activeModel = getDeepSeekModel(squadId);
    try {
        console.log(`[LLM-DEEPSEEK] Querying ${activeModel}...`);
        const completion = await deepseek.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: activeModel,
            max_tokens: 4096,
        });
        const usage = completion.usage;
        if (usage) {
            const callCost = (usage.prompt_tokens / 1_000_000 * PRICING.deepseek.prompt) +
                (usage.completion_tokens / 1_000_000 * PRICING.deepseek.completion);
            TokenMetrics.promptTokens += usage.prompt_tokens;
            TokenMetrics.completionTokens += usage.completion_tokens;
            TokenMetrics.costUsd += callCost;
            recordCall(callCost);
        }
        return completion.choices[0].message.content || "";
    } catch (err: any) {
        console.warn(`[LLM-DEEPSEEK] Failed: ${err.message}`);
        return null;
    }
};

// ─── FALLBACK #2: Kimi/Moonshot (non-streaming) ───────────────────────────────
const queryKimi = async (
    systemPrompt: string,
    userPrompt: string
): Promise<string | null> => {
    if (!kimi || !config.llm.moonshot_api_key) return null;

    try {
        console.log(`[LLM-KIMI] Querying moonshot-v1-8k...`);
        const completion = await kimi.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "moonshot-v1-8k",
        });
        const usage = completion.usage;
        if (usage) {
            const callCost = (usage.prompt_tokens / 1_000_000 * PRICING.moonshot.prompt) +
                (usage.completion_tokens / 1_000_000 * PRICING.moonshot.completion);
            TokenMetrics.promptTokens += usage.prompt_tokens;
            TokenMetrics.completionTokens += usage.completion_tokens;
            TokenMetrics.costUsd += callCost;
            recordCall(callCost);
        }
        return completion.choices[0].message.content || "";
    } catch (err: any) {
        console.warn(`[LLM-KIMI] Failed: ${err.message}`);
        return null;
    }
};

/**
 * Standard (non-streaming) LLM query.
 * Order: Cache → Claude (PRIMARY) → DeepSeek (Fallback #1) → Kimi (Fallback #2)
 */
export const queryLLM = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string = 'forge'
): Promise<string> => {
    // ── Rate Limiter ──────────────────────────────────────────────────────────
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
        console.warn(`[LLM] Rate limited: ${rateLimitError}`);
        return rateLimitError;
    }

    // ── TIER 1: CACHE (<10ms) ─────────────────────────────────────────────────
    const cached = getCachedResponse(systemPrompt + '\n' + userPrompt);
    if (cached) return cached;

    // ── TIER 2: CLAUDE — PRIMARY ──────────────────────────────────────────────
    const claudeResponse = await queryClaude(systemPrompt, userPrompt, squadId);
    if (claudeResponse) {
        cacheResponse(systemPrompt + '\n' + userPrompt, claudeResponse);
        return claudeResponse;
    }

    // ── TIER 3: DEEPSEEK — FALLBACK #1 ───────────────────────────────────────
    const deepSeekResponse = await queryDeepSeek(systemPrompt, userPrompt, squadId);
    if (deepSeekResponse) {
        cacheResponse(systemPrompt + '\n' + userPrompt, deepSeekResponse);
        return deepSeekResponse;
    }

    // ── TIER 4: KIMI — FALLBACK #2 ────────────────────────────────────────────
    const kimiResponse = await queryKimi(systemPrompt, userPrompt);
    if (kimiResponse) {
        cacheResponse(systemPrompt + '\n' + userPrompt, kimiResponse);
        return kimiResponse;
    }

    return "⚠️ Error: All LLM providers unavailable. Check ANTHROPIC_API_KEY in your .env file.";
};

/**
 * Streaming LLM query — calls onChunk for each token, returns full response.
 * Order: Cache → Claude streaming (PRIMARY) → DeepSeek streaming (Fallback) → Kimi non-streaming
 */
export const queryLLMStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: string) => void,
    squadId: string = 'forge'
): Promise<string> => {
    // ── Rate Limiter ──────────────────────────────────────────────────────────
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
        console.warn(`[LLM] Stream rate limited: ${rateLimitError}`);
        onChunk(rateLimitError);
        return rateLimitError;
    }

    // ── TIER 1: CACHE (<10ms) — stream word-by-word for consistent UX ────────
    const cached = getCachedResponse(systemPrompt + '\n' + userPrompt);
    if (cached) {
        console.log('[LLM-CACHE] Hit! Streaming cached response');
        const words = cached.split(' ');
        for (let i = 0; i < words.length; i++) {
            onChunk((i === 0 ? '' : ' ') + words[i]);
            await new Promise(r => setTimeout(r, 5));
        }
        return cached;
    }

    // ── TIER 2: CLAUDE STREAMING — PRIMARY ───────────────────────────────────
    if (claudeClient) {
        const model = getClaudeModel(squadId);
        try {
            console.log(`[LLM-CLAUDE-STREAM] Streaming ${model}...`);
            let fullResponse = '';

            const stream = claudeClient.messages.stream({
                model,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            });

            for await (const event of stream) {
                if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'text_delta'
                ) {
                    const text = event.delta.text;
                    fullResponse += text;
                    onChunk(text);
                }
            }

            const finalMessage = await stream.finalMessage();
            const usage = finalMessage.usage;
            const pricing = PRICING.claude_sonnet;
            const callCost = (usage.input_tokens / 1_000_000 * pricing.prompt) +
                (usage.output_tokens / 1_000_000 * pricing.completion);
            TokenMetrics.promptTokens += usage.input_tokens;
            TokenMetrics.completionTokens += usage.output_tokens;
            TokenMetrics.costUsd += callCost;
            recordCall(callCost);

            console.log(`[LLM-CLAUDE-STREAM] ✓ Complete (${fullResponse.length} chars)`);
            cacheResponse(systemPrompt + '\n' + userPrompt, fullResponse);
            return fullResponse;
        } catch (err: any) {
            console.warn(`[LLM-CLAUDE-STREAM] Failed: ${err.message}. Falling back to DeepSeek.`);
        }
    }

    // ── TIER 3: DEEPSEEK STREAMING — FALLBACK #1 ─────────────────────────────
    if (deepseek && config.llm.deepseek_api_key) {
        const activeModel = getDeepSeekModel(squadId);
        try {
            console.log(`[LLM-DEEPSEEK-STREAM] Streaming ${activeModel}...`);
            let fullResponse = '';

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
                const reasoningDelta = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
                const baseDelta = chunk.choices[0]?.delta?.content || '';

                if (reasoningDelta) onChunk(`[THINKING] ${reasoningDelta}`);
                if (baseDelta) {
                    fullResponse += baseDelta;
                    onChunk(baseDelta);
                }
            }

            const estimatedPrompt = Math.ceil((systemPrompt.length + userPrompt.length) / 3.5);
            const estimatedCompletion = Math.ceil(fullResponse.length / 3.5);
            const streamCost = (estimatedPrompt / 1_000_000 * PRICING.deepseek.prompt) +
                (estimatedCompletion / 1_000_000 * PRICING.deepseek.completion);
            TokenMetrics.promptTokens += estimatedPrompt;
            TokenMetrics.completionTokens += estimatedCompletion;
            TokenMetrics.costUsd += streamCost;
            recordCall(streamCost);

            cacheResponse(systemPrompt + '\n' + userPrompt, fullResponse);
            return fullResponse;
        } catch (err: any) {
            console.warn(`[LLM-DEEPSEEK-STREAM] Failed: ${err.message}. Falling back to Kimi.`);
        }
    }

    // ── TIER 4: KIMI non-streaming — FALLBACK #2, simulate stream ────────────
    const text = await queryLLM(systemPrompt, userPrompt, squadId);
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
        onChunk((i === 0 ? '' : ' ') + words[i]);
        await new Promise(r => setTimeout(r, 20));
    }
    return text;
};

// ─── Audio Transcription (Whisper via OpenAI) ─────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const transcribeAudio = async (audioBuffer: Buffer, mimetype: string): Promise<string> => {
    if (!config.llm.openai_api_key) {
        throw new Error("OPENAI_API_KEY is not configured for Whisper transcription.");
    }
    const openai = new OpenAI({ apiKey: config.llm.openai_api_key });

    let ext = 'ogg';
    if (mimetype.includes('mp4')) ext = 'mp4';
    if (mimetype.includes('mpeg')) ext = 'mp3';
    if (mimetype.includes('wav')) ext = 'wav';

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
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
};

// ─── Vision LLM — Gemini flash, falls back to Claude text ────────────────────
export const queryVisionLLM = async (
    systemPrompt: string,
    userPrompt: string,
    imageBuffer: Buffer
): Promise<string> => {
    // Try Gemini vision first
    if (genAI && config.llm.google_api_key) {
        try {
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
            console.warn("[Vision/Gemini] Failed:", error.message, "— falling back to Claude text");
        }
    }

    // Fallback: Claude vision (pass image as base64)
    if (claudeClient) {
        try {
            const completion = await claudeClient.messages.create({
                model: config.llm.anthropic_model || 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: imageBuffer.toString('base64'),
                            },
                        },
                        { type: 'text', text: userPrompt }
                    ]
                }]
            });
            return (completion.content[0] as any)?.text || '';
        } catch (err: any) {
            console.warn("[Vision/Claude] Failed:", err.message);
        }
    }

    // Last resort: text-only via queryLLM
    return await queryLLM(systemPrompt, userPrompt);
};
