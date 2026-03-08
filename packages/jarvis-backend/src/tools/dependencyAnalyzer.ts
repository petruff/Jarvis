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
  parallelizable?: boolean
}

export type Tool = ToolDef;

export interface DependencyGraph {
  tools: Map<string, Tool>
  dependencies: Dependency[]
  circularDeps: string[][]
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
  buildGraph(tools: Tool[]): DependencyGraph {
    const depsMap = new Map<string, Dependency[]>()
    const toolsMap = new Map<string, Tool>()

    for (const tool of tools) {
      depsMap.set(tool.id, [])
      toolsMap.set(tool.id, tool)
    }

    const dependencies: Dependency[] = []

    // Infer dependencies from input/output names
    for (const tool of tools) {
      for (const [inputName, inputDef] of Object.entries(tool.inputs)) {
        for (const other of tools) {
          if (other.id === tool.id) continue

          // Check if another tool's output matches this tool's input
          for (const outputName of Object.keys(other.outputs)) {
            if (this.namesMatch(inputName, outputName)) {
              const dep: Dependency = {
                from: other.id,
                to: tool.id,
                type: 'data',
                required: inputDef.required
              }
              depsMap.get(tool.id)!.push(dep)
              dependencies.push(dep)
            }
          }
        }
      }
    }

    return {
      tools: toolsMap,
      dependencies,
      circularDeps: this.detectCircularDeps(depsMap)
    }
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
  analyzeTool(toolId: string, graph: DependencyGraph): AnalysisResult {
    const depsMap = this.getDepsMap(graph)
    const depth = this.calculateDepth(toolId, depsMap)
    const deps = depsMap.get(toolId) || []

    // Check if dependencies can run in parallel
    const canParallelize = !deps.some(d => d.type === 'temporal')

    const circularDeps = graph.circularDeps.filter(cycle =>
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

  private getDepsMap(graph: DependencyGraph): Map<string, Dependency[]> {
    const map = new Map<string, Dependency[]>()
    for (const id of graph.tools.keys()) {
      map.set(id, graph.dependencies.filter(d => d.to === id))
    }
    return map
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
