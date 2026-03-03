/**
 * JARVIS minimal logger shim.
 * Wraps console.* with a structured format so Sprint 1 modules
 * can import a consistent logger without requiring a full logging library.
 * When Fastify is available its built-in pino logger is preferred for
 * request-scoped logging; this shim covers background/module-level logging.
 */

const timestamp = (): string => new Date().toISOString();

const logger = {
    info: (msg: string, ...args: unknown[]): void => {
        console.log(`[${timestamp()}] INFO  ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]): void => {
        console.warn(`[${timestamp()}] WARN  ${msg}`, ...args);
    },
    error: (msg: string, ...args: unknown[]): void => {
        console.error(`[${timestamp()}] ERROR ${msg}`, ...args);
    },
    debug: (msg: string, ...args: unknown[]): void => {
        if (process.env.JARVIS_DEBUG === 'true') {
            console.debug(`[${timestamp()}] DEBUG ${msg}`, ...args);
        }
    },
};

export default logger;
