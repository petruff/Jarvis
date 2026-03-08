// src/llm.ts
// ═══════════════════════════════════════════════════════════════════════════════
//  JARVIS LLM Router — Tiered, cost-optimised
//
//  ROUTING ORDER (non-strategic squads):
//   1. Cache          — <10ms,   FREE
//   2. Ollama         — local,   FREE forever (no internet needed)
//   3. Groq           — API,     FREE (6 000 req/day, Llama 3.3 70B)
//   4. Claude Haiku   — API,     $0.25/$1.25 per 1M (strategic + fallback)
//   5. DeepSeek       — API,     $0.14/$0.28 per 1M
//   6. Kimi/Moonshot  — API,     last resort
//
//  STRATEGIC squads (board, vault, oracle, nexus):
//   1. Cache
//   2. Groq           — still free, and fast enough for strategy
//   3. Claude Sonnet  — best quality for high-stakes decisions
//   4. DeepSeek reasoner
//   5. Kimi
// ═══════════════════════════════════════════════════════════════════════════════

import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, recordCall } from './rateLimiter';

dotenv.config();
import { config } from './config/loader';

// ─── Token metrics ────────────────────────────────────────────────────────────
export const TokenMetrics = {
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
};

export const getAndResetTokenMetrics = () => {
    const m = { ...TokenMetrics };
    TokenMetrics.promptTokens = 0;
    TokenMetrics.completionTokens = 0;
    TokenMetrics.costUsd = 0;
    return m;
};

// Pricing per 1M tokens (USD)
const PRICING = {
    ollama: { prompt: 0, completion: 0 }, // FREE
    groq: { prompt: 0, completion: 0 }, // FREE tier
    claude_haiku: { prompt: 0.25, completion: 1.25 },
    claude_sonnet: { prompt: 3.00, completion: 15.00 },
    deepseek: { prompt: 0.14, completion: 0.28 },
    moonshot: { prompt: 1.00, completion: 1.00 },
};

// ─── Response cache (1 hour TTL) ─────────────────────────────────────────────
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3_600_000;

const crypto = require('crypto');
const cacheKey = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const fromCache = (k: string) => { const e = responseCache.get(k); return e && Date.now() - e.timestamp < CACHE_TTL ? e.response : null; };
const toCache = (k: string, v: string) => responseCache.set(k, { response: v, timestamp: Date.now() });

// ─── Squad classification ─────────────────────────────────────────────────────
const STRATEGIC_SQUADS = new Set(['board', 'vault', 'oracle', 'nexus']);
export const requiresDeepReasoning = (squadId: string): boolean =>
    STRATEGIC_SQUADS.has(squadId.toLowerCase());

// ─── Client initialisation ────────────────────────────────────────────────────
let groqClient: Groq | null = null;
let claudeClient: Anthropic | null = null;
let deepseek: OpenAI | null = null;
let kimi: OpenAI | null = null;
let genAI: GoogleGenerativeAI | null = null;
// Ollama uses OpenAI-compatible API — no extra package needed
let ollamaClient: OpenAI | null = null;

try {
    // Ollama — always attempt (localhost)
    ollamaClient = new OpenAI({
        apiKey: 'ollama', // Ollama ignores the key
        baseURL: config.llm.ollama_base_url || 'http://localhost:11434/v1',
    });
    console.log(`[LLM] 🖥️  Ollama client ready  → ${config.llm.ollama_base_url}/v1  (model: ${config.llm.ollama_model})`);

    // Groq — free API
    if (config.llm.groq_api_key) {
        groqClient = new Groq({ apiKey: config.llm.groq_api_key });
        console.log(`[LLM] ⚡ Groq client ready    → model: ${config.llm.groq_model}  (FREE)`);
    } else {
        console.warn('[LLM] ⚠️  GROQ_API_KEY not set — get one FREE at https://console.groq.com/');
    }

    // Claude — paid, strategic / fallback
    if (config.llm.anthropic_api_key) {
        claudeClient = new Anthropic({ apiKey: config.llm.anthropic_api_key });
        console.log(`[LLM] 🧠 Claude client ready  → model: ${config.llm.anthropic_model}`);
    }

    // DeepSeek — cheap fallback
    if (config.llm.deepseek_api_key) {
        deepseek = new OpenAI({ apiKey: config.llm.deepseek_api_key, baseURL: 'https://api.deepseek.com' });
        console.log(`[LLM] 🔵 DeepSeek ready       → fallback`);
    }

    // Kimi — last resort
    if (config.llm.moonshot_api_key) {
        kimi = new OpenAI({ apiKey: config.llm.moonshot_api_key, baseURL: 'https://api.moonshot.ai/v1' });
        console.log(`[LLM] 🟡 Kimi ready           → last-resort fallback`);
    }

    // Gemini — vision only
    if (config.llm.google_api_key) {
        genAI = new GoogleGenerativeAI(config.llm.google_api_key);
        console.log(`[LLM] 👁️  Gemini ready         → vision tasks`);
    }
} catch (err: any) {
    console.warn('[LLM] Client init warning:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Individual provider helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Ollama — local, completely FREE */
const queryOllama = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string
): Promise<string | null> => {
    if (!ollamaClient) return null;
    const model = config.llm.ollama_model || 'llama3.2';
    try {
        const t0 = Date.now();
        const completion = await ollamaClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            // Short timeout so we don't stall if Ollama isn't running
        });
        const text = completion.choices[0]?.message?.content || '';
        if (!text) return null;
        console.log(`[LLM-OLLAMA] ✓ ${model} replied in ${Date.now() - t0}ms (FREE)`);
        return text;
    } catch (err: any) {
        // Ollama not running is expected — silently fall through
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('404')) {
            // Don't spam logs — Ollama simply not running or misconfigured
        } else {
            console.warn(`[LLM-OLLAMA] ${err.message}`);
        }
        return null;
    }
};

