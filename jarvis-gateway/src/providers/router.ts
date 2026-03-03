// src/providers/router.ts
// Smart provider routing based on task type with automatic fallback

import * as fs from 'fs';
import * as path from 'path';
import { AIProvider, AIResponse, Message, Tool, TaskType } from './types';
import { DeepSeekProvider } from './deepseek';
import { KimiProvider } from './kimi';
import { GenericOpenAIProvider } from './generic';
import { logger } from '../logger';

interface ProviderConfig {
    id: string;
    name: string;
    baseURL: string;
    apiKeyEnv: string;
    models: { default: string; reasoning?: string };
    temperature?: { default?: number; reasoning?: number };
    enabled: boolean;
    priority: number;
}

interface RoutingConfig {
    providers: ProviderConfig[];
    routing: Record<string, string>;
    fallback: { enabled: boolean; maxRetries: number };
}

export class ProviderRouter {
    private providers: Map<string, AIProvider> = new Map();
    private config: RoutingConfig;
    private usageLogPath: string;

    constructor() {
        const configPath = path.resolve(process.cwd(), 'config', 'providers.json');
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.usageLogPath = path.resolve(process.cwd(), 'logs', 'usage.jsonl');
        this.initProviders();
    }

    private initProviders(): void {
        // Built-in providers
        const deepseekDefault = new DeepSeekProvider('deepseek-chat');
        const deepseekReasoner = new DeepSeekProvider('deepseek-reasoner');
        const kimiDefault = new KimiProvider(false);
        const kimiThinking = new KimiProvider(true);

        this.providers.set('deepseek.default', deepseekDefault);
        this.providers.set('deepseek.reasoning', deepseekReasoner);
        this.providers.set('kimi.default', kimiDefault);
        this.providers.set('kimi.reasoning', kimiThinking);

        // Generic providers from config
        for (const pc of this.config.providers) {
            if (!pc.enabled) continue;
            if (pc.id === 'deepseek' || pc.id === 'kimi') continue; // Already registered

            const apiKey = process.env[pc.apiKeyEnv] || '';
            if (!apiKey) continue;

            const generic = new GenericOpenAIProvider({
                id: pc.id,
                name: pc.name,
                baseURL: pc.baseURL,
                apiKey,
                model: pc.models.default,
                temperature: pc.temperature?.default,
            });
            this.providers.set(`${pc.id}.default`, generic);
            logger.info(`[Router] Generic provider loaded: ${pc.name}`);
        }

        // Log which providers are available
        const available = [...this.providers.entries()]
            .filter(([, p]) => p.isAvailable())
            .map(([k]) => k);
        logger.info(`[Router] Available providers: ${available.join(', ')}`);
    }

    getProviderForTask(taskType: TaskType): AIProvider {
        const routeKey = this.config.routing[taskType] || this.config.routing['DEFAULT'];
        const provider = this.providers.get(routeKey);

        if (provider && provider.isAvailable()) {
            return provider;
        }

        // Fallback: find any available provider
        for (const [, p] of this.providers) {
            if (p.isAvailable()) {
                logger.warn(`[Router] Primary route ${routeKey} unavailable, using fallback: ${p.name}`);
                return p;
            }
        }

        throw new Error('No AI providers are available. Check your API keys in .env');
    }

    async call(
        messages: Message[],
        taskType: TaskType = 'DEFAULT',
        tools?: Tool[]
    ): Promise<AIResponse> {
        const provider = this.getProviderForTask(taskType);
        const maxRetries = this.config.fallback.enabled ? this.config.fallback.maxRetries : 1;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const start = Date.now();
                const response = await provider.call(messages, tools);
                const durationMs = Date.now() - start;

                // Log usage to JSONL
                this.logUsage({
                    timestamp: new Date().toISOString(),
                    provider: response.provider,
                    model: response.model,
                    taskType,
                    tokens: response.usage,
                    durationMs,
                });

                return response;
            } catch (err) {
                lastError = err as Error;
                logger.error(`[Router] Provider ${provider.name} failed (attempt ${attempt + 1}): ${lastError.message}`);

                // On retry, try next available provider
                if (attempt < maxRetries - 1) {
                    const fallbackProviders = [...this.providers.values()].filter(
                        p => p.isAvailable() && p.name !== provider.name
                    );
                    if (fallbackProviders.length > 0) {
                        logger.info(`[Router] Retrying with fallback: ${fallbackProviders[0].name}`);
                        return fallbackProviders[0].call(messages, tools);
                    }
                }
            }
        }

        throw lastError || new Error('All provider attempts failed');
    }

    getAvailableProviders(): string[] {
        return [...this.providers.entries()]
            .filter(([, p]) => p.isAvailable())
            .map(([key, p]) => `${key} (${p.model})`);
    }

    private logUsage(entry: Record<string, unknown>): void {
        try {
            fs.mkdirSync(path.dirname(this.usageLogPath), { recursive: true });
            fs.appendFileSync(this.usageLogPath, JSON.stringify(entry) + '\n');
        } catch {
            // Non-fatal
        }
    }
}
