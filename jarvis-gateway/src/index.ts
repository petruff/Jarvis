// src/index.ts
// JARVIS Gateway — Entry point (Dumb Pipe Mode)

import 'dotenv/config';
import { initMemory } from './jarvis/memory';
import { initializeTelegram } from './channels/telegram';
import { initializeWhatsApp } from './channels/whatsapp';
import { cleanExpiredApprovals } from './jarvis/approvals';
import { logger } from './logger';

async function validateEnvironment(): Promise<void> {
    const backendUrl = process.env.JARVIS_BACKEND_URL;
    if (!backendUrl) {
        logger.error('❌ JARVIS_BACKEND_URL is missing in .env');
        process.exit(1);
    }

    logger.info(`[Boot] Checking backend health at ${backendUrl}...`);
    let attempts = 0;
    while (attempts < 10) {
        try {
            const response = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = await response.json() as any;
                if (data.status === 'OK') {
                    logger.info('✅ Backend connection established');
                    return;
                }
            }
        } catch (err) {
            // Ignore errors during retry phrase
        }
        attempts++;
        logger.warn(`⚠️ [GATEWAY] Backend not ready, retrying in 2 seconds... (${attempts}/10)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logger.error(`❌ [GATEWAY] Backend unreachable at ${backendUrl} after 10 attempts. Halting.`);
    process.exit(1);
}

async function main(): Promise<void> {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         ⚡  JARVIS GATEWAY  ⚡          ║');
    console.log('║    Mobile AI Operating System v1.0     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Validate
    await validateEnvironment();

    // Init memory (creates files if not exist)
    logger.info('[Boot] Initializing memory system...');
    initMemory();

    // Clean expired approvals
    cleanExpiredApprovals();

    // Initialize channels
    const channels: string[] = [];

    // if (process.env.TELEGRAM_BOT_TOKEN) {
    //     const tg = await initializeTelegram();
    //     if (tg) channels.push('Telegram');
    // }

    if (process.env.WHATSAPP_ALLOWED_NUMBERS) {
        try {
            const wa = await initializeWhatsApp();
            if (wa) channels.push('WhatsApp');
        } catch (err) {
            logger.error(`[Boot] WhatsApp init failed: ${(err as Error).message}`);
        }
    }

    if (channels.length === 0) {
        logger.warn('⚠️  No channels configured. Set TELEGRAM_BOT_TOKEN or WHATSAPP_ALLOWED_NUMBERS in .env');
        logger.info('Gateway is running in headless mode. Add channel config to receive messages.');
    }

    // Startup summary
    console.log('');
    console.log(`⚡ JARVIS Gateway iniciado`);
    console.log(`   Channels:  ${channels.length > 0 ? channels.join(', ') : 'none (configure in .env)'}`);
    console.log(`   Backend:   ${process.env.JARVIS_BACKEND_URL}`);
    console.log('');

    // Clean up expired approvals every 5 minutes
    setInterval(cleanExpiredApprovals, 5 * 60 * 1000);
}

// Graceful shutdown
function handleShutdown(signal: string): void {
    logger.info(`[Shutdown] Received ${signal}. Shutting down gracefully...`);
    process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error(`[Fatal] Uncaught exception: ${err.message}`, err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger.error(`[Fatal] Unhandled rejection: ${reason}`);
});

main().catch((err) => {
    logger.error(`[Boot] Fatal error: ${err.message}`);
    process.exit(1);
});
