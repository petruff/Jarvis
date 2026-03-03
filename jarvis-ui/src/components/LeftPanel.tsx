import React, { useState, useEffect } from 'react';

const LeftPanel: React.FC = () => {
    const [networkTraffic, setNetworkTraffic] = useState<{ rx: number; tx: number }[]>([{ rx: 50, tx: 50 }]);
    const [squadStatus, setSquadStatus] = useState([
        { id: 'forge', name: 'FORGE.SYS', status: 'ONLINE', load: 12, memory: '2.1GB' },
        { id: 'mercury', name: 'MERCURY.NET', status: 'STANDBY', load: 0, memory: '120MB' },
        { id: 'vault', name: 'VAULT.SEC', status: 'ACTIVE', load: 45, memory: '4.8GB' },
        { id: 'oracle', name: 'ORACLE.AI', status: 'SYNCING', load: 88, memory: '11.2GB' },
        { id: 'nexus', name: 'NEXUS.CORE', status: 'ONLINE', load: 5, memory: '1.4GB' }
    ]);
    const [sysInfo, setSysInfo] = useState({ os: 'WINNT', arch: 'x64', platform: 'Win32' });

    useEffect(() => {
        // Fetch static OS info via browser
        if (navigator.userAgent) {
            let os = 'UNKNOWN';
            if (navigator.userAgent.indexOf("Win") !== -1) os = 'WINNT';
            if (navigator.userAgent.indexOf("Mac") !== -1) os = 'DARWIN';
            if (navigator.userAgent.indexOf("Linux") !== -1) os = 'LINUX';
            setSysInfo({ os, arch: 'x64', platform: navigator.platform });
        }

        const interval = setInterval(() => {
            // Update network graph
            setNetworkTraffic(prev => {
                const updated = [...prev, {
                    rx: Math.floor(Math.random() * 80) + 10,
                    tx: Math.floor(Math.random() * 60) + 5
                }];
                if (updated.length > 30) updated.shift();
                return updated;
            });

            // Randomly fluctuate load on active squads
            setSquadStatus(prev => prev.map(s => {
                if (s.status === 'STANDBY') return s;
                let newLoad = s.load + (Math.floor(Math.random() * 15) - 7);
                if (newLoad < 5) newLoad = 5;
                if (newLoad > 100) newLoad = 100;
                return { ...s, load: newLoad };
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 w-72 hidden 2xl:flex flex-col gap-4 z-10 pointer-events-none">

            {/* System Info Breakdown */}
            <div className="glass-panel p-3 border border-jarvis-primary/50 relative">
                <div className="absolute top-0 right-0 w-8 h-full bg-jarvis-primary/5 backdrop-blur-md"></div>
                <div className="flex justify-between items-center border-b border-jarvis-primary/20 pb-2 mb-2">
                    <h3 className="text-[11px] font-bold text-jarvis-primary tracking-[0.2em] uppercase">HOST ENV</h3>
                    <span className="text-[9px] text-jarvis-text/60 font-mono">{sysInfo.os} // {sysInfo.platform}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[9px] font-mono">
                    <span className="text-jarvis-primary/50">ARCH: </span><span className="text-right text-jarvis-text">{sysInfo.arch}</span>
                    <span className="text-jarvis-primary/50">RES: </span><span className="text-right text-jarvis-text">{window.screen.width}x{window.screen.height}</span>
                    <span className="text-jarvis-primary/50">LANG: </span><span className="text-right text-jarvis-text uppercase">{navigator.language}</span>
                    <span className="text-jarvis-primary/50">CORES: </span><span className="text-right text-jarvis-text">{navigator.hardwareConcurrency} THR</span>
                </div>
            </div>

            {/* Squad / Array Module */}
            <div className="glass-panel p-3 pb-4 border border-jarvis-primary/50 relative overflow-hidden group">
                <h3 className="text-[11px] font-bold text-jarvis-primary tracking-[0.2em] mb-4 uppercase border-b border-jarvis-primary/20 pb-2 shadow-glow-sm">
                    NEURAL ARRAY
                </h3>

                <div className="flex flex-col gap-3">
                    {squadStatus.map(squad => (
                        <div key={squad.id} className="font-mono">
                            <div className="flex justify-between items-end mb-1 text-[9px]">
                                <span className="text-jarvis-text font-bold">{squad.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-jarvis-primary/50">{squad.memory}</span>
                                    <span className={squad.status === 'ACTIVE' || squad.status === 'SYNCING' ? 'text-jarvis-primary shadow-glow-sm' : 'text-jarvis-primary/40'}>
                                        {squad.load}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full h-1 bg-jarvis-surface rounded-sm overflow-hidden flex">
                                <div
                                    className={`h-full transition-all duration-1000 ${squad.status === 'STANDBY' ? 'bg-jarvis-primary/20' : 'bg-jarvis-primary shadow-glow'}`}
                                    style={{ width: `${squad.load}%` }}
                                ></div>
                                <div className={`h-full transition-all duration-1000 bg-jarvis-secondary shadow-glow`} style={{ width: `${Math.random() * 10}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Network I/O Module (Dense Graph) */}
            <div className="glass-panel p-3 border border-jarvis-secondary/50 relative">
                <h3 className="text-[11px] font-bold text-jarvis-secondary tracking-[0.2em] mb-3 uppercase flex items-center gap-2 border-b border-jarvis-secondary/20 pb-2">
                    NETWORK I/O TRAFFIC
                </h3>

                {/* Advanced Histogram */}
                <div className="h-20 w-full flex items-end gap-[1px] opacity-80 border-b border-l border-jarvis-secondary/40 p-1">
                    {networkTraffic.map((t, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-[1px]">
                            {/* TX Bar */}
                            <div className="w-full bg-jarvis-secondary/90 transition-all duration-500" style={{ height: `${t.tx}%` }}></div>
                            {/* RX Bar */}
                            <div className="w-full bg-jarvis-primary/90 transition-all duration-500" style={{ height: `${t.rx}%` }}></div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between mt-2 text-[10px] font-mono text-jarvis-primary font-bold">
                    <span className="shadow-glow-sm">RX: {networkTraffic[networkTraffic.length - 1]?.rx.toFixed(1)} Mb/s</span>
                    <span className="text-jarvis-secondary shadow-glow-sm">TX: {networkTraffic[networkTraffic.length - 1]?.tx.toFixed(1)} Mb/s</span>
                </div>
            </div>

        </div>
    );
};

export default LeftPanel;
