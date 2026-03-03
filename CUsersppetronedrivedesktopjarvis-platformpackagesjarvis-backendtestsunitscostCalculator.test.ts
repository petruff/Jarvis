import { CostCalculator } from '../../src/costs/costCalculator'
import { DEFAULT_PRICING } from '../../src/costs/pricingData'

describe('CostCalculator', () => {
  let calculator: CostCalculator

  beforeEach(() => {
    calculator = new CostCalculator()
  })

  describe('calculateCost', () => {
    it('should calculate cost for DeepSeek model correctly', () => {
      const cost = calculator.calculateCost(1_000_000, 500_000, 'deepseek-chat')
      const expectedInputCost = 1_000_000 * 0.14 / 1_000_000
      const expectedOutputCost = 500_000 * 0.28 / 1_000_000
      const expected = expectedInputCost + expectedOutputCost
      expect(cost).toBeCloseTo(expected, 4)
    })

    it('should calculate cost for GPT-3.5 Turbo correctly', () => {
      const cost = calculator.calculateCost(1_000_000, 1_000_000, 'gpt-3.5-turbo')
      const expectedInputCost = 1_000_000 * 0.50 / 1_000_000
      const expectedOutputCost = 1_000_000 * 1.50 / 1_000_000
      const expected = expectedInputCost + expectedOutputCost
      expect(cost).toBeCloseTo(expected, 2)
    })

    it('should calculate cost for GPT-4 Turbo correctly', () => {
      const cost = calculator.calculateCost(1_000_000, 1_000_000, 'gpt-4-turbo')
      const expectedInputCost = 1_000_000 * 3.00 / 1_000_000
      const expectedOutputCost = 1_000_000 * 6.00 / 1_000_000
      const expected = expectedInputCost + expectedOutputCost
      expect(cost).toBeCloseTo(expected, 2)
    })

    it('should enforce minimum cost per call', () => {
      const cost = calculator.calculateCost(100, 100, 'deepseek-chat')
      const deepseekPricing = DEFAULT_PRICING.get('deepseek-chat')!
      expect(cost).toBeGreaterThanOrEqual(deepseekPricing.minCostPerCall)
    })

    it('should return 0 for free models', () => {
      const cost = calculator.calculateCost(1_000_000, 1_000_000, 'llama-2-local')
      expect(cost).toBe(0)
    })

    it('should handle large token counts', () => {
      const cost = calculator.calculateCost(100_000_000, 50_000_000, 'gpt-3.5-turbo')
      expect(cost).toBeGreaterThan(100)
    })
  })

  describe('trackCost', () => {
    it('should create a cost tracking record', () => {
      const record = calculator.trackCost('squad-1', 'gpt-3.5-turbo', 1_000_000, 500_000, 'exec-1')
      expect(record).toBeDefined()
      expect(record.squadId).toBe('squad-1')
      expect(record.modelUsed).toBe('gpt-3.5-turbo')
      expect(record.inputTokens).toBe(1_000_000)
      expect(record.outputTokens).toBe(500_000)
    })

    it('should generate unique IDs for each record', () => {
      const record1 = calculator.trackCost('squad-1', 'deepseek-chat', 1_000, 1_000, 'exec-1')
      const record2 = calculator.trackCost('squad-1', 'deepseek-chat', 1_000, 1_000, 'exec-2')
      expect(record1.id).not.toBe(record2.id)
    })

    it('should calculate and store cost in record', () => {
      const record = calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1')
      const expectedCost = calculator.calculateCost(1_000_000, 500_000, 'deepseek-chat')
      expect(record.costUsd).toBeCloseTo(expectedCost, 4)
    })

    it('should allow tracking multiple costs for same squad', () => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1_000, 1_000, 'exec-1')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 1_000, 1_000, 'exec-2')

      const costs = calculator.getSquadCosts('squad-1')
      expect(costs.length).toBe(2)
    })
  })

  describe('getSquadCostSummary', () => {
    beforeEach(() => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1')
      calculator.trackCost('squad-1', 'deepseek-chat', 2_000_000, 1_000_000, 'exec-2')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 500_000, 500_000, 'exec-3')
    })

    it('should aggregate costs for a squad', () => {
      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.squadId).toBe('squad-1')
      expect(summary.executionCount).toBe(3)
      expect(summary.totalInputTokens).toBe(3_500_000)
      expect(summary.totalOutputTokens).toBe(2_000_000)
    })

    it('should calculate average cost per execution', () => {
      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.averageCostPerExecution).toBeGreaterThan(0)
    })

    it('should identify most used model', () => {
      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.mostUsedModel).toBe('deepseek-chat')
    })

    it('should return summary for non-existent squad', () => {
      const summary = calculator.getSquadCostSummary('non-existent')
      expect(summary.executionCount).toBe(0)
      expect(summary.totalCost).toBe(0)
    })
  })

  describe('getAgentCostSummary', () => {
    beforeEach(() => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1', 'agent-1')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 500_000, 500_000, 'exec-2', 'agent-1')
      calculator.trackCost('squad-1', 'deepseek-chat', 2_000_000, 1_000_000, 'exec-3', 'agent-2')
    })

    it('should aggregate costs for an agent', () => {
      const summary = calculator.getAgentCostSummary('agent-1')
      expect(summary.agentId).toBe('agent-1')
      expect(summary.executionCount).toBe(2)
    })

    it('should handle agent with no costs', () => {
      const summary = calculator.getAgentCostSummary('agent-999')
      expect(summary.executionCount).toBe(0)
      expect(summary.totalCost).toBe(0)
    })
  })

  describe('getSquadCosts', () => {
    it('should return all costs for a squad', () => {
      const record1 = calculator.trackCost('squad-1', 'deepseek-chat', 1_000_000, 500_000, 'exec-1')
      const record2 = calculator.trackCost('squad-1', 'gpt-3.5-turbo', 500_000, 500_000, 'exec-2')

      const costs = calculator.getSquadCosts('squad-1')
      expect(costs.length).toBe(2)
      expect(costs).toContainEqual(record1)
      expect(costs).toContainEqual(record2)
    })

    it('should return empty array for squad with no costs', () => {
      const costs = calculator.getSquadCosts('squad-999')
      expect(costs).toEqual([])
    })
  })
})
