// src/providers/kimi.ts
// Kimi K2.5 Provider — OpenAI-compatible via Moonshot API

import OpenAI from 'openai';
import { AIProvider, AIResponse, Message, Tool } from './types';
import { logger } from '../logger';

export class KimiProvider implements AIProvider {
    name = 'kimi';
    model: string;
    private client: OpenAI;
    private apiKey: string;
    private useReasoning: boolean;

    constructor(useReasoning = false) {
        this.apiKey = process.env.MOONSHOT_API_KEY || '';
        this.model = 'moonshot-v1-128k';
        this.useReasoning = useReasoning;
        this.client = new OpenAI({
            apiKey: this.apiKey,
            baseURL: 'https://api.moonshot.ai/v1',
        });
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }

    async call(messages: Message[], tools?: Tool[]): Promise<AIResponse> {
        const temperature = this.useReasoning ? 1.0 : 0.6;

        const createParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            model: this.model,
            messages: messages as OpenAI.ChatCompletionMessageParam[],
            temperature,
            stream: false,
        };

        if (tools && tools.length > 0) {
            createParams.tools = tools as OpenAI.ChatCompletionTool[];
        }

        // Kimi thinking mode requires extra_body, use a cast via unknown
        const finalParams = this.useReasoning
            ? ({
                ...createParams,
                extra_body: { chat_template_kwargs: { thinking: true } },
            } as unknown as OpenAI.ChatCompletionCreateParamsNonStreaming)
            : createParams;

        const response = await this.client.chat.completions.create(finalParams) as OpenAI.ChatCompletion;
        const choice = response.choices[0];

        logger.info(`[Kimi] model=${this.model} reasoning=${this.useReasoning} tokens=${response.usage?.total_tokens}`);

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
