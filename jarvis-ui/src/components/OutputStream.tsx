import React from 'react';

interface OutputStreamProps {
    transcript: string;
    isScanning: boolean;
    user: any;
    lastResponse?: string;
    logs?: any[];
}

const OutputStream: React.FC<OutputStreamProps> = ({ transcript, isScanning, user, lastResponse, logs = [] }) => {
    return (
        <div className="w-full max-w-3xl mx-auto my-2 relative group" aria-live="polite">
            {/* Header Label - Atom */}
            <div className="absolute -top-3 left-0 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-jarvis-primary animate-pulse shadow-glow"></div>
                <span className="text-jarvis-primary text-xs font-mono tracking-widest font-bold uppercase">OUTPUT STREAM</span>
            </div>

            <div className="w-full glass-panel border-2 border-jarvis-secondary/30 p-4 min-h-[100px] relative overflow-hidden bg-jarvis-surface/90 rounded-none rounded-br-2xl rounded-tl-2xl">

                {/* Corner Decorators - Visual Atoms */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-jarvis-primary"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-jarvis-primary"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-jarvis-primary"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-jarvis-primary"></div>

                {/* Content - Molecule */}
                <div className="font-mono text-lg leading-relaxed mb-2 h-48 md:h-64 overflow-y-auto scrollbar-hide pr-2">
                    <span className="text-jarvis-primary font-bold shadow-glow-sm">JARVIS: </span>
                    <span className="text-white drop-shadow-md">
                        {isScanning ? "Iniciando protocolos de segurança..." :
                            lastResponse ? lastResponse :
                                user ? `Online. Aguardando comando, ${user.title}.` :
                                    "Aguardando comando..."}
                    </span>

                    {transcript && (
                        <div className="mt-4 border-t border-jarvis-primary/10 pt-2">
                            <span className="text-jarvis-alert font-bold shadow-glow-sm uppercase">PETRUFF: </span>
                            <span className="text-jarvis-primary/70">{transcript}</span>
                        </div>
                    )}
                    <span className="inline-block w-2 h-5 bg-jarvis-primary ml-1 animate-pulse align-middle"></span>
                </div>

                {/* Incoming Data Logs (WhatsApp, Telegram, System) */}
                {logs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-jarvis-primary/20 max-h-40 overflow-y-auto font-mono text-xs scrollbar-hide">
                        <div className="text-jarvis-secondary/70 mb-2 uppercase tracking-wider text-[10px]">{`>>`} Incoming Data Stream</div>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-jarvis-text/80">
                                <span className="text-jarvis-primary">[{log.source || 'SYSTEM'}]</span>
                                <span className="mx-2 text-jarvis-secondary">
                                    {log.user ? `@${log.user}` : '{`>>`}'}
                                </span>
                                <span>{log.content || JSON.stringify(log)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutputStream;
