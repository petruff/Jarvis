import { ResponseCache } from '../../packages/jarvis-backend/src/performance/responseCache'

describe('ResponseCache', () => {
  let cache: ResponseCache

  beforeEach(() => {
    cache = new ResponseCache()
  })

  test('caches and retrieves responses', () => {
    cache.cache('Hello', 'Hi there!', 0.95)
    const result = cache.match('Hello')

    expect(result).toBeDefined()
    expect(result?.response).toBe('Hi there!')
  })

  test('matches similar queries', () => {
    cache.cache('What is your status?', 'All systems operational', 0.9)
    const result = cache.match('status?', 0.7)

    expect(result).toBeDefined()
  })

  test('respects confidence threshold', () => {
    cache.cache('test', 'answer', 0.6)
    const result = cache.match('test', 0.9)

    expect(result).toBeNull() // Low confidence below threshold
  })

  test('expires old entries', (done) => {
    cache.cache('test', 'answer', 0.9, 100) // 100ms TTL
    expect(cache.match('test')).toBeDefined()

    setTimeout(() => {
      expect(cache.match('test')).toBeNull()
      done()
    }, 150)
  })

  test('invalidates matching patterns', () => {
    cache.cache('status query', 'answer1', 0.9)
    cache.cache('other query', 'answer2', 0.9)

    const removed = cache.invalidate('status')
    expect(removed).toBeGreaterThan(0)
    expect(cache.match('status query')).toBeNull()
    expect(cache.match('other query')).toBeDefined()
  })

  test('tracks hit statistics', () => {
    cache.cache('test', 'answer', 0.95)
    cache.match('test')
    cache.match('test')

    const stats = cache.getStats()
    expect(stats.totalHits).toBeGreaterThan(0)
  })
})
