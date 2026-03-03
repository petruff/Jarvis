// Story 4.3: Sliding Window Manager
// Manages context window with automatic FIFO eviction

export interface WindowItem {
  id: string
  content: string
  tokens: number
  addedAt: Date
  priority: 'high' | 'normal' | 'low'
  pinned: boolean
}

export interface WindowStatus {
  currentTokens: number
  capacity: number
  percentUsed: number
  itemCount: number
}

export class SlidingWindowManager {
  private window: WindowItem[] = []
  private capacity: number
  private pinned: Set<string> = new Set()

  constructor(capacity: number = 4096) {
    this.capacity = capacity
  }

  /**
   * Add item to window
   * Automatically evicts low-priority items if needed
   */
  addItem(id: string, content: string, priority: 'high' | 'normal' | 'low' = 'normal'): boolean {
    const tokens = this.countTokens(content)

    // Check if item fits
    const currentTokens = this.getCurrentTokens()
    if (currentTokens + tokens > this.capacity) {
      // Evict low priority items
      this.evictLowest(tokens)
    }

    this.window.push({
      id,
      content,
      tokens,
      addedAt: new Date(),
      priority,
      pinned: false,
    })

    return true
  }

  /**
   * Pin item (won't be evicted)
   */
  pinItem(id: string): boolean {
    const item = this.window.find((i) => i.id === id)
    if (!item) return false
    item.pinned = true
    this.pinned.add(id)
    return true
  }

  /**
   * Unpin item
   */
  unpinItem(id: string): boolean {
    const item = this.window.find((i) => i.id === id)
    if (!item) return false
    item.pinned = false
    this.pinned.delete(id)
    return true
  }

  /**
   * Get window contents
   */
  getWindow(): WindowItem[] {
    return this.window
  }

  /**
   * Get window status
   */
  getStatus(): WindowStatus {
    const currentTokens = this.getCurrentTokens()
    return {
      currentTokens,
      capacity: this.capacity,
      percentUsed: (currentTokens / this.capacity) * 100,
      itemCount: this.window.length,
    }
  }

  /**
   * Remove item from window
   */
  removeItem(id: string): boolean {
    const index = this.window.findIndex((i) => i.id === id)
    if (index === -1) return false
    this.window.splice(index, 1)
    this.pinned.delete(id)
    return true
  }

  /**
   * Evict lowest priority items until space available
   */
  private evictLowest(neededTokens: number): void {
    let evicted = 0
    const sortedByPriority = this.window
      .filter((i) => !i.pinned)
      .sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

    for (const item of sortedByPriority) {
      if (evicted >= neededTokens) break
      this.removeItem(item.id)
      evicted += item.tokens
    }
  }

  /**
   * Get current token count
   */
  private getCurrentTokens(): number {
    return this.window.reduce((sum, item) => sum + item.tokens, 0)
  }

  /**
   * Count tokens (approximate: 1 token ≈ 4 characters)
   */
  private countTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Clear window
   */
  clear(): void {
    this.window = []
    this.pinned.clear()
  }
}
