/**
 * Pattern Analyzer Tests
 */

import { PatternAnalyzer, ExecutionSequence, ExecutionStep } from '../../packages/jarvis-backend/src/skills/patternAnalyzer'

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer

  beforeEach(() => {
    analyzer = new PatternAnalyzer()
  })

  const createStep = (toolId: string, success: boolean = true): ExecutionStep => ({
    toolId,
    toolName: toolId,
    inputs: {},
    outputs: { result: 'data' },
    success,
    durationMs: 100,
    timestamp: new Date()
  })

  const createSequence = (toolIds: string[], success: boolean = true): ExecutionSequence => ({
    id: `seq-${Math.random()}`,
    agentId: 'agent-1',
    squadId: 'squad-1',
    steps: toolIds.map(id => createStep(id, success)),
    success,
    totalDuration: toolIds.length * 100,
    timestamp: new Date()
  })

  test('detects patterns with 3+ steps', () => {
    const executions = [
      createSequence(['tool_a', 'tool_b', 'tool_c']),
      createSequence(['tool_a', 'tool_b', 'tool_c']),
      createSequence(['tool_a', 'tool_b', 'tool_c'])
    ]

    const patterns = analyzer.detectPatterns(executions)

    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].frequency).toBeGreaterThanOrEqual(1)
  })

  test('ignores short sequences', () => {
    const executions = [
      createSequence(['tool_a', 'tool_b']),
      createSequence(['tool_a', 'tool_b']),
      createSequence(['tool_a', 'tool_b'])
    ]

    const patterns = analyzer.detectPatterns(executions)

    // Should find no patterns (< 3 steps)
    expect(patterns.length).toBe(0)
  })

  test('calculates success rate correctly', () => {
    const executions = [
      createSequence(['a', 'b', 'c'], true),
      createSequence(['a', 'b', 'c'], true),
      createSequence(['a', 'b', 'c'], false)
    ]

    const patterns = analyzer.detectPatterns(executions)
    const pattern = patterns.find(p => p.pattern.join('->') === 'a->b->c')

    expect(pattern).toBeDefined()
    expect(pattern?.successRate).toBeCloseTo(66.67, 1)
  })

  test('ranks patterns by confidence', () => {
    const executions = [
      createSequence(['a', 'b', 'c']), // Low frequency
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z'])
    ]

    const patterns = analyzer.detectPatterns(executions)

    if (patterns.length >= 2) {
      expect(patterns[0].confidence).toBeGreaterThanOrEqual(patterns[1].confidence)
    }
  })

  test('handles empty executions', () => {
    const patterns = analyzer.detectPatterns([])
    expect(patterns).toEqual([])
  })

  test('recommends top patterns', () => {
    const executions = [
      createSequence(['a', 'b', 'c']),
      createSequence(['a', 'b', 'c']),
      createSequence(['a', 'b', 'c']),
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z']),
      createSequence(['x', 'y', 'z'])
    ]

    const patterns = analyzer.detectPatterns(executions)
    const recommended = analyzer.recommendPatterns(patterns, 1)

    expect(recommended.length).toBeLessThanOrEqual(1)
    expect(recommended[0].confidence).toBeGreaterThanOrEqual(0.6)
  })
})
