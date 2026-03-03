import React from 'react';

const DataStreams: React.FC = () => {
    return (
        <>
            {/* Left Data Stream */}
            <div className="fixed left-6 top-1/4 bottom-1/4 w-16 hidden xl:flex flex-col justify-center items-start gap-1 pointer-events-none opacity-30 mix-blend-screen z-0">
                {Array.from({ length: 25 }).map((_, i) => (
                    <div key={`l-${i}`} className="text-[9px] text-jarvis-primary/50 font-mono whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}>
                        {i % 3 === 0 ? `SYS.DAT.${Math.floor(Math.random() * 999)}` : Math.random().toString(16).substring(2, 10).toUpperCase()}
                    </div>
                ))}
                <div className="w-px h-64 bg-gradient-to-b from-transparent via-jarvis-primary/30 to-transparent absolute left-0 top-1/2 -translate-y-1/2"></div>
            </div>

            {/* Right Data Stream */}
            <div className="fixed right-6 top-1/4 bottom-1/4 w-16 hidden xl:flex flex-col justify-center items-end gap-1 pointer-events-none opacity-30 mix-blend-screen z-0">
                {Array.from({ length: 25 }).map((_, i) => (
                    <div key={`r-${i}`} className="text-[9px] text-jarvis-secondary/50 font-mono whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.08}s` }}>
                        {i % 2 === 0 ? `0x${Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0')} :: [OK]` : `NET.LOC.${Math.floor(Math.random() * 99)}`}
                    </div>
                ))}
                <div className="w-px h-64 bg-gradient-to-b from-transparent via-jarvis-secondary/30 to-transparent absolute right-0 top-1/2 -translate-y-1/2"></div>
            </div>
        </>
    );
};

export default DataStreams;
