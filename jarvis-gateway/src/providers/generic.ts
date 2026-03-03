// src/providers/generic.ts
// Generic OpenAI-compatible provider — enables zero-code provider additions

import OpenAI from 'openai';
import { AIProvider, AIResponse, Message, Tool } from './types';
import { logger } from '../logger';

export interface GenericProviderConfig {
    id: string;
    name: string;
    baseURL: string;
    apiKey: string;
    model: string;
    temperature?: number;
}

export class GenericOpenAIProvider implements AIProvider {
    name: string;
    model: string;
    private client: OpenAI;
    private config: GenericProviderConfig;

    constructor(config: GenericProviderConfig) {
        this.config = config;
        this.name = config.id;
        this.model = config.model;
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
    }

    isAvailable(): boolean {
        return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 0);
    }

    async call(messages: Message[], tools?: Tool[]): Promise<AIResponse> {
        const params: OpenAI.ChatCompletionCreateParams = {
            model: this.model,
            messages: messages as OpenAI.ChatCompletionMessageParam[],
            temperature: this.config.temperature,
        };
        if (tools && tools.length > 0) {
            params.tools = tools as OpenAI.ChatCompletionTool[];
        }

        const response = await this.client.chat.completions.create(params);
        const choice = response.choices[0];

        logger.info(`[${this.name}] model=${this.model} tokens=${response.usage?.total_tokens}`);

        return {
            content: choice.message.content || '',
            toolCalls: choice.message.tool_calls?.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
            provider: this.name,
            model: this.model,
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            } : undefined,
            finishReason: choice.finish_reason,
        };
    }
}