/** Ollama streaming */
const queryOllamaStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (c: string) => void
): Promise<string | null> => {
    if (!ollamaClient) return null;
    const model = config.llm.ollama_model || 'llama3.2';
    try {
        const stream = await ollamaClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: true,
        });
        let full = '';
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) { full += delta; onChunk(delta); }
        }
        if (!full) return null;
        console.log(`[LLM-OLLAMA-STREAM] ✓ ${model} streamed ${full.length} chars (FREE)`);
        return full;
    } catch (err: any) {
        if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('404')) console.warn(`[LLM-OLLAMA-STREAM] ${err.message}`);
        return null;
    }
};

/** Groq — free API, Llama 3.3 70B */
const queryGroq = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string
): Promise<string | null> => {
    if (!groqClient) return null;
    const model = config.llm.groq_model || 'llama-3.3-70b-versatile';
    try {
        const t0 = Date.now();
        const completion = await groqClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 4096,
        });
        const text = completion.choices[0]?.message?.content || '';
        if (!text) return null;
        const usage = completion.usage;
        if (usage) {
            TokenMetrics.promptTokens += usage.prompt_tokens;
            TokenMetrics.completionTokens += usage.completion_tokens;
            // Groq free tier = $0
        }
        recordCall(0);
        console.log(`[LLM-GROQ] ✓ ${model} replied in ${Date.now() - t0}ms (FREE)`);
        return text;
    } catch (err: any) {
        console.warn(`[LLM-GROQ] ${err.message}`);
        return null;
    }
};

/** Groq streaming */
const queryGroqStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (c: string) => void,
    squadId: string
): Promise<string | null> => {
    if (!groqClient) return null;
    const model = config.llm.groq_model || 'llama-3.3-70b-versatile';
    try {
        const stream = await groqClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 4096,
            stream: true,
        });
        let full = '';
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) { full += delta; onChunk(delta); }
        }
        if (!full) return null;
        recordCall(0);
        console.log(`[LLM-GROQ-STREAM] ✓ ${model} streamed ${full.length} chars (FREE)`);
        return full;
    } catch (err: any) {
        console.warn(`[LLM-GROQ-STREAM] ${err.message}`);
        return null;
    }
};

/** Claude — paid, used for strategic squads + fallback */
const queryClaude = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string
): Promise<string | null> => {
    if (!claudeClient) return null;
    const strategic = requiresDeepReasoning(squadId);
    // Haiku for fallback on simple tasks, Sonnet for strategic
    const model = strategic
        ? (process.env.ANTHROPIC_MODEL_STRATEGIC || 'claude-3-5-sonnet-20241022')
        : (config.llm.anthropic_model || 'claude-3-5-haiku-20241022');
    const pricing = strategic ? PRICING.claude_sonnet : PRICING.claude_haiku;

    try {
        const t0 = Date.now();
        const completion = await claudeClient.messages.create({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });
        const text = (completion.content[0] as any)?.text || '';
        if (!text) return null;
        const u = completion.usage;
        const cost = (u.input_tokens / 1e6 * pricing.prompt) + (u.output_tokens / 1e6 * pricing.completion);
        TokenMetrics.promptTokens += u.input_tokens;
        TokenMetrics.completionTokens += u.output_tokens;
        TokenMetrics.costUsd += cost;
        recordCall(cost);
        console.log(`[LLM-CLAUDE] ✓ ${model} replied in ${Date.now() - t0}ms ($${cost.toFixed(5)})`);
        return text;
    } catch (err: any) {
        console.warn(`[LLM-CLAUDE] ${err.name}: ${err.message}`, err.stack);
        return null;
    }
};

