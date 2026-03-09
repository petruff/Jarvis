
import puppeteer, { Browser, Page } from 'puppeteer';
import logger from '../logger';

/**
 * DomCortex — The "Ghost Hand" of JARVIS
 * 
 * Implements human-like browsing, navigating, typing, and interacting
 * with web environments in real-time.
 */
export class DomCortex {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async initialize() {
        if (this.browser) return;

        logger.info('[DomCortex] Initializing AGI Browser Core (GhostHand)...');
        this.browser = await puppeteer.launch({
            headless: false, // Visible for the user to see JARVIS working
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });
    }

    async navigate(url: string) {
        if (!this.page) await this.initialize();
        logger.info(`[DomCortex] Navigating to: ${url}`);
        await this.page!.goto(url, { waitUntil: 'networkidle2' });
        return "[SUCCESS] Navigation complete.";
    }

    async click(selector: string) {
        if (!this.page) return "[ERROR] Browser not initialized.";
        logger.info(`[DomCortex] Clicking element: ${selector}`);
        await this.page.click(selector);
        return `[SUCCESS] Clicked ${selector}`;
    }

    async type(selector: string, text: string) {
        if (!this.page) return "[ERROR] Browser not initialized.";
        logger.info(`[DomCortex] Typing into ${selector}: ${text}`);
        await this.page.type(selector, text, { delay: 50 });
        return `[SUCCESS] Typed into ${selector}`;
    }

    async getPageSource() {
        if (!this.page) return "";
        return await this.page.content();
    }

    async takeScreenshot() {
        if (!this.page) return null;
        return await this.page.screenshot({ type: 'jpeg', quality: 80 });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}

export const domCortex = new DomCortex();
