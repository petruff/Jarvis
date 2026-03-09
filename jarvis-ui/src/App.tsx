import { useState, useEffect, useRef, lazy, Suspense } from 'react';
const AgiCoreLazy = lazy(() => import('./components/AgiCore'));
import SystemTelemetry from './components/SystemTelemetry';
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
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import GeoSentinel from './components/GeoSentinel';
import KnowledgeGraphUI from './components/KnowledgeGraphUI';

function App() {
    const { voiceState, transcript, speak, lastResponse, logs, sendCommand, startJarvis, stopJarvis, socket, isConnected, isTalkMode, recognitionLanguage, toggleLanguage } = useJarvisVoice();
    const { user } = useUserRecognition();
    const [selectedAgent, setSelectedAgent] = useState('jarvis');
    const [showDashboard, setShowDashboard] = useState(false);
    const [showStrategy, setShowStrategy] = useState(false);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [showQRModal, setShowQRModal] = useState(true);
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

    // WhatsApp ready event â€” update LINKED status in UI
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
        <div className="h-screen w-screen bg-jarvis-bg text-jarvis-text selection:bg-jarvis-primary selection:text-jarvis-surface flex flex-col relative overflow-hidden font-sans">

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

            {/* Scanline Overlay Removed */}

            {/* WhatsApp QR Panel (non-blocking, bottom-right) */}
            {!whatsappConnected && showQRModal && (
                <WhatsAppQR
                    onConnected={() => setWhatsappConnected(true)}
                    onClose={() => setShowQRModal(false)}
                />
            )}

            {/* No overlay needed â€” system auto-starts on mount */}



            {/* Cinematic Scanner Overlay */}
            <div className="scanner-line"></div>

            {/* Background Radial & Grid Mesh */}
            <div className="fixed inset-0 bg-[#070b14] z-[-2]"></div>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)] pointer-events-none z-[-1] mix-blend-screen overflow-hidden"></div>
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,11,20,0.8)_80%,rgba(7,11,20,1)_100%)] z-[-1]"></div>

            {/* Decorative Data Streams */}
            <DataStreams />
            <LeftPanel />
            <RightPanel />

            {/* System Status Organism */}
            <SystemStatus
                isConnected={isConnected}
                voiceState={voiceState}
                whatsappConnected={whatsappConnected}
                onResetWhatsapp={handleResetWhatsApp}
                isTalkMode={isTalkMode}
                onToggleQR={() => setShowQRModal(!showQRModal)}
                socket={socket}
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

            {/* Hyper-Presence Overlay (Telemetry) */}
            <div className="fixed top-6 right-6 z-50 pointer-events-none text-white">
                <SystemTelemetry socket={socket as any} />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto relative z-10 px-4 pt-2 pb-4 h-full overflow-hidden">

                {/* Top Section: Flexible Arc Container */}
                <div className="flex-1 flex flex-col items-center justify-center relative w-full min-h-0 pointer-events-none overflow-visible mb-2 mt-2">
                    <ConnectorLines />

                    {/* Central Visualizer - Scalable */}
                    <div className={`transition-transform duration-500 z-0 opacity-90 w-full h-full max-h-[350px] flex items-center justify-center ${voiceState === 'LISTENING' ? 'scale-110' : 'scale-100'}`}>
                        {socket ? (
                            <Suspense fallback={<div className="text-jarvis-primary/20 font-mono text-[8px] animate-pulse">LOADING NEURAL CORE...</div>}>
                                <AgiCoreLazy socket={socket as any} active={true} />
                            </Suspense>
                        ) : (
                            <div className="text-jarvis-primary/20 font-mono text-[8px] animate-pulse">ESTABLISHING NEURAL LINK...</div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Control Deck & Info Bar */}
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 z-20 pointer-events-auto shrink-0 justify-end">

                    {/* Info Bar / Stats */}
                    <div className="w-full flex items-center justify-center gap-4 text-[10px] font-mono text-jarvis-primary/60 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-jarvis-primary shadow-glow animate-pulse"></div>
                        <span className="hidden sm:inline">SYSTEM NOMINAL â€” NEURAL CLUSTER ONLINE</span>
                        <span className="sm:hidden">SYSTEM ONLINE</span>
                        <div className="flex-1 h-px bg-jarvis-primary/20"></div>

                        <button
                            onClick={() => setShowDashboard(!showDashboard)}
                            className="hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(0,243,255,0.8)] transition-all duration-300 cursor-pointer mr-2 border border-jarvis-primary/30 px-3 py-1 bg-jarvis-primary/10 rounded backdrop-blur-sm animate-pulse"
                        >
                            [{showDashboard ? 'CLOSE SQUAD' : 'âš¡ SQUAD'}]
                        </button>
                        <button
                            onClick={() => setShowStrategy(!showStrategy)}
                            className="hover:text-gold-400 hover:shadow-[0_0_15px_rgba(255,215,0,0.8)] text-yellow-500 transition-all duration-300 cursor-pointer border border-yellow-500/30 px-3 py-1 bg-yellow-500/10 rounded backdrop-blur-sm animate-pulse"
                        >
                            [{showStrategy ? 'CLOSE PLAN' : 'ðŸš€ V5 PLAN'}]
                        </button>
                        {!whatsappConnected && !showQRModal && (
                            <button
                                onClick={() => setShowQRModal(true)}
                                className="hover:text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.8)] text-emerald-500 transition-all duration-300 cursor-pointer border border-emerald-500/30 px-3 py-1 bg-emerald-500/10 rounded backdrop-blur-sm animate-pulse"
                            >
                                [WHATSAPP QR]
                            </button>
                        )}

                        <div className="hidden sm:block flex-1 h-px bg-jarvis-primary/20"></div>
                        <span className="hidden sm:inline">PROTOCOL â€” ACTIVE</span>
                        <div className="hidden sm:block w-2 h-2 rounded-full bg-jarvis-primary/50"></div>
                    </div>

                    {/* Output Stream Box */}
                    <div className="w-full" style={{ maxHeight: '35vh' }}>
                        <OutputStream transcript={transcript} isScanning={!user} user={user} lastResponse={lastResponse} logs={logs} />
                    </div>

                    {/* Agent Selector Buttons */}
                    <div className="w-full flex items-center gap-2 mt-1">
                        <AgentSelector selectedAgent={selectedAgent} onSelect={handleAgentSelect} />
                        <button
                            onClick={toggleLanguage}
                            className="bg-jarvis-primary/10 border border-jarvis-primary/30 text-jarvis-primary hover:bg-jarvis-primary/20 px-3 py-2 rounded text-xs font-mono uppercase tracking-widest transition-all whitespace-nowrap"
                            title="Toggle Voice Language"
                        >
                            {recognitionLanguage === 'pt-BR' ? 'ðŸ‡§ðŸ‡· PT' : 'ðŸ‡ºðŸ‡¸ EN'}
                        </button>
                        <button
                            onClick={() => speak("Voice systems calibrated. Ready for instruction.")}
                            className="bg-jarvis-primary/10 border border-jarvis-primary/30 text-jarvis-primary hover:bg-jarvis-primary/20 px-3 py-2 rounded text-xs font-mono uppercase tracking-widest transition-all whitespace-nowrap"
                            title="Test Voice Output"
                        >
                            ðŸ”Š TEST
                        </button>
                    </div>

                    {/* Input Module */}
                    <CommandInput
                        onSend={(text) => sendCommand(text, selectedAgent)}
                        isListening={voiceState === 'LISTENING' || voiceState === 'PASSIVE'}
                        onMicClick={() => voiceState === 'PASSIVE' || voiceState === 'LISTENING' ? stopJarvis() : startJarvis()}
                    />
                </div>

            </main>

            {/* GeoSentinel Surveillance (THOMAS Evolution) */}
            <GeoSentinel socket={socket} />

            {/* Knowledge Graph / Quimera UI */}
            <KnowledgeGraphUI socket={socket} />

            {/* Footer / Decorative Lines */}
            <div className="fixed bottom-10 left-0 w-full h-px bg-gradient-to-r from-transparent via-jarvis-primary/20 to-transparent pointer-events-none"></div>
        </div>
    );
}

export default App;
