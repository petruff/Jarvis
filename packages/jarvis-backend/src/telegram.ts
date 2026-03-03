import { Telegraf } from 'telegraf';
import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { CommandHandler } from './commandHandler';
import { config } from './config/loader';

let bot: Telegraf;

// Allowed Telegram usernames (without @). Set OWNER_TELEGRAM in .env
const getAllowedUsers = (): string[] => {
    const envVal = config.messaging.founder_telegram_id || '';
    return envVal.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
};

export const initializeTelegram = (fastify: FastifyInstance, io: Server, commandHandler: CommandHandler) => {
    const token = config.messaging.telegram_token;
    if (!token) {
        console.error('[Telegram] TELEGRAM_BOT_TOKEN missing');
        return;
    }

    bot = new Telegraf(token);

    bot.command('start', (ctx) => {
        const username = (ctx.from.username || '').toLowerCase();
        const allowed = getAllowedUsers();

        if (allowed.length > 0 && !allowed.includes(username)) {
            console.warn(`[Telegram] 🚫 Blocked /start from: @${username}`);
            ctx.reply('Unauthorized.');
            return;
        }
        ctx.reply('Jarvis Online. Awaiting commands.');
        io.emit('jarvis/output', { source: 'TELEGRAM', content: 'New Session Started' });
    });

    bot.on('text', async (ctx) => {
        const text = ctx.message.text;
        const username = (ctx.from.username || '').toLowerCase();
        const firstName = ctx.from.first_name || 'TelegramUser';
        const userId = ctx.from.username || firstName;
        const allowed = getAllowedUsers();

        // --- SECURITY: OWNER-ONLY GATE ---
        if (allowed.length > 0 && !allowed.includes(username)) {
            console.warn(`[Telegram] 🚫 BLOCKED message from @${username}: "${text}"`);
            io.emit('jarvis/output', {
                source: 'TELEGRAM',
                content: `🚫 Blocked: @${username || firstName}`
            });
            return; // Silent ignore to strangers
        }
        // --- END SECURITY GATE ---

        console.log(`[Telegram] ✅ Owner message: "${text}" from @${userId}`);
        io.emit('jarvis/output', { source: 'TELEGRAM', content: `📱 ${userId}: ${text}` });

        await commandHandler.handle(text, userId, 'telegram', (response) => {
            ctx.reply(response);
            io.emit('jarvis/output', { source: 'JARVIS', content: `To Telegram: ${response}` });
        });
    });

    bot.launch(() => {
        fastify.log.info('Telegram Bot launched successfully!');
        io.emit('jarvis/status', { status: 'online', service: 'telegram' });
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

export const sendTelegramMessage = (chatId: string, text: string, options: any = {}) => {
    if (bot) {
        bot.telegram.sendMessage(chatId, text, options);
    }
};
