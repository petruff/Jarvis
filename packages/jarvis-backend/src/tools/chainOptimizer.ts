/**
 * Chain Optimizer - Optimizes tool execution order for better performance
 */

import { v4 as uuidv4 } from 'uuid'
import { ToolDef, Dependency } from './dependencyAnalyzer'

export interface OptimizedChain {
  id: string
  originalSequence: string[]
  optimizedSequence: string[]
  originalSteps: number
  optimizedSteps: number
  stepReduction: number
  estimatedTimeSavings: number
  executionGroups: string[][]
}

export interface ChainMetrics {
  originalDuration: number
  optimizedDuration: number
  parallelizationGain: number
  cacheHitEstimate: number
}

export class ChainOptimizer {
  /**
   * Optimize a tool execution chain using topological sort
   */
  optimizeChain(
    toolSequence: string[],
    graph: Map<string, Dependency[]>,
    tools: Map<string, ToolDef>
  ): OptimizedChain {
    // Step 1: Remove redundant tools
    const deduplicated = this.deduplicateSequence(toolSequence)

    // Step 2: Topological sort for optimal order
    const optimized = this.topologicalSort(deduplicated, graph)

    // Step 3: Group independent tools for parallelization
    const groups = this.groupForParallelization(optimized, graph)

    const flatOptimized = groups.flat()
    const stepReduction = (1 - flatOptimized.length / deduplicated.length) * 100

    return {
      id: uuidv4(),
      originalSequence: toolSequence,
      optimizedSequence: flatOptimized,
      originalSteps: toolSequence.length,
      optimizedSteps: flatOptimized.length,
      stepReduction,
      estimatedTimeSavings: this.estimateTimeSavings(toolSequence, flatOptimized, tools),
      executionGroups: groups
    }
  }

  /**
   * Remove duplicate sequential tool calls
   */
  private deduplicateSequence(sequence: string[]): string[] {
    const result: string[] = []

    for (const toolId of sequence) {
      // Only add if not already in result
      if (!result.includes(toolId)) {
        result.push(toolId)
      }
    }

    return result
  }

  /**
   * Topological sort - order tools by dependencies
   */
  private topologicalSort(
    toolIds: string[],
    graph: Map<string, Dependency[]>
  ): string[] {
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    // Initialize
    for (const toolId of toolIds) {
      inDegree.set(toolId, 0)
      adj.set(toolId, [])
    }

    // Build adjacency list (reverse of dependency graph)
    for (const toolId of toolIds) {
      const deps = graph.get(toolId) || []
      for (const dep of deps) {
        if (toolIds.includes(dep.from)) {
          inDegree.set(toolId, (inDegree.get(toolId) || 0) + 1)
          const list = adj.get(dep.from) || []
          list.push(toolId)
          adj.set(dep.from, list)
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = []
    for (const [toolId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(toolId)
      }
    }

    const result: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      for (const neighbor of adj.get(current) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1)
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      }
    }

    return result
  }

  /**
   * Group tools that can execute in parallel
   */
  private groupForParallelization(
    toolIds: string[],
    graph: Map<string, Dependency[]>
  ): string[][] {
    const groups: string[][] = [[]]
    const placed = new Set<string>()

    for (const toolId of toolIds) {
      const deps = graph.get(toolId) || []
      const requiredDeps = deps.filter(d => d.required && toolIds.includes(d.from))

      // Check if all dependencies are already placed
      if (requiredDeps.every(d => placed.has(d.from))) {
        groups[groups.length - 1].push(toolId)
        placed.add(toolId)
      } else {
        // Start new group
        groups.push([toolId])
        placed.add(toolId)
      }
    }

    return groups.filter(g => g.length > 0)
  }

  /**
   * Estimate time saved by optimization
   */
  private estimateTimeSavings(
    original: string[],
    optimized: string[],
    tools: Map<string, ToolDef>
  ): number {
    let originalTime = 0
    let optimizedTime = 0

    // Original: sequential execution
    for (const toolId of original) {
      const tool = tools.get(toolId)
      if (tool) originalTime += tool.estimatedDurationMs
    }

    // Optimized: with parallelization
    // This is a simplification - assume 2 tools can run in parallel
    let prevGroupTime = 0
    for (let i = 0; i < optimized.length; i++) {
      const tool = tools.get(optimized[i])
      if (tool) {
        prevGroupTime = Math.max(prevGroupTime, tool.estimatedDurationMs)
      }
    }
    optimizedTime = prevGroupTime

    return originalTime - optimizedTime
  }
}
