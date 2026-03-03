/**
 * Story 4.5: Cost Optimization Engine
 * Model Selector - Selects optimal model based on task complexity
 */

import { getPricingByCategory } from './pricingData'

export interface ComplexityAnalysis {
  score: number
  category: 'simple' | 'standard' | 'complex'
  contextLength: number
  parameterCount: number
  toolCount: number
}

export class ModelSelector {
  /**
   * Analyze task complexity (1-10 scale)
   */
  analyzeComplexity(
    contextLength: number,
    parameterCount: number = 0,
    toolCount: number = 0
  ): ComplexityAnalysis {
    // Normalize each factor
    const contextScore = Math.min(contextLength / 8000, 10)
    const paramScore = Math.min(parameterCount / 10, 5)
    const toolScore = Math.min(toolCount / 5, 5)

    // Weighted complexity score (1-10)
    const score = Math.min(
      10,
      1 + (contextScore * 4 + paramScore * 3 + toolScore * 3) / 10
    )

    let category: 'simple' | 'standard' | 'complex'
    if (score <= 3) category = 'simple'
    else if (score <= 7) category = 'standard'
    else category = 'complex'

    return {
      score: Math.round(score * 100) / 100,
      category,
      contextLength,
      parameterCount,
      toolCount
    }
  }

  /**
   * Select optimal model based on complexity
   */
  selectModel(complexity: ComplexityAnalysis): string {
    switch (complexity.category) {
      case 'simple':
        // Use cheap models for simple tasks
        return 'deepseek-chat' // or 'llama-2-local' for free

      case 'standard':
        // Use standard models for medium complexity
        return 'gpt-3.5-turbo'

      case 'complex':
        // Use premium models for complex tasks
        return 'gpt-4-turbo'

      default:
        return 'deepseek-chat'
    }
  }

  /**
   * Get model for context length (simpler logic)
   */
  getModelByContext(contextLength: number): string {
    if (contextLength < 4000) return 'deepseek-chat'
    if (contextLength < 8000) return 'gpt-3.5-turbo'
    return 'gpt-4-turbo'
  }

  /**
   * Estimate cost reduction by switching models
   */
  estimateCostSavings(
    currentModel: string,
    suggestedModel: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const currentPricing = getPricingByCategory(
      this.getCategory(currentModel)
    )
    const suggestedPricing = getPricingByCategory(
      this.getCategory(suggestedModel)
    )

    const currentCost =
      (inputTokens * currentPricing.inputPrice +
        outputTokens * currentPricing.outputPrice) /
      1_000_000

    const suggestedCost =
      (inputTokens * suggestedPricing.inputPrice +
        outputTokens * suggestedPricing.outputPrice) /
      1_000_000

    return currentCost - suggestedCost
  }

  private getCategory(
    model: string
  ): 'cheap' | 'standard' | 'premium' | 'free' {
    if (model.includes('deepseek')) return 'cheap'
    if (model.includes('llama') || model.includes('local')) return 'free'
    if (model.includes('gpt-4') || model.includes('opus')) return 'premium'
    return 'standard'
  }
}

export default ModelSelector
