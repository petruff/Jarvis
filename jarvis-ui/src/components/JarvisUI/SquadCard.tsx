import React from 'react'

interface SquadCardProps {
  name: string
  status: 'idle' | 'active' | 'processing'
  tasksInProgress: number
  successRate: number
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'active':
      return { color: '#00ff88', animation: 'pulse 2s infinite' }
    case 'processing':
      return { color: '#0088ff', animation: 'spin 1s linear infinite' }
    default:
      return { color: '#666', animation: 'none' }
  }
}

export const SquadCard: React.FC<SquadCardProps> = ({
  name,
  status,
  tasksInProgress,
  successRate
}) => {
  const styles = getStatusStyles(status)

  return (
    <div className="squad-card">
      <div className="squad-header">
        <h4>{name}</h4>
        <div 
          className="squad-status-indicator" 
          style={{ boxShadow: `0 0 10px ${styles.color}` }}
        >
          <div style={styles} className="status-dot" />
        </div>
      </div>

      <div className="squad-details">
        <div className="detail-item">
          <span>Status</span>
          <strong>{status.toUpperCase()}</strong>
        </div>
        <div className="detail-item">
          <span>Tasks</span>
          <strong>{tasksInProgress}</strong>
        </div>
        <div className="detail-item">
          <span>Success</span>
          <strong>{(successRate * 100).toFixed(0)}%</strong>
        </div>
      </div>

      <div className="success-rate-bar">
        <div 
          className="rate-fill" 
          style={{ width: `${successRate * 100}%` }}
        />
      </div>
    </div>
  )
}

export default SquadCard
