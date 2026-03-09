import axios from 'axios';
import logger from '../logger';
import { getLatestNews, Article } from '../news';
import { quimera } from './quimera';

export interface WorldState {
    timestamp: string;
    aviation: {
        total_active_flights: number;
        significant_events: string[];
    };
    maritime: {
        total_vessels: number;
        port_congestion: string;
    };
    geopolitics: {
        top_headlines: Article[];
        critical_alerts: string[];
    };
    commodities: {
        crude_oil: string;
        gold: string;
        btc: string;
    };
}

/**
 * WorldMonitor — The global "Eyes" of JARVIS.
 * 
 * Continuous surveillance of global logistics, markets, and events.
 * Supplies the 'Conclave' and 'Sentinel' squads with real-time reality data.
 */
export class WorldMonitor {
    private currentState: WorldState;
    private interval: NodeJS.Timeout | null = null;

    constructor() {
        this.currentState = {
            timestamp: new Date().toISOString(),
            aviation: { total_active_flights: 0, significant_events: [] },
            maritime: { total_vessels: 0, port_congestion: 'NORMAL' },
            geopolitics: { top_headlines: [], critical_alerts: [] },
            commodities: { crude_oil: 'N/A', gold: 'N/A', btc: 'N/A' }
        };
    }

    public start(intervalMs: number = 600000) { // Default every 10 mins
        logger.info(`[WorldMonitor] Starting global surveillance cycle (${intervalMs}ms)...`);
        this.poll();
        this.interval = setInterval(() => this.poll(), intervalMs);
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    public getState(): WorldState {
        return { ...this.currentState, timestamp: new Date().toISOString() };
    }

    private async poll() {
        logger.info('[WorldMonitor] Polling global status...');
        try {
            await Promise.allSettled([
                this.pollAviation(),
                this.pollMaritime(),
                this.pollGeopolitics(),
                this.pollMarkets()
            ]);
            logger.info('[WorldMonitor] State updated.');
        } catch (error: any) {
            logger.error(`[WorldMonitor] Critical poll failure: ${error.message}`);
        }
    }

    private async pollAviation() {
        try {
            // OpenSky Network API (Free public restricted access)
            const response = await axios.get('https://opensky-network.org/api/states/all', { timeout: 5000 });
            if (response.data && response.data.states) {
                this.currentState.aviation.total_active_flights = response.data.states.length;
            }
        } catch (e) {
            logger.warn('[WorldMonitor] Aviation poll failed (OpenSky is rate-limited or down)');
        }
    }

    private async pollMaritime() {
        // Placeholder for AIS data — in THOMAS this would use a dedicated stream
        // For now, we simulate normal load unless news says otherwise
        this.currentState.maritime.total_vessels = 50000 + Math.floor(Math.random() * 1000);
    }

    private async pollGeopolitics() {
        const keywords = ['conflict', 'cyber attack', 'market crash', 'election', 'natural disaster'];
        const headlines = await getLatestNews('Global News');
        this.currentState.geopolitics.top_headlines = headlines;

        // Check for "Critical Alerts" in headlines
        this.currentState.geopolitics.critical_alerts = headlines
            .filter(a => keywords.some(k => a.title.toLowerCase().includes(k)))
            .map(a => a.title);

        // Feed to Quimera Graph
        for (const alert of this.currentState.geopolitics.critical_alerts) {
            await quimera.feed(
                { id: `alert_${Date.now()}`, label: alert, type: 'GlobalAlert', properties: { source: 'RSS' } },
                [{ from: 'earth', to: `alert_${Date.now()}`, relation: 'OCCURRED_IN', weight: 1.0 }]
            );
        }
    }

    private async pollMarkets() {
        try {
            // Using a simple public ticker for BTC/Gold/Oil
            // In production, this would use Alpaca or Bloomberg
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            this.currentState.commodities.btc = `$${response.data.bitcoin.usd}`;

            await quimera.feed(
                { id: 'btc', label: 'Bitcoin', type: 'Asset', properties: { price: this.currentState.commodities.btc } },
                [{ from: 'btc', to: 'market', relation: 'TRADED_ON', weight: 0.8 }]
            );

            // Mocking Oil/Gold (Public stable APIs for these are usually gated)
            this.currentState.commodities.crude_oil = '$78.42';
            this.currentState.commodities.gold = '$2,150.10';
        } catch (e) {
            logger.warn('[WorldMonitor] Market poll failed');
        }
    }
}

export const worldMonitor = new WorldMonitor();
