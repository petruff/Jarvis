import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasWorkspaceProps {
    socket: Socket | null;
    onClose?: () => void;
}

export default function CanvasWorkspace({ socket, onClose }: CanvasWorkspaceProps) {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [agentId, setAgentId] = useState<string>('jarvis');
    const [isOpen, setIsOpen] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleCanvasRender = (data: { html: string, type: string, agent: string }) => {
            console.log("[A2UI] Received render payload", data);

            // Strip out markdown ticks if they accidentally bleed over
            let cleanHtml = data.html
                .replace(/^```(html|react)[\s\n]*/gi, '')
                .replace(/```$/g, '');

            // Ensure basic HTML wrapper if the agent only sent partials
            if (!cleanHtml.includes('<html')) {
                cleanHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>A2UI Canvas</title>
                    <base target="_blank">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { 
                            margin: 0; 
                            background: transparent;
                            color: white; /* Assuming Jarvis theme */
                            font-family: system-ui, -apple-system, sans-serif;
                        }
                        /* Custom scrollbar for iframe content */
                        ::-webkit-scrollbar { width: 8px; }
                        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                        ::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.3); border-radius: 4px; }
                        ::-webkit-scrollbar-thumb:hover { background: rgba(0, 243, 255, 0.5); }
                    </style>
                </head>
                <body class="p-4">
                    ${cleanHtml}
                </body>
                </html>
                `;
            }

            setHtmlContent(cleanHtml);
            setAgentId(data.agent || 'jarvis');
            setIsOpen(true);

            // Re-inject content if iframe is already mounted. 
            // srcDoc sometimes needs a manual nudge in React
            if (iframeRef.current) {
                iframeRef.current.srcdoc = cleanHtml;
            }
        };

        socket.on('jarvis/a2ui_render', handleCanvasRender);
        return () => {
            socket.off('jarvis/a2ui_render', handleCanvasRender);
        };
    }, [socket]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 w-[600px] h-full bg-jarvis-surface/95 backdrop-blur-md border-l border-jarvis-primary/20 z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transform transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-jarvis-primary/20 bg-jarvis-dark/50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-jarvis-primary animate-pulse"></div>
                    <span className="text-xs font-mono text-jarvis-primary uppercase tracking-wider">
                        A2UI Canvas / {agentId.toUpperCase()}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setHtmlContent('')}
                        className="text-jarvis-primary/50 hover:text-jarvis-primary text-xs font-mono"
                        title="Clear Canvas"
                    >
                        [CLEAR]
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); if (onClose) onClose(); }}
                        className="text-jarvis-primary/50 hover:text-red-400 text-xs font-mono"
                    >
                        [CLOSE]
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden bg-black/20 m-2 rounded border border-jarvis-primary/10">
                {htmlContent ? (
                    <iframe
                        ref={iframeRef}
                        title="JARVIS A2UI Canvas"
                        sandbox="allow-scripts allow-forms allow-same-origin"
                        className="w-full h-full border-none"
                        srcDoc={htmlContent}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-jarvis-primary/30 font-mono text-sm">
                        Waiting for agent rendering payload...
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-jarvis-primary/10 text-[10px] font-mono text-jarvis-primary/40 text-center">
                Isolated Render Context Active
            </div>
        </div>
    );
}
