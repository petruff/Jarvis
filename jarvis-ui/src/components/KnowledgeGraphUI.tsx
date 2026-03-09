import React, { useState, useEffect } from 'react';

interface KnowledgeGraphProps {
    socket?: any;
}

const KnowledgeGraphUI: React.FC<KnowledgeGraphProps> = ({ socket }) => {
    const [stats, setStats] = useState({ nodes: 0, edges: 0 });
    const [recentPaths, setRecentPaths] = useState<string[]>([]);

    useEffect(() => {
        if (!socket) return;

        // Listen for graph updates
        const handleGraphPulse = (data: { nodeCount: number, edgeCount: number, recentPath?: string }) => {
            setStats({ nodes: data.nodeCount, edges: data.edgeCount });
            if (data.recentPath) {
                setRecentPaths(prev => [data.recentPath!, ...prev].slice(0, 5));
            }
        };

        socket.on('jarvis/graph_pulse', handleGraphPulse);
        return () => socket.off('jarvis/graph_pulse', handleGraphPulse);
    }, [socket]);

    return (
        <div className="fixed top-32 left-8 w-72 bg-zinc-950/80 border border-jarvis-secondary/20 rounded-xl p-4 font-mono text-xs backdrop-blur-md shadow-2xl z-20">
            <div className="flex justify-between items-center mb-4 border-b border-jarvis-secondary/10 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-jarvis-secondary animate-pulse shadow-[0_0_8px_rgba(0,150,255,0.8)]"></div>
                    <span className="text-jarvis-secondary font-bold tracking-tighter uppercase">Quimera Neural Map</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                    <span className="text-[9px] text-zinc-500 block uppercase">Nodes</span>
                    <span className="text-lg font-bold text-white">{stats.nodes.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                    <span className="text-[9px] text-zinc-500 block uppercase">Edges</span>
                    <span className="text-lg font-bold text-white">{stats.edges.toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <span className="text-[9px] text-zinc-500 uppercase block mb-2">Inference Traversals</span>
                    <div className="space-y-2">
                        {recentPaths.length > 0 ? (
                            recentPaths.map((path, i) => (
                                <div
                                    key={i}
                                    className="text-[9px] text-jarvis-secondary/80 bg-jarvis-secondary/5 p-1.5 rounded border-l border-jarvis-secondary/30 break-all transition-all duration-300"
                                >
                                    {path}
                                </div>
                            ))
                        ) : (
                            <div className="text-[9px] text-zinc-700 italic py-4 text-center border border-dashed border-zinc-800 rounded">
                                Waiting for neural activity...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-jarvis-secondary/10 flex justify-between items-center">
                <span className="text-[8px] text-zinc-600 uppercase">Local Sovereignty: Active</span>
                <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-1 h-3 bg-jarvis-secondary/20 rounded-full overflow-hidden">
                            <div
                                className="w-full bg-jarvis-secondary animate-pulse"
                                style={{ height: '60%', animationDelay: `${i * 0.2}s` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeGraphUI;
