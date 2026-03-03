// Story 4.4: Result Precomputer
// Pre-computes intermediate results to avoid redundant tool calls

export interface CachedResult {
  id: string
  toolId: string
  inputs: Record<string, any>
  output: any
  timestamp: Date
  hitCount: number
}

export interface PrecomputationResult {
  toolId: string
  result: any
  fromCache: boolean
  cacheDuration?: number
}

export class ResultPrecomputer {
  private cache: Map<string, CachedResult> = new Map()
  private cacheSize: number = 1000
  private cacheDuration: number = 60 * 60 * 1000 // 1 hour default

  /**
   * Get or compute result
   * Returns cached result if available and valid
   */
  async getOrCompute(toolId: string, inputs: Record<string, any>, compute: () => Promise<any>): Promise<PrecomputationResult> {
    const cacheKey = this.generateKey(toolId, inputs)
    const cached = this.cache.get(cacheKey)

    // Check cache validity
    if (cached && !this.isCacheExpired(cached)) {
      cached.hitCount++
      return {
        toolId,
        result: cached.output,
        fromCache: true,
        cacheDuration: Date.now() - cached.timestamp.getTime(),
      }
    }

    // Compute new result
    const result = await compute()

    // Store in cache
    this.cacheResult(cacheKey, toolId, inputs, result)

    return {
      toolId,
      result,
      fromCache: false,
    }
  }

  /**
   * Cache a result
   */
  private cacheResult(key: string, toolId: string, inputs: Record<string, any>, output: any): void {
    // Evict LRU if cache full
    if (this.cache.size >= this.cacheSize) {
      this.evictLRU()
    }

    const cached: CachedResult = {
      id: key,
      toolId,
      inputs,
      output,
      timestamp: new Date(),
      hitCount: 0,
    }

    this.cache.set(key, cached)
  }

  /**
   * Generate cache key from tool and inputs
   */
  private generateKey(toolId: string, inputs: Record<string, any>): string {
    const inputStr = JSON.stringify(inputs)
    const hash = this.simpleHash(inputStr)
    return `${toolId}-${hash}`
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cached: CachedResult): boolean {
    return Date.now() - cached.timestamp.getTime() > this.cacheDuration
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lru: [string, CachedResult] | null = null
    let minHits = Infinity

    for (const entry of this.cache.entries()) {
      if (entry[1].hitCount < minHits) {
        minHits = entry[1].hitCount
        lru = entry
      }
    }

    if (lru) {
      this.cache.delete(lru[0])
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; memory: number } {
    const hits = Array.from(this.cache.values()).reduce((sum, c) => sum + c.hitCount, 0)
    const memory = Array.from(this.cache.values()).reduce((sum, c) => sum + JSON.stringify(c).length, 0)

    return {
      size: this.cache.size,
      hits,
      memory,
    }
  }

  /**
   * Set cache duration (in ms)
   */
  setCacheDuration(duration: number): void {
    this.cacheDuration = duration
  }

  /**
   * Set cache size limit
   */
  setCacheSize(size: number): void {
    this.cacheSize = size
  }
}
