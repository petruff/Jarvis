// src/rateLimiter.ts
// JARVIS Global Rate Limiter & Circuit Breaker
//
// Prevents runaway API consumption from loops, cascades, or bugs.
// Acts as a hard stop before any LLM call is made.
//
// Limits (configurable via env vars):
//   RATE_LIMIT_PER_MINUTE  — max LLM calls in any 60-second window (default: 20)
//   RATE_LIMIT_DAILY       — max LLM calls per calendar day (default: 1000)
//   RATE_LIMIT_COST_USD    — max USD spend per day before emergency stop (default: 5.00)
//
// When tripped:
//   - All further queryLLM() calls are blocked and return an error string
//   - A warning is emitted via console + stored in .jarvis/rate-limit.log
//   - Circuit resets at midnight (daily) or after 60s window (per-minute)

import * as fs from 'fs';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20');
const MAX_DAILY = parseInt(process.env.RATE_LIMIT_DAILY || '1000');
const MAX_COST_USD = parseFloat(process.env.RATE_LIMIT_COST_USD || '5.00');

// ─── State ────────────────────────────────────────────────────────────────────

interface RateLimiterState {
    // Sliding window (last 60 seconds)
    minuteWindow: number[];        // timestamps of recent calls
    // Daily counters (reset at midnight)
    dailyDate: string;             // YYYY-MM-DD of last reset
    dailyCalls: number;
    dailyCostUsd: number;
    // Circuit breaker
    isTripped: boolean;
    tripReason: string;
    tripTime: string;
}

const state: RateLimiterState = {
    minuteWindow: [],
    dailyDate: new Date().toISOString().slice(0, 10),
    dailyCalls: 0,
    dailyCostUsd: 0,
    isTripped: false,
    tripReason: '',
    tripTime: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLogPath(): string {
    const dataDir = path.resolve(process.cwd(), '.jarvis');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'rate-limit.log');
}

function logEvent(msg: string): void {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    console.warn(`[RATE-LIMITER] ${msg}`);
    try { fs.appendFileSync(getLogPath(), entry); } catch { /* ignore */ }
}

function resetDailyIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (state.dailyDate !== today) {
        state.dailyDate = today;
        state.dailyCalls = 0;
        state.dailyCostUsd = 0;
        if (state.isTripped && state.tripReason.includes('daily')) {
            state.isTripped = false;
            state.tripReason = '';
            logEvent('Daily circuit breaker auto-reset at midnight');
        }
        logEvent(`Daily counters reset for ${today}`);
    }
}

function pruneSlidingWindow(): void {
    const cutoff = Date.now() - 60_000;
    state.minuteWindow = state.minuteWindow.filter(ts => ts > cutoff);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call BEFORE every LLM query. Returns null if OK to proceed, or an error string if blocked.
 */
export function checkRateLimit(): string | null {
    resetDailyIfNeeded();

    // Circuit breaker tripped
    if (state.isTripped) {
        return `⛔ JARVIS CIRCUIT BREAKER ACTIVE: ${state.tripReason}. Use POST /api/rate-limit/reset to resume.`;
    }

    // Daily call limit
    if (state.dailyCalls >= MAX_DAILY) {
        trip(`Daily call limit reached (${MAX_DAILY} calls). Resets at midnight.`);
        return `⛔ Daily LLM call limit reached (${MAX_DAILY}). Halting to prevent runaway costs.`;
    }

    // Daily cost limit
    if (state.dailyCostUsd >= MAX_COST_USD) {
        trip(`Daily cost limit reached ($${state.dailyCostUsd.toFixed(4)} >= $${MAX_COST_USD}). Resets at midnight.`);
        return `⛔ Daily cost limit reached ($${MAX_COST_USD}). Halting to prevent excess spending.`;
    }

    // Per-minute limit (sliding window)
    pruneSlidingWindow();
    if (state.minuteWindow.length >= MAX_PER_MINUTE) {
        // Don't trip the circuit — just throttle (self-recovers in 60s)
        return `⏳ Rate limit: ${MAX_PER_MINUTE} calls/minute exceeded. Please wait a moment.`;
    }

    return null; // OK to proceed
}

/**
 * Call AFTER every successful LLM call to track usage.
 */
export function recordCall(costUsd: number = 0): void {
    resetDailyIfNeeded();
    pruneSlidingWindow();

    state.minuteWindow.push(Date.now());
    state.dailyCalls++;
    state.dailyCostUsd += costUsd;

    // Log warning thresholds
    if (state.dailyCalls === Math.floor(MAX_DAILY * 0.8)) {
        logEvent(`WARNING: ${state.dailyCalls}/${MAX_DAILY} daily calls used (80% threshold)`);
    }
    if (state.dailyCostUsd >= MAX_COST_USD * 0.8 && state.dailyCostUsd < MAX_COST_USD) {
        logEvent(`WARNING: $${state.dailyCostUsd.toFixed(4)} daily cost (80% of $${MAX_COST_USD} limit)`);
    }
}

/**
 * Trip the circuit breaker — halts all LLM calls until manually reset.
 */
export function trip(reason: string): void {
    if (!state.isTripped) {
        state.isTripped = true;
        state.tripReason = reason;
        state.tripTime = new Date().toISOString();
        logEvent(`CIRCUIT BREAKER TRIPPED: ${reason}`);
    }
}

/**
 * Manually reset the circuit breaker (via API or Telegram command).
 */
export function resetCircuitBreaker(): void {
    state.isTripped = false;
    state.tripReason = '';
    state.tripTime = '';
    logEvent('Circuit breaker manually reset');
}

/**
 * Get current rate limiter status (for health endpoint).
 */
export function getRateLimiterStatus() {
    resetDailyIfNeeded();
    pruneSlidingWindow();
    return {
        isTripped: state.isTripped,
        tripReason: state.isTripped ? state.tripReason : null,
        tripTime: state.isTripped ? state.tripTime : null,
        dailyCalls: state.dailyCalls,
        dailyCallsLimit: MAX_DAILY,
        dailyCostUsd: parseFloat(state.dailyCostUsd.toFixed(4)),
        dailyCostLimit: MAX_COST_USD,
        callsLastMinute: state.minuteWindow.length,
        callsPerMinuteLimit: MAX_PER_MINUTE,
        dailyDate: state.dailyDate,
    };
}
