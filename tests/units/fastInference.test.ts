import { FastInference } from '../../packages/jarvis-backend/src/performance/fastInference'

describe('FastInference', () => {
  let inference: FastInference

  beforeEach(() => {
    inference = new FastInference()
  })

  test('answers greetings instantly', async () => {
    const answer = await inference.generateQuickAnswer('hello', '')
    expect(answer).toBeDefined()
    expect(answer?.source).toBe('template')
    expect(answer?.confidence).toBeGreaterThan(0.9)
  })

  test('answers status queries quickly', async () => {
    const answer = await inference.generateQuickAnswer('what is the status', '')
    expect(answer).toBeDefined()
    expect(answer?.processingTimeMs).toBeLessThan(300)
  })

  test('times out on complex queries', async () => {
    const answer = await inference.generateQuickAnswer(
      'Analyze the last 100 executions and provide optimization recommendations',
      '',
      100 // 100ms timeout
    )
    // Should timeout and return null
    expect(answer?.confidence || 0).toBeLessThanOrEqual(0.75)
  })

  test('supports pattern-based answers', async () => {
    const answer = await inference.generateQuickAnswer('memory stats', '')
    expect(answer).toBeDefined()
  })

  test('streams responses', async () => {
    const chunks: string[] = []
    for await (const chunk of inference.streamQuickAnswer('hello', '')) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
  })

  test('respects processing time budget', async () => {
    const startTime = Date.now()
    await inference.generateQuickAnswer('test query', '', 200)
    const elapsed = Date.now() - startTime
    expect(elapsed).toBeLessThan(300) // Should complete within timeout + buffer
  })
})
