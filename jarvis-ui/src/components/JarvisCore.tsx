import React from 'react';

interface JarvisCoreProps {
    isSpeaking?: boolean;
    isListening?: boolean;
}

const JarvisCore: React.FC<JarvisCoreProps> = ({ isSpeaking = false, isListening = false }) => {
    return (
        <div className="relative flex items-center justify-center w-[28rem] h-[28rem] 2xl:w-[32rem] 2xl:h-[32rem]" aria-label="Jarvis Core Visualizer" role="img">
            {/* Ambient background glow */}
            <div className={`absolute w-full h-full rounded-full transition-all duration-1000 ${isSpeaking ? 'bg-jarvis-primary/20 blur-3xl scale-110' : isListening ? 'bg-[#ff003c]/20 blur-3xl scale-105' : 'bg-jarvis-primary/5 blur-2xl scale-95'}`}></div>

            <svg className="absolute w-full h-full pointer-events-none drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="intense-bloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <linearGradient id="coilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0a0f1c" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#050a15" stopOpacity="0.9" />
                    </linearGradient>

                    <radialGradient id="triangleGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={isSpeaking ? "1" : "0.9"} />
                        <stop offset="40%" stopColor="#00f3ff" stopOpacity={isSpeaking ? "0.9" : "0.7"} />
                        <stop offset="80%" stopColor="#0a44ff" stopOpacity={isSpeaking ? "0.6" : "0.3"} />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="metalRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1a253b" />
                        <stop offset="30%" stopColor="#4a6ba5" />
                        <stop offset="70%" stopColor="#0a0f1c" />
                        <stop offset="100%" stopColor="#1a253b" />
                    </linearGradient>
                </defs>

                <g filter="url(#bloom)">
                    {/* Dark metallic outer gear ring */}
                    <circle cx="250" cy="250" r="235" fill="none" stroke="url(#metalRing)" strokeWidth="15" strokeDasharray="95 5" className="animate-spin-slower origin-center" />
                    <circle cx="250" cy="250" r="235" fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.5" />

                    {/* Ring with HUD text / azimuth marks */}
                    <circle cx="250" cy="250" r="215" fill="none" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 18" />

                    {/* Multi-layered rotating bands */}
                    <circle cx="250" cy="250" r="200" fill="none" stroke="#00f3ff" strokeWidth="6" strokeOpacity="0.4" strokeDasharray="30 40 80 40" className={`${isSpeaking ? 'animate-spin duration-[2s]' : 'animate-spin-slow'} origin-center`} />
                    <circle cx="250" cy="250" r="185" fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="1 5" className="animate-spin-reverse-slow origin-center" />

                    {/* Highly dense mechanical coils (Iron Man reactor) */}
                    <g className={`${isSpeaking ? 'animate-spin duration-[3s]' : 'animate-spin'} origin-center`}>
                        {Array.from({ length: 18 }).map((_, i) => (
                            <path
                                key={i}
                                d="M250 85 
                                 A 165 165 0 0 1 275 92
                                 L 265 130
                                 A 120 120 0 0 0 250 125
                                 Z"
                                fill="url(#coilGradient)"
                                stroke="#00f3ff"
                                strokeWidth="2"
                                strokeOpacity={isSpeaking ? "1" : "0.7"}
                                transform={`rotate(${i * 20} 250 250)`}
                            />
                        ))}
                    </g>

                    {/* Thick metallic inner ring boundary */}
                    <circle cx="250" cy="250" r="120" fill="none" stroke="url(#metalRing)" strokeWidth="12" />
                    <circle cx="250" cy="250" r="120" fill="none" stroke="#00f3ff" strokeWidth="2" strokeOpacity="0.8" />

                    {/* Inner segmented fast-reverse Ring */}
                    <circle cx="250" cy="250" r="110" fill="none" stroke="#00f3ff" strokeWidth="8" strokeOpacity="0.7" strokeDasharray="40 10 10 10" className={`${isSpeaking ? 'animate-spin-reverse duration-[1.5s]' : 'animate-spin-reverse-slow'} origin-center`} />

                    {/* Inner Housing background */}
                    <circle cx="250" cy="250" r="100" fill="#02050a" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" />
                </g>

                {/* Mark VI Triangle Core (Glowing) */}
                <g filter={isSpeaking ? "url(#intense-bloom)" : "url(#bloom)"} className={`${isSpeaking ? 'scale-105' : 'scale-100'} transition-transform duration-200 origin-center`}>
                    <polygon
                        points="250,160 330,300 170,300"
                        fill="url(#triangleGlow)"
                        stroke="#ffffff"
                        strokeWidth="4"
                        className={`${isSpeaking ? 'animate-pulse-fast' : 'animate-pulse-slow'}`}
                    />
                    {/* Inner darker inset of the triangle to make it look 3D and thick */}
                    <polygon
                        points="250,180 305,285 195,285"
                        fill="none"
                        stroke="#0a0f1c"
                        strokeWidth="6"
                        strokeOpacity="0.6"
                    />
                    <polygon
                        points="250,180 305,285 195,285"
                        fill="none"
                        stroke="#00f3ff"
                        strokeWidth="2"
                    />
                </g>

                {/* Center dot */}
                <circle cx="250" cy="258" r="12" fill="#ffffff" filter="url(#intense-bloom)" className="animate-pulse" />
            </svg>

            {/* LISTENING STATE: Alert ring override */}
            {isListening && (
                <div className="absolute w-[110%] h-[110%] rounded-full border-4 border-[#ff003c]/60 animate-ping shadow-[0_0_50px_rgba(255,0,60,0.8)]" style={{ animationDuration: '1s' }}></div>
            )}

            {/* Extreme Bloom HTML Overlay for max intensity when speaking */}
            <div className={`absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white rounded-full mix-blend-overlay z-10 transition-all duration-300 pointer-events-none ${isSpeaking ? 'shadow-[0_0_150px_80px_rgba(0,243,255,1)] opacity-100' : 'shadow-[0_0_80px_30px_rgba(0,243,255,0.7)] opacity-60 animate-pulse-slow'}`}></div>

        </div>
    );
};

export default JarvisCore;
