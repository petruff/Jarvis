// src/scout/scraper.ts
// Background Autonomy: Proactive data ingestion loops
import RssParser from 'rss-parser';
import * as cron from 'node-cron';
import { hybridMemory } from '../index';
import { ScoutSynthesizer } from './synthesizer';

const KNOWLEDGE_DOMAINS = [
    { name: 'AI & Tech News', feedUrl: 'https://techcrunch.com/feed/' },
    { name: 'Startup News YC', feedUrl: 'https://ycombinator.com/blog.xml' }
];

export class ScoutScraper {
    private parser = new RssParser({ timeout: 10000 });
    private job: cron.ScheduledTask | null = null;
    public isRunning = false;

    constructor() { }

    start(): void {
        console.log(`[Scout] Background Scraper scheduling (Running every 6 hours)`);
        // Run every 6 hours passively
        this.job = cron.schedule('0 */6 * * *', () => {
            this.runPassively().catch(err => {
                console.error(`[Scout] Scraping Loop failed: ${err.message}`);
            });
        });

        // Let's run it once immediately on boot for AGI impression
        setTimeout(() => {
            this.runPassively().catch(console.error);
        }, 30000);

        console.log('[Scout] Proactive Ingestion Online.');
    }

    stop(): void {
        this.job?.stop();
    }

    async runPassively(): Promise<void> {
        if (this.isRunning) {
            console.log('[Scout] Scrub skipped — previous job still running');
            return;
        }

        this.isRunning = true;
        console.log(`\n[Scout] ========== BACKGROUND INTELLIGENCE SCRAPE INITIATED ==========`);

        try {
            for (const domain of KNOWLEDGE_DOMAINS) {
                console.log(`[Scout] Harvesting: ${domain.name} — ${domain.feedUrl}`);
                try {
                    const feed = await this.parser.parseURL(domain.feedUrl);

                    const articles = (feed.items || []).slice(0, 3).map(item => ({
                        title: item.title || '',
                        summary: (item.contentSnippet || item.content || '').slice(0, 500),
                        link: item.link || '',
                        pubDate: item.pubDate || '',
                    }));

                    const payload = `DOMAIN: ${domain.name}\n` + articles.map(i => `${i.title} (${i.pubDate})\n${i.summary}`).join('\n\n');

                    const synthesizer = new ScoutSynthesizer();
                    const intelReport = await synthesizer.synthesize(domain.name, payload);

                    // Directly inject to Jarvis's Subconscious
                    const documentId = `scout_intel_${domain.name.replace(/\s+/g, '_')}_${Date.now()}`;
                    await hybridMemory.encodeDocument(documentId, intelReport, 'WORKSPACE', { source: 'scout_background_job', domain: domain.name });
                    console.log(`[Scout] Memory encoded successfully for ${domain.name}`);

                } catch (feedErr: any) {
                    console.warn(`[Scout] Failed to harvest ${domain.name}: ${feedErr.message}`);
                }
            }

            console.log(`[Scout] ========== INGESTION CYCLE COMPLETE ==========`);
        } catch (err: any) {
            console.error(`[Scout] Critical loop failure: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }
}
