/**
 * Story 4.5: Cost Optimization Engine
 * Cost Calculator - Tracks and calculates costs across LLM providers
 */

import { v4 as uuidv4 } from 'uuid'
import { getPricing } from './pricingData'

export interface CostTrackingRecord {
  id: string
  squadId: string
  agentId?: string
  userId?: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  executionId: string
  createdAt: Date
}

export interface CostSummary {
  totalCost: number
  inputTokens: number
  outputTokens: number
  executionCount: number
  averageCostPerExecution: number
  mostUsedModel: string
}

export class CostCalculator {
  private costs: Map<string, CostTrackingRecord> = new Map()

  /**
   * Calculate cost for a single execution
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string
  ): number {
    const pricing = getPricing(modelId)
    const inputCost = (inputTokens * pricing.inputPrice) / 1_000_000
    const outputCost = (outputTokens * pricing.outputPrice) / 1_000_000
    const totalCost = inputCost + outputCost
    return Math.max(totalCost, pricing.minCostPerCall)
  }

  /**
   * Track a cost for an execution
   */
  trackCost(
    squadId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    executionId: string,
    agentId?: string,
    userId?: string
  ): CostTrackingRecord {
    const costUsd = this.calculateCost(inputTokens, outputTokens, model)
    
    const record: CostTrackingRecord = {
      id: uuidv4(),
      squadId,
      agentId,
      userId,
      model,
      inputTokens,
      outputTokens,
      costUsd,
      executionId,
      createdAt: new Date()
    }

    this.costs.set(record.id, record)
    return record
  }

  /**
   * Get squad-level cost summary
   */
  getSquadCostSummary(squadId: string): CostSummary {
    const squadCosts = Array.from(this.costs.values()).filter(
      c => c.squadId === squadId
    )

    if (squadCosts.length === 0) {
      return {
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        executionCount: 0,
        averageCostPerExecution: 0,
        mostUsedModel: 'none'
      }
    }

    const totalCost = squadCosts.reduce((sum, c) => sum + c.costUsd, 0)
    const totalInputTokens = squadCosts.reduce((sum, c) => sum + c.inputTokens, 0)
    const totalOutputTokens = squadCosts.reduce((sum, c) => sum + c.outputTokens, 0)

    // Find most used model
    const modelCounts = new Map<string, number>()
    squadCosts.forEach(c => {
      modelCounts.set(c.model, (modelCounts.get(c.model) ?? 0) + 1)
    })
    const mostUsedModel = Array.from(modelCounts.entries()).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] ?? 'none'

    return {
      totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      executionCount: squadCosts.length,
      averageCostPerExecution: totalCost / squadCosts.length,
      mostUsedModel
    }
  }

  /**
   * Get agent-level cost summary
   */
  getAgentCostSummary(agentId: string): CostSummary {
    const agentCosts = Array.from(this.costs.values()).filter(
      c => c.agentId === agentId
    )

    if (agentCosts.length === 0) {
      return {
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        executionCount: 0,
        averageCostPerExecution: 0,
        mostUsedModel: 'none'
      }
    }

    const totalCost = agentCosts.reduce((sum, c) => sum + c.costUsd, 0)
    const totalInputTokens = agentCosts.reduce((sum, c) => sum + c.inputTokens, 0)
    const totalOutputTokens = agentCosts.reduce((sum, c) => sum + c.outputTokens, 0)

    const modelCounts = new Map<string, number>()
    agentCosts.forEach(c => {
      modelCounts.set(c.model, (modelCounts.get(c.model) ?? 0) + 1)
    })
    const mostUsedModel = Array.from(modelCounts.entries()).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] ?? 'none'

    return {
      totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      executionCount: agentCosts.length,
      averageCostPerExecution: totalCost / agentCosts.length,
      mostUsedModel
    }
  }

  /**
   * Get all cost records for a squad
   */
  getSquadCosts(squadId: string): CostTrackingRecord[] {
    return Array.from(this.costs.values()).filter(c => c.squadId === squadId)
  }
}

export default CostCalculator
