// src/security/guardrails.ts
// Tool execution safety checks — blocklists and path validation

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../logger';

const SECURITY_LOG = path.resolve(process.cwd(), 'logs', 'security.log');

const COMMAND_BLOCKLIST = [
    'rm -rf',
    'sudo',
    'mkfs',
    'dd ',
    '> /dev/',
    'shutdown',
    'reboot',
    'curl | sh',
    'curl|sh',
    'wget | sh',
    'wget|sh',
    'format c',
    ':(){:|:&};:', // Fork bomb
];

function logSecurityEvent(event: string): void {
    const entry = `[${new Date().toISOString()}] ${event}\n`;
    try {
        fs.mkdirSync(path.dirname(SECURITY_LOG), { recursive: true });
        fs.appendFileSync(SECURITY_LOG, entry);
    } catch { /* ignore */ }
    logger.warn(`[SECURITY] ${event}`);
}

export function checkGuardrails(toolName: string, args: Record<string, string>): void {
    switch (toolName) {
        case 'run_command': {
            const command = args.command || '';
            const lower = command.toLowerCase();
            for (const blocked of COMMAND_BLOCKLIST) {
                if (lower.includes(blocked.toLowerCase())) {
                    const msg = `BLOCKED run_command: "${command}" matched blocklist pattern "${blocked}"`;
                    logSecurityEvent(msg);
                    throw new Error(`🚨 Ação bloqueada pelos guardrails. Motivo: Comando bloqueado — "${blocked}"`);
                }
            }
            break;
        }

        case 'write_file': {
            const filePath = args.path || '';
            // Reject absolute paths
            if (path.isAbsolute(filePath)) {
                const msg = `BLOCKED write_file: absolute path "${filePath}"`;
                logSecurityEvent(msg);
                throw new Error(`🚨 Ação bloqueada pelos guardrails. Motivo: Caminho absoluto não permitido.`);
            }
            // Reject path traversal
            if (filePath.includes('..')) {
                const msg = `BLOCKED write_file: path traversal "${filePath}"`;
                logSecurityEvent(msg);
                throw new Error(`🚨 Ação bloqueada pelos guardrails. Motivo: Path traversal não permitido (..)`);
            }
            break;
        }
    }
}

export function requireApproval(action: string, payload: string): never {
    logSecurityEvent(`ACTION REQUIRES APPROVAL: ${action} — ${payload}`);
    throw new Error(`[AGUARDANDO APROVAÇÃO] ${action}: ${payload}`);
}
