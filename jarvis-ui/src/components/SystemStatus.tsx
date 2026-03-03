import React from 'react';

interface SystemStatusProps {
    isConnected?: boolean;
    voiceState?: 'IDLE' | 'PASSIVE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';
    whatsappConnected?: boolean;
    onResetWhatsapp?: () => void;
    isTalkMode?: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ isConnected = false, voiceState = 'IDLE', whatsappConnected = false, onResetWhatsapp, isTalkMode = false }) => {
    return (
        <div className="absolute top-8 right-8 flex flex-col items-end gap-2 font-mono text-xs z-20" role="status" aria-label="System Statistics">
            {/* CPU Status */}
            <div className="flex items-center gap-3">
                <span className="text-jarvis-primary/50 tracking-widest">CPU.CORE</span>
                <div className="w-24 h-1.5 bg-jarvis-surface border border-jarvis-primary/30 rounded-full overflow-hidden">
                    <div className="h-full bg-jarvis-primary shadow-glow animate-pulse" style={{ width: '38%' }}></div>
                </div>
                <span className="text-jarvis-primary font-bold">38%</span>
            </div>

            {/* Memory Status */}
            <div className="flex items-center gap-3">
                <span className="text-jarvis-primary/50 tracking-widest">MEM.ALLOC</span>
                <div className="w-24 h-1.5 bg-jarvis-surface border border-jarvis-primary/30 rounded-full overflow-hidden">
                    <div className="h-full bg-jarvis-secondary shadow-glow" style={{ width: '64%' }}></div>
                </div>
                <span className="text-jarvis-secondary font-bold">16TB</span>
            </div>

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
                <div className="flex gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-jarvis-success animate-pulse' : 'bg-jarvis-alert'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-jarvis-success/50' : 'bg-jarvis-alert/50'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-jarvis-success/30' : 'bg-jarvis-alert/30'}`}></div>
                </div>
                <span className={`text-[10px] font-bold ${isConnected ? 'text-jarvis-success' : 'text-jarvis-alert'}`}>
                    {isConnected ? 'ON' : 'OFFLINE'}
                </span>
            </div>

            {/* WhatsApp Status - NEW */}
            <div className="flex items-center gap-3 mt-1 pt-1 border-t border-jarvis-primary/10">
                <span className={`text-[10px] tracking-widest ${whatsappConnected ? 'text-jarvis-success/50' : 'text-jarvis-alert/50'}`}>WHATSAPP</span>
                <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-bold ${whatsappConnected ? 'text-jarvis-success' : 'text-jarvis-alert'}`}>
                        {whatsappConnected ? 'LINKED' : 'NOT LINKED'}
                    </span>
                    <button
                        onClick={() => onResetWhatsapp && onResetWhatsapp()}
                        className="text-[9px] text-jarvis-alert px-1 border border-jarvis-alert/30 rounded hover:bg-jarvis-alert/10 transition-colors"
                        title="Force Reset WhatsApp Session"
                    >
                        RESET
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemStatus;
