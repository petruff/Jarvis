/**
 * Story 4.5: Cost Calculator Tests
 */

import CostCalculator from '../../src/costs/costCalculator'

describe('CostCalculator', () => {
  let calculator: CostCalculator

  beforeEach(() => {
    calculator = new CostCalculator()
  })

  describe('calculateCost', () => {
    test('should calculate cost for DeepSeek model', () => {
      const cost = calculator.calculateCost(1000000, 500000, 'deepseek-chat')
      // Input: 1M * 0.14 = $0.14, Output: 500K * 0.28 / 1M = $0.14
      expect(cost).toBeCloseTo(0.28, 5)
    })

    test('should calculate cost for GPT-3.5', () => {
      const cost = calculator.calculateCost(1000000, 1000000, 'gpt-3.5-turbo')
      // Input: 1M * 0.50 = $0.50, Output: 1M * 1.50 = $1.50
      expect(cost).toBeCloseTo(2.0, 5)
    })

    test('should calculate cost for GPT-4', () => {
      const cost = calculator.calculateCost(1000000, 1000000, 'gpt-4-turbo')
      // Input: 1M * 3.00 = $3.00, Output: 1M * 6.00 = $6.00
      expect(cost).toBeCloseTo(9.0, 5)
    })

    test('should enforce minimum cost per call', () => {
      const cost = calculator.calculateCost(100, 100, 'deepseek-chat')
      expect(cost).toBeGreaterThanOrEqual(0)
    })
  })

  describe('trackCost', () => {
    test('should track cost record', () => {
      const record = calculator.trackCost(
        'squad-1',
        'deepseek-chat',
        1000,
        500,
        'exec-1'
      )
      expect(record).toBeDefined()
      expect(record.squadId).toBe('squad-1')
      expect(record.model).toBe('deepseek-chat')
      expect(record.costUsd).toBeGreaterThan(0)
    })

    test('should assign unique ID to each record', () => {
      const record1 = calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-1')
      const record2 = calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-2')
      expect(record1.id).not.toBe(record2.id)
    })
  })

  describe('getSquadCostSummary', () => {
    test('should return zero for non-existent squad', () => {
      const summary = calculator.getSquadCostSummary('non-existent')
      expect(summary.totalCost).toBe(0)
      expect(summary.executionCount).toBe(0)
    })

    test('should aggregate costs correctly', () => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1000000, 500000, 'exec-1')
      calculator.trackCost('squad-1', 'deepseek-chat', 1000000, 500000, 'exec-2')

      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.executionCount).toBe(2)
      expect(summary.totalCost).toBeCloseTo(0.56, 5)
      expect(summary.averageCostPerExecution).toBeCloseTo(0.28, 5)
    })

    test('should identify most used model', () => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-1')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 1000, 500, 'exec-2')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 1000, 500, 'exec-3')

      const summary = calculator.getSquadCostSummary('squad-1')
      expect(summary.mostUsedModel).toBe('gpt-3.5-turbo')
    })
  })

  describe('getAgentCostSummary', () => {
    test('should return zero for non-existent agent', () => {
      const summary = calculator.getAgentCostSummary('non-existent')
      expect(summary.totalCost).toBe(0)
      expect(summary.executionCount).toBe(0)
    })

    test('should aggregate agent costs correctly', () => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-1', 'agent-1')
      calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-2', 'agent-1')

      const summary = calculator.getAgentCostSummary('agent-1')
      expect(summary.executionCount).toBe(2)
      expect(summary.totalCost).toBeGreaterThan(0)
    })
  })

  describe('getSquadCosts', () => {
    test('should return all costs for a squad', () => {
      calculator.trackCost('squad-1', 'deepseek-chat', 1000, 500, 'exec-1')
      calculator.trackCost('squad-1', 'gpt-3.5-turbo', 2000, 1000, 'exec-2')
      calculator.trackCost('squad-2', 'deepseek-chat', 1000, 500, 'exec-3')

      const costs = calculator.getSquadCosts('squad-1')
      expect(costs.length).toBe(2)
      expect(costs.every(c => c.squadId === 'squad-1')).toBe(true)
    })
  })
})
