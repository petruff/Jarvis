import * as fs from 'fs-extra';
import * as path from 'path';
const screenshot = require('screenshot-desktop');
import { yoloBridge } from './yoloBridge';
import logger from '../logger';

export interface VisualTrigger {
    id: string;
    type: 'text_match' | 'element_identified' | 'frustration_detected';
    description: string;
    confidence: number;
    timestamp: number;
}

export interface AirSegmentation {
    objects: string[];
    altitude: number;
    latitude: number;
    longitude: number;
    detected_threats: string[];
}

/**
 * Visual Cortex — Phase 8 Multimodal Embodiment
 * 
 * Background service that analyzes screen capture streams
 * to provide proactive contextual assistance.
 */
export class VisualCortex {
    private streamDir: string;
    private isActive: boolean = false;
    private io?: any;

    constructor(baseDir: string) {
        this.streamDir = path.join(baseDir, 'screen_stream');
        fs.ensureDirSync(this.streamDir);
    }

    /**
     * Start analyzing the incoming screen stream
     */
    async start(io?: any) {
        this.io = io;
        this.isActive = true;

        // Start the YOLO Python Kernel
        await yoloBridge.start();

        logger.info('[VisualCortex] Starting real-time vision analysis (1 FPS mode)...');

        // Start capture loop
        this.captureLoop();

        // Start analysis loop
        this.analysisLoop();
    }

    private async captureLoop() {
        while (this.isActive) {
            try {
                const filename = path.join(this.streamDir, `frame_${Date.now()}.jpg`);
                await screenshot({ filename });
            } catch (e: any) {
                logger.warn(`[VisualCortex] Capture failed: ${e.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 FPS
        }
    }

    private async analysisLoop() {
        while (this.isActive) {
            try {
                const files = await fs.readdir(this.streamDir);
                const frames = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
                    .sort((a, b) => fs.statSync(path.join(this.streamDir, b)).mtimeMs -
                        fs.statSync(path.join(this.streamDir, a)).mtimeMs);

                if (frames.length > 0) {
                    const latestFrame = path.join(this.streamDir, frames[0]);
                    await this.processFrame(latestFrame);

                    // Cleanup old frames
                    if (frames.length > 10) {
                        for (let i = 10; i < frames.length; i++) {
                            await fs.remove(path.join(this.streamDir, frames[i]));
                        }
                    }
                }
            } catch (error: any) {
                logger.error(`[VisualCortex] Analysis cycle error: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    private async processFrame(filePath: string) {
        // Simulation of Vision trigger detection 
        const triggers = this.detectTriggers();

        if (this.io) {
            const liveResult = await yoloBridge.getLatestResult();

            this.io.emit('jarvis/visual_trigger', {
                triggers,
                air_segmentation: this.processLiveVision(liveResult),
                frame: path.basename(filePath),
                timestamp: Date.now()
            });
        }
    }

    private processLiveVision(result: any): AirSegmentation {
        if (!result || !result.detections) {
            return {
                objects: [],
                altitude: 35000,
                latitude: -23.5505,
                longitude: -46.6333,
                detected_threats: []
            };
        }

        const objects = result.detections.map((d: any) => `${d.class} (${Math.round(d.confidence * 100)}%)`);
        const threats = result.detections
            .filter((d: any) => ['person', 'weapon', 'danger'].includes(d.class))
            .map((d: any) => d.class);

        return {
            objects,
            altitude: 35000,
            latitude: -23.5505,
            longitude: -46.6333,
            detected_threats: threats
        };
    }

    /**
     * Detect patterns in the visual field
     */
    private detectTriggers(): VisualTrigger[] {
        // Placeholder for advanced pattern matching
        return [];
    }

    /**
     * Stop analysis
     */
    stop() {
        this.isActive = false;
        yoloBridge.stop();
    }
}

export const visualCortex = new VisualCortex(process.cwd());
