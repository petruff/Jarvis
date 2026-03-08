/**
 * Chain Optimizer - Optimizes tool execution order for better performance
 */

import { v4 as uuidv4 } from 'uuid'
import { ToolDef, Dependency, DependencyGraph } from './dependencyAnalyzer'

export interface OptimizedChain {
  id: string
  originalSequence: string[]
  optimized: string[]
  originalSteps: number
  optimizedSteps: number
  stepReduction: number
  estimatedTimeSavings: number
  estimatedTimeOriginal: number
  estimatedTimeOptimized: number
  timeImprovement: number
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
    graph: DependencyGraph
  ): OptimizedChain {
    const toolsMap = graph.tools
    const depsMap = this.getDepsMap(graph)

    // Step 1: Remove redundant tools
    const deduplicated = this.deduplicateSequence(toolSequence)

    // Step 2: Topological sort for optimal order
    const optimized = this.topologicalSort(deduplicated, depsMap)

    // Step 3: Group independent tools for parallelization
    const groups = this.groupForParallelization(optimized, depsMap)

    const flatOptimized = groups.flat()
    const stepReduction = deduplicated.length > 0 ? (1 - flatOptimized.length / deduplicated.length) * 100 : 0

    const originalTime = this.estimateTimeSavings(toolSequence, toolSequence, toolsMap) // Wait, this just returns originalTime
    // Actually, I need to fix estimateTimeSavings logic or just return the values directly.

    let originalTotalTime = 0
    for (const id of toolSequence) originalTotalTime += graph.tools.get(id)?.estimatedDurationMs || 0

    let optimizedTotalTime = 0
    for (const group of groups) {
      let maxInGroup = 0
      for (const id of group) maxInGroup = Math.max(maxInGroup, graph.tools.get(id)?.estimatedDurationMs || 0)
      optimizedTotalTime += maxInGroup
    }

    const timeSavings = originalTotalTime - optimizedTotalTime
    const timeImprovement = originalTotalTime > 0 ? (timeSavings / originalTotalTime) * 100 : 0

    return {
      id: uuidv4(),
      originalSequence: toolSequence,
      optimized: flatOptimized,
      originalSteps: toolSequence.length,
      optimizedSteps: flatOptimized.length,
      stepReduction,
      estimatedTimeSavings: timeSavings,
      estimatedTimeOriginal: originalTotalTime,
      estimatedTimeOptimized: optimizedTotalTime,
      timeImprovement,
      executionGroups: groups
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
   * Get parallel execution opportunities
   */
  getParallelOpportunities(toolIds: string[], graph: DependencyGraph): string[][] {
    return this.groupForParallelization(toolIds, this.getDepsMap(graph)).filter(group => group.length > 1)
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
