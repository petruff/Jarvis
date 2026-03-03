import { FastifyInstance } from 'fastify'
import { CostCalculator } from '../costs/costCalculator'
import { ModelSelector } from '../costs/modelSelector'
import { BudgetMonitor } from '../costs/budgetMonitor'
import { CostAnalyzer } from '../costs/costAnalyzer'

const calculator = new CostCalculator()
const modelSelector = new ModelSelector()
const budgetMonitor = new BudgetMonitor()
const costAnalyzer = new CostAnalyzer(calculator, budgetMonitor)

export async function registerCostRoutes(fastify: FastifyInstance) {
  console.log('[COSTS] registerCostRoutes called with fastify instance')

  fastify.get('/api/costs/metrics', async (request, reply) => {
    try {
      const allSquads = ['squad-1', 'squad-2', 'squad-3', 'squad-4', 'squad-5']
      const metrics = allSquads.map((squadId) => {
        const summary = calculator.getSquadCostSummary(squadId)
        const budget = budgetMonitor.getBudgetStatus(squadId)
        return {
          squadId,
          totalCost: summary.totalCost,
          executionCount: summary.executionCount,
          monthlyBudget: budget?.monthlyLimit || 0,
          spendingPercentage: budget && budget.monthlyLimit > 0 ? (summary.totalCost / budget.monthlyLimit) * 100 : 0,
        }
      })
      const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0)
      const totalExecutions = metrics.reduce((sum, m) => sum + m.executionCount, 0)
      reply.send({
        status: 'success',
        data: {
          totalCost,
          totalExecutions,
          averageCostPerExecution: totalExecutions > 0 ? totalCost / totalExecutions : 0,
          squads: metrics,
        },
      })
    } catch (error) {
      reply.code(500).send({
        status: 'error',
        message: 'Failed to get cost metrics',
      })
    }
  })

  fastify.get('/api/costs/squad/:id', async (request, reply) => {
    try {
      const { id: squadId } = request.params as { id: string }
      const summary = calculator.getSquadCostSummary(squadId)
      const costs = calculator.getSquadCosts(squadId)
      reply.send({
        status: 'success',
        data: {
          squadId,
          totalCost: summary.totalCost,
          totalInputTokens: summary.inputTokens,
          totalOutputTokens: summary.outputTokens,
          executionCount: summary.executionCount,
          averageCostPerExecution: summary.averageCostPerExecution,
          mostUsedModel: summary.mostUsedModel,
          executions: costs,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get squad costs' })
    }
  })

  fastify.get('/api/costs/agent/:id', async (request, reply) => {
    try {
      const { id: agentId } = request.params as { id: string }
      const summary = calculator.getAgentCostSummary(agentId)
      reply.send({
        status: 'success',
        data: {
          agentId,
          totalCost: summary.totalCost,
          executionCount: summary.executionCount,
          averageCostPerExecution: summary.averageCostPerExecution,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get agent costs' })
    }
  })

  fastify.get('/api/costs/models', async (request, reply) => {
    try {
      const models = modelSelector.getAllModels()
      reply.send({ status: 'success', data: { models } })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get model list' })
    }
  })

  fastify.get('/api/budgets/:id', async (request, reply) => {
    try {
      const { id: squadId } = request.params as { id: string }
      const budget = budgetMonitor.getBudgetStatus(squadId)
      reply.send({
        status: 'success',
        data: {
          ...budget,
          spendingPercentage: budget.monthlyLimit > 0 ? (budget.currentSpend / budget.monthlyLimit) * 100 : 0,
          remaining: Math.max(0, budget.monthlyLimit - budget.currentSpend),
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get budget status' })
    }
  })

  fastify.post('/api/budgets/:id/set', async (request, reply) => {
    try {
      const { id: squadId } = request.params as { id: string }
      const { monthlyLimit } = request.body as { monthlyLimit: number }
      if (!monthlyLimit || monthlyLimit <= 0) {
        return reply.code(400).send({
          status: 'error',
          message: 'monthlyLimit must be a positive number',
        })
      }
      const budget = budgetMonitor.setBudget(squadId, monthlyLimit)
      reply.send({ status: 'success', data: budget })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to set budget' })
    }
  })

  console.log('[COSTS] ✓ All cost routes registered successfully')
}
