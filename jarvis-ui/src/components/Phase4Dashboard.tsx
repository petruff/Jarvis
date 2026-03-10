import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import '../styles/ironman.css';
import AgentMissionCard from './Phase4/AgentMissionCard';
import KnowledgeGraphViewer from './Phase4/KnowledgeGraphViewer';
import WorldMonitorPanel from './Phase4/WorldMonitorPanel';
import VisionAnalysisPanel from './Phase4/VisionAnalysisPanel';
import SystemHealthGauge from './Phase4/SystemHealthGauge';

interface Phase4DashboardProps {
  socket?: Socket;
  onClose?: () => void;
}

export default function Phase4Dashboard({ socket, onClose }: Phase4DashboardProps) {
  const [operationality, setOperationality] = useState(0);
  const [activeSystem, setActiveSystem] = useState<'quimera' | 'domcortex' | 'worldmonitor' | 'yolo'>('quimera');

  useEffect(() => {
    const fetchOperationality = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/operationality/score');
        const data = await res.json();
        setOperationality(data.score || 0);
      } catch (e) {
        console.error('Failed to fetch operationality:', e);
      }
    };

    fetchOperationality();
    const interval = setInterval(fetchOperationality, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Grid Background & Scan Lines */}
      <div className="grid-background" />
      <div className="scan-lines" />

      {/* Corner Brackets */}
      <div className="corner-bracket top-left" />
      <div className="corner-bracket top-right" />
      <div className="corner-bracket bottom-left" />
      <div className="corner-bracket bottom-right" />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="neon-text active text-4xl font-bold mb-2">
                ⚛️ PHASE 4 — ADVANCED AGI SYSTEMS
              </h1>
              <p className="text-text-secondary text-sm tracking-widest">
                DEEP SYNTHESIS • BROWSER AUTOMATION • GLOBAL SURVEILLANCE • COMPUTER VISION
              </p>
            </div>
            <button
              onClick={onClose}
              className="button-primary"
              aria-label="Close dashboard"
            >
              [CLOSE]
            </button>
          </div>

          {/* System Health Overview */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {['Quimera', 'DomCortex', 'WorldMonitor', 'YOLO'].map((system) => (
              <div key={system} className="holographic-card p-4 text-center cursor-pointer hover:border-primary transition-all"
                onClick={() => setActiveSystem(system.toLowerCase() as any)}>
                <div className="text-primary font-bold text-sm uppercase mb-2">{system}</div>
                <div className="w-12 h-12 mx-auto mb-2">
                  <div className="circular-gauge" style={{ '--gauge-progress': '85%' } as any}>
                    <div className="circular-gauge-value">
                      <div className="circular-gauge-value-number">85</div>
                      <div className="circular-gauge-value-label">%</div>
                    </div>
                  </div>
                </div>
                <div className="status-indicator online inline-block" />
                <span className="text-xs text-text-secondary ml-2">OPERATIONAL</span>
              </div>
            ))}
          </div>

          {/* Overall Operationality Score */}
          <div className="holographic-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-text-secondary text-sm uppercase mb-2">SYSTEM OPERATIONALITY</div>
                <div className="neon-text text-3xl font-bold">{Math.round(operationality)}/100</div>
              </div>
              <div className="w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d9ff" />
                      <stop offset="100%" stopColor="#0099ff" />
                    </linearGradient>
                    <linearGradient id="gradient-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0, 217, 255, 0.3)" />
                      <stop offset="100%" stopColor="rgba(0, 153, 255, 0.1)" />
                    </linearGradient>
                  </defs>

                  {/* Background circle */}
                  <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(0, 217, 255, 0.1)" strokeWidth="2" />

                  {/* Progress circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="55"
                    fill="none"
                    stroke="url(#gradient-primary)"
                    strokeWidth="3"
                    strokeDasharray={`${(operationality / 100) * 2 * Math.PI * 55} ${2 * Math.PI * 55}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />

                  {/* Center dot */}
                  <circle cx="60" cy="60" r="4" fill="#00d9ff" filter="drop-shadow(0 0 5px rgba(0, 217, 255, 0.8))" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Left Column: Active System Display */}
          <div className="col-span-2">
            {activeSystem === 'quimera' && <KnowledgeGraphViewer />}
            {activeSystem === 'domcortex' && <VisionAnalysisPanel />}
            {activeSystem === 'worldmonitor' && <WorldMonitorPanel />}
            {activeSystem === 'yolo' && <VisionAnalysisPanel />}
          </div>

          {/* Right Column: Agent Missions & Status */}
          <div className="flex flex-col gap-4">
            <SystemHealthGauge operationality={operationality} />
            <div className="flex-1 overflow-y-auto max-h-[600px]">
              <AgentMissionCard socket={socket} />
            </div>
          </div>
        </div>

        {/* Bottom Section: Detailed Telemetry */}
        <div className="grid grid-cols-2 gap-6">
          <div className="holographic-card p-4">
            <div className="text-primary font-bold mb-3 uppercase text-sm">Quimera Synthesis</div>
            <div className="text-text-secondary text-xs space-y-2">
              <div className="flex justify-between">
                <span>Vector RAG Status:</span>
                <span className="neon-text">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>Graph Connections:</span>
                <span className="text-primary">2,847</span>
              </div>
              <div className="flex justify-between">
                <span>Analysis Confidence:</span>
                <span className="text-success">94.2%</span>
              </div>
            </div>
          </div>

          <div className="holographic-card p-4">
            <div className="text-primary font-bold mb-3 uppercase text-sm">DomCortex Browser</div>
            <div className="text-text-secondary text-xs space-y-2">
              <div className="flex justify-between">
                <span>Browser Status:</span>
                <span className="neon-text">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>Pages Analyzed:</span>
                <span className="text-primary">156</span>
              </div>
              <div className="flex justify-between">
                <span>Response Time:</span>
                <span className="text-success">234ms</span>
              </div>
            </div>
          </div>

          <div className="holographic-card p-4">
            <div className="text-primary font-bold mb-3 uppercase text-sm">WorldMonitor</div>
            <div className="text-text-secondary text-xs space-y-2">
              <div className="flex justify-between">
                <span>Aviation Tracking:</span>
                <span className="text-primary">12,450</span>
              </div>
              <div className="flex justify-between">
                <span>Maritime Vessels:</span>
                <span className="text-primary">8,923</span>
              </div>
              <div className="flex justify-between">
                <span>Data Freshness:</span>
                <span className="text-success">Real-time</span>
              </div>
            </div>
          </div>

          <div className="holographic-card p-4">
            <div className="text-primary font-bold mb-3 uppercase text-sm">YOLO Vision</div>
            <div className="text-text-secondary text-xs space-y-2">
              <div className="flex justify-between">
                <span>Model Status:</span>
                <span className="neon-text">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>Objects Detected:</span>
                <span className="text-primary">43,821</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Confidence:</span>
                <span className="text-success">91.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
