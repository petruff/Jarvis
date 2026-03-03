import { CostCalculator } from './costCalculator'
import { BudgetMonitor } from './budgetMonitor'

export interface CostTrend {
  date: Date
  totalCost: number
  modelBreakdown: Record<string, number>
  executionCount: number
}

export interface CostReport {
  period: 'daily' | 'weekly' | 'monthly'
  squadId: string
  startDate: Date
  endDate: Date
  totalCost: number
  executionCount: number
  averageCostPerExecution: number
  modelBreakdown: Record<string, { count: number; cost: number }>
  costTrends: CostTrend[]
  recommendations: string[]
  savingsPotential: number
}

export class CostAnalyzer {
  constructor(
    private calculator: CostCalculator,
    private budgetMonitor: BudgetMonitor
  ) {}

  /**
   * Generate monthly cost report for a squad
   */
  generateMonthlyReport(squadId: string): CostReport {
    const summary = this.calculator.getSquadCostSummary(squadId)
    const budget = this.budgetMonitor.getBudgetStatus(squadId)
    const costs = this.calculator.getSquadCosts(squadId)

    const modelBreakdown = this.analyzeModelUsage(costs)
    const recommendations = this.generateRecommendations(summary, modelBreakdown, budget)
    const savingsPotential = this.calculateSavingsPotential(costs)

    return {
      period: 'monthly',
      squadId,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(),
      totalCost: summary.totalCost,
      executionCount: summary.executionCount,
      averageCostPerExecution: summary.averageCostPerExecution,
      modelBreakdown,
      costTrends: this.calculateTrends(costs),
      recommendations,
      savingsPotential,
    }
  }

  /**
   * Analyze model usage breakdown
   */
  private analyzeModelUsage(
    costs: any[]
  ): Record<string, { count: number; cost: number }> {
    const breakdown: Record<string, { count: number; cost: number }> = {}

    for (const record of costs) {
      if (!breakdown[record.modelUsed]) {
        breakdown[record.modelUsed] = { count: 0, cost: 0 }
      }
      breakdown[record.modelUsed].count++
      breakdown[record.modelUsed].cost += record.costUsd
    }

    return breakdown
  }

  /**
   * Calculate cost trends over time
   */
  private calculateTrends(costs: any[]): CostTrend[] {
    const trends: Map<string, CostTrend> = new Map()

    for (const record of costs) {
      const date = new Date(record.createdAt || Date.now())
      const dateKey = date.toISOString().split('T')[0]

      if (!trends.has(dateKey)) {
        trends.set(dateKey, {
          date: new Date(dateKey),
          totalCost: 0,
          modelBreakdown: {},
          executionCount: 0,
        })
      }

      const trend = trends.get(dateKey)!
      trend.totalCost += record.costUsd
      trend.executionCount++

      if (!trend.modelBreakdown[record.modelUsed]) {
        trend.modelBreakdown[record.modelUsed] = 0
      }
      trend.modelBreakdown[record.modelUsed] += record.costUsd
    }

    return Array.from(trends.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  /**
   * Generate actionable optimization recommendations
   */
  private generateRecommendations(
    summary: any,
    modelBreakdown: Record<string, { count: number; cost: number }>,
    budget: any
  ): string[] {
    const recommendations: string[] = []

    // Check if spending is high relative to budget
    if (budget.monthlyLimit > 0) {
      const spendingPercent = (summary.totalCost / budget.monthlyLimit) * 100
      if (spendingPercent > 80) {
        recommendations.push(
          `⚠️ High spending: ${spendingPercent.toFixed(1)}% of monthly budget. Consider optimizing task complexity or reducing execution frequency.`
        )
      }
    }

    // Check for expensive model overuse
    const modelCosts = Object.entries(modelBreakdown).map(([model, data]) => ({
      model,
      count: data.count,
      cost: data.cost,
    }))

    const expensiveModels = modelCosts.filter((m) =>
      ['gpt-4-turbo', 'claude-3-opus'].includes(m.model)
    )

    if (expensiveModels.length > 0) {
      const expensiveTotal = expensiveModels.reduce((sum, m) => sum + m.cost, 0)
      const expensePercent = (expensiveTotal / summary.totalCost) * 100

      if (expensePercent > 50) {
        recommendations.push(
          `💰 Cost Optimization: ${expensePercent.toFixed(1)}% of costs use premium models. Consider evaluating if standard models could handle some tasks.`
        )
      }
    }

    // Check for DeepSeek adoption
    const deepseekUsage = modelBreakdown['deepseek-chat']
    if (!deepseekUsage || deepseekUsage.count < summary.executionCount * 0.3) {
      recommendations.push(
        `✅ Opportunity: Increase DeepSeek usage for simple tasks (90%+ cost reduction vs GPT-4).`
      )
    }

    // Check for execution efficiency
    if (summary.executionCount > 100) {
      recommendations.push(
        `📊 Analytics: ${summary.executionCount} executions this month. Consider caching results to reduce redundant calls.`
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ Cost usage is optimized. No major recommendations.')
    }

    return recommendations
  }

  /**
   * Calculate potential cost savings by model optimization
   */
  private calculateSavingsPotential(costs: any[]): number {
    let currentCost = 0
    let optimizedCost = 0

    for (const record of costs) {
      currentCost += record.costUsd

      // Estimate if cheaper model could handle this
      const inputTokens = record.inputTokens
      const outputTokens = record.outputTokens
      const deepseekCost = this.calculator.calculateCost(inputTokens, outputTokens, 'deepseek-chat')

      optimizedCost += Math.min(record.costUsd, deepseekCost)
    }

    return currentCost - optimizedCost
  }

  /**
   * Get cost metrics for dashboard
   */
  getDashboardMetrics(squadId: string) {
    const summary = this.calculator.getSquadCostSummary(squadId)
    const budget = this.budgetMonitor.getBudgetStatus(squadId)

    return {
      totalCost: summary.totalCost,
      monthlyBudget: budget.monthlyLimit,
      spendingPercentage: budget.monthlyLimit > 0 
        ? (summary.totalCost / budget.monthlyLimit) * 100 
        : 0,
      executionCount: summary.executionCount,
      averageCostPerExecution: summary.averageCostPerExecution,
      mostUsedModel: summary.mostUsedModel,
      isOverBudget: this.budgetMonitor.isOverBudget(squadId),
    }
  }
}
