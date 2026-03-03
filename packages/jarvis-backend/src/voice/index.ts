/**
 * JARVIS Voice Module — Export all voice components
 *
 * Components:
 * - ProsodyEngine: Emotion detection and prosody parameter generation
 * - VoiceActivityDetector: Real-time VAD for speech detection
 * - StreamingHandler: Low-latency audio streaming
 * - ElevenLabsClient: TTS API integration
 * - VoiceService: Central orchestration
 * - VoiceManager: Express/Fastify API binding
 */

export { default as ProsodyEngine, prosodyEngine } from './prosodyEngine';
export type { Emotion, VoicePersonality } from './prosodyEngine';

export { default as VoiceActivityDetector } from './voiceActivityDetector';
export type { VADConfig, VADStats } from './voiceActivityDetector';

export { StreamingHandler, StreamChunkQueue } from './streamingHandler';
export type { StreamConfig, StreamChunk } from './streamingHandler';

export { default as ElevenLabsClient } from './elevenLabsClient';

export { default as VoiceService } from './voiceService';

export { default as VoiceManager } from './voiceManager';
