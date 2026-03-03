import React, { useState, useEffect } from 'react';

interface EventLog {
    id: number;
    time: string;
    action: string;
    type: 'INFO' | 'WARN' | 'SEC' | 'DATA';
}

const RightPanel: React.FC = () => {
    const [events, setEvents] = useState<EventLog[]>([]);

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
            { a: 'New file detected in /workspace', t: 'INFO' },
        ];

        let idCounter = 0;

        const generateEvent = () => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            const randItem = pool[Math.floor(Math.random() * pool.length)];

            setEvents(prev => {
                const updated = [{ id: idCounter++, time: timeStr, action: randItem.a, type: randItem.t as 'INFO' | 'WARN' | 'SEC' | 'DATA' }, ...prev];
                return updated.slice(0, 8); // Keep last 8 events visible
            });

            // Re-trigger randomly between 2s and 6s
            setTimeout(generateEvent, Math.random() * 4000 + 2000);
        };

        setTimeout(generateEvent, 1000); // Start the loop
    }, []);

    return (
        <div className="fixed right-8 top-1/4 w-64 hidden 2xl:flex flex-col gap-6 z-10 pointer-events-none">

            {/* System Log Module */}
            <div className="glass-panel p-4 rounded-lg border border-jarvis-primary/30 relative">
                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-jarvis-primary/0 via-jarvis-primary to-jarvis-primary/0"></div>
                <h3 className="text-[10px] text-jarvis-primary/80 font-mono tracking-[0.2em] mb-3 uppercase flex items-center justify-end gap-2">
                    EVENT LOG
                    <span className="w-1.5 h-1.5 bg-jarvis-primary/50 animate-pulse rounded-full"></span>
                </h3>

                <div className="flex flex-col gap-2 font-mono text-[9px] h-[190px] overflow-hidden relative">
                    {/* Fade out top items */}
                    <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[rgba(10,15,28,0.8)] to-transparent z-10"></div>

                    {events.map((ev, i) => (
                        <div
                            key={ev.id}
                            className={`flex gap-2 p-1 border-l-2 opacity-90 transition-all duration-500 transform translate-x-0
                                ${ev.type === 'INFO' ? 'border-jarvis-primary/50 text-jarvis-text' :
                                    ev.type === 'WARN' ? 'border-[#ffea00] text-[#ffea00] shadow-glow-sm' :
                                        ev.type === 'SEC' ? 'border-jarvis-alert text-jarvis-alert shadow-glow-sm' :
                                            'border-jarvis-secondary text-jarvis-secondary'}
                            `}
                            style={{ opacity: 1 - (i * 0.12) }}
                        >
                            <span className="opacity-50 shrink-0">[{ev.time}]</span>
                            <span className="truncate">{ev.action}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Target Reticle / Scanner Aesthetic */}
            <div className="w-full aspect-square border border-jarvis-primary/20 rounded-full relative flex items-center justify-center rotate-45 opacity-60">
                <div className="absolute w-[110%] h-[1px] bg-jarvis-primary/20"></div>
                <div className="absolute h-[110%] w-[1px] bg-jarvis-primary/20"></div>

                <svg className="w-[80%] h-[80%] animate-spin-slower" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,243,255,0.4)" strokeWidth="0.5" strokeDasharray="10 5" />
                    <path d="M 50 0 L 55 10 L 45 10 Z" fill="rgba(0,243,255,0.8)" />
                    <path d="M 50 100 L 55 90 L 45 90 Z" fill="rgba(0,243,255,0.8)" />
                </svg>

                <div className="absolute text-[8px] font-mono text-jarvis-primary text-center leading-tight shadow-glow-sm -rotate-45">
                    GLOBAL<br />SCAN
                </div>
            </div>

        </div>
    );
};

export default RightPanel;
