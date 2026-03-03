// src/channels/telegram.ts
// Telegram gateway — bot setup, message flow (Dumb Pipe version)

import TelegramBot from 'node-telegram-bot-api';
import { processMessage } from '../jarvis/engine';
import { checkRateLimit } from '../security/ratelimit';
import { getContext } from '../jarvis/memory';
import { resolveApproval, getPendingApproval } from '../jarvis/approvals';
import { logger } from '../logger';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

let bot: TelegramBot | null = null;

function getAllowedUsers(): number[] {
    return (process.env.TELEGRAM_ALLOWED_USERS || '')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
}

function isAllowed(userId: number): boolean {
    const allowed = getAllowedUsers();
    return allowed.length === 0 || allowed.includes(userId);
}

function splitMessage(text: string, maxLen = 4096): string[] {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > maxLen) {
        const split = remaining.lastIndexOf('\n', maxLen);
        const pos = split > 0 ? split : maxLen;
        chunks.push(remaining.slice(0, pos));
        remaining = remaining.slice(pos).trimStart();
    }
    chunks.push(remaining);
    return chunks.filter(c => c.trim().length > 0);
}

export async function initializeTelegram(): Promise<TelegramBot | null> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        logger.info('[Telegram] TELEGRAM_BOT_TOKEN not set — channel disabled');
        return null;
    }

    bot = new TelegramBot(token, { polling: true });
    logger.info('[Telegram] Bot starting...');

    // ── COMMANDS ─────────────────────────────────────────────────────────────

    bot.onText(/\/start/, async (msg) => {
        if (!isAllowed(msg.from?.id || 0)) return;
        const context = getContext();
        const reply = `⚡ *JARVIS Online*\n\nSistema operacional ativo e pronto para instrução.\n\n*Contexto atual:*\n\`\`\`\n${context.slice(0, 800)}\n\`\`\``;
        await bot!.sendMessage(msg.chat.id, reply, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/status/, async (msg) => {
        if (!isAllowed(msg.from?.id || 0)) return;
        const context = getContext();
        await bot!.sendMessage(msg.chat.id, `📊 *Status JARVIS*\n\n${context.slice(0, 2000)}`, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/help/, async (msg) => {
        if (!isAllowed(msg.from?.id || 0)) return;
        const help = `⚡ *JARVIS Gateway — Comandos*\n\n/start — Briefing e contexto atual\n/status — Estado do projeto\n/help — Esta mensagem\n\n*Envie qualquer mensagem* para ativar o sistema.\n\n*Exemplos:*\n• "pesquise os top 3 concorrentes"\n• "crie estratégia de growth para Q2"\n• "analise risco do novo contrato"`;
        await bot!.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
    });

    // ── CALLBACK QUERIES (inline buttons) ────────────────────────────────────

    bot.on('callback_query', async (query) => {
        const chatId = query.message?.chat.id;
        if (!chatId || !isAllowed(query.from.id)) return;

        const data = query.data || '';

        if (data === 'approve') {
            const approval = resolveApproval(chatId, true);
            if (approval) {
                await bot!.editMessageText(
                    `✅ *Aprovado:* ${approval.action}\n\nExecutando...`,
                    { chat_id: chatId, message_id: query.message!.message_id, parse_mode: 'Markdown' }
                );
                // Re-process with approval context
                const result = await processMessage(`APPROVED: ${approval.action} ${approval.payload}`, 'telegram');
                await sendResponse(chatId, result.response, result.needsApproval);
            }
        } else if (data === 'cancel') {
            resolveApproval(chatId, false);
            await bot!.editMessageText(
                '❌ *Cancelado.*',
                { chat_id: chatId, message_id: query.message!.message_id, parse_mode: 'Markdown' }
            );
        } else if (data.startsWith('briefing_approve_')) {
            const briefingId = data.replace('briefing_approve_', '');
            await bot!.editMessageText(
                `✅ *Briefing ${briefingId} Aprovado.*`,
                { chat_id: chatId, message_id: query.message!.message_id, parse_mode: 'Markdown' }
            );
            await processMessage(`APPROVED BRIEFING: ${briefingId}`, 'telegram');
        } else if (data.startsWith('briefing_discuss_')) {
            const briefingId = data.replace('briefing_discuss_', '');
            await bot!.sendMessage(chatId, `💬 *Iniciando discussão sobre o briefing ${briefingId}...*`);
            await processMessage(`DISCUSS BRIEFING: ${briefingId}`, 'telegram');
        }

        await bot!.answerCallbackQuery(query.id);
    });

    // ── MAIN MESSAGE HANDLER ─────────────────────────────────────────────────

    bot.on('message', async (msg) => {
        if (msg.text?.startsWith('/')) return;
        if (!isAllowed(msg.from?.id || 0)) return;

        let finalCommand = msg.text || msg.caption || '';
        let imageToRelay: string | undefined;

        // Vision handling
        if (msg.photo && msg.photo.length > 0) {
            try {
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                await bot!.sendChatAction(msg.chat.id, 'typing');

                const tempDir = path.join(process.cwd(), '.jarvis', 'temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const filePath = await bot!.downloadFile(fileId, tempDir);
                imageToRelay = fs.readFileSync(filePath, 'base64');
                fs.unlinkSync(filePath); // Cleanup
                logger.info('[Telegram] Image attachment prepared for relay');
            } catch (err: any) {
                logger.error(`[Telegram] Attachment error: ${err.message}`);
            }
        }

        const chatId = msg.chat.id;
        const userId = String(msg.from?.id);

        try {
            checkRateLimit(userId);
        } catch (err) {
            await bot!.sendMessage(chatId, (err as Error).message);
            return;
        }

        // Check if this is an approval response (1 = approve, 2 = cancel)
        const trimmed = finalCommand.trim();
        const pending = getPendingApproval(chatId);
        if (pending && (trimmed === '1' || trimmed.toLowerCase() === 'approve' || trimmed.toLowerCase().startsWith('approve'))) {
            const result = await processMessage(`APPROVED: ${pending.action} ${pending.payload}`, 'telegram');
            resolveApproval(chatId, true);
            await sendResponse(chatId, result.response, result.needsApproval);
            return;
        } else if (pending && (trimmed === '2' || trimmed.toLowerCase() === 'cancel')) {
            resolveApproval(chatId, false);
            await bot!.sendMessage(chatId, '❌ Cancelado.');
            return;
        }

        if (!finalCommand && !imageToRelay) return;

        // Show typing indicator
        await bot!.sendChatAction(chatId, 'typing');
        const thinkingMsg = await bot!.sendMessage(chatId, '🔄 Processando...');

        try {
            const result = await processMessage(finalCommand, 'telegram', imageToRelay);
            await bot!.deleteMessage(chatId, thinkingMsg.message_id).catch(() => { });
            await sendResponse(chatId, result.response, result.needsApproval);
        } catch (err) {
            await bot!.editMessageText(`❌ Erro: ${(err as Error).message}`, {
                chat_id: chatId,
                message_id: thinkingMsg.message_id,
            });
        }
    });

    // Notify allowed users that bot is online
    const allowedUsers = getAllowedUsers();
    for (const uid of allowedUsers) {
        try {
            await bot.sendMessage(uid, '⚡ JARVIS online e pronto para instrução.');
        } catch { /* user may not have started chat */ }
    }

    logger.info('[Telegram] Bot online ✅');
    return bot;
}

async function sendResponse(
    chatId: number,
    response: string,
    needsApproval: boolean
): Promise<void> {
    if (!bot) return;

    const chunks = splitMessage(response);

    for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;

        if (isLast && needsApproval) {
            await bot.sendMessage(chatId, chunks[i], {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Aprovar', callback_data: 'approve' },
                        { text: '❌ Cancelar', callback_data: 'cancel' },
                    ]],
                },
            });
        } else {
            await bot.sendMessage(chatId, chunks[i], { parse_mode: 'Markdown' }).catch(async () => {
                await bot!.sendMessage(chatId, chunks[i]);
            });
        }
    }
}
