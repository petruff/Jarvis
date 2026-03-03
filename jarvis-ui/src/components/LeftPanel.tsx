import React, { useState, useEffect } from 'react';

const LeftPanel: React.FC = () => {
    const [networkTraffic, setNetworkTraffic] = useState<{ rx: number; tx: number }[]>([{ rx: 50, tx: 50 }]);
    const [squadStatus, setSquadStatus] = useState([
        { id: 'forge', name: 'Forge', status: 'ONLINE', load: 12 },
        { id: 'mercury', name: 'Mercury', status: 'STANDBY', load: 0 },
        { id: 'vault', name: 'Vault', status: 'ACTIVE', load: 45 },
        { id: 'oracle', name: 'Oracle', status: 'SYNCING', load: 88 },
        { id: 'nexus', name: 'Nexus', status: 'ONLINE', load: 5 }
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Update network graph
            setNetworkTraffic(prev => {
                const updated = [...prev, {
                    rx: Math.floor(Math.random() * 80) + 10,
                    tx: Math.floor(Math.random() * 60) + 5
                }];
                if (updated.length > 20) updated.shift();
                return updated;
            });

            // Randomly fluctuate load on active squads
            setSquadStatus(prev => prev.map(s => {
                if (s.status === 'STANDBY') return s;
                let newLoad = s.load + (Math.floor(Math.random() * 15) - 7);
                if (newLoad < 5) newLoad = 5;
                if (newLoad > 98) newLoad = 98;
                return { ...s, load: newLoad };
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 w-64 hidden 2xl:flex flex-col gap-6 z-10 pointer-events-none">

            {/* Squad Array Module */}
            <div className="glass-panel p-4 pb-5 rounded-lg border border-jarvis-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-jarvis-primary/0 via-jarvis-primary to-jarvis-primary/0"></div>
                <h3 className="text-[10px] text-jarvis-primary/80 font-mono tracking-[0.2em] mb-3 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-jarvis-primary rounded-full animate-pulse shadow-glow"></span>
                    Neural Array
                </h3>

                <div className="flex flex-col gap-3">
                    {squadStatus.map(squad => (
                        <div key={squad.id} className="font-mono">
                            <div className="flex justify-between items-end mb-1 text-[9px]">
                                <span className="text-jarvis-text/80">{squad.name}</span>
                                <span className={squad.status === 'ACTIVE' || squad.status === 'SYNCING' ? 'text-jarvis-primary shadow-glow-sm' : 'text-jarvis-primary/40'}>
                                    {squad.status}
                                </span>
                            </div>
                            <div className="w-full h-[3px] bg-jarvis-surface rounded overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${squad.status === 'STANDBY' ? 'bg-jarvis-primary/20' : 'bg-jarvis-primary shadow-glow'}`}
                                    style={{ width: `${squad.load}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Network I/O Module */}
            <div className="glass-panel p-4 rounded-lg border border-jarvis-secondary/30 relative">
                <h3 className="text-[10px] text-jarvis-secondary/80 font-mono tracking-[0.2em] mb-3 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-jarvis-secondary rounded-full shadow-glow-sm"></span>
                    COM LINK I/O
                </h3>
                <div className="h-24 w-full flex items-end justify-between gap-[2px] opacity-70">
                    {networkTraffic.map((t, i) => (
                        <div key={i} className="w-full flex flex-col justify-end gap-[1px]">
                            {/* TX Bar (Top, Secondary Color) */}
                            <div className="w-full bg-jarvis-secondary/80 rounded-t-sm" style={{ height: `${t.tx}%` }}></div>
                            {/* RX Bar (Bottom, Primary Color) */}
                            <div className="w-full bg-jarvis-primary/80 rounded-b-sm" style={{ height: `${t.rx}%` }}></div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-[8px] font-mono text-jarvis-primary/60">
                    <span>RX: {networkTraffic[networkTraffic.length - 1]?.rx.toFixed(1)} Mbps</span>
                    <span className="text-jarvis-secondary/60">TX: {networkTraffic[networkTraffic.length - 1]?.tx.toFixed(1)} Mbps</span>
                </div>
            </div>

        </div>
    );
};

export default LeftPanel;
