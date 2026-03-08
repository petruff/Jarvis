/**
 * Component: SystemStatus
 * Shows overall system health and operational status
 */

import React from 'react'

interface SystemStatusProps {
  status: 'operational' | 'warning' | 'critical'
}

const StatusConfig = {
  operational: {
    color: '#00ff88',
    label: 'OPERATIONAL',
    health: 94
  },
  warning: {
    color: '#ffaa00',
    label: 'WARNING',
    health: 65
  },
  critical: {
    color: '#ff0055',
    label: 'CRITICAL',
    health: 30
  }
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const config = StatusConfig[status]

  return (
    <div className="system-status">
      <div className="status-header">
        <h3>System Status</h3>
      </div>

      <div className="status-indicator">
        <div
          className="status-dot"
          style={{ boxShadow: `0 0 20px ${config.color}` }}
        />
        <span className="status-label">{config.label}</span>
      </div>

      <div className="health-bar">
        <div
          className="health-fill"
          style={{
            width: `${config.health}%`,
            backgroundColor: config.color
          }}
        />
      </div>

      <div className="health-text">
        <span>System Health: {config.health}%</span>
      </div>

      <div className="status-timestamp">
        <small>Updated: {new Date().toLocaleTimeString()}</small>
      </div>

      <div className="mega-brain-active-indicator" style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,255,136,0.1)', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="pulse-scan" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 10px #00ff88' }} />
          <span style={{ fontSize: '0.6rem', color: '#00ff88', letterSpacing: '1px' }}>MEGA BRAIN DNA LOADED</span>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
