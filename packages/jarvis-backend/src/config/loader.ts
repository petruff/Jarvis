import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

export interface JarvisConfig {
    llm: {
        primary: string;
        // ── Free / Local ─────────────────────────────────────────
        ollama_base_url?: string;      // http://localhost:11434  (local, free)
        ollama_model?: string;         // e.g. llama3.2, deepseek-r1:7b
        groq_api_key?: string;         // Free tier: 6 000 req/day
        groq_model?: string;           // e.g. llama-3.3-70b-versatile
        // ── Paid (strategic / critical only) ─────────────────────
        anthropic_api_key?: string;
        anthropic_model?: string;
        deepseek_api_key?: string;
        moonshot_api_key?: string;
        openai_api_key?: string;
        google_api_key?: string;
    };
    voice: {
        provider?: 'openai';
        openai_voice?: string;
        openai_model?: string;
    };
    messaging: {
        telegram_token?: string;
        founder_telegram_id?: string;
        whatsapp_enabled?: boolean;
        owner_whatsapp_phone?: string;
    };
    jarvis: {
        founder_language?: string;
        founder_timezone?: string;
        trust_tier?: number;
        consciousness_cron?: string;
        briefing_cron?: string;
    };
    tools: {
        filesystem_allowed_paths: string[];
        web_search_api_key?: string;
        web_search_provider?: string;
        obsidian_vault_path?: string;
        composio_api_key?: string;
        github_token?: string;
    };
    chroma?: {
        url?: string;
        token?: string;
    };
}

const DEFAULT_CONFIG: JarvisConfig = {
    llm: {
        primary: 'tiered',
        ollama_base_url: 'http://localhost:11434',
        ollama_model: 'llama3.2',
        groq_model: 'llama-3.3-70b-versatile',
        anthropic_model: 'claude-3-5-haiku-20241022',
    },
    voice: { provider: 'openai', openai_voice: 'onyx', openai_model: 'tts-1' },
    messaging: { whatsapp_enabled: true },
    jarvis: {
        founder_language: 'en',
        founder_timezone: 'UTC',
        trust_tier: 1,
        consciousness_cron: '0 */6 * * *',
        briefing_cron: '0 8 * * *'
    },
    tools: { filesystem_allowed_paths: [] },
    chroma: { url: 'http://localhost:8000' }
};

export function loadConfig(): JarvisConfig {
    const configPath = path.resolve(process.cwd(), '../../.jarvis/config.json');
    let fileConfig: Partial<JarvisConfig> = {};

    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            fileConfig = JSON.parse(raw);
        } else {
            const altPath = path.resolve(process.cwd(), '../.jarvis/config.json');
            const doubleAltPath = path.resolve(__dirname, '../../../../.jarvis/config.json');
            if (fs.existsSync(altPath)) {
                fileConfig = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
            } else if (fs.existsSync(doubleAltPath)) {
                fileConfig = JSON.parse(fs.readFileSync(doubleAltPath, 'utf-8'));
            }
        }
    } catch (e: any) {
        console.warn(`[CONFIG] Failed to parse config.json: ${e.message}. Using defaults/.env`);
    }

    dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

    const config: JarvisConfig = {
        llm: { ...DEFAULT_CONFIG.llm, ...fileConfig.llm },
        voice: { ...DEFAULT_CONFIG.voice, ...fileConfig.voice },
        messaging: { ...DEFAULT_CONFIG.messaging, ...fileConfig.messaging },
        jarvis: { ...DEFAULT_CONFIG.jarvis, ...fileConfig.jarvis },
        tools: { ...DEFAULT_CONFIG.tools, ...fileConfig.tools },
        chroma: { ...DEFAULT_CONFIG.chroma, ...fileConfig.chroma },
    };

    // ── FREE: Ollama (local) ──────────────────────────────────────────────────
    if (!config.llm.ollama_base_url) config.llm.ollama_base_url = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    if (!config.llm.ollama_model) config.llm.ollama_model = process.env.OLLAMA_MODEL || 'llama3.2';

    // ── FREE: Groq API ────────────────────────────────────────────────────────
    if (!config.llm.groq_api_key) config.llm.groq_api_key = process.env.GROQ_API_KEY;
    if (!config.llm.groq_model) config.llm.groq_model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    // ── PAID: Claude / Anthropic (strategic tasks only) ───────────────────────
    if (!config.llm.anthropic_api_key) config.llm.anthropic_api_key = process.env.ANTHROPIC_API_KEY;
    if (!config.llm.anthropic_model) config.llm.anthropic_model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

    // ── PAID: Fallbacks ───────────────────────────────────────────────────────
    if (!config.llm.deepseek_api_key) config.llm.deepseek_api_key = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!config.llm.moonshot_api_key) config.llm.moonshot_api_key = process.env.MOONSHOT_API_KEY;
    if (!config.llm.google_api_key) config.llm.google_api_key = process.env.GOOGLE_API_KEY;

    // ── Supporting services ───────────────────────────────────────────────────
    if (!config.llm.openai_api_key) config.llm.openai_api_key = process.env.OPENAI_API_KEY;
    if (!config.voice.openai_voice) config.voice.openai_voice = process.env.OPENAI_VOICE;

    if (!config.messaging.telegram_token) config.messaging.telegram_token = process.env.TELEGRAM_BOT_TOKEN;
    if (!config.messaging.founder_telegram_id) config.messaging.founder_telegram_id = process.env.FOUNDER_TELEGRAM_ID;
    if (!config.messaging.owner_whatsapp_phone) config.messaging.owner_whatsapp_phone = process.env.OWNER_PHONE;

    if (!config.tools.obsidian_vault_path) config.tools.obsidian_vault_path = process.env.OBSIDIAN_VAULT_PATH;
    if (!config.tools.composio_api_key) config.tools.composio_api_key = process.env.COMPOSIO_API_KEY;
    if (!config.tools.github_token) config.tools.github_token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    // ── Startup report ────────────────────────────────────────────────────────
    console.log('\n[CONFIG] ═══ LLM Provider Status ══════════════════════════════');
    const ollamaOk = true; // Always attempt — health checked at query time
    console.log(`[CONFIG]  🖥️  Ollama  (FREE local)  → model: ${config.llm.ollama_model} @ ${config.llm.ollama_base_url}`);
    console.log(`[CONFIG]  ⚡  Groq    (FREE API)    → ${config.llm.groq_api_key ? '✅ key set' : '❌ no GROQ_API_KEY — get one free at groq.com'}`);
    console.log(`[CONFIG]  🧠  Claude  (paid/strategic) → ${config.llm.anthropic_api_key ? `✅ ${config.llm.anthropic_model}` : '⚠️  no ANTHROPIC_API_KEY'}`);
    console.log(`[CONFIG]  🔵  DeepSeek (paid/fallback) → ${config.llm.deepseek_api_key ? '✅' : '—'}`);
    console.log('[CONFIG] ════════════════════════════════════════════════════════\n');

    return config;
}

export const config = loadConfig();
