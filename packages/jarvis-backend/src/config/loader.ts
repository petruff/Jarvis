import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

export interface JarvisConfig {
    llm: {
        primary: string;
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
    llm: { primary: 'deepseek' },
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
    chroma: { url: "http://localhost:8000" }
};

export function loadConfig(): JarvisConfig {
    const configPath = path.resolve(process.cwd(), '../../.jarvis/config.json');
    let fileConfig: Partial<JarvisConfig> = {};

    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            fileConfig = JSON.parse(raw);
        } else {
            // Try searching one dir up if running inside the package root rather than monorepo root
            const altPath = path.resolve(process.cwd(), '../.jarvis/config.json');
            const doubleAltPath = path.resolve(__dirname, '../../../../.jarvis/config.json');

            if (fs.existsSync(altPath)) {
                const raw = fs.readFileSync(altPath, 'utf-8');
                fileConfig = JSON.parse(raw);
            } else if (fs.existsSync(doubleAltPath)) {
                const raw = fs.readFileSync(doubleAltPath, 'utf-8');
                fileConfig = JSON.parse(raw);
            }
        }
    } catch (e: any) {
        console.warn(`[CONFIG] Failed to parse config.json: ${e.message}. Falling back to defaults/.env`);
    }

    dotenv.config({ path: path.resolve(__dirname, '../../../../.env') }); // Ensure exact route to root env too

    const config: JarvisConfig = {
        llm: { ...DEFAULT_CONFIG.llm, ...fileConfig.llm },
        voice: { ...DEFAULT_CONFIG.voice, ...fileConfig.voice },
        messaging: { ...DEFAULT_CONFIG.messaging, ...fileConfig.messaging },
        jarvis: { ...DEFAULT_CONFIG.jarvis, ...fileConfig.jarvis },
        tools: { ...DEFAULT_CONFIG.tools, ...fileConfig.tools },
        chroma: { ...DEFAULT_CONFIG.chroma, ...fileConfig.chroma }
    };

    // Environmental Fallbacks for Transition Period
    if (!config.llm.openai_api_key) config.llm.openai_api_key = process.env.OPENAI_API_KEY;
    if (!config.voice.openai_voice) config.voice.openai_voice = process.env.OPENAI_VOICE;
    if (!config.llm.deepseek_api_key) config.llm.deepseek_api_key = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!config.llm.moonshot_api_key) config.llm.moonshot_api_key = process.env.MOONSHOT_API_KEY;
    if (!config.llm.google_api_key) config.llm.google_api_key = process.env.GOOGLE_API_KEY;

    if (!config.messaging.telegram_token) config.messaging.telegram_token = process.env.TELEGRAM_BOT_TOKEN;
    if (!config.messaging.founder_telegram_id) config.messaging.founder_telegram_id = process.env.FOUNDER_TELEGRAM_ID;
    if (!config.messaging.owner_whatsapp_phone) config.messaging.owner_whatsapp_phone = process.env.OWNER_PHONE;

    // Operational Integrations (Phase A)
    if (!config.tools.obsidian_vault_path) config.tools.obsidian_vault_path = process.env.OBSIDIAN_VAULT_PATH;
    if (!config.tools.composio_api_key) config.tools.composio_api_key = process.env.COMPOSIO_API_KEY;
    if (!config.tools.github_token) config.tools.github_token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    // Validation (Silent warns just for LLM, critical for embedding)
    if (!config.llm.openai_api_key) {
        console.warn('[CONFIG] Missing openai_api_key (Needed for Embeddings)');
    }

    return config;
}

export const config = loadConfig();
