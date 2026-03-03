/**
 * Image Processor — Vision Processing Pipeline
 *
 * Handles:
 * - Image encoding/decoding
 * - Resolution optimization
 * - Format conversion
 * - Metadata extraction
 */

import sharp from 'sharp';

export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorspace: string;
}

export interface ProcessedImage {
    base64: string;
    buffer: Buffer;
    metadata: ImageMetadata;
    thumbnail?: string; // Base64 thumbnail for UI
}

class ImageProcessor {
    private maxWidth = 1920;
    private maxHeight = 1440;
    private thumbnailSize = 320;

    /**
     * Process image from buffer
     */
    async processBuffer(buffer: Buffer): Promise<ProcessedImage> {
        try {
            // Get metadata
            const image = sharp(buffer);
            const metadata = await image.metadata();

            // Optimize image size
            const optimized = await image
                .resize(this.maxWidth, this.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .png({ quality: 80 })
                .toBuffer();

            // Generate thumbnail
            const thumbnail = await sharp(optimized)
                .resize(this.thumbnailSize, this.thumbnailSize, {
                    fit: 'cover',
                })
                .png({ quality: 60 })
                .toBuffer();

            return {
                base64: optimized.toString('base64'),
                buffer: optimized,
                metadata: {
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                    format: metadata.format || 'unknown',
                    size: optimized.length,
                    hasAlpha: metadata.hasAlpha || false,
                    colorspace: metadata.space || 'unknown',
                },
                thumbnail: thumbnail.toString('base64'),
            };
        } catch (error) {
            console.error('[ImageProcessor] Buffer processing error:', error);
            throw error;
        }
    }

    /**
     * Process image from base64
     */
    async processBase64(base64: string): Promise<ProcessedImage> {
        try {
            const buffer = Buffer.from(base64, 'base64');
            return await this.processBuffer(buffer);
        } catch (error) {
            console.error('[ImageProcessor] Base64 processing error:', error);
            throw error;
        }
    }

    /**
     * Process image from URL
     */
    async processUrl(url: string): Promise<ProcessedImage> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return await this.processBuffer(buffer);
        } catch (error) {
            console.error('[ImageProcessor] URL processing error:', error);
            throw error;
        }
    }

    /**
     * Crop image region
     */
    async cropRegion(
        buffer: Buffer,
        x: number,
        y: number,
        width: number,
        height: number
    ): Promise<ProcessedImage> {
        try {
            const image = sharp(buffer);
            const cropped = await image
                .extract({ left: x, top: y, width, height })
                .png()
                .toBuffer();

            return await this.processBuffer(cropped);
        } catch (error) {
            console.error('[ImageProcessor] Crop error:', error);
            throw error;
        }
    }

    /**
     * Extract region of interest (center 80% of image)
     */
    async extractROI(buffer: Buffer): Promise<ProcessedImage> {
        try {
            const metadata = await sharp(buffer).metadata();
            const width = metadata.width || 0;
            const height = metadata.height || 0;

            const roiWidth = Math.floor(width * 0.8);
            const roiHeight = Math.floor(height * 0.8);
            const x = Math.floor((width - roiWidth) / 2);
            const y = Math.floor((height - roiHeight) / 2);

            return await this.cropRegion(buffer, x, y, roiWidth, roiHeight);
        } catch (error) {
            console.error('[ImageProcessor] ROI extraction error:', error);
            throw error;
        }
    }

    /**
     * Convert to grayscale (for gesture detection)
     */
    async toGrayscale(buffer: Buffer): Promise<Buffer> {
        try {
            return await sharp(buffer)
                .grayscale()
                .png()
                .toBuffer();
        } catch (error) {
            console.error('[ImageProcessor] Grayscale conversion error:', error);
            throw error;
        }
    }

    /**
     * Detect edges (for gesture/movement detection)
     */
    async detectEdges(buffer: Buffer): Promise<Buffer> {
        try {
            // Use Laplacian edge detection via convolution
            return await sharp(buffer)
                .convolve({
                    kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
                    width: 3,
                    height: 3,
                    offset: 0,
                })
                .png()
                .toBuffer();
        } catch (error) {
            console.error('[ImageProcessor] Edge detection error:', error);
            throw error;
        }
    }

    /**
     * Resize to specific dimensions
     */
    async resize(
        buffer: Buffer,
        width: number,
        height: number
    ): Promise<Buffer> {
        try {
            return await sharp(buffer)
                .resize(width, height, { fit: 'cover' })
                .png()
                .toBuffer();
        } catch (error) {
            console.error('[ImageProcessor] Resize error:', error);
            throw error;
        }
    }

    /**
     * Get image statistics (histogram, brightness, contrast)
     */
    async getStatistics(buffer: Buffer): Promise<{
        brightness: number;
        contrast: number;
        entropy: number;
    }> {
        try {
            const metadata = await sharp(buffer).metadata();
            const stats = await sharp(buffer)
                .stats()
                .then((s: any) => s.channels[0]); // Red channel

            return {
                brightness: stats.mean / 255, // Normalize to 0-1
                contrast: (stats.max - stats.min) / 255,
                entropy: stats.entropy || 0,
            };
        } catch (error) {
            console.error('[ImageProcessor] Statistics error:', error);
            throw error;
        }
    }
}

export default ImageProcessor;
