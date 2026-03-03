// src/screenshot.ts
// Screen capture & vision — "what's on my screen?"

import { captureScreen } from './desktop';
import { queryVisionLLM, queryLLM } from './llm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Capture current screen and analyze it with Vision AI.
 * Returns a natural language description + any detected actions.
 */
export async function analyzeScreen(question: string = 'What is on the screen?'): Promise<string> {
    try {
        console.log('[Vision] Capturing screen...');
        const screenshot = await captureScreen();

        if (!screenshot || screenshot.length === 0) {
            return 'Could not capture the screen. Desktop automation may not be available.';
        }

        console.log(`[Vision] Analyzing screen (${screenshot.length} bytes)...`);

        const systemPrompt = `You are JARVIS's vision system. You analyze screenshots of the user's screen.
Describe what you see clearly and concisely. If the user asks a specific question about the screen, answer it directly.
If you see any errors, warnings, or issues, highlight them first.
If you see code, briefly describe what it does.
Be precise, not verbose.`;

        const result = await queryVisionLLM(systemPrompt, question, screenshot);

        // Save screenshot for reference
        const screenshotDir = path.resolve(process.cwd(), 'output', 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const filename = `screenshot_${Date.now()}.png`;
        fs.writeFileSync(path.join(screenshotDir, filename), screenshot);
        console.log(`[Vision] Screenshot saved: ${filename}`);

        return result;
    } catch (err: any) {
        console.error('[Vision] Screen analysis failed:', err.message);
        return `Screen analysis failed: ${err.message}`;
    }
}

/**
 * Detect if a command is a screen-related query
 */
export function isScreenCommand(cmd: string): boolean {
    const triggers = [
        'what is on my screen', "what's on my screen", 'what do you see',
        'look at my screen', 'analyze my screen', 'read my screen',
        'what am i looking at', 'screenshot', 'capture screen',
        'what is open', "what's open", 'what is happening on',
        'look at this', 'can you see', 'what error', 'whats on screen',
    ];
    const lower = cmd.toLowerCase();
    return triggers.some(t => lower.includes(t));
}
