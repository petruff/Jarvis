// src/providers/types.ts
// Unified AI Provider interfaces

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
    name?: string;
}

export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface AIResponse {
    content: string;
    toolCalls?: ToolCall[];
    provider: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
}

export interface AIProvider {
    name: string;
    model: string;
    call(messages: Message[], tools?: Tool[], extraBody?: Record<string, unknown>): Promise<AIResponse>;
    isAvailable(): boolean;
}

export type TaskType = 'REASONING' | 'CODE' | 'FAST' | 'MARKETING' | 'DEFAULT';
