import { RelevanceScorer, ContextItem } from '../../src/context/relevanceScorer'

describe('RelevanceScorer', () => {
  let scorer: RelevanceScorer

  beforeEach(() => {
    scorer = new RelevanceScorer()
  })

  test('should score items between 0 and 1', () => {
    const items: ContextItem[] = [
      { id: '1', content: 'machine learning model training', type: 'memory', createdAt: new Date(), tokens: 100 },
      { id: '2', content: 'neural networks architecture', type: 'fact', createdAt: new Date(), tokens: 80 },
    ]

    const scores = scorer.scoreItems(items, 'machine learning', '')
    expect(scores.every((s) => s.score >= 0 && s.score <= 1)).toBe(true)
  })

  test('should score relevant items higher', () => {
    const items: ContextItem[] = [
      { id: '1', content: 'machine learning AI deep learning', type: 'memory', createdAt: new Date(), tokens: 150 },
      { id: '2', content: 'completely unrelated topic dogs cats birds', type: 'memory', createdAt: new Date(), tokens: 80 },
    ]

    const scores = scorer.scoreItems(items, 'machine learning', '')
    const score1 = scores.find((s) => s.itemId === '1')
    const score2 = scores.find((s) => s.itemId === '2')

    expect(score1?.score).toBeGreaterThan(score2?.score || 0)
  })

  test('should prefer recent context', () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const items: ContextItem[] = [
      { id: '1', content: 'current information', type: 'memory', createdAt: now, tokens: 100 },
      { id: '2', content: 'current information', type: 'memory', createdAt: yesterday, tokens: 100 },
    ]

    const scores = scorer.scoreItems(items, 'current', '')
    const score1 = scores.find((s) => s.itemId === '1')
    const score2 = scores.find((s) => s.itemId === '2')

    expect(score1?.score).toBeGreaterThan(score2?.score || 0)
  })

  test('should update IDF from documents', () => {
    const docs = [
      'machine learning is important',
      'deep learning requires neural networks',
      'machine learning has many applications',
    ]

    scorer.updateIdf(docs)
    // Should not throw
    expect(true).toBe(true)
  })

  test('should calculate score statistics', () => {
    const items: ContextItem[] = [
      { id: '1', content: 'test content one', type: 'memory', createdAt: new Date(), tokens: 50 },
      { id: '2', content: 'test content two', type: 'memory', createdAt: new Date(), tokens: 50 },
      { id: '3', content: 'test content three', type: 'memory', createdAt: new Date(), tokens: 50 },
    ]

    const scores = scorer.scoreItems(items, 'test content', '')
    const stats = scorer.getStatistics(scores)

    expect(stats.avg).toBeGreaterThan(0)
    expect(stats.max).toBeGreaterThanOrEqual(stats.min)
    expect(stats.median).toBeGreaterThanOrEqual(stats.min)
  })
})
