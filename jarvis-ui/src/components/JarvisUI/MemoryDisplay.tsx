import React from 'react'

interface MemoryDisplayProps {
  episodic: string
  semantic: string
  hybrid: number
}

export const MemoryDisplay: React.FC<MemoryDisplayProps> = ({
  episodic,
  semantic,
  hybrid
}) => {
  return (
    <div className="memory-display">
      <div className="memory-header">
        <h3>Memory Systems</h3>
      </div>

      <div className="memory-items">
        <div className="memory-item">
          <div className="memory-label">
            <span className="label-text">Episodic</span>
            <span className="memory-value">{episodic}</span>
          </div>
          <div className="memory-indicator">
            <div className="memory-bar">
              <div className="memory-fill" style={{ width: '85%' }} />
            </div>
          </div>
        </div>

        <div className="memory-item">
          <div className="memory-label">
            <span className="label-text">Semantic</span>
            <span className="memory-value">{semantic}</span>
          </div>
          <div className="memory-indicator">
            <div className="memory-bar">
              <div className="memory-fill" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

        <div className="memory-item">
          <div className="memory-label">
            <span className="label-text">Hybrid Cache</span>
            <span className="memory-value">{hybrid} items</span>
          </div>
          <div className="memory-indicator">
            <div className="memory-bar">
              <div className="memory-fill" style={{ width: '65%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="memory-total">
        <small>Total capacity: 512 MB</small>
      </div>
    </div>
  )
}

export default MemoryDisplay
