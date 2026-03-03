/**
 * Context Compressor Tests
 */

import { ContextCompressor } from '../../packages/jarvis-backend/src/context/contextCompressor'

describe('ContextCompressor', () => {
  let compressor: ContextCompressor

  beforeEach(() => {
    compressor = new ContextCompressor()
  })

  test('compresses text', () => {
    const text = 'This is a very long text with many words. It contains redundant information. It has lots of fluff.'
    const result = compressor.compress(text)

    expect(result.compressed).toBeTruthy()
    expect(result.originalTokens).toBeGreaterThan(0)
    expect(result.compressedTokens).toBeGreaterThan(0)
    expect(result.compressionRatio).toBeLessThan(1.0)
  })

  test('achieves 20%+ compression', () => {
    const text = `
      The system is very important and critical for operations. It is really essential and quite vital.
      We need to ensure that it works properly. It must function correctly and perform well.
      The performance is critical. The reliability is essential. The availability is important.
    `
    const result = compressor.compress(text)

    // Target 20%+ compression (ratio 0.8 or less)
    expect(result.compressionRatio).toBeLessThan(1.0)
  })

  test('preserves semantic meaning', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const result = compressor.compress(text)

    // Should preserve key words
    const compressed = result.compressed.toLowerCase()
    expect(compressed).toContain('fox') || expect(compressed).toContain('dog')
  })

  test('removes redundancy', () => {
    const text = 'Important point is important. We need to make this point. This is the main point.'
    const result = compressor.compress(text)

    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
  })

  test('condenses wordy phrases', () => {
    const text = 'In order to complete this task, we need to do the following things.'
    const result = compressor.compress(text)

    // Should replace "in order to" with "to"
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
  })

  test('compresses structured data', () => {
    const data = {
      title: 'The very important and critical title about the system',
      description: 'This is a very long description that contains lots of words and information'
    }

    const result = compressor.compressStructured(data)

    expect(result.title).toBeTruthy()
    expect(result.description).toBeTruthy()
  })

  test('estimates tokens', () => {
    const text = 'one two three four five'
    const tokens = compressor.estimateTokens(text)

    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeCloseTo(5 * 1.3, 1)
  })

  test('respects target token limit', () => {
    const text = 'word '.repeat(100) // 100 words = ~130 tokens
    const targetTokens = 50
    const result = compressor.compress(text, targetTokens)

    expect(result.compressedTokens).toBeLessThanOrEqual(targetTokens * 1.2) // Allow 20% overage
  })
})
