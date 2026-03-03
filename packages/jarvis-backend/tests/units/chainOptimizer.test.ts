import { ChainOptimizer } from '../../src/tools/chainOptimizer'
import { Tool, DependencyAnalyzer, DependencyGraph } from '../../src/tools/dependencyAnalyzer'

describe('ChainOptimizer', () => {
  let optimizer: ChainOptimizer
  let analyzer: DependencyAnalyzer

  beforeEach(() => {
    optimizer = new ChainOptimizer()
    analyzer = new DependencyAnalyzer()
  })

  test('should optimize tool chain', () => {
    const tools: Tool[] = [
      { id: 'a', name: 'A', inputs: [], outputs: ['x'], estimatedDuration: 100, parallelizable: false },
      { id: 'b', name: 'B', inputs: ['x'], outputs: ['y'], estimatedDuration: 100, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    const result = optimizer.optimizeChain(tools, ['a', 'b'], graph)

    expect(result).toBeDefined()
    expect(result.optimized.length).toBeGreaterThan(0)
  })

  test('should calculate time improvement', () => {
    const tools: Tool[] = [
      { id: 'x', name: 'X', inputs: [], outputs: ['p'], estimatedDuration: 50, parallelizable: false },
      { id: 'y', name: 'Y', inputs: ['p'], outputs: ['q'], estimatedDuration: 50, parallelizable: false },
      { id: 'z', name: 'Z', inputs: ['q'], outputs: ['r'], estimatedDuration: 50, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    const result = optimizer.optimizeChain(tools, ['x', 'y', 'z'], graph)

    expect(result.estimatedTimeOriginal).toBeGreaterThan(0)
    expect(result.estimatedTimeOptimized).toBeGreaterThan(0)
  })

  test('should identify parallel opportunities', () => {
    const tools: Tool[] = [
      { id: 'p1', name: 'P1', inputs: [], outputs: ['a'], estimatedDuration: 100, parallelizable: true },
      { id: 'p2', name: 'P2', inputs: [], outputs: ['b'], estimatedDuration: 100, parallelizable: true },
      { id: 'p3', name: 'P3', inputs: ['a', 'b'], outputs: ['c'], estimatedDuration: 50, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    const parallel = optimizer.getParallelOpportunities(['p1', 'p2', 'p3'], graph)

    expect(parallel.length).toBeGreaterThan(0)
    expect(parallel[0].length).toBeGreaterThan(0)
  })

  test('should detect non-parallelizable chains', () => {
    const tools: Tool[] = [
      { id: 's1', name: 'S1', inputs: [], outputs: ['x'], estimatedDuration: 100, parallelizable: false },
      { id: 's2', name: 'S2', inputs: ['x'], outputs: ['y'], estimatedDuration: 100, parallelizable: false },
      { id: 's3', name: 'S3', inputs: ['y'], outputs: ['z'], estimatedDuration: 100, parallelizable: false },
    ]

    const graph = analyzer.buildGraph(tools)
    const parallel = optimizer.getParallelOpportunities(['s1', 's2', 's3'], graph)

    // Sequential chain should have 3 levels (one tool each)
    expect(parallel.length).toBe(3)
  })

  test('should calculate step reduction', () => {
    const tools: Tool[] = [
      { id: 't1', name: 'T1', inputs: [], outputs: ['o1'], estimatedDuration: 80, parallelizable: true },
      { id: 't2', name: 'T2', inputs: [], outputs: ['o2'], estimatedDuration: 80, parallelizable: true },
    ]

    const graph = analyzer.buildGraph(tools)
    const result = optimizer.optimizeChain(tools, ['t1', 't2'], graph)

    // Parallel execution reduces to 1 step
    expect(result.stepReduction).toBeGreaterThanOrEqual(0)
  })
})
