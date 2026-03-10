import { useState, useEffect } from 'react';

interface WorldState {
  timestamp: string;
  aviation: { activeFlights: number; alerts: string[] };
  maritime: { activeVessels: number; alerts: string[] };
  geopolitics: { activeEvents: number; alerts: string[] };
  commodities: { activeInstruments: number; alerts: string[] };
}

export default function WorldMonitorPanel() {
  const [worldState, setWorldState] = useState<WorldState>({
    timestamp: new Date().toISOString(),
    aviation: { activeFlights: 12450, alerts: ['Flight delay detected in APAC', 'Airspace closure: Beijing'] },
    maritime: { activeVessels: 8923, alerts: ['Container ship delay: Suez Canal', 'Storm warning: South China Sea'] },
    geopolitics: { activeEvents: 47, alerts: ['Sanctions update: Russia-Ukraine', 'Trade agreement signed: USMCA'] },
    commodities: { activeInstruments: 5432, alerts: ['Oil price spike: Brent +3.5%', 'Gold rallying on inflation fears'] },
  });

  const [selectedDomain, setSelectedDomain] = useState<'aviation' | 'maritime' | 'geopolitics' | 'commodities'>('aviation');

  useEffect(() => {
    const fetchWorldState = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/monitor/state');
        if (res.ok) {
          const data = await res.json();
          setWorldState(data.data || worldState);
        }
      } catch (e) {
        console.error('Failed to fetch world state:', e);
      }
    };

    fetchWorldState();
    const interval = setInterval(fetchWorldState, 10000);
    return () => clearInterval(interval);
  }, []);

  const domains = [
    { key: 'aviation' as const, label: '✈️ Aviation', icon: '✈️' },
    { key: 'maritime' as const, label: '🌊 Maritime', icon: '🌊' },
    { key: 'geopolitics' as const, label: '🌍 Geopolitics', icon: '🌍' },
    { key: 'commodities' as const, label: '💰 Commodities', icon: '💰' },
  ];

  const currentDomain = worldState[selectedDomain];

  return (
    <div className="holographic-card p-6 flex flex-col gap-4">
      <div>
        <div className="text-primary font-bold mb-2 uppercase text-sm">WorldMonitor — Global Surveillance</div>
        <p className="text-text-secondary text-xs">Real-time monitoring of aviation, maritime, geopolitics & commodities</p>
      </div>

      {/* Domain Selector */}
      <div className="flex gap-2">
        {domains.map((domain) => (
          <button
            key={domain.key}
            onClick={() => setSelectedDomain(domain.key)}
            className={`flex-1 py-2 px-3 rounded text-sm font-bold uppercase transition-all ${
              selectedDomain === domain.key
                ? 'bg-primary text-background border border-primary'
                : 'bg-surface-light/50 text-text-secondary border border-border hover:border-primary/50'
            }`}
          >
            {domain.icon}
          </button>
        ))}
      </div>

      {/* Domain Stats */}
      <div className="bg-surface/30 border border-border rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-text-secondary text-xs uppercase mb-1">Active {selectedDomain}</div>
          <div className="neon-text text-3xl font-bold">
            {selectedDomain === 'aviation'
              ? (currentDomain as any).activeFlights.toLocaleString()
              : selectedDomain === 'maritime'
              ? (currentDomain as any).activeVessels.toLocaleString()
              : selectedDomain === 'geopolitics'
              ? (currentDomain as any).activeEvents.toLocaleString()
              : (currentDomain as any).activeInstruments.toLocaleString()}
          </div>
        </div>

        {/* Visual Indicator */}
        <svg width="100" height="100" className="opacity-60">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0, 217, 255, 0.1)" strokeWidth="1" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(0, 217, 255, 0.2)" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r="15"
            fill="none"
            stroke="#00d9ff"
            strokeWidth="2"
            opacity="0.6"
            style={{
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </svg>
      </div>

      {/* Alerts */}
      <div className="bg-surface-light/50 border border-border rounded-lg p-4">
        <div className="text-primary text-xs font-bold mb-3 uppercase">Active Alerts ({currentDomain.alerts.length})</div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {currentDomain.alerts.length > 0 ? (
            currentDomain.alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 text-text-secondary text-xs pb-2 border-b border-border/30 last:border-b-0">
                <div className="w-2 h-2 rounded-full bg-warning mt-1 flex-shrink-0" />
                <span className="leading-tight">{alert}</span>
              </div>
            ))
          ) : (
            <div className="text-text-secondary/50 text-xs italic">No active alerts</div>
          )}
        </div>
      </div>

      {/* Domain Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-light/30 border border-primary/20 rounded p-2">
          <div className="text-primary text-[10px] font-bold mb-1 uppercase">Status</div>
          <div className="status-indicator online inline-block" />
          <span className="text-text-secondary text-[10px] ml-1">MONITORING</span>
        </div>

        <div className="bg-surface-light/30 border border-primary/20 rounded p-2">
          <div className="text-primary text-[10px] font-bold mb-1 uppercase">Refresh</div>
          <div className="text-text-primary text-xs font-bold">Real-time</div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-text-secondary/50 text-[10px] text-right">
        Updated: {new Date(worldState.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
