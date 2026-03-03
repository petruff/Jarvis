/**
 * Chain Optimizer Tests
 */

import { ChainOptimizer } from '../../packages/jarvis-backend/src/tools/chainOptimizer'
import { ToolDef, Dependency } from '../../packages/jarvis-backend/src/tools/dependencyAnalyzer'

describe('ChainOptimizer', () => {
  let optimizer: ChainOptimizer

  beforeEach(() => {
    optimizer = new ChainOptimizer()
  })

  const createTool = (id: string, duration: number = 100): ToolDef => ({
    id,
    name: id,
    inputs: {},
    outputs: { [`${id}_output`]: 'string' },
    estimatedDurationMs: duration
  })

  test('optimizes tool chains', () => {
    const sequence = ['tool_a', 'tool_b', 'tool_c', 'tool_a']
    const graph = new Map<string, Dependency[]>([
      ['tool_a', []],
      ['tool_b', [{ from: 'tool_a', to: 'tool_b', type: 'data', required: true }]],
      ['tool_c', [{ from: 'tool_b', to: 'tool_c', type: 'data', required: true }]]
    ])
    const tools = new Map([
      ['tool_a', createTool('tool_a')],
      ['tool_b', createTool('tool_b')],
      ['tool_c', createTool('tool_c')]
    ])

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized).toBeDefined()
    expect(optimized.originalSteps).toBe(4)
    expect(optimized.optimizedSteps).toBeLessThanOrEqual(optimized.originalSteps)
  })

  test('removes duplicate tools', () => {
    const sequence = ['tool_a', 'tool_a', 'tool_a', 'tool_b']
    const graph = new Map([
      ['tool_a', []],
      ['tool_b', []]
    ])
    const tools = new Map([
      ['tool_a', createTool('tool_a')],
      ['tool_b', createTool('tool_b')]
    ])

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized.optimizedSteps).toBe(2) // Only tool_a and tool_b
  })

  test('calculates step reduction', () => {
    const sequence = ['a', 'b', 'c', 'a', 'b']
    const graph = new Map([
      ['a', []],
      ['b', []],
      ['c', []]
    ])
    const tools = new Map([
      ['a', createTool('a')],
      ['b', createTool('b')],
      ['c', createTool('c')]
    ])

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized.stepReduction).toBeGreaterThanOrEqual(0)
    expect(optimized.stepReduction).toBeLessThanOrEqual(100)
  })

  test('groups parallel tools', () => {
    const sequence = ['tool_a', 'tool_b', 'tool_c']
    const graph = new Map([
      ['tool_a', []],
      ['tool_b', []],
      ['tool_c', [{ from: 'tool_a', to: 'tool_c', type: 'data', required: true }]]
    ])
    const tools = new Map([
      ['tool_a', createTool('tool_a')],
      ['tool_b', createTool('tool_b')],
      ['tool_c', createTool('tool_c')]
    ])

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized.executionGroups.length).toBeGreaterThan(0)
  })

  test('estimates time savings', () => {
    const sequence = ['tool_a', 'tool_b', 'tool_c']
    const graph = new Map([
      ['tool_a', []],
      ['tool_b', [{ from: 'tool_a', to: 'tool_b', type: 'data', required: true }]],
      ['tool_c', [{ from: 'tool_b', to: 'tool_c', type: 'data', required: true }]]
    ])
    const tools = new Map([
      ['tool_a', createTool('tool_a', 100)],
      ['tool_b', createTool('tool_b', 100)],
      ['tool_c', createTool('tool_c', 100)]
    ])

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized.estimatedTimeSavings).toBeGreaterThanOrEqual(0)
  })

  test('handles empty chains', () => {
    const sequence: string[] = []
    const graph = new Map<string, Dependency[]>()
    const tools = new Map<string, ToolDef>()

    const optimized = optimizer.optimizeChain(sequence, graph, tools)

    expect(optimized.optimizedSteps).toBe(0)
  })
})
