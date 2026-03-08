import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import logger from '../logger';

/**
 * Realtime Service — Phase 9 Hyper-Presence
 * 
 * Manages high-throughput, low-latency communication between the AI Core
 * and the User Interface.
 */
export class RealtimeService {
    private io: Server;

    constructor(fastify: FastifyInstance) {
        this.io = (fastify as any).io;
        this.setupHandlers();
        logger.info('[Realtime] Service initialized for sub-200ms presence.');
    }

    private setupHandlers() {
        this.io.on('connection', (socket) => {
            const clientId = socket.handshake.query.clientId || 'anonymous';
            logger.info(`[Realtime] Client connected: ${clientId} (${socket.id})`);

            // ─── Presence & Synchronicity ──────────────────────────────────────────

            // Emit "pulse" every 5 seconds to keep visuals alive
            const pulseInterval = setInterval(() => {
                socket.emit('jarvis/pulse', {
                    latency: Math.floor(Math.random() * 50) + 10, // Simulated real-time latency
                    neuralLoad: Math.random() * 100
                });
            }, 5000);

            // Listen for UI state changes (User interaction start/stop)
            socket.on('ui/state', (data) => {
                logger.debug(`[Realtime] UI State update from ${clientId}:`, data);
            });

            // ─── Proactive Events ──────────────────────────────────────────────────

            // When VisualCortex or other autonomous layers trigger an event,
            // we broadcast it to the connected UI for immediate visual reaction.
            // This is hooked into the global event bus.

            socket.on('disconnect', () => {
                clearInterval(pulseInterval);
                logger.info(`[Realtime] Client disconnected: ${clientId}`);
            });
        });
    }

    /**
     * Broadcast a visual trigger to all connected UIs
     */
    public broadcastTrigger(type: string, metadata: any) {
        this.io.emit('jarvis/trigger', {
            type,
            metadata,
            timestamp: Date.now()
        });
    }

    /**
     * Stream thoughts or speech tokens for zero-latency feel
     */
    public streamOutput(token: string, type: 'thought' | 'speech' = 'speech') {
        this.io.emit('jarvis/stream', {
            token,
            type,
            timestamp: Date.now()
        });
    }
}

let realtimeService: RealtimeService | null = null;

export function initRealtime(fastify: FastifyInstance) {
    realtimeService = new RealtimeService(fastify);
    return realtimeService;
}

export function getRealtimeService() {
    if (!realtimeService) throw new Error('Realtime service not initialized.');
    return realtimeService;
}
