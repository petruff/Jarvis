import React, { useEffect, useState } from 'react'
import { useSystemStatus } from '../../hooks/useSystemStatus'
import { SystemStatus } from './SystemStatus'
import { HolographicDisplay } from './HolographicDisplay'
import { CircuitBreaker } from './CircuitBreaker'
import { AgentMonitor } from './AgentMonitor'
import { KnowledgeAutonomy } from './KnowledgeAutonomy'
import { PerformanceMetrics } from './PerformanceMetrics'
import { MemoryDisplay } from './MemoryDisplay'
import { VoiceInterface } from './VoiceInterface'
import './JarvisInterface.css'

export const JarvisInterface: React.FC = () => {
  const { data: systemData } = useSystemStatus()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!systemData) return <div className="loading">JARVIS INITIALIZING...</div>

  return (
    <div className="jarvis-interface">
      {/* Background grid */}
      <div className="background-grid" />

      {/* Corner accents */}
      <div className="corner-accent top-left" />
      <div className="corner-accent top-right" />
      <div className="corner-accent bottom-left" />
      <div className="corner-accent bottom-right" />

      {/* Main grid */}
      <div className="jarvis-grid">
        {/* Header */}
        <header className="jarvis-header">
          <div className="logo-container">
            <div className="arc-reactor">J</div>
            <div className="title-section">
              <h1>JARVIS</h1>
              <p>Autonomous AI Operating System v4.0</p>
            </div>
          </div>
          <div className="header-time">{time.toLocaleTimeString()}</div>
        </header>

        {/* Left column */}
        <div className="column left">
          <SystemStatus status={systemData.status} />
          <HolographicDisplay title="Circuit Breaker" icon="⚡">
            <CircuitBreaker
              calls={systemData.circuitBreaker.calls}
              maxCalls={systemData.circuitBreaker.maxCalls}
              costUsd={systemData.circuitBreaker.costUsd}
              maxCostUsd={systemData.circuitBreaker.maxCostUsd}
            />
          </HolographicDisplay>
        </div>

        {/* Center column */}
        <div className="column center">
          <AgentMonitor squads={systemData.squads} />
          <HolographicDisplay title="Knowledge Autonomy" icon="🧠">
            <KnowledgeAutonomy percentage={systemData.knowledgeAutonomy} />
          </HolographicDisplay>
        </div>

        {/* Right column */}
        <div className="column right">
          <HolographicDisplay title="Performance" icon="⚡">
            <PerformanceMetrics latency={systemData.latency} />
          </HolographicDisplay>
          <HolographicDisplay title="Memory" icon="💾">
            <MemoryDisplay
              episodic={systemData.memory.episodic}
              semantic={systemData.memory.semantic}
              hybrid={systemData.memory.hybrid}
            />
          </HolographicDisplay>
        </div>

        {/* Voice interface */}
        <div className="voice-section">
          <VoiceInterface />
        </div>
      </div>
    </div>
  )
}

export default JarvisInterface
