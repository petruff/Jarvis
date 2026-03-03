import { useState, useEffect, useRef } from 'react';
import JarvisCore from './components/JarvisCore';
import CommandInput from './components/CommandInput';
import AgentSelector from './components/AgentSelector';
import OutputStream from './components/OutputStream';
import DataStreams from './components/DataStreams';
import SystemStatus from './components/SystemStatus';
import ConnectorLines from './components/ConnectorLines';
import { useJarvisVoice } from './hooks/useJarvisVoice';
import { useUserRecognition } from './hooks/useUserRecognition';

import SquadDashboard from './components/SquadDashboard';
import StrategyDashboard from './components/StrategyDashboard';
import WhatsAppQR from './components/WhatsAppQR';
import CanvasWorkspace from './components/CanvasWorkspace';

function App() {
    const { voiceState, transcript, speak, lastResponse, logs, sendCommand, startJarvis, stopJarvis, socket, isConnected, isTalkMode } = useJarvisVoice();
    const { user } = useUserRecognition();
    const [selectedAgent, setSelectedAgent] = useState('jarvis');
    const [showDashboard, setShowDashboard] = useState(false);
    const [showStrategy, setShowStrategy] = useState(false);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const hasWelcomed = useRef(false);

    // Auto-start passive listening on mount
    useEffect(() => {
        startJarvis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (user && user.isAuthenticated && !hasWelcomed.current) {
            speak(`Welcome back, ${user.title}.`);
            hasWelcomed.current = true;
        }
    }, [user, speak]);

    // WhatsApp ready event — update LINKED status in UI
    useEffect(() => {
        if (!socket) return;
        const handler = () => setWhatsappConnected(true);
        socket.on('whatsapp/ready', handler);
        return () => { socket.off('whatsapp/ready', handler); };
    }, [socket]);

    // Keyboard Shortcut for Dashboard: Ctrl+Shift+D or Command "Squad"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                setShowDashboard(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Command listener for "Open Squad"
    useEffect(() => {
        if (transcript.toLowerCase().includes('open squad') || transcript.toLowerCase().includes('command center')) {
            setShowDashboard(true);
        }
    }, [transcript]);

    const handleAgentSelect = (id: string) => {
        setSelectedAgent(id);
    };

    const handleResetWhatsApp = async () => {
        try {
            await fetch(`http://${window.location.hostname}:3000/logout`);
            setWhatsappConnected(false);
        } catch (e) {
            console.error('WhatsApp Reset Failed', e);
        }
    };

    return (
        <div className="min-h-screen bg-jarvis-bg text-jarvis-text selection:bg-jarvis-primary selection:text-jarvis-surface flex flex-col relative overflow-y-auto font-sans scrollbar-hide">

            {/* SQUAD DASHBOARD OVERLAY */}
            {showDashboard && socket && (
                <SquadDashboard socket={socket} onClose={() => setShowDashboard(false)} />
            )}

            {/* STRATEGY DASHBOARD (V5 PLAN) */}
            {showStrategy && (
                <StrategyDashboard onClose={() => setShowStrategy(false)} />
            )}

            {/* A2UI CANVAS WORKSPACE */}
            <CanvasWorkspace socket={socket} />

            {/* Scanline Overlay */}
            <div className="scanline"></div>

            {/* WhatsApp QR Panel (non-blocking, bottom-right) */}
            {!whatsappConnected && (
                <WhatsAppQR onConnected={() => setWhatsappConnected(true)} />
            )}

            {/* No overlay needed — system auto-starts on mount */}



            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-jarvis-surface/50 to-jarvis-dark z-0"></div>

            {/* Decorative Data Streams */}
            <DataStreams />

            {/* System Status Organism */}
            <SystemStatus
                isConnected={isConnected}
                voiceState={voiceState}
                whatsappConnected={whatsappConnected}
                onResetWhatsapp={handleResetWhatsApp}
                isTalkMode={isTalkMode}
            />

            {/* Header */}
            <header className="pt-6 pb-2 text-center z-10 relative">
                <h1 className="text-5xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-jarvis-primary to-jarvis-secondary drop-shadow-[0_0_15px_rgba(0,243,255,0.5)] font-mono">
                    J.A.R.V.I.S.
                </h1>
                <p className="text-jarvis-primary/40 text-[0.6rem] tracking-[0.8em] mt-2 uppercase font-bold">
                    Just A Rather Very Intelligent System
                </p>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-7xl mx-auto px-4 gap-2 pb-4">

                <ConnectorLines />

                {/* Central Visualizer */}
                <div className={`my-2 transform transition-all duration-500 relative z-20 ${voiceState === 'LISTENING' ? 'scale-110' : ''}`}>
                    <JarvisCore isSpeaking={voiceState === 'SPEAKING'} isListening={voiceState === 'LISTENING'} />
                </div>

                {/* Info Bar / Stats */}
                <div className="w-full max-w-3xl flex items-center gap-4 text-[10px] font-mono text-jarvis-primary/60 uppercase tracking-wider mb-4 relative z-10" aria-hidden="true">
                    <div className="w-2 h-2 rounded-full bg-jarvis-primary shadow-glow animate-pulse"></div>
                    <span>Logs analisados para esta conversa — 243 arquivos</span>
                    <div className="flex-1 h-px bg-jarvis-primary/20"></div>

                    <button
                        onClick={() => setShowDashboard(!showDashboard)}
                        className="hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(0,243,255,0.8)] transition-all duration-300 cursor-pointer mr-4 border border-jarvis-primary/30 px-3 py-1 bg-jarvis-primary/10 rounded backdrop-blur-sm animate-pulse"
                    >
                        [{showDashboard ? 'CLOSE SQUAD' : '⚡ SQUAD'}]
                    </button>
                    <button
                        onClick={() => setShowStrategy(!showStrategy)}
                        className="hover:text-gold-400 hover:shadow-[0_0_15px_rgba(255,215,0,0.8)] text-yellow-500 transition-all duration-300 cursor-pointer mr-4 border border-yellow-500/30 px-3 py-1 bg-yellow-500/10 rounded backdrop-blur-sm animate-pulse"
                    >
                        [{showStrategy ? 'CLOSE PLAN' : '🚀 V5 PLAN'}]
                    </button>

                    <span>Padrão - Ric</span>
                    <div className="w-2 h-2 rounded-full bg-jarvis-primary/50"></div>
                </div>

                {/* Control Deck */}
                <div className="w-full max-w-3xl relative z-20 flex flex-col gap-4">
                    {/* Output Stream Box */}
                    <div className="w-full">
                        <OutputStream transcript={transcript} isScanning={!user} user={user} lastResponse={lastResponse} logs={logs} />
                    </div>

                    {/* Agent Selector Buttons */}
                    <div className="w-full flex items-center gap-2">
                        <AgentSelector selectedAgent={selectedAgent} onSelect={handleAgentSelect} />
                        <button
                            onClick={() => speak("Voice systems calibrated. Ready for instruction.")}
                            className="bg-jarvis-primary/10 border border-jarvis-primary/30 text-jarvis-primary hover:bg-jarvis-primary/20 px-3 py-2 rounded text-xs font-mono uppercase tracking-widest transition-all"
                            title="Test Voice Output"
                        >
                            🔊 TEST
                        </button>
                    </div>

                    <CommandInput
                        onSend={(text) => sendCommand(text, selectedAgent)}
                        isListening={voiceState === 'LISTENING' || voiceState === 'PASSIVE'}
                        onMicClick={() => voiceState === 'PASSIVE' || voiceState === 'LISTENING' ? stopJarvis() : startJarvis()}
                    />
                </div>

            </main>

            {/* Footer / Decorative Lines */}
            <div className="fixed bottom-10 left-0 w-full h-px bg-gradient-to-r from-transparent via-jarvis-primary/20 to-transparent pointer-events-none"></div>
        </div>
    );
}

export default App;
