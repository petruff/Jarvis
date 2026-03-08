/**
 * Response Cache - Fast path for common queries
 * Provides instant responses from memory (<50ms)
 */

import { v4 as uuidv4 } from 'uuid'

export interface CachedResponse {
  id: string
  query: string
  response: string
  confidence: number
  timestamp: Date
  ttlMs: number
  hitCount: number
}

export class ResponseCache {
  private store = new Map<string, CachedResponse>()
  private queryIndex = new Map<string, string[]>() // For similarity matching
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Try to find cached response for query
   */
  match(query: string, minConfidence: number = 0.85): CachedResponse | null {
    const normalized = this.normalize(query)

    // Exact match first
    let cached = this.store.get(normalized)
    if (cached && this.isValid(cached)) {
      cached.hitCount++
      return cached
    }

    // Semantic similarity match
    for (const [key, response] of this.store) {
      if (!this.isValid(response)) {
        this.store.delete(key)
        continue
      }

      const similarity = this.calculateSimilarity(normalized, key)
      if (similarity > minConfidence) {
        response.hitCount++
        return response
      }
    }

    return null
  }

  /**
   * Cache a response for future queries
   */
  cache(query: string, response: string, confidence: number, ttlMs: number = this.DEFAULT_TTL_MS): CachedResponse {
    const normalized = this.normalize(query)

    const cached: CachedResponse = {
      id: uuidv4(),
      query,
      response,
      confidence,
      timestamp: new Date(),
      ttlMs,
      hitCount: 0
    }

    this.store.set(normalized, cached)
    this.updateIndex(normalized, query)

    return cached
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern?: string): number {
    let removed = 0

    if (!pattern) {
      // Clear all
      removed = this.store.size
      this.store.clear()
      this.queryIndex.clear()
      return removed
    }

    // Remove matching pattern
    for (const [key, response] of this.store) {
      if (key.includes(this.normalize(pattern))) {
        this.store.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0
    let validEntries = 0

    for (const response of this.store.values()) {
      if (this.isValid(response)) {
        validEntries++
        totalHits += response.hitCount
      }
    }

    return {
      totalCached: validEntries,
      totalHits,
      avgHitsPerEntry: validEntries > 0 ? totalHits / validEntries : 0,
      hitRate: totalHits > 0 ? 1.0 : 0.0
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0

    for (const [key, response] of this.store) {
      if (!this.isValid(response)) {
        this.store.delete(key)
        removed++
      }
    }

    return removed
  }

  private isValid(response: CachedResponse): boolean {
    const age = Date.now() - response.timestamp.getTime()
    return age < response.ttlMs
  }

  private normalize(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  private calculateSimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.split(' '))
    const words2 = new Set(query2.split(' '))

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  private updateIndex(normalized: string, original: string): void {
    const words = normalized.split(' ')
    for (const word of words) {
      if (!this.queryIndex.has(word)) {
        this.queryIndex.set(word, [])
      }
      this.queryIndex.get(word)!.push(normalized)
    }
  }
}
