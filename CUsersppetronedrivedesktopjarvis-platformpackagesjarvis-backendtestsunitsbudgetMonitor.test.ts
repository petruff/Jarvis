import { BudgetMonitor } from '../../src/costs/budgetMonitor'

describe('BudgetMonitor', () => {
  let monitor: BudgetMonitor

  beforeEach(() => {
    monitor = new BudgetMonitor()
  })

  describe('setBudget', () => {
    it('should create a new budget', () => {
      const budget = monitor.setBudget('squad-1', 1000)
      expect(budget).toBeDefined()
      expect(budget.squadId).toBe('squad-1')
      expect(budget.monthlyLimit).toBe(1000)
      expect(budget.currentSpend).toBe(0)
    })

    it('should initialize alert flags to false', () => {
      const budget = monitor.setBudget('squad-1', 1000)
      expect(budget.alert50Sent).toBe(false)
      expect(budget.alert80Sent).toBe(false)
    })

    it('should update existing budget', () => {
      monitor.setBudget('squad-1', 1000)
      const updated = monitor.setBudget('squad-1', 2000)
      expect(updated.monthlyLimit).toBe(2000)
    })
  })

  describe('addCost', () => {
    beforeEach(() => {
      monitor.setBudget('squad-1', 1000)
    })

    it('should add cost and return null when under 50% threshold', () => {
      const alert = monitor.addCost('squad-1', 100)
      expect(alert).toBeNull()
      const budget = monitor.getBudgetStatus('squad-1')
      expect(budget.currentSpend).toBe(100)
    })

    it('should generate warning alert at 50% threshold', () => {
      const alert1 = monitor.addCost('squad-1', 500)
      expect(alert1).toBeDefined()
      expect(alert1?.threshold).toBe(50)
      expect(alert1?.type).toBe('warning')
    })

    it('should not duplicate 50% alert', () => {
      monitor.addCost('squad-1', 500)
      const alert2 = monitor.addCost('squad-1', 1) // Total now 501
      expect(alert2).toBeNull()
    })

    it('should generate critical alert at 80% threshold', () => {
      monitor.addCost('squad-1', 500) // First alert at 50%
      const alert = monitor.addCost('squad-1', 300) // Now at 80%
      expect(alert).toBeDefined()
      expect(alert?.threshold).toBe(80)
      expect(alert?.type).toBe('critical')
    })

    it('should not duplicate 80% alert', () => {
      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-1', 300) // Alert at 80%
      const alert = monitor.addCost('squad-1', 1)
      expect(alert).toBeNull()
    })

    it('should block spending at 100% threshold', () => {
      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-1', 300) // Alert at 80%
      const alert = monitor.addCost('squad-1', 200) // Now at 100%
      expect(alert).toBeDefined()
      expect(alert?.threshold).toBe(100)
      expect(alert?.type).toBe('blocked')
    })
  })

  describe('getBudgetStatus', () => {
    it('should return budget status', () => {
      monitor.setBudget('squad-1', 1000)
      monitor.addCost('squad-1', 250)
      const budget = monitor.getBudgetStatus('squad-1')
      expect(budget.monthlyLimit).toBe(1000)
      expect(budget.currentSpend).toBe(250)
    })

    it('should return empty budget for non-existent squad', () => {
      const budget = monitor.getBudgetStatus('squad-999')
      expect(budget.monthlyLimit).toBe(0)
      expect(budget.currentSpend).toBe(0)
    })
  })

  describe('isOverBudget', () => {
    beforeEach(() => {
      monitor.setBudget('squad-1', 1000)
    })

    it('should return false when under budget', () => {
      monitor.addCost('squad-1', 500)
      expect(monitor.isOverBudget('squad-1')).toBe(false)
    })

    it('should return true when at budget limit', () => {
      monitor.addCost('squad-1', 1000)
      expect(monitor.isOverBudget('squad-1')).toBe(true)
    })

    it('should return true when over budget', () => {
      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-1', 600)
      expect(monitor.isOverBudget('squad-1')).toBe(true)
    })

    it('should handle non-existent squad', () => {
      expect(monitor.isOverBudget('squad-999')).toBe(false)
    })
  })

  describe('getSpendingPercentage', () => {
    beforeEach(() => {
      monitor.setBudget('squad-1', 1000)
    })

    it('should calculate correct spending percentage', () => {
      monitor.addCost('squad-1', 250)
      expect(monitor.getSpendingPercentage('squad-1')).toBe(25)
    })

    it('should return 0 for non-existent squad', () => {
      expect(monitor.getSpendingPercentage('squad-999')).toBe(0)
    })

    it('should return 100+ for overspend', () => {
      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-1', 600)
      expect(monitor.getSpendingPercentage('squad-1')).toBeGreaterThan(100)
    })
  })

  describe('resetMonthlyBudget', () => {
    beforeEach(() => {
      monitor.setBudget('squad-1', 1000)
      monitor.addCost('squad-1', 500)
    })

    it('should reset current spend to zero', () => {
      const reset = monitor.resetMonthlyBudget('squad-1')
      expect(reset.currentSpend).toBe(0)
    })

    it('should reset alert flags to false', () => {
      monitor.addCost('squad-1', 500) // Hit 50% alert
      const reset = monitor.resetMonthlyBudget('squad-1')
      expect(reset.alert50Sent).toBe(false)
      expect(reset.alert80Sent).toBe(false)
    })

    it('should maintain budget limit', () => {
      const reset = monitor.resetMonthlyBudget('squad-1')
      expect(reset.monthlyLimit).toBe(1000)
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple squads independently', () => {
      monitor.setBudget('squad-1', 1000)
      monitor.setBudget('squad-2', 2000)

      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-2', 1500)

      expect(monitor.getSpendingPercentage('squad-1')).toBe(50)
      expect(monitor.getSpendingPercentage('squad-2')).toBe(75)
    })

    it('should handle full budget cycle', () => {
      monitor.setBudget('squad-1', 1000)
      monitor.addCost('squad-1', 500)
      monitor.addCost('squad-1', 300) // 80% alert
      monitor.addCost('squad-1', 200) // 100% blocked

      expect(monitor.isOverBudget('squad-1')).toBe(true)

      monitor.resetMonthlyBudget('squad-1')
      expect(monitor.isOverBudget('squad-1')).toBe(false)
      expect(monitor.getSpendingPercentage('squad-1')).toBe(0)
    })
  })
})
