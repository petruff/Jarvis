/**
 * Semantic Recall - Query episodic memory directly
 * Answers questions without LLM calls (<50ms)
 */

export interface Fact {
  id: string
  content: string
  confidence: number
  source: string
  timestamp: Date
}

export interface RecalledMemory {
  facts: Fact[]
  answer: string | null
  confidence: number
  retrievedAt: Date
  processingTimeMs: number
}

export class SemanticRecall {
  /**
   * Query episodic memory for similar items
   * Uses vector similarity, returns relevant context
   */
  async recallSimilar(
    query: string,
    topK: number = 3,
    minSimilarity: number = 0.6
  ): Promise<RecalledMemory> {
    const startTime = Date.now()

    // Mock: Replace with actual episodicMemory.recall()
    // const results = await episodicMemory.recall(query, topK)

    // For now: simulate fast memory lookup
    const facts: Fact[] = [
      {
        id: '1',
        content: 'Recent execution: skills discovery found 5 patterns',
        confidence: 0.9,
        source: 'episodic',
        timestamp: new Date(Date.now() - 60000)
      }
    ]

    return {
      facts,
      answer: null,
      confidence: 0.7,
      retrievedAt: new Date(),
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Extract facts directly without LLM
   * Keyword + semantic search
   */
  async queryFacts(question: string, topK: number = 5): Promise<Fact[]> {
    // Parse question for keywords
    const keywords = this.extractKeywords(question)

    // Mock: Search database for matching facts
    const facts: Fact[] = []

    // Would query: SELECT * FROM facts WHERE keywords && fact_keywords
    // Return top K by relevance

    return facts
  }

  /**
   * Assemble answer from retrieved context
   * No LLM, pure formatting
   */
  async assembleFromMemory(query: string): Promise<string | null> {
    const startTime = Date.now()

    const memories = await this.recallSimilar(query)

    if (memories.facts.length === 0) {
      return null
    }

    // Check if we have high-confidence facts
    const highConfidence = memories.facts.filter(f => f.confidence > 0.8)

    if (highConfidence.length === 0) {
      return null
    }

    // Format answer from facts
    const answer = this.formatAnswer(highConfidence)

    return answer
  }

  /**
   * Score confidence of assembled answer
   */
  scoreConfidence(answer: string, facts: Fact[]): number {
    if (facts.length === 0) return 0

    const avgConfidence = facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length
    const recency = this.scoreRecency(facts)

    return (avgConfidence * 0.7) + (recency * 0.3)
  }

  private extractKeywords(question: string): string[] {
    return question
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.isStopword(w))
  }

  private isStopword(word: string): boolean {
    const stopwords = ['the', 'and', 'what', 'that', 'this', 'with', 'from']
    return stopwords.includes(word)
  }

  private formatAnswer(facts: Fact[]): string {
    if (facts.length === 0) return ''

    const content = facts.map(f => f.content).join(' ')
    return `Based on recent information: ${content}`
  }

  private scoreRecency(facts: Fact[]): number {
    if (facts.length === 0) return 0

    const now = Date.now()
    const ages = facts.map(f => now - f.timestamp.getTime())
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length

    // Recent = high score, old = low score
    const dayMs = 24 * 60 * 60 * 1000
    return Math.exp(-avgAge / dayMs)
  }
}
