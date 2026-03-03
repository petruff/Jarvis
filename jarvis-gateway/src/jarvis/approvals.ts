// src/jarvis/approvals.ts
// Approval state machine — pending approvals stored in filesystem

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

const MEMORY_DIR = process.env.MEMORY_DIR || './memory';
const APPROVALS_FILE = path.resolve(process.cwd(), MEMORY_DIR, 'pending-approvals.json');
const APPROVAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface PendingApproval {
    id: string;
    action: string;
    payload: string;
    channel: 'telegram' | 'whatsapp';
    chatId: string | number;
    expiresAt: string;
    resolved: boolean;
}

function loadApprovals(): PendingApproval[] {
    try {
        if (fs.existsSync(APPROVALS_FILE)) {
            return JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf-8'));
        }
    } catch { /* ignore */ }
    return [];
}

function saveApprovals(approvals: PendingApproval[]): void {
    fs.mkdirSync(path.dirname(APPROVALS_FILE), { recursive: true });
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2), 'utf-8');
}

export function createApproval(
    action: string,
    payload: string,
    channel: 'telegram' | 'whatsapp',
    chatId: string | number
): PendingApproval {
    const approval: PendingApproval = {
        id: `approval_${Date.now()}`,
        action,
        payload,
        channel,
        chatId: String(chatId),
        expiresAt: new Date(Date.now() + APPROVAL_TIMEOUT_MS).toISOString(),
        resolved: false,
    };
    const approvals = loadApprovals();
    approvals.push(approval);
    saveApprovals(approvals);
    logger.info(`[Approvals] Created: ${approval.id} action=${action}`);
    return approval;
}

export function resolveApproval(chatId: string | number, approved: boolean): PendingApproval | null {
    const approvals = loadApprovals();
    const now = new Date();

    const pending = approvals.find(
        a => a.chatId === String(chatId) && !a.resolved && new Date(a.expiresAt) > now
    );

    if (!pending) {
        logger.info(`[Approvals] No pending approval for chatId=${chatId}`);
        return null;
    }

    pending.resolved = true;
    saveApprovals(approvals);

    if (approved) {
        logger.info(`[Approvals] Approved: ${pending.id}`);
    } else {
        logger.info(`[Approvals] Cancelled: ${pending.id}`);
    }

    return pending;
}

export function getPendingApproval(chatId: string | number): PendingApproval | null {
    const approvals = loadApprovals();
    const now = new Date();
    return approvals.find(
        a => a.chatId === String(chatId) && !a.resolved && new Date(a.expiresAt) > now
    ) || null;
}

export function cleanExpiredApprovals(): void {
    const approvals = loadApprovals();
    const now = new Date();
    const active = approvals.filter(a => !a.resolved && new Date(a.expiresAt) > now);
    saveApprovals(active);
}
