/**
 * JARVIS Evolution v6.0 — Email/Gmail Integration (Sprint 2 / Phase A3)
 *
 * Polling-based IMAP inbox reader (every 5 min) + Nodemailer SMTP sender.
 * Only processes emails from allowlisted senders.
 * Routes email body as mission to CommandHandler and replies via email.
 *
 * Config:
 *   GMAIL_USER            - Gmail address
 *   GMAIL_APP_PASSWORD    - Gmail app password (not account password)
 *   EMAIL_ALLOWLIST       - Comma-separated list of allowed sender emails
 *   EMAIL_POLL_INTERVAL_MS - Poll interval (default 300000 = 5min)
 */

import logger from '../logger';
import { sessionManager } from '../sessions/sessionManager';

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isConnected = false;
let processedIds = new Set<string>();

// ─── Initialization ────────────────────────────────────────────────────────────

export async function initializeEmail(
    commandHandler: { handle: (cmd: string, userId: string, source: string, onResponse: (text: string) => void) => Promise<void> },
    io?: { emit: (event: string, data: unknown) => void }
): Promise<boolean> {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
        logger.warn('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — Email channel disabled.');
        return false;
    }

    try {
        // Test SMTP connection
        const transporter = createTransporter(gmailUser, gmailPassword);
        await transporter.verify();

        isConnected = true;
        logger.info('[Email] SMTP connection verified.');
        if (io) io.emit('channel/status', { channel: 'email', status: 'online' });

        // Start polling
        const pollMs = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '300000', 10);
        pollingInterval = setInterval(
            () => pollInbox(gmailUser, gmailPassword, commandHandler, io),
            pollMs
        );

        // Initial poll
        pollInbox(gmailUser, gmailPassword, commandHandler, io).catch(err => {
            logger.warn(`[Email] Initial poll failed: ${err.message}`);
        });

        logger.info(`[Email] Channel ONLINE — polling every ${pollMs / 1000}s`);
        return true;

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[Email] Initialization failed: ${msg}`);
        return false;
    }
}

// ─── SMTP Sender ───────────────────────────────────────────────────────────────

function createTransporter(user: string, password: string): any {
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass: password },
    });
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
        logger.warn('[Email] Cannot send — credentials not configured.');
        return false;
    }

    try {
        const transporter = createTransporter(gmailUser, gmailPassword);
        await transporter.sendMail({
            from: `"JARVIS" <${gmailUser}>`,
            to,
            subject,
            text: body,
            html: `<pre style="font-family:monospace;white-space:pre-wrap">${body}</pre>`,
        });
        logger.info(`[Email] Sent to ${to}: ${subject}`);
        return true;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[Email] Send failed: ${msg}`);
        return false;
    }
}

// ─── IMAP Poller ───────────────────────────────────────────────────────────────

async function pollInbox(
    user: string,
    password: string,
    commandHandler: { handle: (cmd: string, userId: string, source: string, onResponse: (text: string) => void) => Promise<void> },
    io?: { emit: (event: string, data: unknown) => void }
): Promise<void> {
    const allowlist = getAllowlist();
    if (!allowlist.length) {
        logger.info('[Email] No allowlist configured — skipping inbox poll.');
        return;
    }

    try {
        const imaps = require('imap-simple');

        const config = {
            imap: {
                user,
                password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                authTimeout: 10000,
                tlsOptions: { rejectUnauthorized: false },
            },
        };

        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Fetch unseen messages from today
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)', 'TEXT'],
            markSeen: true,
            struct: true,
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        connection.end();

        for (const msg of messages) {
            try {
                const headerPart = msg.parts.find((p: any) => p.which.startsWith('HEADER'));
                const bodyPart = msg.parts.find((p: any) => p.which === 'TEXT');

                if (!headerPart || !bodyPart) continue;

                const headers = headerPart.body;
                const from: string = (headers.from?.[0] || '').toLowerCase();
                const subject: string = headers.subject?.[0] || '(no subject)';
                const messageId: string = headers['message-id']?.[0] || `${Date.now()}`;
                const body: string = bodyPart.body || '';

                // Skip if already processed
                if (processedIds.has(messageId)) continue;
                processedIds.add(messageId);

                // Allowlist check — extract email from "Name <email>" format
                const emailMatch = from.match(/<([^>]+)>/) || [null, from];
                const senderEmail = emailMatch[1] || from;

                if (!allowlist.some(allowed => senderEmail.includes(allowed.toLowerCase()))) {
                    logger.info(`[Email] Skipping non-allowlisted sender: ${senderEmail}`);
                    continue;
                }

                logger.info(`[Email] Processing from ${senderEmail}: ${subject}`);
                if (io) io.emit('channel/message', { channel: 'email', from: senderEmail, subject });

                // Session management
                const session = sessionManager.getOrCreate('email', senderEmail, { channelId: 'email' });
                const mission = `Email from ${senderEmail}\nSubject: ${subject}\n\n${body.slice(0, 3000)}`;
                sessionManager.addMessage(session.sessionId, 'user', mission);

                // Route to CommandHandler
                let responseBuffer = '';
                await commandHandler.handle(mission, senderEmail, 'email', (resp: string) => {
                    responseBuffer += resp + '\n';
                });

                const reply = responseBuffer.trim() || 'Mission acknowledged.';
                sessionManager.addMessage(session.sessionId, 'assistant', reply);

                // Reply via email
                await sendEmail(
                    senderEmail,
                    `Re: ${subject}`,
                    reply
                );

            } catch (msgErr: unknown) {
                const msg = msgErr instanceof Error ? msgErr.message : String(msgErr);
                logger.warn(`[Email] Error processing message: ${msg}`);
            }
        }

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Email] Poll error: ${msg}`);
    }
}

function getAllowlist(): string[] {
    const envList = process.env.EMAIL_ALLOWLIST || '';
    if (envList) return envList.split(',').map(e => e.trim()).filter(Boolean);
    return [];
}

export function stopEmailPolling(): void {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        logger.info('[Email] Polling stopped.');
    }
}

export function isEmailConnected(): boolean {
    return isConnected;
}
