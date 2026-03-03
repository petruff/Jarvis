import { ContextCompressor } from '../../src/context/contextCompressor'

describe('ContextCompressor', () => {
  let compressor: ContextCompressor

  beforeEach(() => {
    compressor = new ContextCompressor()
  })

  test('should compress text', () => {
    const text = 'This is a long text that contains redundant information. ' +
      'This is a long text that contains redundant information. ' +
      'This is important information that should be kept.'

    const result = compressor.compress(text)
    expect(result.compressed.length).toBeLessThan(text.length)
  })

  test('should calculate compression ratio', () => {
    const text = 'The quick brown fox jumps over the lazy dog. ' +
      'The quick brown fox jumps over the lazy dog.'

    const result = compressor.compress(text)
    expect(result.compressionRatio).toBeGreaterThan(0)
    expect(result.compressionRatio).toBeLessThanOrEqual(1)
  })

  test('should count tokens correctly', () => {
    const text = 'This is a test.'
    const tokens = compressor.countTokens(text)
    expect(tokens).toBeGreaterThan(0)
  })

  test('should preserve quality (>50%)', () => {
    const text = 'Machine learning is a subset of artificial intelligence. ' +
      'Machine learning enables computers to learn from data. ' +
      'Deep learning is a subset of machine learning. ' +
      'Deep learning uses neural networks.'

    const result = compressor.compress(text)
    expect(result.quality).toBeGreaterThan(0.5)
  })

  test('should handle target token limit', () => {
    const text = 'This is a longer text with many words that should be compressed. ' +
      'It contains multiple sentences. The compression should respect the token limit. ' +
      'This ensures efficient use of context window space.'

    const targetTokens = 20
    const result = compressor.compress(text, targetTokens)
    expect(result.compressedTokens).toBeLessThanOrEqual(targetTokens + 5) // Allow small margin
  })
})
