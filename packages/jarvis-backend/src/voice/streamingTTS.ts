// Wave 3: Streaming TTS Engine - Lowest Latency Voice Output
// Replaces batch TTS with real-time streaming for sub-500ms latency
import { EventEmitter } from 'events'

export interface TTSConfig {
  provider: 'elevenlabs' | 'google' | 'azure'
  voiceId: string
  language: 'en' | 'pt'
  modelId?: string
  optimizedLatency: boolean
  speechRate: number // 0.5-2.0, 1.0 = normal
  stability: number // 0-1, higher = more consistent
  similarityBoost: number // 0-1, higher = closer to original voice
}

export interface StreamingMetrics {
  startTime: number
  firstBytesTime: number
  totalProcessingTime: number
  chunksStreamed: number
  estimatedLatency: number
}

export class StreamingTTS extends EventEmitter {
  private config: TTSConfig
  private cache: Map<string, Buffer> = new Map() // Pre-computed responses
  private metrics: StreamingMetrics | null = null
  private voicePresets: Record<string, TTSConfig> = {
    british_butler: {
      provider: 'elevenlabs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // British male voice
      language: 'en',
      modelId: 'eleven_monolingual_v1',
      optimizedLatency: true,
      speechRate: 0.95, // Slightly slower, more articulate
      stability: 0.5,
      similarityBoost: 0.75,
    },
    brazilian_butler: {
      provider: 'elevenlabs',
      voiceId: 'MF3mGyEYCl7XYWbV7V92', // Brazilian Portuguese voice
      language: 'pt',
      modelId: 'eleven_monolingual_v1',
      optimizedLatency: true,
      speechRate: 1.0,
      stability: 0.5,
      similarityBoost: 0.75,
    },
  }

  constructor(config: Partial<TTSConfig> = {}) {
    super()
    this.config = {
      provider: 'elevenlabs',
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      language: 'en',
      optimizedLatency: true,
      speechRate: 1.0,
      stability: 0.5,
      similarityBoost: 0.75,
      ...config,
    }
  }

  /**
   * Stream TTS with minimal latency
   * Yields audio chunks as they arrive from provider
   */
  async *streamText(
    text: string,
    voicePreset: 'british_butler' | 'brazilian_butler' = 'british_butler'
  ): AsyncGenerator<Buffer, void, unknown> {
    this.metrics = {
      startTime: Date.now(),
      firstBytesTime: 0,
      totalProcessingTime: 0,
      chunksStreamed: 0,
      estimatedLatency: 0,
    }

    // Apply voice preset
    const preset = this.voicePresets[voicePreset]
    if (preset) {
      this.config = { ...this.config, ...preset }
    }

    // Check cache for pre-computed responses
    const cacheKey = this.getCacheKey(text)
    if (this.cache.has(cacheKey)) {
      yield this.cache.get(cacheKey)!
      return
    }

    try {
      // Stream from ElevenLabs API
      if (this.config.provider === 'elevenlabs') {
        yield* await this.streamElevenLabs(text)
      }
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Stream audio from ElevenLabs with latency optimization
   */
  private async *streamElevenLabs(text: string): AsyncGenerator<Buffer, void, unknown> {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured')
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: this.config.modelId || 'eleven_monolingual_v1',
        voice_settings: {
          stability: this.config.stability,
          similarity_boost: this.config.similarityBoost,
        },
        optimize_streaming_latency: this.config.optimizedLatency ? 3 : 0, // 3 = max optimization
      }),
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body from ElevenLabs')
    }

    let chunkCount = 0
    const reader = response.body.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        if (chunkCount === 0 && this.metrics) {
          // First bytes received - measure latency
          this.metrics.firstBytesTime = Date.now() - this.metrics.startTime
        }

        if (value) {
          chunkCount++
          this.emit('chunk', { size: value.length, count: chunkCount })
          yield Buffer.from(value)
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (this.metrics) {
      this.metrics.totalProcessingTime = Date.now() - this.metrics.startTime
      this.metrics.chunksStreamed = chunkCount
      this.metrics.estimatedLatency = this.metrics.firstBytesTime
      this.emit('metrics', this.metrics)
    }
  }

