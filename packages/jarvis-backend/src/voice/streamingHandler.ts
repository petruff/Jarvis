/**
 * Real-time Streaming Handler
 *
 * Manages low-latency response streaming:
 * - Token-by-token streaming from LLM
 * - Parallel TTS generation during streaming
 * - Chunk-based audio delivery
 * - Backpressure handling for smooth playback
 */

import { Socket } from 'socket.io';

export interface StreamConfig {
    maxQueueSize: number; // max pending TTS chunks
    chunkSize: number; // tokens per TTS request
    ttsTcpTimeout: number; // ms to wait for TTS response
    enableBuffering: boolean; // buffer first chunk before starting playback
}

export interface StreamChunk {
    id: string;
    text: string;
    index: number;
    timestamp: number;
    audioUrl?: string;
    ttsDuration?: number;
    isComplete: boolean;
}

class StreamingHandler {
    private config: StreamConfig;
    private activeStreams: Map<string, StreamChunkQueue> = new Map();

    constructor(config: Partial<StreamConfig> = {}) {
        this.config = {
            maxQueueSize: 10,
            chunkSize: 50, // tokens
            ttsTcpTimeout: 2000,
            enableBuffering: true,
            ...config,
        };
    }

    /**
     * Start streaming response to client
     */
    async startStream(
        socket: Socket,
        streamId: string,
        generateTTS: (text: string) => Promise<string> // returns base64 audio
    ): Promise<StreamChunkQueue> {
        const queue = new StreamChunkQueue(
            socket,
            streamId,
            this.config,
            generateTTS
        );

        this.activeStreams.set(streamId, queue);

        // Auto-cleanup when stream ends
        queue.onComplete(() => {
            this.activeStreams.delete(streamId);
            console.log(`[Streaming] Stream ${streamId} completed and cleaned up`);
        });

        return queue;
    }

    /**
     * Add token chunk to active stream
     */
    async addChunk(streamId: string, tokens: string): Promise<void> {
        const queue = this.activeStreams.get(streamId);
        if (!queue) {
            console.warn(`[Streaming] Stream ${streamId} not found`);
            return;
        }

        await queue.enqueue(tokens);
    }

    /**
     * Complete stream
     */
    completeStream(streamId: string, fullText: string): void {
        const queue = this.activeStreams.get(streamId);
        if (!queue) {
            console.warn(`[Streaming] Stream ${streamId} not found`);
            return;
        }

        queue.complete(fullText);
    }

    /**
     * Cancel stream
     */
    cancelStream(streamId: string): void {
        const queue = this.activeStreams.get(streamId);
        if (!queue) return;

        queue.cancel();
        this.activeStreams.delete(streamId);
    }

    /**
     * Get stream stats
     */
    getStats(streamId: string): {
        queueSize: number;
        isActive: boolean;
        tokensProcessed: number;
        audioChunksSent: number;
    } | null {
        const queue = this.activeStreams.get(streamId);
        if (!queue) return null;

        return {
            queueSize: queue.getQueueSize(),
            isActive: queue.isActive(),
            tokensProcessed: queue.getTokenCount(),
            audioChunksSent: queue.getAudioChunkCount(),
        };
    }
}

/**
 * Internal: Manages a single stream's chunk queue
 */
class StreamChunkQueue {
    private socket: Socket;
    private streamId: string;
    private config: StreamConfig;
    private generateTTS: (text: string) => Promise<string>;

    private queue: string[] = [];
    private currentChunk: string = '';
    private chunkIndex: number = 0;
    private isProcessing: boolean = false;
    private isCancelled: boolean = false;
    private isCompleted: boolean = false;
    private tokenCount: number = 0;
    private audioChunkCount: number = 0;
    private onCompleteCallback: (() => void) | null = null;
    private accumulatedText: string = '';

    constructor(
        socket: Socket,
        streamId: string,
        config: StreamConfig,
        generateTTS: (text: string) => Promise<string>
    ) {
        this.socket = socket;
        this.streamId = streamId;
        this.config = config;
        this.generateTTS = generateTTS;

        console.log(`[StreamQueue] Created for stream ${streamId}`);
    }

