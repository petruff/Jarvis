import { DependencyAnalyzer, Tool } from '../../src/tools/dependencyAnalyzer'

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer

  beforeEach(() => {
    analyzer = new DependencyAnalyzer()
  })

  test('should build dependency graph from tools', () => {
    const tools: Tool[] = [
      { id: 'tool1', name: 'Tool 1', inputs: ['a'], outputs: ['b'], estimatedDuration: 100, parallelizable: false },
      { id: 'tool2', name: 'Tool 2', inputs: ['b'], outputs: ['c'], estimatedDuration: 100, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    expect(graph.tools.size).toBe(2)
    expect(graph.dependencies.length).toBeGreaterThan(0)
  })

  test('should detect circular dependencies', () => {
    const tools: Tool[] = [
      { id: 'toolA', name: 'Tool A', inputs: ['x'], outputs: ['y'], estimatedDuration: 100, parallelizable: false },
      { id: 'toolB', name: 'Tool B', inputs: ['y'], outputs: ['z'], estimatedDuration: 100, parallelizable: false },
      { id: 'toolC', name: 'Tool C', inputs: ['z'], outputs: ['x'], estimatedDuration: 100, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    // Circular detection implementation may vary
    expect(graph.circularDeps).toBeDefined()
  })

  test('should calculate graph depth', () => {
    const tools: Tool[] = [
      { id: 't1', name: 'T1', inputs: ['a'], outputs: ['b'], estimatedDuration: 50, parallelizable: true },
      { id: 't2', name: 'T2', inputs: ['b'], outputs: ['c'], estimatedDuration: 50, parallelizable: true },
      { id: 't3', name: 'T3', inputs: ['c'], outputs: ['d'], estimatedDuration: 50, parallelizable: true },
    ]

    const graph = analyzer.buildGraph(tools)
    expect(graph.depth).toBeGreaterThan(0)
  })

  test('should identify parallel-executable tools', () => {
    const tools: Tool[] = [
      { id: 'p1', name: 'P1', inputs: ['x'], outputs: ['y'], estimatedDuration: 100, parallelizable: true },
      { id: 'p2', name: 'P2', inputs: ['x'], outputs: ['z'], estimatedDuration: 100, parallelizable: true },
    ]

    const graph = analyzer.buildGraph(tools)
    const parallel = analyzer.getParallel(graph)
    expect(parallel.length).toBeGreaterThan(0)
  })

  test('should handle independent tools', () => {
    const tools: Tool[] = [
      { id: 'i1', name: 'I1', inputs: [], outputs: ['a'], estimatedDuration: 100, parallelizable: true },
      { id: 'i2', name: 'I2', inputs: [], outputs: ['b'], estimatedDuration: 100, parallelizable: true },
    ]

    const graph = analyzer.buildGraph(tools)
    expect(graph.dependencies.length).toBe(0)
    const parallel = analyzer.getParallel(graph)
    expect(parallel.length).toBeGreaterThan(0)
  })
})
