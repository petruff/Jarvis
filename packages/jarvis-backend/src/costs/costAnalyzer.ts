// Story 4.5: Cost Analyzer - Generates monthly cost reports
import { CostCalculator } from './costCalculator'
import { BudgetMonitor } from './budgetMonitor'

export class CostAnalyzer {
  constructor(
    private calculator: CostCalculator,
    private budgetMonitor: BudgetMonitor
  ) {}

  generateMonthlyReport(squadId: string) {
    const summary = this.calculator.getSquadCostSummary(squadId)
    const budget = this.budgetMonitor.getBudgetStatus(squadId)
    const costs = this.calculator.getSquadCosts(squadId)

    return {
      squadId,
      month: new Date().toISOString().slice(0, 7),
      totalCost: summary.totalCost,
      totalExecutions: summary.executionCount,
      averageCostPerExecution: summary.averageCostPerExecution,
      monthlyBudget: budget?.monthlyLimit || 0,
      spendingPercentage: budget && budget.monthlyLimit > 0 ? (summary.totalCost / budget.monthlyLimit) * 100 : 0,
      topAgents: costs.slice(0, 5),
      alerts: budget && summary.totalCost > budget.monthlyLimit * 0.8 ? ['Approaching budget limit'] : [],
    }
  }
}
