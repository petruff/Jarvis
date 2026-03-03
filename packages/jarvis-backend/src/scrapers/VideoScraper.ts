import { YoutubeTranscript } from 'youtube-transcript';
import puppeteer from 'puppeteer';

export interface VideoContent {
    platform: 'youtube' | 'generic';
    title?: string;
    description?: string;
    transcript?: string;
    summary?: string;
}

export class VideoScraper {

    static async scrape(url: string): Promise<VideoContent> {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return this.scrapeYoutube(url);
        } else {
            return this.scrapeGeneric(url);
        }
    }

    private static async scrapeYoutube(url: string): Promise<VideoContent> {
        try {
            // 1. Get Transcript
            const transcriptItems = await YoutubeTranscript.fetchTranscript(url);
            const fullText = transcriptItems.map(item => item.text).join(' ');

            return {
                platform: 'youtube',
                transcript: fullText
            };
        } catch (error) {
            console.error("YouTube Scraping Error:", error);
            throw new Error("Failed to get YouTube transcript. Video might not have captions.");
        }
    }

    private static async scrapeGeneric(url: string): Promise<VideoContent> {
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Basic Extraction
        const title = await page.title();
        const description = await page.$eval('meta[name="description"]', element => element.getAttribute('content')).catch(() => '');

        // Attempt to get main text content (rudimentary)
        const text = await page.$eval('body', el => el.innerText);

        await browser.close();

        return {
            platform: 'generic',
            title,
            description: (description !== null ? description : undefined),
            transcript: text.substring(0, 5000)
        };
    }
}
