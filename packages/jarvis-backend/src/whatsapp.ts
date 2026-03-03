import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { CommandHandler } from './commandHandler';
import { analyzeImage } from './vision';
import { config } from './config/loader';
import { transcribeAudio } from './llm';
import { generateAudioBuffer } from './voice';

let client: Client | null = null;
let lastQR = '';
let authenticated = false;
let _fastify: FastifyInstance;
let _io: Server;
let _commandHandler: CommandHandler;

// ─── Loop & Concurrency Protection ───────────────────────────────────────────
// Track recently processed message IDs to prevent double-processing
const processedMessageIds = new Set<string>();
const MESSAGE_DEDUP_TTL_MS = 30_000; // Forget processed IDs after 30s

// Concurrency lock: only ONE message is processed at a time.
// This prevents simultaneous parallel processing of a burst of messages.
let isProcessingMessage = false;
const messageQueue: Array<() => Promise<void>> = [];

function scheduleMessageProcessing(handler: () => Promise<void>): void {
    // Limit queue depth to prevent memory bloat from message floods
    if (messageQueue.length >= 5) {
        console.warn('[WhatsApp] Message queue full (5 pending) — dropping oldest message');
        messageQueue.shift();
    }
    messageQueue.push(handler);
    if (!isProcessingMessage) drainMessageQueue();
}

async function drainMessageQueue(): Promise<void> {
    if (isProcessingMessage || messageQueue.length === 0) return;
    isProcessingMessage = true;
    const handler = messageQueue.shift()!;
    try {
        await handler();
    } catch (err: any) {
        console.error('[WhatsApp] Message handler error:', err.message);
    } finally {
        isProcessingMessage = false;
        // Short pause between messages (prevents thundering herd)
        if (messageQueue.length > 0) {
            setTimeout(drainMessageQueue, 1000);
        }
    }
}

export const initializeWhatsApp = (fastify: FastifyInstance, io: Server, commandHandler: CommandHandler) => {
    _fastify = fastify;
    _io = io;
    _commandHandler = commandHandler;
    startClient();
};

