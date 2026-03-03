// src/search.ts
// Brave Search integration for all backend agents

import * as fs from 'fs';
import * as path from 'path';
import { config } from './config/loader';

interface SearchResult {
    title: string;
    description: string;
    url: string;
}

/**
 * Search the web using Brave Search API.
 * Returns formatted markdown string of top results.
 */
export async function webSearch(query: string, count: number = 5): Promise<string> {
    const apiKey = config.tools.web_search_api_key;
    if (!apiKey) {
        console.warn('[Search] web_search_api_key not set — search unavailable');
        return `[WEB SEARCH UNAVAILABLE: No web_search_api_key configured]`;
    }

    try {
        console.log(`[Search] Searching: "${query}"`);
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;

        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': apiKey,
            }
        });

        if (!res.ok) {
            console.error(`[Search] API error: ${res.status} ${res.statusText}`);
            return `[SEARCH ERROR: ${res.statusText}]`;
        }

        const data = await res.json() as { web?: { results?: SearchResult[] } };
        const results = data?.web?.results || [];

        if (results.length === 0) return '[No results found]';

        const formatted = results.map((r, i) =>
            `[${i + 1}] **${r.title}**\n${r.description}\n${r.url}`
        ).join('\n\n');

        console.log(`[Search] Got ${results.length} results for: "${query}"`);
        return `[WEB SEARCH RESULTS for: "${query}"]\n\n${formatted}`;
    } catch (err: any) {
        console.error('[Search] Failed:', err.message);
        return `[SEARCH FAILED: ${err.message}]`;
    }
}

/**
 * Detect if a command/task likely needs a web search.
 */
export function needsWebSearch(cmd: string): boolean {
    const triggers = [
        'search', 'find', 'look up', 'research', 'what is', 'who is',
        'latest', 'current', 'today', 'price of', 'how to', 'what are',
        'tell me about', 'news about', 'update on', 'stock', 'weather',
    ];
    const lower = cmd.toLowerCase();
    return triggers.some(t => lower.includes(t));
}
