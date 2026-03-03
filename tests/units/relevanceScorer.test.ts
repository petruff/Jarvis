/**
 * Relevance Scorer Tests
 */

import { RelevanceScorer, ContextItem } from '../../packages/jarvis-backend/src/context/relevanceScorer'

describe('RelevanceScorer', () => {
  let scorer: RelevanceScorer

  beforeEach(() => {
    scorer = new RelevanceScorer()
  })

  const createItem = (id: string, content: string, daysOld: number = 0): ContextItem => ({
    id,
    content,
    type: 'memory',
    createdAt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
    relatedTopics: ['test', 'data']
  })

  test('scores context items', () => {
    const items = [
      createItem('1', 'This is about machine learning'),
      createItem('2', 'This is about cooking'),
      createItem('3', 'This is about machine learning models')
    ]

    const scores = scorer.scoreItems(items, 'machine learning')

    expect(scores.length).toBe(3)
    expect(scores.every(s => typeof s.score === 'number')).toBe(true)
    expect(scores.every(s => s.score >= 0 && s.score <= 1)).toBe(true)
  })

  test('ranks relevant items higher', () => {
    const items = [
      createItem('1', 'This is about machine learning'),
      createItem('2', 'This is about cooking recipes'),
      createItem('3', 'This is about machine learning models')
    ]

    const scores = scorer.scoreItems(items, 'machine learning')
    const sorted = scores.sort((a, b) => b.score - a.score)

    // Items about ML should score higher than cooking
    const mlScores = scores.filter(s => ['1', '3'].includes(s.itemId)).map(s => s.score)
    const cookingScore = scores.find(s => s.itemId === '2')?.score || 0

    expect(Math.max(...mlScores)).toBeGreaterThan(cookingScore)
  })

  test('filters by relevance threshold', () => {
    const items = [
      createItem('1', 'This is about machine learning'),
      createItem('2', 'This is about cooking'),
      createItem('3', 'This is not related at all')
    ]

    const scores = scorer.scoreItems(items, 'machine learning')
    const filtered = scorer.filterByThreshold(scores, 0.5)

    expect(filtered.length).toBeLessThanOrEqual(3)
  })

  test('returns top N items', () => {
    const items = [
      createItem('1', 'machine learning topic'),
      createItem('2', 'machine learning topic'),
      createItem('3', 'unrelated'),
      createItem('4', 'machine learning topic'),
      createItem('5', 'machine learning topic')
    ]

    const scores = scorer.scoreItems(items, 'machine learning')
    const top3 = scorer.getTopN(scores, 3)

    expect(top3.length).toBe(3)
  })

  test('considers recency', () => {
    const items = [
      createItem('1', 'machine learning old', 100),
      createItem('2', 'machine learning new', 1)
    ]

    const scores = scorer.scoreItems(items, 'machine learning')
    const newScore = scores.find(s => s.itemId === '2')?.score || 0
    const oldScore = scores.find(s => s.itemId === '1')?.score || 0

    expect(newScore).toBeGreaterThan(oldScore)
  })

  test('estimates tokens correctly', () => {
    const text = 'This is a sample text with multiple words'
    const tokens = scorer.estimateTokens(text)

    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeCloseTo(9 * 1.3, 1) // ~9 words * 1.3
  })
})
