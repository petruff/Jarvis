import React from 'react'

interface CircuitBreakerProps {
  calls: number
  maxCalls: number
  costUsd: number
  maxCostUsd: number
}

export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  calls,
  maxCalls,
  costUsd,
  maxCostUsd
}) => {
  const callsPercentage = (calls / maxCalls) * 100
  const isWarning = callsPercentage > 80

  return (
    <div className="circuit-breaker">
      <div className="breaker-stat">
        <label>API Calls</label>
        <div className={`progress-bar ${isWarning ? 'warning' : ''}`}>
          <div
            className="progress-fill"
            style={{ width: `${callsPercentage}%` }}
          />
        </div>
        <span className="stat-value">{calls} / {maxCalls}</span>
      </div>

      <div className="breaker-stat">
        <label>Daily Cost</label>
        <div className="cost-display">
          ${costUsd.toFixed(2)} / ${maxCostUsd}
        </div>
      </div>

      <div className="breaker-status">
        {callsPercentage > 90 ? (
          <span style={{ color: '#ff0055' }}>⚠️ Critical</span>
        ) : callsPercentage > 80 ? (
          <span style={{ color: '#ffaa00' }}>⚠️ Warning</span>
        ) : (
          <span style={{ color: '#00ff88' }}>✓ Normal</span>
        )}
      </div>
    </div>
  )
}

export default CircuitBreaker
