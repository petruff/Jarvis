import React from 'react'

interface KnowledgeAutonomyProps {
  percentage: number
}

export const KnowledgeAutonomy: React.FC<KnowledgeAutonomyProps> = ({ percentage }) => {
  const getColor = (pct: number) => {
    if (pct >= 70) return '#00ff88'
    if (pct >= 50) return '#ffaa00'
    return '#ff0055'
  }

  const color = getColor(percentage)

  return (
    <div className="knowledge-autonomy">
      <div className="autonomy-gauge">
        <svg viewBox="0 0 200 200" className="gauge-svg">
          <circle cx="100" cy="100" r="90" className="gauge-background" />
          <circle
            cx="100"
            cy="100"
            r="90"
            className="gauge-fill"
            style={{
              strokeDasharray: `${(percentage / 100) * (Math.PI * 180)} ${Math.PI * 180}`,
              stroke: color
            }}
          />
        </svg>
        <div className="autonomy-text">
          <span className="percentage" style={{ color }}>{percentage}%</span>
          <span className="label">AUTONOMY</span>
        </div>
      </div>

      <div className="autonomy-description">
        {percentage >= 80 ? (
          <p>✓ Highly Autonomous - Minimal squad dependency</p>
        ) : percentage >= 60 ? (
          <p>→ Moderately Autonomous - Some squad support</p>
        ) : (
          <p>↑ Limited Autonomy - Depends on squads</p>
        )}
      </div>
    </div>
  )
}

export default KnowledgeAutonomy
