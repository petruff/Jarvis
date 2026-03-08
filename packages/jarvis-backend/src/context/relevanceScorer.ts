/**
 * Relevance Scorer - Scores context items for inclusion in agent reasoning
 */

export interface ContextItem {
  id: string
  content: string
  type: 'memory' | 'goal' | 'rule' | 'fact' | 'conversation'
  createdAt: Date
  frequency?: number // how often referenced
  relatedTopics?: string[]
  tokens?: number // token count for pruning
}


export interface RelevanceScore {
  itemId: string
  score: number // 0-1
  breakdown: {
    tfIdf: number
    recency: number
    relationship: number
    taskAlignment: number
  }
}

export class RelevanceScorer {
  private tfIdfCache: Map<string, number> = new Map()
  private documentFrequency: Map<string, number> = new Map()

  /**
   * Score context items against a query
   */
  scoreItems(items: ContextItem[], query: string, taskContext?: string): RelevanceScore[] {
    const queryTerms = this.tokenize(query)
    const taskTerms = taskContext ? this.tokenize(taskContext) : []
    const allTerms = [...queryTerms, ...taskTerms]

    return items.map(item => {
      const tfIdf = this.calculateTfIdf(item.content, allTerms, items)
      const recency = this.calculateRecency(item.createdAt)
      const relationship = this.calculateRelationship(item, queryTerms)
      const taskAlignment = taskTerms.length > 0 ? this.calculateAlignment(item, taskTerms) : 0

      const score = (tfIdf * 0.3) + (recency * 0.2) + (relationship * 0.3) + (taskAlignment * 0.2)

      return {
        itemId: item.id,
        score: Math.min(score, 1.0),
        breakdown: { tfIdf, recency, relationship, taskAlignment }
      }
    })
  }

  /**
   * Filter items by relevance threshold
   */
  filterByThreshold(scores: RelevanceScore[], threshold: number = 0.5): string[] {
    return scores
      .filter(s => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map(s => s.itemId)
  }

  /**
   * Get top N most relevant items
   */
  getTopN(scores: RelevanceScore[], n: number): string[] {
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(s => s.itemId)
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .match(/\b\w+\b/g) || []
  }

  private calculateTfIdf(content: string, queryTerms: string[], allItems: ContextItem[]): number {
    const contentTokens = this.tokenize(content)
    let score = 0

    for (const term of queryTerms) {
      const tf = contentTokens.filter(t => t === term).length / contentTokens.length
      const df = allItems.filter(item =>
        this.tokenize(item.content).includes(term)
      ).length
      const idf = Math.log(allItems.length / Math.max(df, 1))
      score += tf * idf
    }

    return Math.min(score / queryTerms.length, 1.0)
  }

  private calculateRecency(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)

    // Decay function: recent items score higher
    // After 30 days: 0.5, after 90 days: 0.1
    return Math.exp(-ageDays / 30)
  }

  private calculateRelationship(item: ContextItem, queryTerms: string[]): number {
    if (!item.relatedTopics || item.relatedTopics.length === 0) return 0

    const topicTerms = item.relatedTopics.join(' ').split(/\s+/)
    const matches = queryTerms.filter(term =>
      topicTerms.some(topic => topic.includes(term) || term.includes(topic))
    ).length

    return Math.min(matches / queryTerms.length, 1.0)
  }

  private calculateAlignment(item: ContextItem, taskTerms: string[]): number {
    const contentTokens = this.tokenize(item.content)
    const matches = taskTerms.filter(term =>
      contentTokens.includes(term)
    ).length

    return Math.min(matches / taskTerms.length, 1.0)
  }
}
