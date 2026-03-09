import React, { useState, useEffect } from 'react';

interface WorldState {
    timestamp: string;
    aviation: { total_active_flights: number; significant_events: string[] };
    maritime: { total_vessels: number; port_congestion: string };
    geopolitics: { top_headlines: any[]; critical_alerts: string[] };
    commodities: { crude_oil: string; gold: string; btc: string };
}

interface GeoSentinelProps {
    socket?: any;
}

const GeoSentinel: React.FC<GeoSentinelProps> = ({ socket }) => {
    const [worldData, setWorldData] = useState<WorldState | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleWorldUpdate = (data: WorldState) => {
            setWorldData(data);
        };

        socket.on('jarvis/world_monitor', handleWorldUpdate);
        return () => socket.off('jarvis/world_monitor', handleWorldUpdate);
    }, [socket]);

    if (!worldData) return null;

    return (
        <div className="fixed bottom-32 right-8 w-80 bg-zinc-950/80 border border-jarvis-primary/20 rounded-xl p-4 font-mono text-xs backdrop-blur-md shadow-2xl z-20 transition-all">
            <div className="flex justify-between items-center mb-4 border-b border-jarvis-primary/10 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    <span className="text-jarvis-primary font-bold tracking-tighter uppercase">GeoSentinel Surveillance</span>
                </div>
                <span className="text-[9px] text-zinc-500">{new Date(worldData.timestamp).toLocaleTimeString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase">Aviation States</span>
                    <span className="text-sm font-bold text-white">{worldData.aviation.total_active_flights.toLocaleString()} <span className="text-[10px] text-jarvis-primary/60">FGT</span></span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase">Maritime Vessels</span>
                    <span className="text-sm font-bold text-white">{worldData.maritime.total_vessels.toLocaleString()} <span className="text-[10px] text-jarvis-secondary/60">VSL</span></span>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">BTC/USD</span>
                    <span className="text-jarvis-secondary font-bold">{worldData.commodities.btc}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Crude Oil</span>
                    <span className="text-jarvis-secondary font-bold">{worldData.commodities.crude_oil}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Gold Oz</span>
                    <span className="text-jarvis-secondary font-bold">{worldData.commodities.gold}</span>
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-jarvis-primary/10">
                <span className="text-[9px] text-zinc-500 uppercase block mb-2">Priority Intel Alerts</span>
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {worldData.geopolitics.critical_alerts.length > 0 ? (
                        worldData.geopolitics.critical_alerts.map((alert, i) => (
                            <div
                                key={i}
                                className="text-[10px] text-red-400 bg-red-400/5 p-1 rounded border-l-2 border-red-500 leading-tight animate-in fade-in slide-in-from-left-2 duration-300"
                            >
                                ⚠ {alert}
                            </div>
                        ))
                    ) : (
                        <span className="text-[10px] text-zinc-600 italic">No critical anomalies detected in current cycle.</span>
                    )}
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-jarvis-primary shadow-glow-sm"
                        style={{ width: '100%', transition: 'width 10s linear' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default GeoSentinel;
