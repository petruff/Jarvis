/**
 * Context Compressor - Reduces token usage while preserving semantic meaning
 */

export interface CompressionResult {
  original: string
  compressed: string
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
}

export class ContextCompressor {
  private readonly MIN_COMPRESSION_RATIO = 0.7 // Preserve 70%+ of meaning

  /**
   * Compress text while preserving semantic meaning
   */
  compress(text: string, targetTokens?: number): CompressionResult {
    const originalTokens = this.estimateTokens(text)
    const targetRatio = targetTokens ? targetTokens / originalTokens : 0.7

    // Step 1: Remove redundancy
    let compressed = this.removeRedundancy(text)

    // Step 2: Condense sentences
    compressed = this.condenseSentences(compressed)

    // Step 3: Extract key points
    if (this.estimateTokens(compressed) > (targetTokens || originalTokens * targetRatio)) {
      compressed = this.extractKeyPoints(compressed, targetRatio)
    }

    const compressedTokens = this.estimateTokens(compressed)
    const ratio = compressedTokens / originalTokens

    return {
      original: text,
      compressed,
      originalTokens,
      compressedTokens,
      compressionRatio: ratio
    }
  }

  /**
   * Compress structured data (JSON)
   */
  compressStructured(data: Record<string, unknown>): Record<string, unknown> {
    const compressed: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        compressed[key] = this.compress(value).compressed
      } else if (typeof value === 'object' && value !== null) {
        compressed[key] = this.compressStructured(value as Record<string, unknown>)
      } else {
        compressed[key] = value
      }
    }

    return compressed
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Simple approximation: ~1.3 tokens per word
    const wordCount = text.split(/\s+/).length
    return Math.ceil(wordCount * 1.3)
  }

  private removeRedundancy(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim())
    const uniqueSentences: string[] = []
    const seenNorms = new Set<string>()

    for (const sentence of sentences) {
      const normalized = this.normalizeSentence(sentence)
      if (!seenNorms.has(normalized)) {
        uniqueSentences.push(sentence.trim())
        seenNorms.add(normalized)
      }
    }

    return uniqueSentences.join('. ') + '.'
  }

  private condenseSentences(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim())

    return sentences
      .map(sentence => {
        let condensed = sentence
          .replace(/\s+/g, ' ')
          .replace(/\b(very|really|extremely|quite|rather)\s+/gi, '')
          .replace(/\b(that|which)\s+/gi, '') // Remove some relative clauses
          .trim()

        // Shorten common phrases
        condensed = condensed
          .replace(/\bin order to\b/gi, 'to')
          .replace(/\bas a result\b/gi, 'so')
          .replace(/\bat this point in time\b/gi, 'now')
          .replace(/\bdue to the fact that\b/gi, 'because')

        return condensed
      })
      .filter(s => s.length > 0)
      .join('. ') + '.'
  }

  private extractKeyPoints(text: string, targetRatio: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim())

    // Score sentences by importance
    const scored = sentences.map(sentence => ({
      text: sentence.trim(),
      score: this.sentenceScore(sentence, text),
      tokens: this.estimateTokens(sentence)
    }))

    // Sort by score and select top sentences until target reached
    const selected: string[] = []
    let totalTokens = 0
    const targetTokens = this.estimateTokens(text) * targetRatio

    for (const item of scored.sort((a, b) => b.score - a.score)) {
      if (totalTokens + item.tokens <= targetTokens) {
        selected.push(item.text)
        totalTokens += item.tokens
      }
    }

    return selected.join('. ') + '.'
  }

  private sentenceScore(sentence: string, context: string): number {
    let score = 0

    // Sentences with action verbs score higher
    if (/\b(is|are|was|were|create|build|develop|implement)\b/i.test(sentence)) {
      score += 0.3
    }

    // Sentences with numbers/specific facts score higher
    if (/\d+/.test(sentence)) {
      score += 0.2
    }

    // Longer sentences (more info) score higher
    score += Math.min(sentence.length / 200, 0.3)

    // Sentences appearing early score higher
    if (context.indexOf(sentence) < context.length / 2) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private normalizeSentence(sentence: string): string {
    return sentence
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:]/g, '')
      .trim()
  }
}
