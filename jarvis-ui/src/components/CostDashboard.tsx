import React, { useEffect, useState } from 'react'

interface CostMetrics {
  totalCost: number
  monthlyBudget: number
  spendingPercentage: number
  executionCount: number
  averageCostPerExecution: number
  mostUsedModel: string
  isOverBudget: boolean
}

interface CostRecord {
  id: string
  squadId: string
  modelUsed: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export const CostDashboard: React.FC<{ squadId?: string }> = ({ squadId = 'squad-1' }) => {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null)
  const [costs, setCosts] = useState<CostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, costsRes] = await Promise.all([
          fetch(`/api/costs/squad/${squadId}`),
          fetch(`/api/costs/squad/${squadId}`),
        ])

        if (!metricsRes.ok) throw new Error('Failed to fetch metrics')
        if (!costsRes.ok) throw new Error('Failed to fetch costs')

        const metricsData = await metricsRes.json()
        const costsData = await costsRes.json()

        const budget = await fetch(`/api/budgets/${squadId}`).then((r) => r.json())

        setMetrics({
          totalCost: metricsData.data.totalCost,
          monthlyBudget: budget.data.monthlyLimit,
          spendingPercentage: budget.data.spendingPercentage,
          executionCount: metricsData.data.executionCount,
          averageCostPerExecution: metricsData.data.averageCostPerExecution,
          mostUsedModel: metricsData.data.mostUsedModel,
          isOverBudget: budget.data.remaining <= 0,
        })
        setCosts(costsData.data.executions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [squadId])

  if (loading) return <div className="p-4">Loading cost metrics...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>
  if (!metrics) return <div className="p-4">No data available</div>

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">💰 Cost Optimization Engine</h1>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Cost Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-semibold">Total Cost</div>
          <div className="text-3xl font-bold text-blue-600">${metrics.totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{metrics.executionCount} executions</div>
        </div>

        {/* Budget Status Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-semibold">Budget Status</div>
          <div className={`text-3xl font-bold ${metrics.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.spendingPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">of ${metrics.monthlyBudget}</div>
        </div>

        {/* Avg Cost Per Execution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-semibold">Avg Cost / Exec</div>
          <div className="text-3xl font-bold text-purple-600">${metrics.averageCostPerExecution.toFixed(4)}</div>
          <div className="text-xs text-gray-500 mt-2">per execution</div>
        </div>

        {/* Most Used Model */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-semibold">Top Model</div>
          <div className="text-2xl font-bold text-orange-600">{metrics.mostUsedModel || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-2">most frequently used</div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all ${metrics.spendingPercentage >= 100 ? 'bg-red-600' : metrics.spendingPercentage >= 80 ? 'bg-yellow-600' : 'bg-green-600'}`}
            style={{ width: `${Math.min(metrics.spendingPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>${metrics.totalCost.toFixed(2)} spent</span>
          <span>${Math.max(0, metrics.monthlyBudget - metrics.totalCost).toFixed(2)} remaining</span>
        </div>
      </div>

      {/* Alert */}
      {metrics.isOverBudget && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-8 rounded">
          <p className="text-red-700 font-semibold">⚠️ Budget Limit Exceeded</p>
          <p className="text-red-600 text-sm mt-1">Squad has exceeded monthly budget. New executions may be blocked.</p>
        </div>
      )}

      {/* Cost Execution Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Executions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-4">Model</th>
                <th className="text-right py-2 px-4">Input Tokens</th>
                <th className="text-right py-2 px-4">Output Tokens</th>
                <th className="text-right py-2 px-4">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {costs.slice(0, 10).map((record) => (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {record.modelUsed}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">{record.inputTokens.toLocaleString()}</td>
                  <td className="text-right py-3 px-4">{record.outputTokens.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 font-semibold">${record.costUsd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {costs.length === 0 && (
          <p className="text-center text-gray-500 py-4">No executions yet</p>
        )}
      </div>

      {/* Cost Optimization Tips */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-8 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Cost Optimization Tips</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Use DeepSeek for simple tasks (90%+ cheaper than GPT-4)</li>
          <li>• Analyze task complexity before selecting models</li>
          <li>• Cache repeated queries to reduce API calls</li>
          <li>• Monitor spending trends to stay within budget</li>
        </ul>
      </div>
    </div>
  )
}

export default CostDashboard
