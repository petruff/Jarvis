import React from 'react';

interface JarvisCoreProps {
    isSpeaking?: boolean;
    isListening?: boolean;
}

const JarvisCore: React.FC<JarvisCoreProps> = ({ isSpeaking = false, isListening = false }) => {
    return (
        <div className="relative flex items-center justify-center w-56 h-56" aria-label="Jarvis Core Visualizer" role="img">

            {/* Container for the specific glow bloom effect */}
            <svg className="absolute w-full h-full pointer-events-none" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="coilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0a0f1c" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0a0f1c" stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                {/* Outer Ring Dashed - Accelerates on Speak */}
                <circle
                    cx="200" cy="200" r="190"
                    fill="none" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 6"
                    className={`${isSpeaking ? 'animate-spin duration-[3s]' : 'animate-spin-slower'} origin-center transition-all`}
                />

                {/* Mechanical Coil Ring (10 Segments) - Accelerates */}
                <g className={`${isSpeaking ? 'animate-spin duration-[4s]' : 'animate-spin-slow'} origin-center transition-all`}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <path
                            key={i}
                            d="M200 30 
                     A 170 170 0 0 1 253 45
                     L 240 70
                     A 140 140 0 0 0 200 60
                     Z"
                            fill="url(#coilGradient)"
                            stroke="#00f3ff"
                            strokeWidth="2"
                            strokeOpacity="0.8"
                            transform={`rotate(${i * 36} 200 200)`}
                            filter="url(#bloom)"
                        />
                    ))}
                </g>

                {/* Inner Detailed Ring - Reverses Fast */}
                <circle
                    cx="200" cy="200" r="130"
                    fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="20 40"
                    className={`${isSpeaking ? 'animate-spin-reverse duration-[2s]' : 'animate-spin-reverse-slow'} origin-center transition-all`}
                />

                {/* Core Housing */}
                <circle cx="200" cy="200" r="80" fill="#000" fillOpacity="0.5" stroke="#00f3ff" strokeWidth="4" filter="url(#bloom)" />

                {/* The Central Paladium Core - Pulses heavily */}
                <circle
                    cx="200" cy="200" r="60"
                    fill="#00f3ff" fillOpacity={isSpeaking ? "0.8" : "0.2"}
                    className={`${isSpeaking ? 'animate-pulse duration-[0.5s]' : 'animate-pulse-slow'}`}
                >
                    {!isSpeaking && (
                        <>
                            <animate attributeName="r" values="58;62;58" dur="4s" repeatCount="indefinite" />
                            <animate attributeName="fillOpacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                        </>
                    )}
                </circle>

                {/* Inner Triangles - Fast Spin */}
                <path
                    d="M200 150 L220 190 H180 Z"
                    fill="#00f3ff" fillOpacity="0.8"
                    className={`${isSpeaking ? 'animate-spin duration-[1s]' : 'animate-spin'} origin-center`}
                    filter="url(#bloom)"
                />
            </svg>

            {/* LISTENING STATE: Red/Orange ring override */}
            {isListening && (
                <div className="absolute w-64 h-64 rounded-full border-2 border-jarvis-alert opacity-50 animate-ping"></div>
            )}

            {/* Central White Hot Light (HTML overlay for intensity) - Brightens on Speak */}
            <div className={`absolute w-24 h-24 bg-white rounded-full shadow-[0_0_80px_20px_rgba(0,243,255,0.6)] mix-blend-screen z-10 ${isSpeaking ? 'animate-pulse opacity-100 scale-110' : 'animate-pulse opacity-50'}`}></div>

        </div>
    );
};

export default JarvisCore;
