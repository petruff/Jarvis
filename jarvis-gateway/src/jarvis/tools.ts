// src/jarvis/tools.ts
// Tool registry — OpenAI function-calling definitions and execution logic

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { Tool } from '../providers/types';
import { getContext, updateContext } from './memory';
import { checkGuardrails } from '../security/guardrails';
import { logger } from '../logger';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || './workspace';

function workspacePath(relativePath: string): string {
    const base = path.resolve(process.cwd(), WORKSPACE_DIR);
    const target = path.resolve(base, relativePath);
    // Enforce sandbox
    if (!target.startsWith(base)) {
        throw new Error(`Access denied: ${relativePath} is outside workspace`);
    }
    return target;
}

function ensureWorkspace(): void {
    fs.mkdirSync(path.resolve(process.cwd(), WORKSPACE_DIR), { recursive: true });
}

// ── TOOL DEFINITIONS (for OpenAI function calling) ──────────────────────────

export const TOOL_DEFINITIONS: Tool[] = [
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the content of a file from the workspace directory.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Relative path to the file within workspace' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: 'Write content to a file in the workspace directory. Creates directories as needed.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Relative path within workspace' },
                    content: { type: 'string', description: 'Content to write to the file' },
                },
                required: ['path', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_files',
            description: 'List files and directories in a workspace directory.',
            parameters: {
                type: 'object',
                properties: {
                    dir: { type: 'string', description: 'Relative directory path within workspace (use "." for root)' },
                },
                required: ['dir'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a shell command in the workspace directory. Blocked commands: rm -rf, sudo, format, dd, etc.',
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Shell command to execute' },
                },
                required: ['command'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_search',
            description: 'Search the web using Brave Search API.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_context',
            description: 'Get the current JARVIS memory context (context.md).',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_context',
            description: 'Update the JARVIS memory context (context.md) with new content.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'New content for context.md' },
                },
                required: ['content'],
            },
        },
    },
];

// ── TOOL EXECUTION ───────────────────────────────────────────────────────────

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
    logger.info(`[Tools] Executing: ${name} args=${JSON.stringify(args)}`);

    switch (name) {
        case 'read_file': {
            const filePath = workspacePath(args.path);
            if (!fs.existsSync(filePath)) return `Error: file not found: ${args.path}`;
            return fs.readFileSync(filePath, 'utf-8');
        }

        case 'write_file': {
            checkGuardrails('write_file', args);
            const filePath = workspacePath(args.path);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, args.content, 'utf-8');
            return `✅ File written: ${args.path} (${args.content.length} chars)`;
        }

        case 'list_files': {
            ensureWorkspace();
            const dir = workspacePath(args.dir || '.');
            if (!fs.existsSync(dir)) return `Error: directory not found: ${args.dir}`;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            return entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n') || '(empty)';
        }

        case 'run_command': {
            checkGuardrails('run_command', args);
            const workDir = path.resolve(process.cwd(), WORKSPACE_DIR);
            fs.mkdirSync(workDir, { recursive: true });
            try {
                const result = child_process.execSync(args.command, {
                    cwd: workDir,
                    timeout: 30000,
                    maxBuffer: 1024 * 1024,
                    shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
                });
                return result.toString('utf-8') || '(no output)';
            } catch (err: unknown) {
                const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
                const stdout = e.stdout?.toString() || '';
                const stderr = e.stderr?.toString() || '';
                return `Error:\n${stderr || e.message}\n${stdout}`;
            }
        }

        case 'web_search': {
            const braveKey = process.env.BRAVE_API_KEY;
            if (!braveKey) return 'Web search unavailable: BRAVE_API_KEY not set';
            const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=5`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey },
            });
            if (!res.ok) return `Search error: ${res.statusText}`;
            const data = await res.json() as { web?: { results?: Array<{ title: string; description: string; url: string }> } };
            const results = data?.web?.results || [];
            return results.map((r) =>
                `**${r.title}**\n${r.description}\n${r.url}`
            ).join('\n\n') || 'No results found.';
        }

        case 'get_context':
            return getContext();

        case 'update_context':
            updateContext(args.content);
            return '✅ Context updated.';

        default:
            return `Unknown tool: ${name}`;
    }
}
