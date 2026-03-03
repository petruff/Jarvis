/**
 * Component: HolographicDisplay
 * Reusable glassmorphic panel wrapper with hologram effects
 */

import React from 'react'

interface HolographicDisplayProps {
  title: string
  icon?: string
  children: React.ReactNode
  className?: string
}

export const HolographicDisplay: React.FC<HolographicDisplayProps> = ({
  title,
  icon,
  children,
  className = ''
}) => {
  return (
    <div className={`holographic-display ${className}`}>
      <div className="scan-lines" />
      
      <div className="hologram-header">
        {icon && <span className="hologram-icon">{icon}</span>}
        <h3 className="hologram-title">{title}</h3>
      </div>

      <div className="hologram-content">
        {children}
      </div>

      <div className="hologram-border-glow" />
    </div>
  )
}

export default HolographicDisplay
