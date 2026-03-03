import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type VoiceState = 'IDLE' | 'PASSIVE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface UseJarvisVoiceReturn {
    voiceState: VoiceState;
    transcript: string;
    lastResponse: string;
    logs: any[];
    isConnected: boolean;
    startJarvis: () => void;
    stopJarvis: () => void;
    speak: (text: string) => void;
    sendCommand: (text: string, agentId?: string) => void;
    socket: Socket | null;
    isTalkMode: boolean;
}

export const useJarvisVoice = (): UseJarvisVoiceReturn => {
    const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const [logs, setLogs] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [recognitionLanguage, setRecognitionLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');
    const [isTalkMode, setIsTalkMode] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);
    const talkModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const voiceStateRef = useRef<VoiceState>('IDLE');
    const streamBufferRef = useRef('');

    // AudioContext — created once, resumed on user gesture
    const audioCtxRef = useRef<AudioContext | null>(null);

    function getAudioContext(): AudioContext {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    }

    // Unlock AudioContext on first user interaction
    useEffect(() => {
        const unlock = () => {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => console.log('[AudioCtx] Unlocked for Audio playback'));
            }

            // Now attempt auto-activation after a gesture
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'microphone' as any }).then((result) => {
                    if (result.state === 'granted') {
                        console.log('[Auto-Mic] Microphone permission already granted and gesture detected. Starting ambient listening.');
                        startListening();
                    }
                });
            } else {
                startListening();
            }

            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('keydown', unlock);
        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
        };
    }, []);

    const addLog = useCallback((source: string, content: string) => {
        setLogs(prev => [{ source, content, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
    }, []);

    // Keep voiceStateRef in sync
    useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

    // --- AUDIO QUEUE SYSTEM ---
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);

    const processAudioQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

        isPlayingRef.current = true;
        setVoiceState('SPEAKING');

        const base64Audio = audioQueueRef.current.shift()!;
        console.log('[Audio] Processing queue, remaining:', audioQueueRef.current.length);

        try {
            const audio = new Audio("data:audio/mpeg;base64," + base64Audio);
            audio.onended = () => {
                console.log('[Audio] Chunk ended');
                isPlayingRef.current = false;
                if (audioQueueRef.current.length === 0) {
                    if (isTalkMode) {
                        console.log('[Audio] Talk Mode: Resuming listening...');
                        setVoiceState('LISTENING');
                        addLog('SYSTEM', '🔄 Talk Mode: Auto-resumed listening');
                    } else {
                        setVoiceState('PASSIVE');
                    }
                } else {
                    processAudioQueue();
                }
            };
            audio.onerror = (e) => {
                console.error('[Audio] Playback failed on element:', e);
                isPlayingRef.current = false;
                processAudioQueue();
            };
            audio.play().catch(err => {
                console.error('[Audio] Playback promise failed:', err);
                addLog('SYSTEM', '🔇 Audio Blocked by Browser. Please click inside the page to allow autoplay.');
                isPlayingRef.current = false;
                processAudioQueue();
            });
        } catch (err) {
            console.error('[Audio] Execution failed:', err);
            isPlayingRef.current = false;
            processAudioQueue();
        }
    }, [addLog, isTalkMode]);

    const playAudio = useCallback((base64Audio: string) => {
        console.log('[Audio] Enqueueing audio chunk, length:', base64Audio.length);
        audioQueueRef.current.push(base64Audio);
        processAudioQueue();
    }, [processAudioQueue]);

    // --- TTS / SPEAK ---
    const speak = useCallback((text: string) => {
        if (!text?.trim()) return;

        // NUKE: Force cancel any browser native TTS (Robotic Voice)
        if ('speechSynthesis' in window) {
            console.log('[Speak] Cancelling native speech synthesis');
            window.speechSynthesis.cancel();
        }

        setVoiceState('SPEAKING');

        if (socketRef.current?.connected) {
            console.log('[Speak] Emitting jarvis/speak, socket:', socketRef.current.id);
            socketRef.current.emit('jarvis/speak', {
                text: text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '')
            });
        } else {
            console.warn('[Speak] Socket not connected, attempting manual reconnect.');
            socketRef.current?.connect();
            setTimeout(() => {
                if (socketRef.current?.connected) {
                    socketRef.current.emit('jarvis/speak', {
                        text: text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '')
                    });
                } else {
                    addLog('SYSTEM', '❌ Voice Server Disconnected');
                    setVoiceState('PASSIVE');
                }
            }, 1000);
        }
    }, [addLog]);

    // --- SOCKET (stable - only created once on mount) ---
    useEffect(() => {
        console.log(`[Socket] Connecting to http://${window.location.hostname}:3000...`);
        const socket = io(`http://${window.location.hostname}:3000`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] ✅ Connected:', socket.id);
            setIsConnected(true);
            addLog('SYSTEM', '✅ Connected to Orchestrator');
        });

        socket.on('disconnect', (reason) => {
            console.warn('[Socket] ❌ Disconnected:', reason);
            setIsConnected(false);
            addLog('SYSTEM', `❌ Disconnected: ${reason}`);
        });

        socket.on('connect_error', (err) => {
            setIsConnected(false);
            console.error('[Socket] Error:', err.message);
        });

        socket.on('jarvis/response', (data: { text: string, silent?: boolean }) => {
            console.log('[Socket] jarvis/response:', data.text?.slice(0, 80));
            // Ignore [STREAMING] placeholder 
            if (data.text === '[STREAMING]') return;
            setLastResponse(data.text);
            addLog('JARVIS', data.text);

            // Speak only if NOT silent (streaming handles speech)
            if (!data.silent && data.text && !data.text.startsWith('Displaying') && !data.text.startsWith('Opening')) {
                speakRef.current(data.text);
            } else {
                setVoiceState('PASSIVE');
            }
        });

        // Streaming: accumulate tokens
        socket.on('jarvis/stream', (data: { chunk: string }) => {
            setLastResponse(prev => prev + data.chunk); // Accumulate for UI
            setVoiceState('PROCESSING');
        });

        socket.on('jarvis/stream_end', (data: { full: string }) => {
            console.log('[Socket] Stream ended');
            setLastResponse(data.full); // Ensure consistency
            addLog('JARVIS', data.full);
            setVoiceState('PASSIVE');
        });

        socket.on('jarvis/audio', (data: { audio: string, agent?: string }) => {
            console.log('[Socket] jarvis/audio received, bytes:', data.audio?.length);
            addLog('SYSTEM', `🎵 Received Audio: ${data.audio?.length} bytes from ${data.agent || 'jarvis'}`);
            playAudioRef.current(data.audio);
        });

        socket.on('jarvis/output', (data: any) => {
            setLogs(prev => [data, ...prev].slice(0, 50));
        });
        socket.on('jarvis/control', (data: { type: string;[key: string]: any }) => {
            if (data.type === 'stop') {
                console.log('[Control] STOP received — halting audio & resetting state');
                // Stop any playing audio
                if (audioCtxRef.current) {
                    audioCtxRef.current.suspend();
                    audioCtxRef.current.resume(); // resume immediately so future audio works
                }
                setVoiceState('PASSIVE');
                addLog('SYSTEM', '⛔ Operations halted');
            } else if (data.type === 'voice_error') {
                console.warn('[Control] Voice Error received:', data.message);
                addLog('SYSTEM', `❌ Voice Error: ${data.message}`);
                setVoiceState('PASSIVE');
                isPlayingRef.current = false;
                audioQueueRef.current = [];
            }
        });

        socket.on('jarvis/set_language', (data: { lang: 'en' | 'pt' | 'es' }) => {
            const locale = data.lang === 'pt' ? 'pt-BR' : 'en-US';
            console.log('[Language] Backend requested switch to:', locale);
            setRecognitionLanguage(locale);
            addLog('SYSTEM', `🌍 Language switched to ${locale}`);

            // Restart recognition if running
            if (isTranscribingRef.current && recognitionRef.current) {
                console.log('[Language] Restarting recognition for locale change...');
                recognitionRef.current.stop();
                // onend handler will restart it with the new locale
            }
        });

        return () => {
            console.log('[Socket] Disconnecting');
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — socket must be stable

    // Stable refs for callbacks used inside socket listeners
    const speakRef = useRef(speak);
    const playAudioRef = useRef(playAudio);
    useEffect(() => { speakRef.current = speak; }, [speak]);
    useEffect(() => { playAudioRef.current = playAudio; }, [playAudio]);

    // --- SPEECH RECOGNITION ---
    const isTranscribingRef = useRef(false);

    const startListening = useCallback(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[Mic] SpeechRecognition not supported');
            return;
        }

        if (recognitionRef.current || isTranscribingRef.current) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = recognitionLanguage;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            console.log(`[Mic] Started (${recognition.lang})`);
            isTranscribingRef.current = true;
        };

        recognition.onerror = (e: any) => {
            console.warn('[Mic] Error:', e.error);
            if (e.error === 'not-allowed') {
                console.error('[Mic] Permissions denied or blocked by browser.');
                isTranscribingRef.current = false;
                addLog('SYSTEM', '❌ Microphone Access Denied or Backgrounded.');
                return;
            }
        };

        recognition.onend = () => {
            console.log('[Mic] Stopped, state:', voiceStateRef.current);
            isTranscribingRef.current = false;
            recognitionRef.current = null; // Clear ref on end

            if (voiceStateRef.current !== 'IDLE') {
                setTimeout(() => {
                    try {
                        if (!isTranscribingRef.current && voiceStateRef.current !== 'IDLE') {
                            startListening(); // Re-trigger the safe wrapper
                        }
                    } catch { /* ignored */ }
                }, 1000);
            }
        };

        recognition.onresult = (event: any) => {
            const idx = event.resultIndex;
            const text = event.results[idx][0].transcript.toLowerCase().trim();
            setTranscript(text);

            // Talk Mode Silence Reset
            if (isTalkMode && talkModeTimeoutRef.current) {
                clearTimeout(talkModeTimeoutRef.current);
                talkModeTimeoutRef.current = setTimeout(() => {
                    console.log('[TalkMode] Timeout reached (60s)');
                    setIsTalkMode(false);
                    addLog('SYSTEM', '⌛ Talk Mode: Standby (Silence)');
                }, 60000);
            }

            // Command Detections
            if (text.includes('entrar em modo de conversa') || text.includes('ativar modo talk') || text.includes('enter talk mode')) {
                if (!isTalkMode) {
                    setIsTalkMode(true);
                    addLog('SYSTEM', '🎙️ Talk Mode: Activated');
                    setVoiceState('LISTENING');
                }
                return;
            }
            if (text.includes('sair do modo de conversa') || text.includes('desativar modo talk') || text.includes('exit talk mode') || text.includes('parar conversa')) {
                if (isTalkMode) {
                    setIsTalkMode(false);
                    addLog('SYSTEM', '🎙️ Talk Mode: Deactivated');
                    setVoiceState('PASSIVE');
                }
                return;
            }

            if (voiceStateRef.current === 'PASSIVE' || voiceStateRef.current === 'IDLE') {
                if (text.includes('jarvis') || text.includes('javes') || text.includes('jarvi') || text.includes('davis')) {
                    console.log('[Wakeword] Detected:', text);
                    setVoiceState('LISTENING');
                    addLog('MIC', '🎙️ Wake word detected');
                }
            } else if (voiceStateRef.current === 'LISTENING') {
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                silenceTimer.current = setTimeout(() => {
                    if (event.results[idx].isFinal) {
                        console.log('[Command] Final:', text);
                        sendCommandRef.current(text);
                    }
                }, 1500);
            }
        };

        try { recognition.start(); } catch (e) { console.warn('[Mic] Start failed:', e); }
    }, [addLog]);

    const sendCommand = useCallback((text: string, agentId?: string) => {
        setVoiceState('PROCESSING');
        setLastResponse(''); // Clear previous response
        streamBufferRef.current = ''; // Clear stream buffer
        addLog('USER', text);
        if (socketRef.current?.connected) {
            socketRef.current.emit('jarvis/command', { command: text, user: 'Paulo', agentId });
        } else {
            addLog('SYSTEM', '❌ Cannot send — not connected');
            setVoiceState('PASSIVE');
        }
    }, [addLog]);

    // --- CLAPPING / LOUD NOISE DETECTION ---
    const clapThreshold = 0.5; // Normalized volume (0 to 1) needs tuning
    const clapTimingWindow = 800; // Time in ms to expect the second clap
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const clapTimestampsRef = useRef<number[]>([]);
    const reqFrameRef = useRef<number | null>(null);

    const checkAudioForClap = useCallback(() => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const normalized = Math.abs((dataArray[i] - 128) / 128);
            if (normalized > maxVal) maxVal = normalized;
        }

        if (maxVal > clapThreshold) {
            const now = Date.now();
            clapTimestampsRef.current.push(now);

            // Filter out rapid spikes (single clap reverberation) and old claps
            clapTimestampsRef.current = clapTimestampsRef.current.filter(t => (now - t) < clapTimingWindow);

            // Check if there are at least 2 distinct claps separated by more than 100ms
            if (clapTimestampsRef.current.length >= 2) {
                const first = clapTimestampsRef.current[0];
                const last = clapTimestampsRef.current[clapTimestampsRef.current.length - 1];
                if ((last - first) > 100) {
                    console.log('[Clap Detected] Waking up Jarvis');
                    if (voiceStateRef.current === 'PASSIVE' || voiceStateRef.current === 'IDLE') {
                        setVoiceState('LISTENING');
                        addLog('MIC', '👏 Double clap wake detected');
                    }
                    clapTimestampsRef.current = []; // Reset after trigger
                }
            }
        }

        reqFrameRef.current = requestAnimationFrame(checkAudioForClap);
    }, [addLog]);

    const startAudioAnalyzer = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioStreamRef.current = stream;
            const ctx = getAudioContext();

            // Resume contextual audio engine if browser suspended it so Analyzer can run
            if (ctx.state === 'suspended') await ctx.resume();

            const source = ctx.createMediaStreamSource(stream);
            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            reqFrameRef.current = requestAnimationFrame(checkAudioForClap);
            console.log('[Analyzer] Ambient clap detection running');
        } catch (err) {
            console.warn('[Analyzer] Could not mount microphone for clap detection', err);
        }
    }, [checkAudioForClap]);

    useEffect(() => {
        // Start analyzer asynchronously on mount
        startAudioAnalyzer();
        return () => {
            if (reqFrameRef.current) cancelAnimationFrame(reqFrameRef.current);
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [startAudioAnalyzer]);

    const sendCommandRef = useRef(sendCommand);
    useEffect(() => { sendCommandRef.current = sendCommand; }, [sendCommand]);

    const startJarvis = useCallback(() => {
        // Unlock audio on this user gesture
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        setVoiceState('PASSIVE');
        startListening();
    }, [startListening]);

    const stopJarvis = useCallback(() => {
        setVoiceState('IDLE');
        voiceStateRef.current = 'IDLE';
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, []);

    return {
        voiceState,
        transcript,
        lastResponse,
        logs,
        isConnected,
        startJarvis,
        stopJarvis,
        speak,
        sendCommand,
        socket: socketRef.current,
        isTalkMode
    };
};
