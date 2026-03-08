// Story 4.4: Chain Analyzer
// Orchestrates tool chaining optimization

import { ToolDef as Tool, DependencyGraph, DependencyAnalyzer } from './dependencyAnalyzer'
import { ChainOptimizer, OptimizedChain } from './chainOptimizer'
import { ResultPrecomputer } from './resultPrecomputer'

export interface ChainAnalysisResult {
  original: string[]
  optimized: string[]
  optimization: OptimizedChain
  parallelOpportunities: string[][]
  circularDeps: string[][]
  cacheHits: number
  totalStepReduction: number
}

export class ChainAnalyzer {
  private analyzer: DependencyAnalyzer
  private optimizer: ChainOptimizer
  private precomputer: ResultPrecomputer

  constructor() {
    this.analyzer = new DependencyAnalyzer()
    this.optimizer = new ChainOptimizer()
    this.precomputer = new ResultPrecomputer()
  }

  /**
   * Full chain analysis and optimization
   */
  analyzeChain(tools: Tool[], toolIds: string[]): ChainAnalysisResult {
    // Build dependency graph
    const graph = this.analyzer.buildGraph(tools)

    // Optimize execution order
    const optimization = this.optimizer.optimizeChain(toolIds, graph)

    // Find parallel opportunities
    const parallelOps = this.optimizer.getParallelOpportunities(toolIds, graph)

    // Get cache statistics
    const cacheStats = this.precomputer.getStats()

    return {
      original: toolIds,
      optimized: optimization.optimized,
      optimization,
      parallelOpportunities: parallelOps,
      circularDeps: graph.circularDeps,
      cacheHits: cacheStats.hits,
      totalStepReduction: optimization.stepReduction,
    }
  }

  /**
   * Execute tool chain with optimization
   */
  async executeOptimized(tools: Tool[], toolIds: string[], execFunc: (toolId: string) => Promise<any>): Promise<{
    results: Record<string, any>
    optimization: OptimizedChain
    duration: number
    cacheHits: number
  }> {
    const startTime = Date.now()
    const graph = this.analyzer.buildGraph(tools)
    const optimization = this.optimizer.optimizeChain(toolIds, graph)

    const results: Record<string, any> = {}
    const statsBefore = this.precomputer.getStats()

    // Execute in optimized order
    for (const toolId of optimization.optimized) {
      results[toolId] = await this.precomputer.getOrCompute(
        toolId,
        { inputs: {} },
        () => execFunc(toolId)
      )
    }

    const statsAfter = this.precomputer.getStats()
    const duration = Date.now() - startTime

    return {
      results,
      optimization,
      duration,
      cacheHits: statsAfter.hits - statsBefore.hits,
    }
  }

  /**
   * Get tool chain visualization data
   */
  getVisualization(graph: DependencyGraph): { nodes: any[]; edges: any[] } {
    const nodes = Array.from(graph.tools.values()).map((tool) => ({
      id: tool.id,
      label: tool.name,
      duration: tool.estimatedDurationMs,
      parallelizable: tool.parallelizable,
    }))

    const edges = graph.dependencies.map((dep) => ({
      from: dep.from,
      to: dep.to,
      type: dep.type,
    }))

    return { nodes, edges }
  }

  /**
   * Clear precomputation cache
   */
  clearCache(): void {
    this.precomputer.clearCache()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return this.precomputer.getStats()
  }
}
