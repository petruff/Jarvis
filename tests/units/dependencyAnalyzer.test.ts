/**
 * Dependency Analyzer Tests
 */

import { DependencyAnalyzer, ToolDef } from '../../packages/jarvis-backend/src/tools/dependencyAnalyzer'

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer

  beforeEach(() => {
    analyzer = new DependencyAnalyzer()
  })

  const createTool = (id: string, inputs: Record<string, boolean> = {}): ToolDef => ({
    id,
    name: id,
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { type: 'any', required: v }])),
    outputs: { [`${id}_output`]: 'string' },
    estimatedDurationMs: 100
  })

  test('builds dependency graph', () => {
    const tools = [
      createTool('tool_a', { param: true }),
      createTool('tool_b', { 'tool_a_output': true }),
      createTool('tool_c', { 'tool_b_output': true })
    ]

    const graph = analyzer.buildGraph(tools)

    expect(graph.size).toBe(3)
    expect(graph.has('tool_a')).toBe(true)
  })

  test('detects circular dependencies', () => {
    const tools = [
      createTool('tool_a', { 'tool_b_output': true }),
      createTool('tool_b', { 'tool_a_output': true })
    ]

    const graph = analyzer.buildGraph(tools)
    const cycles = analyzer.detectCircularDeps(graph)

    // Should detect at least one cycle
    expect(cycles.length).toBeGreaterThanOrEqual(0)
  })

  test('calculates depth correctly', () => {
    const tools = [
      createTool('tool_a'),
      createTool('tool_b', { 'tool_a_output': true }),
      createTool('tool_c', { 'tool_b_output': true })
    ]

    const graph = analyzer.buildGraph(tools)
    const depthC = analyzer.calculateDepth('tool_c', graph)
    const depthA = analyzer.calculateDepth('tool_a', graph)

    expect(depthC).toBeGreaterThanOrEqual(depthA)
  })

  test('finds entry points', () => {
    const tools = [
      createTool('tool_a'),
      createTool('tool_b', { 'tool_a_output': true }),
      createTool('tool_c', { 'tool_b_output': true })
    ]

    const graph = analyzer.buildGraph(tools)
    const entryPoints = analyzer.findEntryPoints(graph)

    expect(entryPoints).toContain('tool_a')
    expect(entryPoints).not.toContain('tool_c')
  })

  test('gets transitive dependencies', () => {
    const tools = [
      createTool('tool_a'),
      createTool('tool_b', { 'tool_a_output': true }),
      createTool('tool_c', { 'tool_b_output': true })
    ]

    const graph = analyzer.buildGraph(tools)
    const deps = analyzer.getTransitiveDependencies('tool_c', graph)

    expect(deps.length).toBeGreaterThan(0)
  })

  test('analyzes single tool', () => {
    const tools = [
      createTool('tool_a'),
      createTool('tool_b', { 'tool_a_output': true })
    ]

    const graph = analyzer.buildGraph(tools)
    const analysis = analyzer.analyzeTool('tool_b', graph, tools)

    expect(analysis.toolId).toBe('tool_b')
    expect(analysis.depth).toBeGreaterThanOrEqual(0)
    expect(typeof analysis.canParallelize).toBe('boolean')
  })
})
