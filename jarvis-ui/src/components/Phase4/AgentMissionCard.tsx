import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface AgentMission {
  id: string;
  agent: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  description: string;
  startTime: string;
  updatedTime: string;
}

interface AgentMissionCardProps {
  socket?: Socket;
}

export default function AgentMissionCard({ socket }: AgentMissionCardProps) {
  const [missions, setMissions] = useState<AgentMission[]>([
    {
      id: 'M001',
      agent: 'Mercury',
      status: 'IN_PROGRESS',
      progress: 65,
      description: 'Analyzing market trends for Q2 strategy',
      startTime: new Date(Date.now() - 5 * 60000).toISOString(),
      updatedTime: new Date().toISOString(),
    },
    {
      id: 'M002',
      agent: 'Forge',
      status: 'COMPLETED',
      progress: 100,
      description: 'Implemented Phase 4 API endpoints',
      startTime: new Date(Date.now() - 30 * 60000).toISOString(),
      updatedTime: new Date(Date.now() - 2 * 60000).toISOString(),
    },
    {
      id: 'M003',
      agent: 'Oracle',
      status: 'IN_PROGRESS',
      progress: 42,
      description: 'Research deep synthesis algorithms',
      startTime: new Date(Date.now() - 15 * 60000).toISOString(),
      updatedTime: new Date().toISOString(),
    },
    {
      id: 'M004',
      agent: 'Sentinel',
      status: 'PENDING',
      progress: 0,
      description: 'Security audit of YOLO vision module',
      startTime: new Date().toISOString(),
      updatedTime: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    if (!socket) return;

    const handler = (mission: AgentMission) => {
      setMissions((prev) => {
        const existing = prev.find((m) => m.id === mission.id);
        if (existing) {
          return prev.map((m) => (m.id === mission.id ? mission : m));
        }
        return [mission, ...prev].slice(0, 8);
      });
    };

    socket.on('mission:update', handler);
    return () => {
      socket.off('mission:update', handler);
    };
  }, [socket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-success bg-success/10 border-success/30';
      case 'IN_PROGRESS':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'FAILED':
        return 'text-danger bg-danger/10 border-danger/30';
      default:
        return 'text-warning bg-warning/10 border-warning/30';
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-success';
      case 'IN_PROGRESS':
        return 'bg-primary';
      case 'FAILED':
        return 'bg-danger';
      default:
        return 'bg-warning';
    }
  };

  return (
    <div className="holographic-card p-4 h-full flex flex-col">
      <div className="text-primary font-bold mb-4 uppercase text-sm">Active Missions</div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {missions.map((mission) => (
          <div key={mission.id} className="bg-surface-light/50 border border-border rounded-lg p-3 hover:border-primary/50 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusIndicatorColor(mission.status)}`} />
                <div>
                  <div className="text-xs font-bold uppercase text-text-primary">{mission.agent}</div>
                  <div className="text-text-secondary text-[10px] mt-1 leading-tight">{mission.description}</div>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getStatusColor(mission.status)}`}>
                {mission.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-surface/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-500"
                style={{ width: `${mission.progress}%` }}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-2 text-[9px] text-text-secondary/60">
              <span>{mission.progress}%</span>
              <span>{Math.round((new Date().getTime() - new Date(mission.startTime).getTime()) / 60000)}m</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
