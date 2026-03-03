import { queryLLM } from '../llm';

export class ScoutSynthesizer {
    /**
     * Sifts raw articles for business and tech intelligence specifically
     */
    async synthesize(domain: string, rawPayload: string): Promise<string> {
        if (!rawPayload || rawPayload.length < 50) return '';

        console.log(`[Scout] Synthesizing payload for domain: ${domain}...`);

        const prompt = `You are SHANNON, JARVIS's internal background intelligence router.
The following is raw data scraped autonomously from the web just now from domain: ${domain}.

RAW DATA:
${rawPayload}

Extrapolate ONLY high-signal, actionable intelligence.
Format it into a "Daily Intel Report" segment focusing on:
1. What changed since yesterday.
2. Emerging tools or frameworks.
3. Market movements.

Do not be wordy. Do not include metadata. Return the pure report block.`;

        try {
            const report = await queryLLM(`Scout Synthesizer (${domain})`, prompt);
            return report;
        } catch (e: any) {
            console.error(`[Scout] Synthesis failed for ${domain}: ${e.message}`);
            return rawPayload; // fallback to raw string if inference bounces
        }
    }
}
