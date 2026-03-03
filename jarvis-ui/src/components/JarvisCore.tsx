import React from 'react';

interface JarvisCoreProps {
    isSpeaking?: boolean;
    isListening?: boolean;
}

const JarvisCore: React.FC<JarvisCoreProps> = ({ isSpeaking = false, isListening = false }) => {
    return (
        <div className="relative flex items-center justify-center w-64 h-64" aria-label="Jarvis Core Visualizer" role="img">
            {/* Ambient background glow */}
            <div className={`absolute w-full h-full rounded-full transition-all duration-1000 ${isSpeaking ? 'bg-jarvis-primary/20 blur-3xl scale-125' : isListening ? 'bg-jarvis-alert/20 blur-3xl scale-110' : 'bg-jarvis-primary/5 blur-2xl'}`}></div>

            <svg className="absolute w-full h-full pointer-events-none drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="intense-bloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <linearGradient id="coilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0a0f1c" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#050a15" stopOpacity="0.9" />
                    </linearGradient>

                    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={isSpeaking ? "1" : "0.9"} />
                        <stop offset="30%" stopColor="#00f3ff" stopOpacity={isSpeaking ? "0.9" : "0.6"} />
                        <stop offset="70%" stopColor="#0088ff" stopOpacity={isSpeaking ? "0.5" : "0.2"} />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="metalRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1a253b" />
                        <stop offset="50%" stopColor="#2a3a5a" />
                        <stop offset="100%" stopColor="#0a0f1c" />
                    </linearGradient>
                </defs>

                <g filter="url(#bloom)">
                    {/* Dark metallic housing */}
                    <circle cx="200" cy="200" r="198" fill="none" stroke="url(#metalRing)" strokeWidth="4" />

                    {/* Outer Ring with geometric cutouts */}
                    <circle
                        cx="200" cy="200" r="185"
                        fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.4"
                        strokeDasharray="4 12 40 12"
                        className={`${isSpeaking ? 'animate-spin duration-[3s]' : 'animate-spin-slower'} origin-center`}
                    />
                    <circle
                        cx="200" cy="200" r="172"
                        fill="none" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.2"
                        strokeDasharray="140 10"
                        className="animate-spin-reverse-slow origin-center"
                    />

                    {/* Mechanical Coils (12 Segments for more complexity) */}
                    <g className={`${isSpeaking ? 'animate-spin duration-[4s]' : 'animate-spin-slow'} origin-center`}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <path
                                key={i}
                                d="M200 35 
                                 A 165 165 0 0 1 244 50
                                 L 230 75
                                 A 125 125 0 0 0 200 65
                                 Z"
                                fill="url(#coilGradient)"
                                stroke="#00f3ff"
                                strokeWidth="2"
                                strokeOpacity={isSpeaking ? "0.9" : "0.6"}
                                transform={`rotate(${i * 30} 200 200)`}
                            />
                        ))}
                    </g>

                    {/* Inner segmented Ring */}
                    <circle
                        cx="200" cy="200" r="115"
                        fill="none" stroke="#00f3ff" strokeWidth="4" strokeOpacity="0.7"
                        strokeDasharray="20 5 5 5"
                        className={`${isSpeaking ? 'animate-spin-reverse duration-[2s]' : 'animate-spin-reverse-slower'} origin-center`}
                    />

                    {/* Inner Housing */}
                    <circle cx="200" cy="200" r="95" fill="#030814" stroke="#1a253b" strokeWidth="8" />
                    <circle cx="200" cy="200" r="95" fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.5" />

                    {/* Triangulated inner structure */}
                    <g className={`${isSpeaking ? 'animate-spin duration-[1.5s]' : 'animate-spin-slow'} origin-center`} stroke="#00f3ff" strokeWidth="1.5" strokeOpacity="0.6" fill="none">
                        <polygon points="200,110 278,245 122,245" />
                        <polygon points="200,290 122,155 278,155" />
                    </g>
                </g>

                {/* The Central Paladium Core */}
                <circle
                    cx="200" cy="200" r="70"
                    fill="url(#coreGlow)"
                    className={`${isSpeaking ? 'animate-pulse-fast' : 'animate-pulse-slow'}`}
                    filter={isSpeaking ? "url(#intense-bloom)" : "url(#bloom)"}
                />
            </svg>

            {/* LISTENING STATE: Alert ring override */}
            {isListening && (
                <div className="absolute w-[120%] h-[120%] rounded-full border-4 border-jarvis-alert/60 animate-ping" style={{ animationDuration: '1.5s' }}></div>
            )}
            {isListening && (
                <div className="absolute w-full h-full rounded-full border-2 border-jarvis-alert/80 opacity-80 animate-pulse"></div>
            )}

            {/* Central White Hot Light DOM element to punch through CSS blending */}
            <div className={`absolute w-32 h-32 bg-white rounded-full mix-blend-overlay z-10 transition-all duration-300 ${isSpeaking ? 'shadow-[0_0_100px_40px_rgba(0,243,255,0.9)] opacity-100 scale-110' : 'shadow-[0_0_60px_20px_rgba(0,243,255,0.6)] opacity-70 scale-95 animate-pulse-slow'}`}></div>
            <div className={`absolute w-12 h-12 bg-white rounded-full blur-[2px] z-20 ${isSpeaking ? 'opacity-100' : 'opacity-80'}`}></div>

        </div>
    );
};

export default JarvisCore;
