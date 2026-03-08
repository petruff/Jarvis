import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface TelemetryData {
    latency: number;
    neuralLoad: number;
}

const SystemTelemetry: React.FC<{ socket?: Socket }> = ({ socket }) => {
    const [data, setData] = useState<TelemetryData>({ latency: 0, neuralLoad: 0 });

    useEffect(() => {
        if (!socket) return;

        socket.on('jarvis/pulse', (pulse: TelemetryData) => {
            setData(pulse);
        });

        return () => {
            socket.off('jarvis/pulse');
        };
    }, [socket]);

    return (
        <div className="system-telemetry glass p-4 rounded-xl flex flex-col gap-3 w-64">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-tighter text-amber-500/60 font-bold">
                <span>System Telemetry</span>
                <span className="pulse-soft">Live</span>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                    <span className="text-white/40">Neural Load</span>
                    <span className="text-amber-500 font-mono">{data.neuralLoad.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${data.neuralLoad}%` }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                    <span className="text-white/40">Latency</span>
                    <span className="text-amber-500 font-mono">{data.latency}ms</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-cyan-400 transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(data.latency / 2, 100)}%` }}
                    />
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/5 flex gap-2 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-full h-4 bg-amber-500/10 rounded-sm animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100}%` }}
                    />
                ))}
            </div>
        </div>
    );
};

export default SystemTelemetry;
