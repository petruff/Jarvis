import React from 'react'
import { SquadCard } from './SquadCard'

interface Squad {
  name: string
  status: 'idle' | 'active' | 'processing'
  tasksInProgress: number
  successRate: number
}

interface AgentMonitorProps {
  squads: Squad[]
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({ squads }) => {
  return (
    <div className="agent-monitor">
      <div className="monitor-header">
        <h3>Agent Squads</h3>
        <span className="squad-count">{squads.length} ACTIVE</span>
      </div>

      <div className="squads-grid">
        {squads.map((squad) => (
          <SquadCard
            key={squad.name}
            name={squad.name}
            status={squad.status}
            tasksInProgress={squad.tasksInProgress}
            successRate={squad.successRate}
          />
        ))}
      </div>

      <div className="monitor-stats">
        <div className="stat">
          <span>Total Tasks</span>
          <strong>{squads.reduce((sum, s) => sum + s.tasksInProgress, 0)}</strong>
        </div>
        <div className="stat">
          <span>Avg Success Rate</span>
          <strong>
            {(squads.reduce((sum, s) => sum + s.successRate, 0) / squads.length * 100).toFixed(1)}%
          </strong>
        </div>
      </div>
    </div>
  )
}

export default AgentMonitor
