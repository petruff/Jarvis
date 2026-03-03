import React from 'react'

interface PerformanceMetricsProps {
  latency: {
    p50: number
    p95: number
    p99: number
  }
}

const getLatencyColor = (ms: number) => {
  if (ms < 300) return '#00ff88'
  if (ms < 1000) return '#ffaa00'
  return '#ff0055'
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ latency }) => {
  const maxLatency = Math.max(latency.p50, latency.p95, latency.p99)
  const scale = 100 / maxLatency

  return (
    <div className="performance-metrics">
      <div className="metrics-header">
        <h3>Latency Metrics</h3>
      </div>

      <div className="metrics-grid">
        <div className="metric-item">
          <label>P50 (Median)</label>
          <div className="metric-bar">
            <div
              className="metric-fill"
              style={{
                width: `${latency.p50 * scale}%`,
                backgroundColor: getLatencyColor(latency.p50)
              }}
            />
          </div>
          <span className="metric-value">{latency.p50}ms</span>
        </div>

        <div className="metric-item">
          <label>P95 (95th)</label>
          <div className="metric-bar">
            <div
              className="metric-fill"
              style={{
                width: `${latency.p95 * scale}%`,
                backgroundColor: getLatencyColor(latency.p95)
              }}
            />
          </div>
          <span className="metric-value">{latency.p95}ms</span>
        </div>

        <div className="metric-item">
          <label>P99 (99th)</label>
          <div className="metric-bar">
            <div
              className="metric-fill"
              style={{
                width: `${latency.p99 * scale}%`,
                backgroundColor: getLatencyColor(latency.p99)
              }}
            />
          </div>
          <span className="metric-value">{latency.p99}ms</span>
        </div>
      </div>

      <div className="metrics-summary">
        <small>Target: P50 {'<'}300ms, P95 {'<'}1000ms</small>
      </div>
    </div>
  )
}

export default PerformanceMetrics
