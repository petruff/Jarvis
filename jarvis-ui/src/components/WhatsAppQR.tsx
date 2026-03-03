import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';

interface WhatsAppQRProps {
    onConnected?: () => void;
}

const WhatsAppQR: React.FC<WhatsAppQRProps> = ({ onConnected }) => {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'dismissed'>('loading');
    const pollRef = useRef<NodeJS.Timeout>();
    const connectedFiredRef = useRef(false);

    const renderQR = useCallback(async (qrString: string) => {
        if (!qrString) return;
        try {
            const dataUrl = await QRCode.toDataURL(qrString, {
                width: 180,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            setQrDataUrl(dataUrl);
            setStatus('qr');
        } catch (err) {
            console.error('[WhatsAppQR] Render failed:', err);
        }
    }, []);

    const handleConnected = useCallback(() => {
        if (connectedFiredRef.current) return;
        connectedFiredRef.current = true;
        setStatus('connected');
        clearInterval(pollRef.current);
        onConnected?.();
        // Auto-hide after 3 seconds
        setTimeout(() => setStatus('dismissed'), 3000);
    }, [onConnected]);

    // Socket — gets QR the instant it's generated
    useEffect(() => {
        const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });
        socket.on('whatsapp/qr', (d: { qr: string }) => renderQR(d.qr));
        socket.on('whatsapp/ready', () => handleConnected());
        return () => { socket.disconnect(); };
    }, [renderQR, handleConnected]);

    // HTTP polling fallback (every 6s)
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3000/api/whatsapp/qr`, { cache: 'no-store' });
                if (res.status === 204) { handleConnected(); return; }
                if (!res.ok) return;
                const data = await res.json();
                if (data.authenticated) { handleConnected(); return; }
                if (data.qr) renderQR(data.qr);
            } catch { /* backend not ready yet */ }
        };
        poll();
        pollRef.current = setInterval(poll, 6000);
        return () => clearInterval(pollRef.current);
    }, [renderQR, handleConnected]);

    if (status === 'dismissed') return null;

    // Connected confirmation
    if (status === 'connected') {
        return (
            <div className="fixed bottom-6 right-6 z-50 bg-[#0a1628] border border-green-500/50 rounded-lg px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,100,0.15)] animate-fade-in">
                <span className="text-green-400 text-lg">✅</span>
                <div>
                    <p className="font-mono text-green-400 text-xs tracking-wider">WHATSAPP CONNECTED</p>
                    <p className="font-mono text-green-400/40 text-[10px]">Mobile channel online</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0a1628] border border-cyan-500/40 rounded-lg p-5 w-64 shadow-[0_0_40px_rgba(0,243,255,0.1)]">
            {/* Corner decorators */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <span className="font-mono text-cyan-400 text-[11px] tracking-widest uppercase">WhatsApp</span>
                </div>
                <button
                    onClick={() => setStatus('dismissed')}
                    className="text-cyan-400/30 hover:text-cyan-400/80 text-[10px] font-mono transition-colors"
                    title="Dismiss"
                >
                    ✕
                </button>
            </div>

            {/* Loading */}
            {status === 'loading' && (
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-cyan-400/50 text-[10px] font-mono text-center">
                        Initializing...<br />
                        <span className="text-cyan-400/25">(takes ~30s first time)</span>
                    </p>
                </div>
            )}

            {/* QR Ready */}
            {status === 'qr' && qrDataUrl && (
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-2 rounded shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                        <img src={qrDataUrl} alt="WhatsApp QR" className="w-40 h-40" />
                    </div>
                    <p className="text-cyan-400/50 text-[9px] font-mono text-center tracking-wider">
                        Scan with WhatsApp → Linked Devices
                    </p>
                </div>
            )}

            {/* Reset link */}
            <div className="mt-3 pt-3 border-t border-cyan-500/10 flex justify-center">
                <a
                    href={`http://${window.location.hostname}:3000/logout`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-400/30 hover:text-red-400/60 text-[9px] font-mono tracking-widest transition-colors"
                >
                    [RESET SESSION]
                </a>
            </div>
        </div>
    );
};

export default WhatsAppQR;
