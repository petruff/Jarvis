/**
 * Dependency Analyzer - Builds and analyzes tool dependency graphs
 */

import { v4 as uuidv4 } from 'uuid'

export interface ToolDef {
  id: string
  name: string
  inputs: Record<string, { type: string; required: boolean }>
  outputs: Record<string, string>
  estimatedDurationMs: number
}

export interface Dependency {
  from: string
  to: string
  type: 'data' | 'control' | 'temporal'
  required: boolean
}

export interface AnalysisResult {
  toolId: string
  dependencies: Dependency[]
  depth: number
  canParallelize: boolean
  circularDeps?: string[][]
}

export class DependencyAnalyzer {
  /**
   * Build dependency graph from tool definitions
   */
  buildGraph(tools: ToolDef[]): Map<string, Dependency[]> {
    const graph = new Map<string, Dependency[]>()

    for (const tool of tools) {
      graph.set(tool.id, [])
    }

    // Infer dependencies from input/output names
    for (const tool of tools) {
      for (const [inputName, inputDef] of Object.entries(tool.inputs)) {
        for (const other of tools) {
          if (other.id === tool.id) continue

          // Check if another tool's output matches this tool's input
          for (const outputName of Object.keys(other.outputs)) {
            if (this.namesMatch(inputName, outputName)) {
              const deps = graph.get(tool.id) || []
              deps.push({
                from: other.id,
                to: tool.id,
                type: 'data',
                required: inputDef.required
              })
              graph.set(tool.id, deps)
            }
          }
        }
      }
    }

    return graph
  }

  /**
   * Detect circular dependencies in the graph
   */
  detectCircularDeps(graph: Map<string, Dependency[]>): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (node: string, path: string[]): void => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const deps = graph.get(node) || []
      for (const dep of deps) {
        const next = dep.to
        if (!visited.has(next)) {
          dfs(next, [...path])
        } else if (recursionStack.has(next)) {
          // Found cycle
          const cycleStart = path.indexOf(next)
          cycles.push(path.slice(cycleStart).concat([next]))
        }
      }

      recursionStack.delete(node)
    }

    for (const toolId of graph.keys()) {
      if (!visited.has(toolId)) {
        dfs(toolId, [])
      }
    }

    return cycles
  }

  /**
   * Calculate dependency depth for a tool
   */
  calculateDepth(toolId: string, graph: Map<string, Dependency[]>): number {
    const visited = new Set<string>()

    const dfs = (id: string): number => {
      if (visited.has(id)) return 0
      visited.add(id)

      const deps = graph.get(id) || []
      if (deps.length === 0) return 0

      const maxDepth = Math.max(...deps.map(dep => dfs(dep.from)))
      return maxDepth + 1
    }

    return dfs(toolId)
  }

  /**
   * Analyze a single tool's dependencies
   */
  analyzeTool(toolId: string, graph: Map<string, Dependency[]>, tools: ToolDef[]): AnalysisResult {
    const depth = this.calculateDepth(toolId, graph)
    const deps = graph.get(toolId) || []

    // Check if dependencies can run in parallel
    const canParallelize = !deps.some(d => d.type === 'temporal')

    const circularDeps = this.detectCircularDeps(graph).filter(cycle =>
      cycle.includes(toolId)
    )

    return {
      toolId,
      dependencies: deps,
      depth,
      canParallelize,
      circularDeps: circularDeps.length > 0 ? circularDeps : undefined
    }
  }

  /**
   * Get all tools a given tool depends on (transitively)
   */
  getTransitiveDependencies(toolId: string, graph: Map<string, Dependency[]>): string[] {
    const result = new Set<string>()
    const visited = new Set<string>()

    const dfs = (id: string): void => {
      if (visited.has(id)) return
      visited.add(id)

      const deps = graph.get(id) || []
      for (const dep of deps) {
        result.add(dep.from)
        dfs(dep.from)
      }
    }

    dfs(toolId)
    return Array.from(result)
  }

  /**
   * Find tools with no dependencies (entry points)
   */
  findEntryPoints(graph: Map<string, Dependency[]>): string[] {
    const hasIncoming = new Set<string>()

    for (const deps of graph.values()) {
      for (const dep of deps) {
        hasIncoming.add(dep.to)
      }
    }

    return Array.from(graph.keys()).filter(id => !hasIncoming.has(id))
  }

  private namesMatch(inputName: string, outputName: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[_-]/g, '')
    return normalize(inputName) === normalize(outputName)
  }
}
