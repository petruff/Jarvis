import React, { useState, useEffect } from 'react';

interface SystemStatusProps {
    isConnected?: boolean;
    voiceState?: 'IDLE' | 'PASSIVE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';
    whatsappConnected?: boolean;
    onResetWhatsapp?: () => void;
    isTalkMode?: boolean;
    onToggleQR?: () => void;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ isConnected = false, voiceState = 'IDLE', whatsappConnected = false, onResetWhatsapp, isTalkMode = false, onToggleQR }) => {
    const [cpuUsage, setCpuUsage] = useState(12);
    const [memUsage, setMemUsage] = useState(45);
    const [netPing, setNetPing] = useState(24);

    // Provide real-time fluctuating data to make the HUD look alive
    useEffect(() => {
        const interval = setInterval(() => {
            setCpuUsage(prev => {
                const fluctuation = Math.floor(Math.random() * 15) - 5;
                let next = prev + fluctuation;
                if (next < 2) next = 2;
                if (next > 98) next = 98;
                return next;
            });

            setMemUsage(prev => {
                const fluctuation = Math.floor(Math.random() * 5) - 2;
                let next = prev + fluctuation;
                if (next < 30) next = 30;
                if (next > 85) next = 85;
                return next;
            });

            setNetPing(() => {
                const next = Math.floor(Math.random() * 15) + 15; // 15ms - 30ms
                return next;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    // Also get real local hardware config if available
    const cores = navigator.hardwareConcurrency || 8;
    const memTotal = (navigator as any).deviceMemory || 16;

    return (
        <div className="absolute top-8 right-8 flex flex-col items-end gap-2 font-mono text-xs z-20" role="status" aria-label="System Statistics">
            {/* CPU Status */}
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-jarvis-primary/50 tracking-widest text-[9px]">CPU [{cores} CORES]</span>
                    <span className="text-jarvis-primary font-bold text-sm shadow-glow-sm">{cpuUsage}%</span>
                </div>
                <div className="w-24 h-1.5 bg-jarvis-surface border border-jarvis-primary/30 rounded-full overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full bg-jarvis-primary shadow-glow transition-all duration-700 ease-in-out"
                        style={{ width: `${cpuUsage}%` }}
                    ></div>
                </div>
            </div>

            {/* Memory Status */}
            <div className="flex items-center gap-3 mt-1">
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-jarvis-secondary/50 tracking-widest text-[9px]">MEM [{memTotal}GB]</span>
                    <span className="text-jarvis-secondary font-bold text-sm shadow-glow-sm">{memUsage}%</span>
                </div>
                <div className="w-24 h-1.5 bg-jarvis-surface border border-jarvis-secondary/30 rounded-full overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full bg-jarvis-secondary shadow-glow transition-all duration-1000 ease-in-out"
                        style={{ width: `${memUsage}%` }}
                    ></div>
                </div>
            </div>

            {/* Network Latency */}
            <div className="flex items-center gap-3 mt-1">
                <span className="text-jarvis-primary/50 tracking-widest text-[10px]">NET.PING</span>
                <span className="text-jarvis-success font-bold w-8 text-right shadow-glow-sm">{netPing}ms</span>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent to-jarvis-primary/30 my-2"></div>

            {/* Voice Status */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] tracking-widest ${voiceState === 'IDLE' ? 'text-jarvis-primary/30' : 'text-jarvis-primary/80'}`}>VOICE.MOD</span>
                <span className={`text-[10px] font-bold ${voiceState === 'LISTENING' ? 'text-jarvis-alert animate-pulse' : 'text-jarvis-primary'}`}>
                    {voiceState}
                </span>
            </div>

            {/* Talk Mode Status */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] tracking-widest ${isTalkMode ? 'text-jarvis-primary/80' : 'text-jarvis-primary/30'}`}>TALK.MODE</span>
                <span className={`text-[10px] font-bold ${isTalkMode ? 'text-jarvis-primary shadow-glow' : 'text-jarvis-primary/40'}`}>
                    {isTalkMode ? 'ACTIVE' : 'OFF'}
                </span>
            </div>

            {/* Secure Net Status */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] tracking-widest ${isConnected ? 'text-jarvis-primary/50' : 'text-jarvis-alert/50'}`}>SECURE.NET</span>
                <div className="flex gap-1 justify-end w-4">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-jarvis-success shadow-[0_0_5px_rgba(0,255,100,0.8)]' : 'bg-jarvis-alert'}`}></div>
                </div>
                <span className={`text-[10px] font-bold ${isConnected ? 'text-jarvis-success shadow-glow-sm' : 'text-jarvis-alert'}`}>
                    {isConnected ? 'ON' : 'OFFLINE'}
                </span>
            </div>

            {/* WhatsApp Status */}
            <div className="flex items-center gap-3">
                <span className={`text-[10px] tracking-widest ${whatsappConnected ? 'text-jarvis-success/50' : 'text-jarvis-alert/50'}`}>WHATSAPP</span>
                <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-bold ${whatsappConnected ? 'text-jarvis-success shadow-glow-sm' : 'text-jarvis-alert'}`}>
                        {whatsappConnected ? 'LINKED' : 'UNLINKED'}
                    </span>
                    {whatsappConnected && onResetWhatsapp && (
                        <button
                            onClick={onResetWhatsapp}
                            className="text-[9px] text-jarvis-alert/80 px-1 border border-jarvis-alert/30 rounded hover:bg-jarvis-alert/20 transition-colors"
                            title="Force Reset WhatsApp Session"
                        >
                            RST
                        </button>
                    )}
                    {!whatsappConnected && onToggleQR && (
                        <button
                            onClick={onToggleQR}
                            className="text-[9px] text-cyan-400 px-1 border border-cyan-400/30 rounded hover:bg-cyan-400/20 transition-colors"
                            title="Show QR Code"
                        >
                            [QR]
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemStatus;
