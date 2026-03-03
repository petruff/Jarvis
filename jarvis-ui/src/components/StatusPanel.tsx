import React, { useEffect, useState } from 'react';

interface Log {
    id: number;
    timestamp: string;
    source: string;
    message: string;
    type: 'info' | 'warning' | 'error';
}

const StatusPanel: React.FC = () => {
    const [logs, setLogs] = useState<Log[]>([]);

    useEffect(() => {
        // Simulate incoming system logs
        const interval = setInterval(() => {
            const newLog: Log = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                source: 'SYSTEM',
                message: `Processing data stream ${Math.floor(Math.random() * 9999)}...`,
                type: 'info',
            };
            setLogs((prev) => [newLog, ...prev].slice(0, 10)); // Keep last 10
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-sm glass-panel p-4 h-64 overflow-hidden flex flex-col font-mono text-xs">
            <div className="flex justify-between items-center border-b border-jarvis-cyan/20 pb-2 mb-2">
                <span className="text-jarvis-cyan uppercase tracking-widest">System Logs</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-jarvis-cyan/50"></div>
                    <div className="w-2 h-2 rounded-full bg-jarvis-cyan/20"></div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-jarvis-text/80">
                        <span className="text-jarvis-cyan/50">[{log.timestamp}]</span>
                        <span className={log.type === 'error' ? 'text-jarvis-alert' : 'text-jarvis-blue'}>
                            {log.source}:
                        </span>
                        <span>{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusPanel;
