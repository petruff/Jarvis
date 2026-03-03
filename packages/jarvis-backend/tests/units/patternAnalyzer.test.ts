import { PatternAnalyzer, ExecutionSequence } from '../../src/skills/patternAnalyzer'

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer

  beforeEach(() => {
    analyzer = new PatternAnalyzer()
  })

  test('should detect patterns with 3+ occurrences', () => {
    const executions: ExecutionSequence[] = [
      { steps: ['A', 'B', 'C'], frequency: 1, successRate: 0.8, avgDuration: 100, confidenceScore: 0.8 },
      { steps: ['A', 'B', 'C'], frequency: 1, successRate: 0.85, avgDuration: 95, confidenceScore: 0.85 },
      { steps: ['A', 'B', 'C'], frequency: 1, successRate: 0.82, avgDuration: 98, confidenceScore: 0.82 },
    ]

    const patterns = analyzer.detectPatterns(executions)
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].frequency).toBe(3)
  })

  test('should return empty patterns for single execution', () => {
    const executions: ExecutionSequence[] = [
      { steps: ['A', 'B'], frequency: 1, successRate: 0.8, avgDuration: 100, confidenceScore: 0.8 },
    ]

    const patterns = analyzer.detectPatterns(executions)
    expect(patterns.length).toBe(0)
  })

  test('should calculate confidence score correctly', () => {
    const pattern = {
      id: 'test',
      name: 'Test',
      steps: ['A', 'B'],
      frequency: 10,
      successRate: 0.9,
      instances: 10,
      created: new Date(),
    }

    const confidence = analyzer.calculateConfidence(pattern)
    expect(confidence).toBeGreaterThan(0)
    expect(confidence).toBeLessThanOrEqual(1)
  })

  test('should filter patterns with low success rate', () => {
    const executions: ExecutionSequence[] = [
      { steps: ['X', 'Y'], frequency: 1, successRate: 0.3, avgDuration: 50, confidenceScore: 0.3 },
      { steps: ['X', 'Y'], frequency: 1, successRate: 0.2, avgDuration: 50, confidenceScore: 0.2 },
      { steps: ['X', 'Y'], frequency: 1, successRate: 0.4, avgDuration: 50, confidenceScore: 0.4 },
    ]

    const patterns = analyzer.detectPatterns(executions)
    expect(patterns.length).toBe(0) // Average <50% success rate
  })

  test('should retrieve patterns by ID', () => {
    const executions: ExecutionSequence[] = [
      { steps: ['P', 'Q', 'R'], frequency: 1, successRate: 0.9, avgDuration: 100, confidenceScore: 0.9 },
      { steps: ['P', 'Q', 'R'], frequency: 1, successRate: 0.92, avgDuration: 105, confidenceScore: 0.92 },
      { steps: ['P', 'Q', 'R'], frequency: 1, successRate: 0.88, avgDuration: 95, confidenceScore: 0.88 },
    ]

    const patterns = analyzer.detectPatterns(executions)
    expect(patterns.length).toBeGreaterThan(0)
    const pattern = analyzer.getPattern(patterns[0].id)
    expect(pattern).toBeDefined()
    expect(pattern?.id).toBe(patterns[0].id)
  })
})
