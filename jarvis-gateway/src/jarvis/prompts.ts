// src/jarvis/prompts.ts
// Dynamic system prompt builder

import * as fs from 'fs';
import * as path from 'path';
import { loadContext } from './memory';
import { DispatchResult } from './dispatcher';

const IDENTITY_PATH = path.resolve(process.cwd(), 'config', 'JARVIS_IDENTITY.md');

function loadIdentity(): string {
    try {
        return fs.readFileSync(IDENTITY_PATH, 'utf-8');
    } catch {
        return '# JARVIS\nYou are JARVIS, an AI operating system.';
    }
}

export function buildSystemPrompt(dispatch: DispatchResult, channel: 'telegram' | 'whatsapp'): string {
    const identity = loadIdentity();
    const context = loadContext();

    const channelNote = channel === 'telegram'
        ? 'You are responding via Telegram. Use Telegram markdown formatting (*bold*, `code`, ```blocks```).'
        : 'You are responding via WhatsApp. Keep responses concise. Use plain text. Numbered options instead of buttons.';

    return `${identity}

---

## CURRENT AGENT CONTEXT

**Active Agent:** ${dispatch.agent}
**Department:** ${dispatch.department}
**Role:** ${dispatch.systemPromptHint}

---

## CHANNEL

${channelNote}

---

## CURRENT MEMORY CONTEXT

${context}

---

## INSTRUCTIONS

1. Read the memory context above before responding.
2. Execute the task using available tools.
3. Save all file deliverables to ./workspace/ .
4. After completing, summarize what was done in 1-2 sentences.
5. If an action requires approval (delete, push, external message), respond with [AGUARDANDO APROVAÇÃO] and explain what needs approval.
`;
}
