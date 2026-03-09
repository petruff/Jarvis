
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import logger from '../logger';

export interface YoloDetection {
    class: string;
    confidence: number;
    box: number[];
}

export interface YoloResult {
    timestamp: number;
    frame: string;
    detections: YoloDetection[];
}

/**
 * YOLO Bridge — Connects JARVIS TS Kernel to the Python Vision Process.
 * 
 * Implements the "THOMAS" multimodal bridge for real-time situational awareness.
 */
export class YoloBridge {
    private pythonProcess: ChildProcess | null = null;
    private streamDir: string;

    constructor() {
        this.streamDir = path.join(process.cwd(), 'screen_stream');
        fs.ensureDirSync(this.streamDir);
    }

    /**
     * Starts the YOLO vision server
     */
    async start() {
        if (this.pythonProcess) return;

        const pythonScript = path.join(process.cwd(), 'vision', 'yolo_server.py');

        logger.info(`[YoloBridge] Launching Python Vision Kernel: ${pythonScript}`);

        this.pythonProcess = spawn('python', [pythonScript], {
            cwd: process.cwd(),
            stdio: 'inherit'
        });

        this.pythonProcess.on('error', (err) => {
            logger.error(`[YoloBridge] Failed to start Python process: ${err.message}`);
        });

        this.pythonProcess.on('close', (code) => {
            logger.warn(`[YoloBridge] Python Vision Kernel exited with code ${code}`);
            this.pythonProcess = null;
        });
    }

    /**
     * Reads the latest inference result from the vision server
     */
    async getLatestResult(): Promise<YoloResult | null> {
        const resultPath = path.join(this.streamDir, 'vision_results.json');

        try {
            if (await fs.pathExists(resultPath)) {
                const data = await fs.readJson(resultPath);
                return data as YoloResult;
            }
        } catch (e) {
            // File might be being written by python, ignore
        }
        return null;
    }

    stop() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }
}

export const yoloBridge = new YoloBridge();
