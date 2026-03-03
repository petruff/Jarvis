import React, { useState, useEffect } from 'react';

const generateDataChunk = (length: number) => {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const DataStreams: React.FC = () => {
    const [leftStream, setLeftStream] = useState<string[]>([]);
    const [rightStream, setRightStream] = useState<string[]>([]);

    useEffect(() => {
        // Init buffers
        setLeftStream(Array.from({ length: 30 }, () => `0x${generateDataChunk(8)}`));
        setRightStream(Array.from({ length: 30 }, () => `SYS.MEM.${generateDataChunk(4)}`));

        // Real-time flowing data effect
        const interval = setInterval(() => {
            setLeftStream(prev => {
                const next = [...prev];
                next.pop(); // Remove oldest at bottom
                next.unshift(`0x${generateDataChunk(8)}`); // Add new at top
                return next;
            });
            setRightStream(prev => {
                const next = [...prev];
                const prefix = Math.random() > 0.7 ? 'NET.TCP.' : 'SYS.MEM.';
                next.pop();
                next.unshift(`${prefix}${generateDataChunk(4)}`);
                return next;
            });
        }, 300); // Super fast telemetry flow

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* Left Data Stream - Matrix Style Downward Flow */}
            <div className="fixed left-6 top-0 bottom-0 w-24 hidden xl:flex flex-col justify-center items-start gap-1 pointer-events-none opacity-40 z-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                {leftStream.map((line, i) => (
                    <div
                        key={`l-${i}`}
                        className="text-[10px] font-mono whitespace-nowrap"
                        style={{
                            color: i === 0 ? '#fff' : (i < 3 ? 'rgba(0,243,255,1)' : 'rgba(0,243,255,0.4)'),
                            textShadow: i < 5 ? '0 0 8px rgba(0,243,255,0.8)' : 'none',
                        }}
                    >
                        {line}
                    </div>
                ))}
            </div>

            {/* Right Data Stream */}
            <div className="fixed right-6 top-0 bottom-0 w-24 hidden xl:flex flex-col justify-center items-end gap-1 pointer-events-none opacity-40 z-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                {rightStream.map((line, i) => (
                    <div
                        key={`r-${i}`}
                        className="text-[10px] font-mono whitespace-nowrap text-right"
                        style={{
                            color: i === 0 ? '#fff' : (i < 3 ? 'rgba(0,150,255,1)' : 'rgba(0,150,255,0.4)'),
                            textShadow: i < 5 ? '0 0 8px rgba(0,150,255,0.8)' : 'none',
                        }}
                    >
                        {line} {i === 2 && ' [OK]'}
                    </div>
                ))}
            </div>

            {/* Edge glow indicators */}
            <div className="fixed left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-jarvis-primary/50 to-transparent pointer-events-none z-0 shadow-[0_0_10px_rgba(0,243,255,1)]"></div>
            <div className="fixed right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-jarvis-secondary/50 to-transparent pointer-events-none z-0 shadow-[0_0_10px_rgba(0,150,255,1)]"></div>
        </>
    );
};

export default DataStreams;
