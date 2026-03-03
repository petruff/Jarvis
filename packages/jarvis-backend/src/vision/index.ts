/**
 * JARVIS Vision Module — Export all vision components
 *
 * Components:
 * - ImageProcessor: Image handling and optimization
 * - VisionModel: GPT-4V image analysis
 * - GestureRecognizer: Hand gesture detection
 * - MultimodalFusionEngine: Voice + Vision fusion
 * - VisionService: Central orchestration
 */

export { default as ImageProcessor } from './imageProcessor';
export type { ImageMetadata, ProcessedImage } from './imageProcessor';

export { default as VisionModel } from './visionModel';
export type { VisionAnalysis, VisionContext } from './visionModel';

export { default as GestureRecognizer } from './gestureRecognizer';
export type { GestureType, Gesture, GestureSequence } from './gestureRecognizer';

export { default as MultimodalFusionEngine } from './multimodalFusion';
export type { MultimodalContext, ResponseConfig } from './multimodalFusion';

export { default as VisionService } from './visionService';