/** Claude streaming */
const queryClaudeStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (c: string) => void,
    squadId: string
): Promise<string | null> => {
    if (!claudeClient) return null;
    const strategic = requiresDeepReasoning(squadId);
    const model = strategic
        ? (process.env.ANTHROPIC_MODEL_STRATEGIC || 'claude-3-5-sonnet-20241022')
        : (config.llm.anthropic_model || 'claude-3-5-haiku-20241022');
    const pricing = strategic ? PRICING.claude_sonnet : PRICING.claude_haiku;
    try {
        let full = '';
        const stream = claudeClient.messages.stream({
            model, max_tokens: 4096, system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                full += event.delta.text; onChunk(event.delta.text);
            }
        }
        if (!full) return null;
        const fm = await stream.finalMessage();
        const u = fm.usage;
        const cost = (u.input_tokens / 1e6 * pricing.prompt) + (u.output_tokens / 1e6 * pricing.completion);
        TokenMetrics.promptTokens += u.input_tokens;
        TokenMetrics.completionTokens += u.output_tokens;
        TokenMetrics.costUsd += cost;
        recordCall(cost);
        return full;
    } catch (err: any) {
        console.warn(`[LLM-CLAUDE-STREAM] ${err.message}`);
        return null;
    }
};

/** DeepSeek — cheap fallback */
const queryDeepSeek = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string
): Promise<string | null> => {
    if (!deepseek) return null;
    const model = requiresDeepReasoning(squadId) ? 'deepseek-reasoner' : 'deepseek-chat';
    try {
        const completion = await deepseek.chat.completions.create({
            model, max_tokens: 4096,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });
        const text = completion.choices[0]?.message?.content || '';
        if (!text) return null;
        const u = completion.usage;
        if (u) {
            const cost = (u.prompt_tokens / 1e6 * PRICING.deepseek.prompt) + (u.completion_tokens / 1e6 * PRICING.deepseek.completion);
            TokenMetrics.promptTokens += u.prompt_tokens;
            TokenMetrics.completionTokens += u.completion_tokens;
            TokenMetrics.costUsd += cost;
            recordCall(cost);
        }
        console.log(`[LLM-DEEPSEEK] ✓ ${model}`);
        return text;
    } catch (err: any) {
        console.warn(`[LLM-DEEPSEEK] ${err.message}`);
        return null;
    }
};

