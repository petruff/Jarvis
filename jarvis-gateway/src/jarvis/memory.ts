// src/jarvis/memory.ts
// Filesystem-based memory system — reads/writes ./memory/ directory

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

const MEMORY_DIR = process.env.MEMORY_DIR || './memory';
const MAX_CONTEXT_CHARS = 16000; // ~4000 tokens

function memoryPath(filename: string): string {
    return path.resolve(process.cwd(), MEMORY_DIR, filename);
}

function ensureMemoryDir(): void {
    const dir = path.resolve(process.cwd(), MEMORY_DIR);
    fs.mkdirSync(dir, { recursive: true });
}

export function initMemory(): void {
    ensureMemoryDir();
    const files = {
        'context.md': '# JARVIS Context\n\n_No context yet. This file will be updated automatically._\n',
        'decisions.md': '# Decision Log\n\n_Decisions will be logged here._\n',
        'patterns.md': '# Learned Patterns\n\n_Behavioral patterns will be tracked here._\n',
        'knowledge.md': '# Knowledge Base\n\n_Domain knowledge will be accumulated here._\n',
        'squad-history.md': '# Squad Execution History\n\n_Squad results will be logged here._\n',
    };
    for (const [name, defaultContent] of Object.entries(files)) {
        const p = memoryPath(name);
        if (!fs.existsSync(p)) {
            fs.writeFileSync(p, defaultContent, 'utf-8');
            logger.info(`[Memory] Initialized ${name}`);
        }
    }
    // Ensure deliverables dir exists
    const delivDir = path.resolve(process.cwd(), 'deliverables');
    fs.mkdirSync(delivDir, { recursive: true });
}

export function loadContext(): string {
    try {
        const content = fs.readFileSync(memoryPath('context.md'), 'utf-8');
        // Trim if too long
        if (content.length > MAX_CONTEXT_CHARS) {
            const trimmed = content.slice(-MAX_CONTEXT_CHARS);
            const firstNewline = trimmed.indexOf('\n');
            return '[...older context trimmed...]\n' + trimmed.slice(firstNewline + 1);
        }
        return content;
    } catch {
        return '# JARVIS Context\n\n_No context available._\n';
    }
}

export function updateContext(newContent: string): void {
    ensureMemoryDir();
    fs.writeFileSync(memoryPath('context.md'), newContent, 'utf-8');
    logger.info('[Memory] context.md updated');
}

export function appendContext(entry: string): void {
    ensureMemoryDir();
    const current = loadContext();
    const timestamp = new Date().toISOString();
    const updated = current + `\n---\n_${timestamp}_\n${entry}\n`;
    // Auto-trim if too long
    if (updated.length > MAX_CONTEXT_CHARS * 1.5) {
        const trimmed = updated.slice(-MAX_CONTEXT_CHARS);
        updateContext('[...context auto-trimmed to fit...]\n' + trimmed);
    } else {
        updateContext(updated);
    }
}

export function logDecision(decision: string): void {
    ensureMemoryDir();
    const p = memoryPath('decisions.md');
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n${decision}\n`;
    fs.appendFileSync(p, entry, 'utf-8');
}

export function getContext(): string {
    return loadContext();
}

// ─── Squad History ───────────────────────────────────────────────────────────

export function logSquadTask(squadId: string, task: string, result: string): void {
    ensureMemoryDir();
    const p = memoryPath('squad-history.md');
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp} — ${squadId.toUpperCase()}\n**Task:** ${task.slice(0, 120)}\n**Resultado (preview):** ${result.slice(0, 400)}\n`;
    fs.appendFileSync(p, entry, 'utf-8');
}

// ─── Deliverables ─────────────────────────────────────────────────────────────

export function saveDeliverable(squadId: string, filename: string, content: string): string {
    const dir = path.resolve(process.cwd(), 'deliverables', squadId);
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fullPath = path.join(dir, `${ts}-${filename}`);
    fs.writeFileSync(fullPath, content, 'utf-8');
    logger.info(`[Memory] Deliverable saved: ${fullPath}`);
    return fullPath;
}
