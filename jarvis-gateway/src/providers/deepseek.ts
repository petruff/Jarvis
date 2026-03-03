// src/providers/deepseek.ts
// DeepSeek AI Provider — OpenAI-compatible API

import OpenAI from 'openai';
import { AIProvider, AIResponse, Message, Tool } from './types';
import { logger } from '../logger';

export class DeepSeekProvider implements AIProvider {
    name = 'deepseek';
    model: string;
    private client: OpenAI;
    private apiKey: string;

    constructor(model: 'deepseek-chat' | 'deepseek-reasoner' = 'deepseek-chat') {
        this.model = model;
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.client = new OpenAI({
            apiKey: this.apiKey,
            baseURL: 'https://api.deepseek.com',
        });
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }

    async call(messages: Message[], tools?: Tool[]): Promise<AIResponse> {
        const params: OpenAI.ChatCompletionCreateParams = {
            model: this.model,
            messages: messages as OpenAI.ChatCompletionMessageParam[],
        };
        if (tools && tools.length > 0) {
            params.tools = tools as OpenAI.ChatCompletionTool[];
        }

        const response = await this.client.chat.completions.create(params);
        const choice = response.choices[0];

        logger.info(`[DeepSeek] model=${this.model} tokens=${response.usage?.total_tokens}`);

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
