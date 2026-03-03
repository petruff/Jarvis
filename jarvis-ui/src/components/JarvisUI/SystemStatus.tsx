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
    </div>
  )
}

export default SystemStatus
