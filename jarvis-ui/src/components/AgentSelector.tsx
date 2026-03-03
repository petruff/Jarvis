import React from 'react';

interface Agent {
    id: string;
    name: string;
}

const agents: Agent[] = [
    { id: 'mega-brain', name: 'MEGA BRAIN' },
    { id: 'gestores', name: 'GESTORES' },
    { id: 'arquiteto', name: 'ARQUITETO' },
    { id: 'developer', name: 'DEVELOPER' },
    { id: 'sales', name: 'SALES SQUAD' },
];

interface AgentSelectorProps {
    selectedAgent: string;
    onSelect: (id: string) => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ selectedAgent, onSelect }) => {
    return (
        <div
            className="flex flex-wrap gap-2 justify-between w-full relative z-20"
            role="group"
            aria-label="Agent Selection"
        >
            {agents.map((agent) => {
                const isActive = selectedAgent === agent.id;
                return (
                    <button
                        key={agent.id}
                        onClick={() => onSelect(agent.id)}
                        aria-pressed={isActive}
                        className={`
                flex-1 min-w-[120px] py-3 border font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-sm rounded-sm clip-corner relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-jarvis-primary/50
                ${isActive
                                ? 'border-jarvis-primary bg-jarvis-primary/20 text-jarvis-primary shadow-glow'
                                : 'border-jarvis-primary/30 bg-jarvis-surface/80 text-jarvis-primary/70 hover:bg-jarvis-primary/10 hover:text-jarvis-primary hover:border-jarvis-primary/60'}
            `}
                    >
                        {/* Active Indicator Line */}
                        {isActive && <div className="absolute top-0 left-0 w-full h-[2px] bg-jarvis-primary shadow-glow"></div>}

                        {agent.name}
                    </button>
                );
            })}
        </div>
    );
};

export default AgentSelector;
