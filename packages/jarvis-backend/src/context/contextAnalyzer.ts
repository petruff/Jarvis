// Story 4.3: Context Analyzer
// Orchestrates context optimization (scoring, compression, windowing)

import { RelevanceScorer, RelevanceScore, ContextItem } from './relevanceScorer'
import { ContextCompressor } from './contextCompressor'
import { SlidingWindowManager, WindowItem } from './slidingWindowManager'

export interface ContextOptimizationResult {
  originalTokens: number
  optimizedTokens: number
  compressionRatio: number
  itemsScored: number
  itemsRetained: number
  qualityPreserved: number
  timestamp: Date
}

export class ContextAnalyzer {
  private scorer: RelevanceScorer
  private compressor: ContextCompressor
  private windowManager: SlidingWindowManager

  constructor(windowCapacity: number = 4096) {
    this.scorer = new RelevanceScorer()
    this.compressor = new ContextCompressor()
    this.windowManager = new SlidingWindowManager(windowCapacity)
  }

  /**
   * Full context optimization pipeline
   * 1. Score relevance
   * 2. Keep top items
   * 3. Compress retained items
   * 4. Manage window
   */
  async optimizeContext(
    items: ContextItem[],
    query: string,
    taskContext: string = ''
  ): Promise<ContextOptimizationResult> {
    const originalTokens = items.reduce((sum, i) => sum + i.tokens, 0)

    // Score relevance
    const scores = this.scorer.scoreItems(items, query, taskContext)

    // Keep top 70% of items by relevance
    const keepThreshold = 0.3
    const highRelevance = scores.filter((s) => s.score > keepThreshold).sort((a, b) => b.score - a.score)

    // Add to window
    let totalQuality = 0
    for (const score of highRelevance) {
      const item = items.find((i) => i.id === score.itemId)
      if (item) {
        this.windowManager.addItem(item.id, item.content, 'normal')
        totalQuality += score.score
      }
    }

    // Get optimized context
    const optimizedItems = this.windowManager.getWindow()
    const optimizedContent = optimizedItems.map((i) => i.content).join('\n\n')

    // Compress optimized content
    const compressionResult = this.compressor.compress(optimizedContent)

    return {
      originalTokens,
      optimizedTokens: compressionResult.compressedTokens,
      compressionRatio: compressionResult.compressionRatio,
      itemsScored: scores.length,
      itemsRetained: optimizedItems.length,
      qualityPreserved:
        highRelevance.length > 0
          ? totalQuality / highRelevance.length
          : 0,
      timestamp: new Date(),
    }
  }

  /**
   * Analyze context efficiency
   */
  analyzeEfficiency(): {
    windowUsage: number
    averageItemSize: number
    compressionPotential: number
  } {
    const status = this.windowManager.getStatus()
    const items = this.windowManager.getWindow()
    const avgSize = items.length > 0 ? items.reduce((sum, i) => sum + i.tokens, 0) / items.length : 0

    return {
      windowUsage: status.percentUsed,
      averageItemSize: avgSize,
      compressionPotential: 0.2, // 20% target
    }
  }

  /**
   * Get current window
   */
  getOptimizedContext(): WindowItem[] {
    return this.windowManager.getWindow()
  }

  /**
   * Pin important context
   */
  pinContext(itemId: string): boolean {
    return this.windowManager.pinItem(itemId)
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.windowManager.clear()
  }
}
