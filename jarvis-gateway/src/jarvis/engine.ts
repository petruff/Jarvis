// src/jarvis/engine.ts
// JARVIS Gateway Engine — Dumb Pipe relay to backend

import { logger } from '../logger';

export interface ProcessResult {
    response: string;
    needsApproval: boolean;
    approvalMessage?: string;
}

export async function processMessage(
    userMessage: string,
    channel: 'telegram' | 'whatsapp',
    image?: string
): Promise<ProcessResult> {
    const backendUrl = process.env.JARVIS_BACKEND_URL;

    logger.info(`[Engine] Relay message to backend: "${userMessage.slice(0, 50)}..."`);

    try {
        const response = await fetch(`${backendUrl}/api/mission/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, channel, image })
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);

        const data = await response.json() as any;

        if (!data.ok) throw new Error(data.error || 'Unknown backend error');

        return {
            response: data.response,
            needsApproval: data.needsApproval,
            approvalMessage: data.response // For legacy support
        };

    } catch (err) {
        logger.error(`[Engine] Backend relay failed: ${(err as Error).message}`);
        return {
            response: `⚠️  Sir, I am having trouble connecting to my core processors. Please ensure the backend is online. (Error: ${(err as Error).message})`,
            needsApproval: false
        };
    }
}
