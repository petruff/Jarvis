import React, { useState, useEffect } from 'react';

interface EventLog {
    id: number;
    time: string;
    action: string;
    type: 'INFO' | 'WARN' | 'SEC' | 'DATA';
}

const RightPanel: React.FC = () => {
    const [events, setEvents] = useState<EventLog[]>([]);
    const [time, setTime] = useState<{ date: string; time: string; tz: string }>({ date: '', time: '', tz: '' });

    // Time updating
    useEffect(() => {
        const updateTime = () => {
            const d = new Date();
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toUpperCase();
            setTime({ date: dateStr, time: timeStr, tz });
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Simulate incoming system events
    useEffect(() => {
        const pool = [
            { a: 'Protocol handhshake established', t: 'INFO' },
            { a: 'DeepSeek routing bypassed -> API limit', t: 'WARN' },
            { a: 'Groq inference latency: 43ms', t: 'INFO' },
            { a: 'Unauthorized endpoint request dropped', t: 'SEC' },
            { a: 'Re-indexing knowledge embeddings...', t: 'DATA' },
            { a: 'Garbage collection cycle complete', t: 'INFO' },
            { a: 'Claude Sonnet requested strategic logic', t: 'DATA' },
            { a: 'Synchronizing timeline to Vault', t: 'INFO' },
            { a: 'Memory footprint optimized', t: 'INFO' },
            { a: 'Sub-routine 4.1.2 engaged', t: 'DATA' }
        ];

        let idCounter = 0;

        const generateEvent = () => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            const randItem = pool[Math.floor(Math.random() * pool.length)];

            setEvents(prev => {
                const updated = [{ id: idCounter++, time: timeStr, action: randItem.a, type: randItem.t as 'INFO' | 'WARN' | 'SEC' | 'DATA' }, ...prev];
                return updated.slice(0, 10); // Keep last 10 events visible
            });

            setTimeout(generateEvent, Math.random() * 3000 + 800);
        };

        setTimeout(generateEvent, 1000); // Start the loop
    }, []);

    return (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 w-80 hidden 2xl:flex flex-col gap-4 z-10 pointer-events-none">

            {/* Real-Time Telemetry / Chrono Module (Matches Top Right of Image) */}
            <div className="glass-panel p-4 border border-jarvis-primary/50 relative font-sans">
                <div className="absolute top-0 right-0 w-2 h-full bg-jarvis-primary/80 shadow-glow"></div>

                <h3 className="text-[10px] text-jarvis-primary/70 font-mono tracking-widest mb-1 uppercase">LOCAL TIME / {time.tz}</h3>
                <div className="text-4xl font-bold text-jarvis-text tracking-widest mb-1 font-mono shadow-glow-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {time.time}
                </div>
                <div className="text-[11px] text-jarvis-primary uppercase font-bold tracking-widest border-b border-jarvis-primary/30 pb-2 mb-2">
                    {time.date}
                </div>

                {/* Micro Weather / Sensor Simulation */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
                    <div className="flex justify-between">
                        <span className="text-jarvis-primary/60">Temp (Internal):</span>
                        <span className="text-white font-bold text-jarvis-alert animate-pulse">82°C</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-jarvis-primary/60">Cooling:</span>
                        <span className="text-jarvis-success font-bold">ACTIVE</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-jarvis-primary/60">Uptime:</span>
                        <span className="text-white font-bold">{Math.floor(performance.now() / 1000 / 60)}m {Math.floor((performance.now() / 1000) % 60)}s</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-jarvis-primary/60">Power:</span>
                        <span className="text-white font-bold text-jarvis-primary">98% AC</span>
                    </div>
                </div>
            </div>

            {/* System Log Module */}
            <div className="glass-panel p-3 border border-jarvis-primary/50 relative overflow-hidden">
                <h3 className="text-[11px] text-jarvis-primary font-bold tracking-[0.2em] mb-2 uppercase border-b border-jarvis-primary/20 pb-2 shadow-glow-sm">
                    SYS.LOG // EVENT TRACE
                </h3>

                <div className="flex flex-col gap-[6px] font-mono text-[9px] h-[180px] overflow-hidden relative">
                    {/* Shadow gradient for fade out */}
                    <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[rgba(10,15,28,0.95)] to-transparent z-10"></div>

                    {events.map((ev, i) => (
                        <div
                            key={ev.id}
                            className={`flex gap-3 px-2 py-1 border-l-[3px] opacity-90 transition-all duration-300 transform
                                ${ev.type === 'INFO' ? 'border-jarvis-primary text-[rgba(255,255,255,0.8)] bg-jarvis-primary/5' :
                                    ev.type === 'WARN' ? 'border-[#ffea00] text-[#ffea00] bg-[#ffea00]/10 shadow-glow-sm' :
                                        ev.type === 'SEC' ? 'border-jarvis-alert text-jarvis-alert bg-jarvis-alert/10 shadow-glow-sm' :
                                            'border-jarvis-secondary text-jarvis-secondary bg-jarvis-secondary/10'}
                            `}
                            style={{ opacity: 1 - (i * 0.1) }}
                        >
                            <span className="opacity-50 shrink-0 font-bold">[{ev.time}]</span>
                            <span className="truncate">{ev.action}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Disk IO / Storage Simulation matching Right Bottom cluster */}
            <div className="glass-panel p-3 border border-jarvis-primary/50 flex flex-col gap-2 relative">
                <div className="absolute top-0 right-0 w-2 h-full bg-jarvis-secondary/50 shadow-glow"></div>
                <h3 className="text-[11px] text-jarvis-secondary font-bold tracking-[0.2em] uppercase border-b border-jarvis-secondary/20 pb-1">
                    STORAGE I/O DRIVES
                </h3>
                <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-jarvis-text/80">C:// SYS.ROOT</span>
                    <span className="text-jarvis-primary font-bold">447.1 GB // 42%</span>
                </div>
                <div className="w-full h-[6px] bg-jarvis-surface rounded overflow-hidden">
                    <div className="h-full bg-jarvis-secondary shadow-glow" style={{ width: `42%` }}></div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono mt-2">
                    <span className="text-jarvis-text/80">D:// VAULT.DATA</span>
                    <span className="text-jarvis-primary font-bold">1024.0 GB // 88%</span>
                </div>
                <div className="w-full h-[6px] bg-jarvis-surface rounded overflow-hidden">
                    <div className="h-full bg-jarvis-alert shadow-glow-sm" style={{ width: `88%` }}></div>
                </div>
            </div>

        </div>
    );
};

export default RightPanel;
