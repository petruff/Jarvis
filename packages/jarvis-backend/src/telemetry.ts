import * as fs from 'fs';
import * as path from 'path';

export interface TelemetryEvent {
    id: string;
    timestamp: string;
    level: 'warn' | 'error' | 'fatal';
    message: string;
    stack?: string;
    source: string;
}

const TELEMETRY_FILE = path.join(process.cwd(), 'data', 'telemetry.json');
let telemetryLog: TelemetryEvent[] = [];

try {
    if (fs.existsSync(TELEMETRY_FILE)) {
        telemetryLog = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf-8'));
    }
} catch (e) {
    console.error('[Telemetry] Failed to load previous telemetry log:', e);
}

function saveTelemetry() {
    try {
        if (!fs.existsSync(path.dirname(TELEMETRY_FILE))) {
            fs.mkdirSync(path.dirname(TELEMETRY_FILE), { recursive: true });
        }
        fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(telemetryLog, null, 2));
    } catch (e) {
        console.error('[Telemetry] Failed to save telemetry:', e);
    }
}

export function logError(source: string, message: string, stack?: string, level: 'warn' | 'error' | 'fatal' = 'error') {
    const event: TelemetryEvent = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        level,
        message,
        stack,
        source
    };

    // Add to beginning of array
    telemetryLog.unshift(event);

    // Keep last 100
    if (telemetryLog.length > 100) {
        telemetryLog.pop();
    }

    saveTelemetry();
    return event;
}

export function getTelemetry(): TelemetryEvent[] {
    return telemetryLog;
}

// Global exception handlers
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    logError('system_uncaught', err.message, err.stack, 'fatal');
    // We intentionally don't exit the process here to keep the JARVIS brain alive if possible,
    // though in standard node this is considered bad practice, for an OS it might be required.
});

process.on('unhandledRejection', (reason: any) => {
    console.error('UNHANDLED REJECTION:', reason);
    logError('system_rejection', reason?.message || String(reason), reason?.stack, 'fatal');
});