/** Kimi — last resort */
const queryKimi = async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    if (!kimi) return null;
    try {
        const completion = await kimi.chat.completions.create({
            model: 'moonshot-v1-8k',
            messages: [
                { role: 'system', content: systemPrompt.slice(0, 3000) }, // respect 8k limit
                { role: 'user', content: userPrompt.slice(0, 4000) },
            ],
        });
        const text = completion.choices[0]?.message?.content || '';
        if (!text) return null;
        const u = completion.usage;
        if (u) {
            const cost = (u.prompt_tokens / 1e6 * PRICING.moonshot.prompt) + (u.completion_tokens / 1e6 * PRICING.moonshot.completion);
            TokenMetrics.promptTokens += u.prompt_tokens;
            TokenMetrics.completionTokens += u.completion_tokens;
            TokenMetrics.costUsd += cost;
            recordCall(cost);
        }
        console.log(`[LLM-KIMI] ✓ moonshot-v1-8k`);
        return text;
    } catch (err: any) {
        console.warn(`[LLM-KIMI] ${err.message}`);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * queryLLM — standard (non-streaming) call
 *
 * Regular squads:   Cache → Ollama (FREE) → Groq (FREE) → Claude Haiku → DeepSeek → Kimi
 * Strategic squads: Cache → Groq (FREE)   → Claude Sonnet → DeepSeek  → Kimi
 */
export const queryLLM = async (
    systemPrompt: string,
    userPrompt: string,
    squadId: string = 'forge'
): Promise<string> => {
    const rateErr = checkRateLimit();
    if (rateErr) { console.warn('[LLM] Rate limited:', rateErr); return rateErr; }

    const ck = cacheKey(systemPrompt + '\n' + userPrompt);
    const hit = fromCache(ck);
    if (hit) { console.log('[LLM-CACHE] Hit!'); return hit; }

    const strategic = requiresDeepReasoning(squadId);

    if (!strategic) {
        // T2 — Ollama (local, free)
        const r = await queryOllama(systemPrompt, userPrompt, squadId);
        if (r) { toCache(ck, r); return r; }
    }

    // T3 — Kimi (Moonshot - Primary as requested)
    const kimiR = await queryKimi(systemPrompt, userPrompt);
    if (kimiR) { toCache(ck, kimiR); return kimiR; }

    // T4 — Claude (paid — Haiku for simple, Sonnet for strategic)
    const claudeR = await queryClaude(systemPrompt, userPrompt, squadId);
    if (claudeR) { toCache(ck, claudeR); return claudeR; }

    // T5 — Groq (free API)
    const dsR = await queryDeepSeek(systemPrompt, userPrompt, squadId);
    if (dsR) { toCache(ck, dsR); return dsR; }

    return '⚠️ All LLM providers unavailable. Install Ollama (free) or set GROQ_API_KEY in .env';
};

/**
 * queryLLMStream — streaming version
 *
 * Same routing as queryLLM but with real-time token streaming.
 */
export const queryLLMStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: string) => void,
    squadId: string = 'forge'
): Promise<string> => {
    const rateErr = checkRateLimit();
    if (rateErr) { onChunk(rateErr); return rateErr; }

    const ck = cacheKey(systemPrompt + '\n' + userPrompt);
    const hit = fromCache(ck);
    if (hit) {
        // Replay cached response word-by-word for consistent UX
        const words = hit.split(' ');
        for (let i = 0; i < words.length; i++) {
            onChunk((i === 0 ? '' : ' ') + words[i]);
            await new Promise(r => setTimeout(r, 5));
        }
        return hit;
    }

    const strategic = requiresDeepReasoning(squadId);

    if (!strategic) {
        // T2 — Ollama streaming
        const r = await queryOllamaStream(systemPrompt, userPrompt, onChunk);
        if (r) { toCache(ck, r); return r; }
    }

    // T3 — Kimi (simulate stream for fast action logic)
    const kimiR = await queryKimi(systemPrompt, userPrompt);
    if (kimiR) {
        const words = kimiR.split(' ');
        for (let i = 0; i < words.length; i++) {
            onChunk((i === 0 ? '' : ' ') + words[i]);
            await new Promise(r => setTimeout(r, 20));
        }
        toCache(ck, kimiR);
        return kimiR;
    }

    // T4 — Claude streaming
    const claudeR = await queryClaudeStream(systemPrompt, userPrompt, onChunk, squadId);
    if (claudeR) { toCache(ck, claudeR); return claudeR; }

    // T5 — Groq streaming
    const groqR = await queryGroqStream(systemPrompt, userPrompt, onChunk, squadId);
    if (groqR) { toCache(ck, groqR); return groqR; }

    // T6 — DeepSeek streaming
    if (deepseek && config.llm.deepseek_api_key) {
        const model = requiresDeepReasoning(squadId) ? 'deepseek-reasoner' : 'deepseek-chat';
        try {
            let full = '';
            const stream = await deepseek.chat.completions.create({
                model, stream: true, max_tokens: 4096,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            });
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                if (delta) { full += delta; onChunk(delta); }
            }
            if (full) { toCache(ck, full); return full; }
        } catch (err: any) {
            console.warn(`[LLM-DEEPSEEK-STREAM] ${err.message}`);
        }
    }

    const err = '⚠️ All LLM providers unavailable. Install Ollama (free) or set GROQ_API_KEY in .env';
    onChunk(err);
    return err;
};

// ─── Audio Transcription (Whisper via OpenAI) ─────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const transcribeAudio = async (audioBuffer: Buffer, mimetype: string): Promise<string> => {
    if (!config.llm.openai_api_key) throw new Error('OPENAI_API_KEY not configured for Whisper.');
    const openai = new OpenAI({ apiKey: config.llm.openai_api_key });
    let ext = 'ogg';
    if (mimetype.includes('mp4')) ext = 'mp4';
    if (mimetype.includes('mpeg')) ext = 'mp3';
    if (mimetype.includes('wav')) ext = 'wav';
    const tmp = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);
    fs.writeFileSync(tmp, audioBuffer);
    try {
        const resp = await openai.audio.transcriptions.create({ file: fs.createReadStream(tmp), model: 'whisper-1' });
        return resp.text;
    } finally {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
};

// ─── Vision (Gemini → Claude → text fallback) ─────────────────────────────────
export const queryVisionLLM = async (
    systemPrompt: string,
    userPrompt: string,
    imageBuffer: Buffer
): Promise<string> => {
    // Gemini vision (free tier)
    if (genAI && config.llm.google_api_key) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent([
                systemPrompt + '\n' + userPrompt,
                { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } },
            ]);
            return result.response.text();
        } catch (err: any) {
            console.warn('[Vision/Gemini]', err.message);
        }
    }
    // Claude vision fallback
    if (claudeClient) {
        try {
            const completion = await claudeClient.messages.create({
                model: config.llm.anthropic_model || 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBuffer.toString('base64') } },
                        { type: 'text', text: userPrompt },
                    ],
                }],
            });
            return (completion.content[0] as any)?.text || '';
        } catch (err: any) {
            console.warn('[Vision/Claude]', err.message);
        }
    }
    return queryLLM(systemPrompt, userPrompt);
};