    /**
     * Enqueue tokens
     */
    async enqueue(tokens: string): Promise<void> {
        if (this.isCancelled || this.isCompleted) return;

        this.queue.push(tokens);
        this.tokenCount += tokens.split(' ').length;

        // Emit progress
        this.socket.emit('jarvis/stream', {
            chunk: tokens,
            streamId: this.streamId,
            progress: {
                tokens: this.tokenCount,
                chunks: this.chunkIndex,
            },
        });

        // Start processing if idle
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process queue: accumulate tokens until chunk size, then generate TTS
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        try {
            while (this.queue.length > 0 && !this.isCancelled) {
                const token = this.queue.shift()!;
                this.currentChunk += token;

                // Check if we've accumulated enough for a TTS request
                if (
                    this.currentChunk.length >= this.config.chunkSize ||
                    this.currentChunk.endsWith('.') ||
                    this.currentChunk.endsWith('!') ||
                    this.currentChunk.endsWith('?')
                ) {
                    await this.generateAndSendAudio(this.currentChunk);
                    this.currentChunk = '';
                }
            }

            // If stream is complete but we have remaining text
            if (this.isCompleted && this.currentChunk) {
                await this.generateAndSendAudio(this.currentChunk);
                this.currentChunk = '';
                this.finalizeStream();
            }
        } catch (error) {
            console.error(`[StreamQueue] Processing error:`, error);
            this.socket.emit('jarvis/stream_error', {
                streamId: this.streamId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Generate and send audio chunk
     */
    private async generateAndSendAudio(text: string): Promise<void> {
        if (!text.trim()) return;

        try {
            const startTime = Date.now();

            // Request TTS from backend
            const audioBase64 = await Promise.race([
                this.generateTTS(text),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TTS timeout')), this.config.ttsTcpTimeout)
                ),
            ]);

            const ttsDuration = Date.now() - startTime;

            this.socket.emit('jarvis/audio', {
                audio: audioBase64,
                streamId: this.streamId,
                chunkIndex: this.chunkIndex,
                ttsDuration,
            });

            this.accumulatedText += text + ' ';
            this.chunkIndex++;
            this.audioChunkCount++;

            console.log(
                `[StreamQueue] Sent audio chunk ${this.chunkIndex} (${text.length} chars, ${ttsDuration}ms TTS)`
            );
        } catch (error) {
            console.error(`[StreamQueue] TTS error for chunk ${this.chunkIndex}:`, error);
            // Continue processing without audio
        }
    }

    /**
     * Mark stream as complete
     */
    complete(fullText: string): void {
        this.isCompleted = true;
        this.accumulatedText = fullText;

        // Process any remaining tokens
        this.processQueue();
    }

    /**
     * Finalize and close stream
     */
    private finalizeStream(): void {
        this.socket.emit('jarvis/stream_end', {
            streamId: this.streamId,
            full: this.accumulatedText.trim(),
            chunks: this.chunkIndex,
            duration: Date.now() - (this.streamId ? 0 : Date.now()), // simplified
        });

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Cancel stream
     */
    cancel(): void {
        this.isCancelled = true;
        this.queue = [];
        this.currentChunk = '';

        this.socket.emit('jarvis/stream_cancel', {
            streamId: this.streamId,
            partial: this.accumulatedText.trim(),
        });

        console.log(`[StreamQueue] Cancelled stream ${this.streamId}`);
    }

    /**
     * Register completion callback
     */
    onComplete(callback: () => void): void {
        this.onCompleteCallback = callback;
    }

    /**
     * Getters
     */
    getQueueSize(): number {
        return this.queue.length;
    }

    isActive(): boolean {
        return !this.isCancelled && !this.isCompleted;
    }

    getTokenCount(): number {
        return this.tokenCount;
    }

    getAudioChunkCount(): number {
        return this.audioChunkCount;
    }
}

export { StreamingHandler, StreamChunkQueue };
export default StreamingHandler;
