/**
 * Voice Activity Detection (VAD) Engine
 *
 * Detects when user is speaking vs. silence
 * - Silence threshold detection
 * - Speech energy analysis
 * - Auto-stop when silence detected
 * - Streaming integration for real-time response
 */

export interface VADConfig {
    silenceThresholdMs: number; // ms of silence before stopping
    energyThreshold: number; // 0-1, below = silence
    minSpeechDurationMs: number; // minimum speech duration to consider valid
    noiseFloor: number; // baseline noise level
    samplingRate: number; // audio sample rate
}

export interface VADStats {
    isSpeaking: boolean;
    energy: number;
    silenceDuration: number;
    speechDuration: number;
    noiseLevelEstimate: number;
}

class VoiceActivityDetector {
    private config: VADConfig;
    private analyserRef: AnalyserNode | null = null;
    private dataArrayRef: Uint8Array | null = null;
    private silenceStartTime: number | null = null;
    private speechStartTime: number | null = null;
    private isSpeakingRef: boolean = false;
    private noiseFloorEstimate: number = 0.1;

    private onSpeechStart: (() => void) | null = null;
    private onSpeechEnd: (() => void) | null = null;
    private onEnergyChange: ((energy: number) => void) | null = null;

    constructor(config: Partial<VADConfig> = {}) {
        this.config = {
            silenceThresholdMs: 2000, // 2 seconds of silence
            energyThreshold: 0.05,
            minSpeechDurationMs: 300, // minimum 300ms to be considered speech
            noiseFloor: 0.02,
            samplingRate: 16000,
            ...config,
        };
    }

    /**
     * Initialize with audio context and microphone stream
     */
    async initialize(audioContext: AudioContext, stream: MediaStream): Promise<void> {
        try {
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;

            (source as any).connect(analyser);
            this.analyserRef = analyser;
            this.dataArrayRef = new Uint8Array(analyser.frequencyBinCount) as any;

            // Estimate initial noise floor
            this.estimateNoiseFloor();

            console.log('[VAD] Initialized with sampling rate:', audioContext.sampleRate);
        } catch (error) {
            console.error('[VAD] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Estimate baseline noise level
     */
    private estimateNoiseFloor(): void {
        if (!this.analyserRef || !this.dataArrayRef) return;

        const samples: number[] = [];
        for (let i = 0; i < 10; i++) {
            this.analyserRef.getByteFrequencyData(this.dataArrayRef as any);
            const avg = Array.from(this.dataArrayRef).reduce((a, b) => a + b, 0) / this.dataArrayRef.length;
            samples.push(avg / 255);
        }

        this.noiseFloorEstimate = samples.reduce((a, b) => a + b, 0) / samples.length;
        console.log('[VAD] Noise floor estimated:', this.noiseFloorEstimate.toFixed(3));
    }

    /**
     * Get current voice energy (0-1)
     */
    private getEnergy(): number {
        if (!this.analyserRef || !this.dataArrayRef) return 0;

        this.analyserRef.getByteFrequencyData(this.dataArrayRef as any);

        // Calculate RMS energy across frequency spectrum
        let sum = 0;
        for (let i = 0; i < this.dataArrayRef.length; i++) {
            const normalized = this.dataArrayRef[i] / 255;
            sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / this.dataArrayRef.length);

        // Normalize relative to noise floor
        const adjustedEnergy = Math.max(0, (rms - this.noiseFloorEstimate) / (1 - this.noiseFloorEstimate));

        return Math.min(adjustedEnergy, 1.0);
    }

    /**
     * Start voice activity monitoring
     */
    startMonitoring(
        onSpeechStart?: () => void,
        onSpeechEnd?: () => void,
        onEnergyChange?: (energy: number) => void
    ): void {
        this.onSpeechStart = onSpeechStart || null;
        this.onSpeechEnd = onSpeechEnd || null;
        this.onEnergyChange = onEnergyChange || null;

        console.log('[VAD] Monitoring started');

        // Monitor in intervals
        const monitor = () => {
            const energy = this.getEnergy();
            const isSpeaking = energy > this.config.energyThreshold;

            if (this.onEnergyChange) {
                this.onEnergyChange(energy);
            }

            // Speech started
            if (isSpeaking && !this.isSpeakingRef) {
                this.isSpeakingRef = true;
                this.speechStartTime = Date.now();
                this.silenceStartTime = null;
                console.log('[VAD] Speech detected:', energy.toFixed(3));

                if (this.onSpeechStart) {
                    this.onSpeechStart();
                }
            }

            // Still speaking
            if (isSpeaking && this.isSpeakingRef) {
                this.silenceStartTime = null;
            }

            // Silence detected
            if (!isSpeaking && this.isSpeakingRef) {
                if (!this.silenceStartTime) {
                    this.silenceStartTime = Date.now();
                } else {
                    const silenceDuration = Date.now() - this.silenceStartTime;

                    // Check if we've had enough silence AND minimum speech duration
                    const speechDuration = this.speechStartTime
                        ? Date.now() - this.speechStartTime
                        : 0;

                    if (
                        silenceDuration >= this.config.silenceThresholdMs &&
                        speechDuration >= this.config.minSpeechDurationMs
                    ) {
                        this.isSpeakingRef = false;
                        console.log(
                            '[VAD] Silence detected after',
                            speechDuration,
                            'ms of speech'
                        );

                        if (this.onSpeechEnd) {
                            this.onSpeechEnd();
                        }
                    }
                }
            }

            // Continue monitoring
            requestAnimationFrame(monitor);
        };

        requestAnimationFrame(monitor);
    }

    /**
     * Get current VAD statistics
     */
    getStats(): VADStats {
        const energy = this.getEnergy();
        const speechDuration = this.speechStartTime ? Date.now() - this.speechStartTime : 0;
        const silenceDuration = this.silenceStartTime ? Date.now() - this.silenceStartTime : 0;

        return {
            isSpeaking: this.isSpeakingRef,
            energy,
            silenceDuration,
            speechDuration,
            noiseLevelEstimate: this.noiseFloorEstimate,
        };
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onEnergyChange = null;
        this.silenceStartTime = null;
        this.speechStartTime = null;
        this.isSpeakingRef = false;

        console.log('[VAD] Monitoring stopped');
    }

    /**
     * Update silence threshold
     */
    setSilenceThreshold(ms: number): void {
        this.config.silenceThresholdMs = ms;
    }

    /**
     * Update energy threshold
     */
    setEnergyThreshold(threshold: number): void {
        this.config.energyThreshold = Math.max(0, Math.min(1, threshold));
    }

    /**
     * Reset detector state
     */
    reset(): void {
        this.silenceStartTime = null;
        this.speechStartTime = null;
        this.isSpeakingRef = false;
        this.estimateNoiseFloor();
    }
}

export default VoiceActivityDetector;