const startClient = () => {
    if (client) {
        console.log('[WhatsApp] Client already running, skipping init');
        return;
    }

    console.log('[WhatsApp] Initializing client...');

    try {
        client = new Client({
            authStrategy: new LocalAuth({ clientId: 'jarvis_v5' }),
            puppeteer: {
                headless: true,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--window-size=1280,800',
                ]
            }
        });
    } catch (e) {
        console.error('[WhatsApp] Failed to create client:', e);
        return;
    }

    client.on('qr', (qr) => {
        console.log('[WhatsApp] ✅ QR Code generated!');
        lastQR = qr;
        qrcode.generate(qr, { small: true });
        _io.emit('whatsapp/qr', { qr });
        _io.emit('jarvis/output', { source: 'WHATSAPP', content: '📱 QR Ready — scan in Jarvis UI' });
    });

    client.on('authenticated', () => {
        console.log('[WhatsApp] Authenticated!');
        authenticated = true;
        lastQR = '';
        _io.emit('jarvis/output', { source: 'WHATSAPP', content: '🔐 Authenticated' });
    });

    client.on('ready', () => {
        console.log('[WhatsApp] ✅ Client ready!');
        authenticated = true;
        lastQR = '';
        _io.emit('whatsapp/ready', { status: 'connected' });
        _io.emit('jarvis/output', { source: 'WHATSAPP', content: '✅ WhatsApp Connected' });
    });

    client.on('auth_failure', (msg) => {
        console.error('[WhatsApp] Auth failure:', msg);
        authenticated = false;
        client = null;
        _io.emit('jarvis/output', { source: 'WHATSAPP', content: '❌ Auth failed — visit /logout to reset' });
    });

    client.on('disconnected', (reason) => {
        console.warn('[WhatsApp] Disconnected:', reason);
        authenticated = false;
        client = null;
        lastQR = '';
        _io.emit('whatsapp/ready', { status: 'disconnected' });
        _io.emit('jarvis/output', { source: 'WHATSAPP', content: `📴 Disconnected: ${reason}` });

        setTimeout(() => {
            if (!client) startClient();
        }, 10000);
    });

    client.on('loading_screen', (percent: number, message: string) => {
        console.log(`[WhatsApp] Loading: ${percent}% — ${message}`);
        if (Number(percent) % 25 === 0) {
            _io.emit('jarvis/output', { source: 'WHATSAPP', content: `⏳ Loading: ${percent}%` });
        }
    });

    // ─── FIX: Use 'message' (incoming ONLY) instead of 'message_create' ──────
    // 'message_create' fires for BOTH incoming AND outgoing messages.
    // This was the primary cause of the feedback loop — every JARVIS reply
    // re-entered the handler as a "self-chat command" and triggered more LLM calls.
    // 'message' fires ONLY for incoming messages from contacts.
    client.on('message', async (msg) => {
        if (msg.from === 'status@broadcast') return;

        const ownerPhone = config.messaging.owner_whatsapp_phone;
        const senderNumber = msg.from.replace('@c.us', '').replace('@g.us', '');

        // --- SECURITY CHECK ---
        if (!ownerPhone || ownerPhone === 'CHANGE_ME') {
            const warning = '⚠️ OWNER_PHONE not configured — WhatsApp disabled for safety.';
            console.warn(`[WhatsApp] ${warning}`);
            _io.emit('jarvis/output', { source: 'WHATSAPP', content: warning });
            return;
        }

        // --- ALLOWLIST: Only process messages from the owner ---
        if (senderNumber !== ownerPhone) {
            console.warn(`[WhatsApp] 🚫 BLOCKED from non-owner: ${senderNumber}`);
            return;
        }

        // --- MESSAGE DEDUPLICATION ---
        // Prevent the same message from being processed twice (race conditions, reconnects)
        const msgId = msg.id?.id || `${msg.from}-${msg.timestamp}-${msg.body?.slice(0, 20)}`;
        if (processedMessageIds.has(msgId)) {
            console.log(`[WhatsApp] ♻️ Duplicate message ignored: ${msgId}`);
            return;
        }
        processedMessageIds.add(msgId);
        // Auto-expire ID after TTL
        setTimeout(() => processedMessageIds.delete(msgId), MESSAGE_DEDUP_TTL_MS);

        console.log(`[WhatsApp] ✅ Incoming Owner Command: "${msg.body?.slice(0, 80)}"`);

        // --- ENQUEUE for sequential processing (prevents parallel execution) ---
        scheduleMessageProcessing(async () => {
            // --- MULTIMODAL VISION & AUDIO CHECK ---
            let finalCommand = msg.body;
            let wasAudio = false;

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        if (media.mimetype.startsWith('image/')) {
                            _io.emit('jarvis/output', { source: 'WHATSAPP', content: '👁️ Processing image attachment...' });
                            const analysis = await analyzeImage(media.data, msg.body || 'Describe this image.');
                            finalCommand = `[IMAGE ATTACHMENT ANALYZED]\n${analysis}\n\nUser Prompt: ${msg.body || 'What should we do with this?'}`;
                            _io.emit('jarvis/output', { source: 'JARVIS', content: '✅ Image understood.' });
                        } else if (media.mimetype.startsWith('audio/') || media.mimetype.includes('ogg')) {
                            _io.emit('jarvis/output', { source: 'WHATSAPP', content: '🎙️ Processing voice message...' });
                            wasAudio = true;

                            const audioBuffer = Buffer.from(media.data, 'base64');
                            const transcript = await transcribeAudio(audioBuffer, media.mimetype);

                            finalCommand = transcript;
                            console.log(`[WhatsApp Voice] Transcribed: "${transcript}"`);
                            _io.emit('jarvis/output', { source: 'JARVIS', content: `🎤 Transcription: ${transcript}` });
                        }
                    }
                } catch (err: any) {
                    console.error('[WhatsApp Media] Error processing media:', err);
                    finalCommand = `${msg.body}\n[System Note: User attached media, but processing failed: ${err.message}]`;
                }
            }

            // --- EXECUTE ---
            _io.emit('jarvis/output', { source: 'WHATSAPP', content: `You: ${finalCommand || '[Media]'}` });

            await _commandHandler.handle(finalCommand, ownerPhone, 'whatsapp', async (response) => {
                if (wasAudio) {
                    try {
                        _io.emit('jarvis/output', { source: 'JARVIS', content: `Generating voice reply...` });
                        const audioBuffer = await generateAudioBuffer(response);
                        if (audioBuffer) {
                            const media = new MessageMedia('audio/mp3', audioBuffer.toString('base64'));
                            await msg.reply(media, undefined, { sendAudioAsVoice: true });
                            _io.emit('jarvis/output', { source: 'JARVIS', content: `Voice reply sent.` });
                            return;
                        }
                    } catch (e: any) {
                        console.error('[WhatsApp Voice] Failed to generate/send audio reply:', e);
                    }
                }

                // Using msg.reply ensures context is kept
                msg.reply(response);
                _io.emit('jarvis/output', { source: 'JARVIS', content: `To WhatsApp: ${response}` });
            });
        });
    });

    client.initialize().catch(e => {
        console.error('[WhatsApp] Initialization failed:', e);
        client = null;
    });
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    if (client && authenticated) {
        await client.sendMessage(to, message);
    } else {
        console.warn('[WhatsApp] Cannot send — not connected');
    }
};

export const getLatestQR = () => lastQR;

export const isAuthenticated = () => authenticated;

export const logoutWhatsApp = async () => {
    if (client) {
        try { await client.logout(); } catch { }
        try { await client.destroy(); } catch { }
        client = null;
        lastQR = '';
        authenticated = false;
        // Restart fresh after 2s
        setTimeout(() => startClient(), 2000);
    }
};
