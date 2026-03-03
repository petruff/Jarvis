import React from 'react';

const ConnectorLines: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#00f3ff" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>

                {/* Central Vertical Line from Core to Deck */}
                <line x1="50%" y1="35%" x2="50%" y2="55%" stroke="url(#line-gradient)" strokeWidth="1" />

                {/* Horizontal Distributor Line */}
                <line x1="30%" y1="55%" x2="70%" y2="55%" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" />

                {/* Vertical Drops to Modules */}
                <line x1="30%" y1="55%" x2="30%" y2="60%" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="70%" y1="55%" x2="70%" y2="60%" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" />

                {/* Angled Lines decoration */}
                <path d="M 50% 35% L 45% 40%" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.2" fill="none" />
                <path d="M 50% 35% L 55% 40%" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.2" fill="none" />
            </svg>
        </div>
    );
};

export default ConnectorLines;
