import React, { useState } from 'react';
import { Mic } from 'lucide-react';

interface CommandInputProps {
    onSend: (text: string) => void;
    isListening: boolean;
    onMicClick: () => void;
}

const CommandInput: React.FC<CommandInputProps> = ({ onSend, isListening, onMicClick }) => {
    const [command, setCommand] = useState('');

    const handleSend = () => {
        if (command.trim()) {
            onSend(command);
            setCommand('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="w-full h-14 flex gap-2 items-stretch mt-4 relative z-20">
            {/* Input Field Container - Molecule */}
            <div className="flex-1 relative group">
                {/* Glow Effect - Token: jarvis-primary, jarvis-secondary */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary rounded opacity-20 transition duration-500 blur ${isListening ? 'opacity-100 animate-pulse' : 'group-hover:opacity-60'}`}></div>

                <div className="relative flex items-center bg-jarvis-surface/90 rounded border border-jarvis-primary/40 h-full">
                    <span className="pl-4 text-jarvis-primary/70 font-mono text-lg" aria-hidden="true">{'>'}</span>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "Ouvindo..." : "Digite ou fale seu comando..."}
                        aria-label="Command Input"
                        className="w-full bg-transparent text-jarvis-text p-3 focus:outline-none font-mono placeholder-jarvis-text/20 text-sm uppercase tracking-wider"
                    />
                    <button
                        onClick={onMicClick}
                        className={`p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-jarvis-primary/50 rounded-full ${isListening ? 'text-jarvis-alert animate-pulse' : 'text-jarvis-primary/50 hover:text-jarvis-primary'}`}
                        aria-label={isListening ? "Stop Voice Input" : "Activate Voice Input"}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Execute Button - Atom */}
            <button
                onClick={handleSend}
                className="px-8 bg-jarvis-primary text-jarvis-surface font-bold font-mono uppercase tracking-widest hover:bg-white hover:shadow-glow-md transition-all duration-300 rounded clip-path-slant text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Execute Command"
            >
                EXECUTAR
            </button>
        </div>
    );
};

export default CommandInput;