  /**
   * Pre-compute and cache common responses
   */
  preComputeResponses(responses: string[], voicePreset: 'british_butler' | 'brazilian_butler' = 'british_butler') {
    responses.forEach((response) => {
      const cacheKey = this.getCacheKey(response)
      if (!this.cache.has(cacheKey)) {
        // Queue for pre-computation (async, non-blocking)
        this.preComputeAsync(response, cacheKey, voicePreset).catch((err) => {
          console.error(`Failed to pre-compute response: ${err.message}`)
        })
      }
    })
  }

  private async preComputeAsync(text: string, cacheKey: string, voicePreset: string) {
    const chunks: Buffer[] = []

    try {
      for await (const chunk of this.streamText(text, voicePreset as any)) {
        chunks.push(chunk)
      }

      // Combine chunks and cache
      const audioBuffer = Buffer.concat(chunks)
      this.cache.set(cacheKey, audioBuffer)
      this.emit('cached', { text: text.slice(0, 50), size: audioBuffer.length })
    } catch (error) {
      console.error(`Pre-computation failed: ${error}`)
    }
  }

  /**
   * Apply prosody/emotion variation for natural speech
   */
  applyProsody(text: string, emotion: 'neutral' | 'friendly' | 'urgent' | 'formal' = 'neutral'): string {
    const prosodyMap: Record<string, { rate: number; pitch: number }> = {
      neutral: { rate: 1.0, pitch: 1.0 },
      friendly: { rate: 0.95, pitch: 1.05 }, // Slightly slower, higher pitch
      urgent: { rate: 1.15, pitch: 0.95 }, // Faster, lower pitch
      formal: { rate: 0.9, pitch: 0.98 }, // Slower, slightly lower pitch
    }

    const prosody = prosodyMap[emotion]
    this.config.speechRate = prosody.rate

    // Add XML prosody tags if provider supports it
    return `<prosody rate="${(prosody.rate * 100).toFixed(0)}%" pitch="${(prosody.pitch * 100).toFixed(0)}%">${text}</prosody>`
  }

  /**
   * Optimize text for speech (remove formatting, expand abbreviations)
   */
  optimizeForSpeech(text: string, language: 'en' | 'pt' = 'en'): string {
    let optimized = text
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\*/g, '') // Remove markdown italic
      .replace(/#/g, '') // Remove headers
      .replace(/\`/g, '') // Remove code markers
      .replace(/\n+/g, ' ') // Collapse newlines
      .trim()

    if (language === 'en') {
      optimized = optimized
        .replace(/\bAPI\b/g, 'A P I') // Spell out acronyms
        .replace(/\bTTS\b/g, 'T T S')
        .replace(/\bSTT\b/g, 'S T T')
        .replace(/\bJSON\b/g, 'JSON')
    } else if (language === 'pt') {
      optimized = optimized
        .replace(/\bAPI\b/g, 'A P I')
        .replace(/\bSQL\b/g, 'SQL')
    }

    return optimized
  }

  /**
   * Get metrics from last stream
   */
  getMetrics(): StreamingMetrics | null {
    return this.metrics
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedResponses: this.cache.size,
      totalCacheSize: Array.from(this.cache.values()).reduce((sum, buf) => sum + buf.length, 0),
      avgCacheEntrySize: this.cache.size > 0 ? Array.from(this.cache.values()).reduce((sum, buf) => sum + buf.length, 0) / this.cache.size : 0,
    }
  }

  private getCacheKey(text: string): string {
    // Simple hash-based cache key
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return `tts-${this.config.voiceId}-${hash}`
  }

  /**
   * Clear cache if it grows too large
   */
  clearCache(maxSize: number = 100 * 1024 * 1024) {
    // 100MB limit
    const currentSize = Array.from(this.cache.values()).reduce((sum, buf) => sum + buf.length, 0)

    if (currentSize > maxSize) {
      // Remove oldest entries (FIFO)
      const entriesToRemove = Math.ceil(this.cache.size * 0.2) // Remove 20%
      let removed = 0

      for (const [key] of this.cache.entries()) {
        if (removed >= entriesToRemove) break
        this.cache.delete(key)
        removed++
      }

      this.emit('cache-cleared', { entriesRemoved: removed, newSize: this.cache.size })
    }
  }
}

export default StreamingTTS
