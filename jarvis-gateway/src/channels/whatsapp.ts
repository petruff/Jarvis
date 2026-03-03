// src/channels/whatsapp.ts
// WhatsApp gateway — WWebJS client with QR auth and session persistence

import { Client, LocalAuth, Message as WAMessage } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { processMessage } from '../jarvis/engine';
import { checkRateLimit } from '../security/ratelimit';
import { getContext } from '../jarvis/memory';
import { resolveApproval, getPendingApproval } from '../jarvis/approvals';
import { logger } from '../logger';

let client: Client | null = null;

function getAllowedNumbers(): string[] {
    return (process.env.WHATSAPP_ALLOWED_NUMBERS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function isAllowed(from: string): boolean {
    const allowed = getAllowedNumbers();
    return allowed.length === 0 || allowed.includes(from);
}

export async function initializeWhatsApp(): Promise<Client | null> {
    const allowedNumbers = getAllowedNumbers();
    if (allowedNumbers.length === 0) {
        logger.info('[WhatsApp] WHATSAPP_ALLOWED_NUMBERS not set — channel disabled');
        return null;
    }

    const sessionsDir = path.resolve(process.cwd(), 'sessions');

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: sessionsDir,
            clientId: 'jarvis-gateway',
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        },
    });

    // ── QR CODE ───────────────────────────────────────────────────────────────

    client.on('qr', async (qr) => {
        logger.info('[WhatsApp] QR Code generated — scan with your phone');
        console.log('\n📱 JARVIS WhatsApp — Scan the QR code below:\n');

        // Print to terminal
        try {
            const QRCodeTerminal = await import('qrcode-terminal').catch(() => null);
            if (QRCodeTerminal) {
                QRCodeTerminal.default.generate(qr, { small: true });
            }
        } catch { /* optional */ }

        // Save as PNG
        const qrPath = path.resolve(process.cwd(), 'qr.png');
        await QRCode.toFile(qrPath, qr, { type: 'png', width: 512 });
        logger.info(`[WhatsApp] QR saved to: ${qrPath}`);
    });

    client.on('authenticated', () => {
        logger.info('[WhatsApp] Authenticated successfully ✅');
    });

    client.on('ready', async () => {
        logger.info('[WhatsApp] Client ready ✅');

        // Notify allowed numbers
        for (const number of allowedNumbers) {
            try {
                await client!.sendMessage(number, '⚡ JARVIS online e pronto para instrução.');
            } catch { /* number may not be valid yet */ }
        }
    });

    client.on('auth_failure', (msg) => {
        logger.error(`[WhatsApp] Auth failure: ${msg}`);
    });

    client.on('disconnected', (reason) => {
        logger.warn(`[WhatsApp] Disconnected: ${reason}`);
    });

    // ── MESSAGE HANDLER ───────────────────────────────────────────────────────

    client.on('message', async (msg: WAMessage) => {
        const from = msg.from;
        if (!isAllowed(from)) {
            logger.warn(`[WhatsApp] Unauthorized: ${from}`);
            return;
        }

        const text = msg.body?.trim();
        if (!text) return;

        try {
            checkRateLimit(from);
        } catch (err) {
            await msg.reply((err as Error).message);
            return;
        }

        // Check approval responses (1 = approve, 2 = cancel)
        const pending = getPendingApproval(from);
        if (pending) {
            if (text === '1' || text.toLowerCase().startsWith('aprovar') || text.toLowerCase().startsWith('approve')) {
                resolveApproval(from, true);
                try {
                    const result = await processMessage(`APPROVED: ${pending.action} ${pending.payload}`, 'whatsapp');
                    await sendWAResponse(msg, result.response, result.needsApproval);
                } catch (err) {
                    await msg.reply(`❌ Erro ao executar: ${(err as Error).message}`);
                }
                return;
            } else if (text === '2' || text.toLowerCase().startsWith('cancelar') || text.toLowerCase() === 'cancel') {
                resolveApproval(from, false);
                await msg.reply('❌ Cancelado.');
                return;
            }
        }

        // Special commands
        if (text === '/status') {
            const context = getContext();
            await msg.reply(`📊 Status JARVIS:\n\n${context.slice(0, 1000)}`);
            return;
        }

        // Notify processing
        await msg.reply('🔄 Processando...');

        try {
            const result = await processMessage(text, 'whatsapp');
            await sendWAResponse(msg, result.response, result.needsApproval);
        } catch (err) {
            await msg.reply(`❌ Erro: ${(err as Error).message}`);
        }
    });

    await client.initialize();
    logger.info('[WhatsApp] Initializing...');

    return client;
}

async function sendWAResponse(
    msg: WAMessage,
    response: string,
    needsApproval: boolean
): Promise<void> {
    if (!client) return;

    // Split long messages (WhatsApp ~65,536 chars limit but keep manageable)
    const MAX_LEN = 3000;
    const chunks: string[] = [];
    let remaining = response;
    while (remaining.length > MAX_LEN) {
        const split = remaining.lastIndexOf('\n', MAX_LEN);
        const pos = split > 0 ? split : MAX_LEN;
        chunks.push(remaining.slice(0, pos));
        remaining = remaining.slice(pos).trimStart();
    }
    chunks.push(remaining);

    for (const chunk of chunks) {
        await msg.reply(chunk);
    }

    // For WhatsApp, use numbered options instead of inline buttons
    if (needsApproval) {
        await msg.reply('_Aguardando aprovação:_\n\n[1] ✅ Aprovar\n[2] ❌ Cancelar\n\nResponda com 1 ou 2.');
    }
}
