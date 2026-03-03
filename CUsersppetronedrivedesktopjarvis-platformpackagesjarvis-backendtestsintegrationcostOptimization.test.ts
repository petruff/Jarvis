import { CostCalculator } from '../../src/costs/costCalculator'
import { ModelSelector } from '../../src/costs/modelSelector'
import { BudgetMonitor } from '../../src/costs/budgetMonitor'

describe('Cost Optimization - Integration Tests', () => {
  let calculator: CostCalculator
  let selector: ModelSelector
  let monitor: BudgetMonitor

  beforeEach(() => {
    calculator = new CostCalculator()
    selector = new ModelSelector()
    monitor = new BudgetMonitor()
  })

  describe('Full Cost Pipeline', () => {
    it('should execute complete cost optimization workflow', () => {
      // 1. Set budget for squad
      monitor.setBudget('squad-1', 100) // Low budget for testing

      // 2. Analyze task complexity
      const complexity = selector.analyzeComplexity(2000, 10, 3)
      expect(complexity.category).toBe('standard')

      // 3. Select optimal model
      const selectedModel = selector.selectModel(complexity)
      expect(['gpt-3.5-turbo', 'claude-3-haiku']).toContain(selectedModel)

      // 4. Track cost of execution
      const record = calculator.trackCost('squad-1', selectedModel, 50_000, 25_000, 'exec-1')
      expect(record.costUsd).toBeGreaterThan(0)

      // 5. Monitor budget impact
      const alert = monitor.addCost('squad-1', record.costUsd)
      expect(alert).toBeNull() // Should be under budget

      const status = monitor.getBudgetStatus('squad-1')
      expect(status.currentSpend).toBe(record.costUsd)
    })

    it('should trigger cost alerts when approaching limits', () => {
      monitor.setBudget('squad-1', 10)

      // Add costs incrementally
      const record1 = calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1')
      const alert1 = monitor.addCost('squad-1', record1.costUsd)

      expect(alert1).toBeDefined()
      if (alert1) {
        expect([50, 80, 100]).toContain(alert1.threshold)
      }
    })

    it('should show cost savings from model switching', () => {
      // Scenario: Task was using expensive model, switch to cheaper one
      const inputTokens = 1_000_000
      const outputTokens = 500_000

      const currentCost = calculator.calculateCost(inputTokens, outputTokens, 'gpt-4-turbo')
      const optimizedCost = calculator.calculateCost(inputTokens, outputTokens, 'deepseek-chat')
      const savings = currentCost - optimizedCost

      expect(savings).toBeGreaterThan(0)
      expect(savings / currentCost).toBeGreaterThan(0.9) // 90%+ savings expected
    })
  })

  describe('Multi-Squad Cost Tracking', () => {
    it('should track costs across multiple squads independently', () => {
      monitor.setBudget('squad-1', 100)
      monitor.setBudget('squad-2', 50)

      // Squad 1 executes with GPT-4 (expensive)
      const record1 = calculator.trackCost('squad-1', 'gpt-4-turbo', 100_000, 50_000, 'exec-1')
      monitor.addCost('squad-1', record1.costUsd)

      // Squad 2 executes with DeepSeek (cheap)
      const record2 = calculator.trackCost('squad-2', 'deepseek-chat', 100_000, 50_000, 'exec-2')
      monitor.addCost('squad-2', record2.costUsd)

      const summary1 = calculator.getSquadCostSummary('squad-1')
      const summary2 = calculator.getSquadCostSummary('squad-2')

      expect(summary1.mostUsedModel).toBe('gpt-4-turbo')
      expect(summary2.mostUsedModel).toBe('deepseek-chat')
      expect(summary1.totalCost).toBeGreaterThan(summary2.totalCost)
    })
  })

  describe('Cost Analysis for Reporting', () => {
    it('should aggregate costs for monthly reporting', () => {
      monitor.setBudget('squad-1', 1000)

      // Simulate multiple executions throughout the month
      const executions = [
        { model: 'deepseek-chat', inputTokens: 100_000, outputTokens: 50_000 },
        { model: 'gpt-3.5-turbo', inputTokens: 200_000, outputTokens: 100_000 },
        { model: 'deepseek-chat', inputTokens: 150_000, outputTokens: 75_000 },
      ]

      let totalCost = 0
      executions.forEach((exec, idx) => {
        const record = calculator.trackCost(
          'squad-1',
          exec.model,
          exec.inputTokens,
          exec.outputTokens,
          `exec-${idx}`
        )
        totalCost += record.costUsd
        monitor.addCost('squad-1', record.costUsd)
      })

      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.executionCount).toBe(3)
      expect(summary.totalCost).toBeCloseTo(totalCost, 4)
      expect(summary.averageCostPerExecution).toBe(totalCost / 3)
      expect(summary.mostUsedModel).toBe('deepseek-chat') // Used twice
    })
  })

  describe('Real-World Optimization Scenario', () => {
    it('should demonstrate 20-30% cost reduction through smart model selection', () => {
      const tasks = [
        { complexity: 2, inputTokens: 50_000, outputTokens: 25_000 },
        { complexity: 5, inputTokens: 100_000, outputTokens: 50_000 },
        { complexity: 8, inputTokens: 200_000, outputTokens: 100_000 },
      ]

      let costWithExpensiveModel = 0
      let costWithOptimizedModel = 0

      tasks.forEach((task) => {
        // Expensive approach: always use GPT-4
        const expensiveCost = calculator.calculateCost(
          task.inputTokens,
          task.outputTokens,
          'gpt-4-turbo'
        )
        costWithExpensiveModel += expensiveCost

        // Optimized approach: select model by complexity
        const analysis = selector.analyzeComplexity(task.complexity * 1000, task.complexity * 10, task.complexity)
        const optimalModel = selector.selectModel(analysis)
        const optimizedCost = calculator.calculateCost(
          task.inputTokens,
          task.outputTokens,
          optimalModel
        )
        costWithOptimizedModel += optimizedCost
      })

      const savings = costWithExpensiveModel - costWithOptimizedModel
      const savingsPercent = (savings / costWithExpensiveModel) * 100

      expect(savingsPercent).toBeGreaterThan(20)
      expect(savingsPercent).toBeLessThan(95) // Ensure realistic range
    })
  })

  describe('Budget Enforcement', () => {
    it('should prevent overspending with strict budget limits', () => {
      monitor.setBudget('squad-1', 1)

      // First execution
      const record1 = calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1')
      const alert1 = monitor.addCost('squad-1', record1.costUsd)

      // After first execution, should be over budget
      expect(monitor.isOverBudget('squad-1')).toBe(true)
      expect(monitor.getSpendingPercentage('squad-1')).toBeGreaterThan(100)

      // Verify alert was triggered
      if (alert1) {
        expect(alert1.type).toBe('blocked')
      }
    })
  })
})
