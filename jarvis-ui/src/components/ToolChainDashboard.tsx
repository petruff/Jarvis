// Story 4.4: Tool Chaining Optimization Dashboard Component
import React, { useState, useEffect } from 'react'

interface ChainMetrics {
  chainId: string
  avgExecutionTime: number
  totalExecutions: number
  successRate: number
  parallelOpportunities: number
}

interface OptimizationResult {
  stepReduction: number
  timeImprovement: string
  estimatedTimeOriginal: number
  estimatedTimeOptimized: number
}

interface VisualizationData {
  nodes: Array<{ id: string; label: string; type: string }>
  edges: Array<{ source: string; target: string; label: string }>
}

export const ToolChainDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ChainMetrics>({
    chainId: 'default',
    avgExecutionTime: 1250,
    totalExecutions: 42,
    successRate: 98.5,
    parallelOpportunities: 3,
  })
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null)
  const [visualization, setVisualization] = useState<VisualizationData | null>(null)
  const [cacheStats, setCacheStats] = useState({
    itemsInCache: 42,
    hitRate: 78.5,
    missRate: 21.5,
  })
  const [loading, setLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState('default')

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [selectedChain])

  const fetchMetrics = async () => {
    try {
      // Fetch chain metrics
      const metricsResponse = await fetch(`/api/chains/metrics?chainId=${selectedChain}`)
      const metricsData = await metricsResponse.json()
      if (metricsData.data) {
        setMetrics(metricsData.data)
      }

      // Fetch visualization
      const vizResponse = await fetch(`/api/chains/visualization?chainId=${selectedChain}`)
      const vizData = await vizResponse.json()
      if (vizData.data) {
        setVisualization(vizData.data)
      }

      // Fetch cache stats
      const cacheResponse = await fetch('/api/cache/stats')
      const cacheData = await cacheResponse.json()
      if (cacheData.data) {
        setCacheStats(cacheData.data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const optimizeChain = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chains/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: selectedChain,
          toolIds: visualization?.nodes.map((n) => n.id) || [],
          tools: visualization?.nodes.map((n) => ({
            id: n.id,
            name: n.label,
            inputs: [],
            outputs: [],
            estimatedDuration: 100,
            parallelizable: true,
          })) || [],
        }),
      })
      const data = await response.json()
      if (data.data) {
        setOptimization(data.data)
      }
    } catch (error) {
      console.error('Failed to optimize chain:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeChain = async () => {
    try {
      await fetch('/api/chains/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: selectedChain,
          input: {},
        }),
      })
      fetchMetrics()
    } catch (error) {
      console.error('Failed to execute chain:', error)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-cyan-500/30">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">⛓️ Tool Chaining Optimizer</h1>
        <p className="text-slate-300">Optimize tool execution chains and detect parallelization opportunities</p>
      </div>

      {/* Chain Selection */}
      <div className="mb-6">
        <label className="text-sm text-cyan-400 font-mono">SELECT_CHAIN</label>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="w-full mt-2 p-2 bg-slate-900 border border-slate-700 rounded text-white"
        >
          <option value="default">Default Chain</option>
          <option value="chain-1">Chain 1: Data Pipeline</option>
          <option value="chain-2">Chain 2: ML Inference</option>
          <option value="chain-3">Chain 3: Synthesis</option>
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">AVG_EXEC_TIME</div>
          <div className="text-3xl font-bold text-white">{metrics.avgExecutionTime}ms</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">SUCCESS_RATE</div>
          <div className="text-3xl font-bold text-white">{metrics.successRate.toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">TOTAL_EXECS</div>
          <div className="text-3xl font-bold text-white">{metrics.totalExecutions}</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">PARALLEL_OPS</div>
          <div className="text-3xl font-bold text-white">{metrics.parallelOpportunities}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={optimizeChain}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Optimizing...' : '⚡ Optimize'}
        </button>
        <button
          onClick={executeChain}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold"
        >
          ▶ Execute
        </button>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Optimization Results */}
      {optimization && (
        <div className="mb-6 p-4 bg-slate-800/70 rounded border border-cyan-500/30">
          <h2 className="text-lg font-bold text-cyan-400 mb-3">Optimization Results</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 text-sm">Steps Reduced:</span>
              <p className="text-white text-xl font-mono">{optimization.stepReduction}</p>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Time Improvement:</span>
              <p className="text-cyan-400 text-xl font-mono">{optimization.timeImprovement}</p>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Original Time:</span>
              <p className="text-white font-mono">{optimization.estimatedTimeOriginal}ms</p>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Optimized Time:</span>
              <p className="text-cyan-400 font-mono">{optimization.estimatedTimeOptimized}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Chain Visualization */}
      {visualization && (
        <div className="mb-6 p-4 bg-slate-800/50 rounded border border-slate-700">
          <h2 className="text-lg font-bold text-cyan-400 mb-3">Chain Structure</h2>
          <div className="bg-slate-900 rounded p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">
              Nodes: {visualization.nodes.length} | Edges: {visualization.edges.length}
            </div>
            <div className="flex flex-col gap-2">
              {visualization.nodes.map((node) => (
                <div key={node.id} className="px-3 py-2 bg-slate-800 rounded border border-cyan-500/30 text-cyan-400 text-sm font-mono">
                  {node.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
        <h2 className="text-lg font-bold text-cyan-400 mb-3">Result Cache Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-slate-400 text-sm">Items Cached:</span>
            <p className="text-white text-xl font-mono">{cacheStats.itemsInCache}</p>
          </div>
          <div>
            <span className="text-slate-400 text-sm">Hit Rate:</span>
            <p className="text-cyan-400 text-xl font-mono">{cacheStats.hitRate.toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-slate-400 text-sm">Miss Rate:</span>
            <p className="text-white text-xl font-mono">{cacheStats.missRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToolChainDashboard
