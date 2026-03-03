/**
 * Story 4.5: Cost Optimization Engine
 * Budget Monitor - Tracks spending against budgets and enforces limits
 */

import { v4 as uuidv4 } from 'uuid'

export interface Budget {
  id: string
  squadId: string
  monthlyLimit: number
  currentSpend: number
  alert50Sent: boolean
  alert80Sent: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BudgetAlert {
  type: 'warning' | 'critical' | 'blocked'
  threshold: number // 50, 80, 100
  message: string
  currentSpend: number
  monthlyLimit: number
}

export class BudgetMonitor {
  private budgets: Map<string, Budget> = new Map()

  /**
   * Create or update a budget for a squad
   */
  setBudget(squadId: string, monthlyLimit: number): Budget {
    let budget = this.budgets.get(squadId)

    if (!budget) {
      budget = {
        id: uuidv4(),
        squadId,
        monthlyLimit,
        currentSpend: 0,
        alert50Sent: false,
        alert80Sent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } else {
      budget.monthlyLimit = monthlyLimit
      budget.updatedAt = new Date()
    }

    this.budgets.set(squadId, budget)
    return budget
  }

  /**
   * Add cost to a squad's budget and check alerts
   */
  addCost(squadId: string, cost: number): BudgetAlert | null {
    let budget = this.budgets.get(squadId)

    if (!budget) {
      // If no budget set, create one with default ($1000)
      budget = this.setBudget(squadId, 1000)
    }

    budget.currentSpend += cost
    budget.updatedAt = new Date()

    return this.checkBudgetAlert(budget)
  }

  /**
   * Get budget status for a squad
   */
  getBudgetStatus(squadId: string): Budget | null {
    return this.budgets.get(squadId) ?? null
  }

  /**
   * Check if squad is at or over budget
   */
  isOverBudget(squadId: string): boolean {
    const budget = this.budgets.get(squadId)
    return budget ? budget.currentSpend >= budget.monthlyLimit : false
  }

  /**
   * Get spending percentage
   */
  getSpendingPercentage(squadId: string): number {
    const budget = this.budgets.get(squadId)
    if (!budget || budget.monthlyLimit === 0) return 0
    return (budget.currentSpend / budget.monthlyLimit) * 100
  }

  /**
   * Reset budget at end of month
   */
  resetMonthlyBudget(squadId: string): Budget | null {
    const budget = this.budgets.get(squadId)
    if (budget) {
      budget.currentSpend = 0
      budget.alert50Sent = false
      budget.alert80Sent = false
      budget.updatedAt = new Date()
    }
    return budget ?? null
  }

  /**
   * Check if alert should be triggered
   */
  private checkBudgetAlert(budget: Budget): BudgetAlert | null {
    const percentage = (budget.currentSpend / budget.monthlyLimit) * 100

    if (percentage >= 100) {
      return {
        type: 'blocked',
        threshold: 100,
        message: `Squad has reached monthly budget limit (${budget.monthlyLimit})`,
        currentSpend: budget.currentSpend,
        monthlyLimit: budget.monthlyLimit
      }
    }

    if (percentage >= 80 && !budget.alert80Sent) {
      budget.alert80Sent = true
      return {
        type: 'critical',
        threshold: 80,
        message: `Squad has spent 80% of monthly budget`,
        currentSpend: budget.currentSpend,
        monthlyLimit: budget.monthlyLimit
      }
    }

    if (percentage >= 50 && !budget.alert50Sent) {
      budget.alert50Sent = true
      return {
        type: 'warning',
        threshold: 50,
        message: `Squad has spent 50% of monthly budget`,
        currentSpend: budget.currentSpend,
        monthlyLimit: budget.monthlyLimit
      }
    }

    return null
  }

  /**
   * Get all budgets (for administration)
   */
  getAllBudgets(): Budget[] {
    return Array.from(this.budgets.values())
  }
}

export default BudgetMonitor
