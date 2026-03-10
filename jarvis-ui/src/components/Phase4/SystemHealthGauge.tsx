import { useEffect, useState } from 'react';

interface SystemHealthGaugeProps {
  operationality: number;
}

export default function SystemHealthGauge({ operationality }: SystemHealthGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue((prev) => {
        const target = operationality;
        const diff = target - prev;
        if (Math.abs(diff) < 1) return target;
        return prev + diff * 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [operationality]);

  const getHealthStatus = (value: number) => {
    if (value >= 90) return { label: 'OPTIMAL', color: 'text-success' };
    if (value >= 75) return { label: 'NOMINAL', color: 'text-primary' };
    if (value >= 60) return { label: 'DEGRADED', color: 'text-warning' };
    return { label: 'CRITICAL', color: 'text-danger' };
  };

  const health = getHealthStatus(displayValue);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (displayValue / 100) * circumference;

  return (
    <div className="holographic-card p-6 flex flex-col items-center justify-center gap-4">
      <div className="text-primary font-bold uppercase text-sm">System Health</div>

      {/* Circular Gauge SVG */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg width="160" height="160" className="absolute">
          <defs>
            <linearGradient id="health-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d9ff" />
              <stop offset="100%" stopColor="#0099ff" />
            </linearGradient>
          </defs>

          {/* Background Circle */}
          <circle cx="80" cy="80" r="45" fill="none" stroke="rgba(0, 217, 255, 0.1)" strokeWidth="3" />

          {/* Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r="45"
            fill="none"
            stroke="url(#health-gradient)"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />

          {/* Center Circle */}
          <circle cx="80" cy="80" r="35" fill="rgba(10, 14, 39, 0.8)" />

          {/* Center Dot */}
          <circle cx="80" cy="80" r="3" fill="#00d9ff" filter="drop-shadow(0 0 5px rgba(0, 217, 255, 0.8))" />
        </svg>

        {/* Text Overlay */}
        <div className="text-center z-10">
          <div className="text-3xl font-bold text-primary">{Math.round(displayValue)}</div>
          <div className="text-[10px] text-text-secondary uppercase">%</div>
        </div>
      </div>

      {/* Status Label */}
      <div className={`text-sm font-bold uppercase tracking-wider ${health.color}`}>{health.label}</div>

      {/* Subsystem Status */}
      <div className="w-full space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Quimera</span>
          <div className="flex items-center gap-2">
            <div className="status-indicator online" />
            <span className="text-success">85%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">DomCortex</span>
          <div className="flex items-center gap-2">
            <div className="status-indicator online" />
            <span className="text-success">92%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">WorldMonitor</span>
          <div className="flex items-center gap-2">
            <div className="status-indicator online" />
            <span className="text-success">88%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">YOLO Vision</span>
          <div className="flex items-center gap-2">
            <div className="status-indicator online" />
            <span className="text-success">91%</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="w-full border-t border-border/30 pt-3 mt-3 space-y-1 text-[10px] text-text-secondary/70">
        <div className="flex justify-between">
          <span>Response Time</span>
          <span>156ms</span>
        </div>
        <div className="flex justify-between">
          <span>Throughput</span>
          <span>4.2K ops/s</span>
        </div>
        <div className="flex justify-between">
          <span>Memory</span>
          <span>512/1024MB</span>
        </div>
      </div>
    </div>
  );
}
