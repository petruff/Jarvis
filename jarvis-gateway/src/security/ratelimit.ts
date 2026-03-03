// src/security/ratelimit.ts
// Per-user rate limiting — max 10 requests/min, max 3 concurrent tool executions

import { logger } from '../logger';

const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_CONCURRENT_TOOLS = 3;

interface UserBucket {
    count: number;
    resetAt: number;
    queue: Array<() => void>;
}

const userBuckets = new Map<string, UserBucket>();
let activeConcurrentTools = 0;

function getBucket(userId: string): UserBucket {
    const now = Date.now();
    let bucket = userBuckets.get(userId);
    if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 60_000, queue: [] };
        userBuckets.set(userId, bucket);
    }
    return bucket;
}

export function checkRateLimit(userId: string): void {
    const bucket = getBucket(userId);
    if (bucket.count >= MAX_REQUESTS_PER_MINUTE) {
        const waitMs = bucket.resetAt - Date.now();
        logger.warn(`[RateLimit] User ${userId} exceeded limit. Wait ${waitMs}ms`);
        throw new Error(`⏱ Rate limit atingido. Aguarde ${Math.ceil(waitMs / 1000)} segundos.`);
    }
    bucket.count++;
}

export async function withToolConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Simple semaphore
    if (activeConcurrentTools >= MAX_CONCURRENT_TOOLS) {
        await new Promise<void>(resolve => {
            // Poll until slot is available
            const interval = setInterval(() => {
                if (activeConcurrentTools < MAX_CONCURRENT_TOOLS) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    activeConcurrentTools++;
    try {
        return await fn();
    } finally {
        activeConcurrentTools--;
    }
}
