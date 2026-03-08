/**
 * useWebcam Hook — Webcam Integration
 *
 * Handles:
 * - Webcam capture
 * - Frame processing
 * - Real-time vision analysis
 * - Gesture detection
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface WebcamFrame {
    base64: string;
    timestamp: number;
    width: number;
    height: number;
}

interface VisionContext {
    description: string;
    objects: string[];
    gestures: string[];
    confidence: number;
    caption: string;
}

export const useWebcam = (apiHost: string = `http://${window.location.hostname}:3000`) => {
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [visionContext, setVisionContext] = useState<VisionContext | null>(
        null
    );
    const [frameCount, setFrameCount] = useState(0);
    const [latencyMs, setLatencyMs] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sessionRef = useRef(
        `vision_session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    );
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Start webcam stream
     */
    const startWebcam = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsWebcamActive(true);

                console.log('[useWebcam] Webcam started');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[useWebcam] Webcam access error:', error);
            return false;
        }
    }, []);

    /**
     * Stop webcam stream
     */
    const stopWebcam = useCallback((): void => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        setIsWebcamActive(false);
        setFrameCount(0);
        console.log('[useWebcam] Webcam stopped');
    }, []);

    /**
     * Capture frame from video
     */
    const captureFrame = useCallback((): WebcamFrame | null => {
        if (!videoRef.current || !canvasRef.current) return null;

        try {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return null;

            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;

            ctx.drawImage(
                videoRef.current,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            const base64 = canvasRef.current.toDataURL('image/png').split(',')[1];

            return {
                base64,
                timestamp: Date.now(),
                width: canvasRef.current.width,
                height: canvasRef.current.height,
            };
        } catch (error) {
            console.error('[useWebcam] Frame capture error:', error);
            return null;
        }
    }, []);

    /**
     * Process frame with vision API
     */
    const processFrame = useCallback(
        async (
            frame: WebcamFrame,
            voiceEmotion: string = 'neutral',
            transcript: string = ''
        ): Promise<VisionContext | null> => {
            if (!frame) return null;

            setIsProcessing(true);
            const startTime = Date.now();

            try {
                const response = await fetch(
                    `${apiHost}/api/vision/process-frame`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            frame: frame.base64,
                            sessionId: sessionRef.current,
                            emotion: voiceEmotion,
                            voiceConfidence: 0.8,
                            transcript,
                        }),
                    }
                );

                if (!response.ok) throw new Error('Vision processing failed');

                const data: any = await response.json();
                const context = data.data.context;
                const latency = Date.now() - startTime;

                setLatencyMs(latency);
                setFrameCount((c) => c + 1);

                const result: VisionContext = {
                    description: context.scene,
                    objects: context.objects,
                    gestures: context.gestures.map((g: any) => g.type),
                    confidence: context.confidence,
                    caption: data.data.caption,
                };

                setVisionContext(result);

                console.log('[useWebcam] Frame processed', {
                    latencyMs: latency,
                    confidence: context.confidence,
                });

                return result;
            } catch (error) {
                console.error('[useWebcam] Processing error:', error);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [apiHost]
    );

    /**
     * Start continuous frame capture
     */
    const startContinuousCapture = useCallback(
        async (
            interval: number = 500, // ms between frames
            voiceEmotion?: string,
            transcript?: string
        ): Promise<void> => {
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
            }

            captureIntervalRef.current = setInterval(() => {
                const frame = captureFrame();
                if (frame) {
                    processFrame(frame, voiceEmotion, transcript);
                }
            }, interval);

            console.log('[useWebcam] Continuous capture started');
        },
        [captureFrame, processFrame]
    );

    /**
     * Stop continuous capture
     */
    const stopContinuousCapture = useCallback((): void => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }

        console.log('[useWebcam] Continuous capture stopped');
    }, []);

    /**
     * Extract text from current frame
     */
    const extractText = useCallback(async (): Promise<string> => {
        const frame = captureFrame();
        if (!frame) return '';

        try {
            const response = await fetch(`${apiHost}/api/vision/extract-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: frame.base64 }),
            });

            if (!response.ok) throw new Error('Text extraction failed');

            const data: any = await response.json();
            return data.data.text;
        } catch (error) {
            console.error('[useWebcam] Text extraction error:', error);
            return '';
        }
    }, [captureFrame, apiHost]);

    /**
     * Detect gestures in current frame
     */
    const detectGestures = useCallback(async (): Promise<string[]> => {
        const frame = captureFrame();
        if (!frame) return [];

        try {
            const response = await fetch(
                `${apiHost}/api/vision/detect-gestures`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: frame.base64 }),
                }
            );

            if (!response.ok) throw new Error('Gesture detection failed');

            const data: any = await response.json();
            return data.data.gestures || [];
        } catch (error) {
            console.error('[useWebcam] Gesture detection error:', error);
            return [];
        }
    }, [captureFrame, apiHost]);

    /**
     * Get session statistics
     */
    const getSessionStats = useCallback(async () => {
        try {
            const response = await fetch(
                `${apiHost}/api/vision/session/${sessionRef.current}/stats`
            );

            if (response.ok) {
                const data: any = await response.json();
                return data.data;
            }
        } catch (error) {
            console.error('[useWebcam] Stats error:', error);
        }

        return null;
    }, [apiHost]);

    /**
     * End session
     */
    const endSession = useCallback(async (): Promise<void> => {
        try {
            await fetch(
                `${apiHost}/api/vision/session/${sessionRef.current}/end`,
                { method: 'POST' }
            );

            console.log('[useWebcam] Session ended');
        } catch (error) {
            console.error('[useWebcam] Session end error:', error);
        }

        stopWebcam();
    }, [apiHost, stopWebcam]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            stopWebcam();
        };
    }, [stopWebcam]);

    return {
        // State
        isWebcamActive,
        isProcessing,
        visionContext,
        frameCount,
        latencyMs,
        sessionId: sessionRef.current,

        // Refs
        videoRef,
        canvasRef,

        // Methods
        startWebcam,
        stopWebcam,
        captureFrame,
        processFrame,
        startContinuousCapture,
        stopContinuousCapture,
        extractText,
        detectGestures,
        getSessionStats,
        endSession,
    };
};

export type { WebcamFrame, VisionContext };
