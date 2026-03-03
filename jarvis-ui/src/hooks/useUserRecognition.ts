import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface UserProfile {
    name: string;
    title: string;
    isAuthenticated: boolean;
}

export const useUserRecognition = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        // Initial Mock Scan
        const timer = setTimeout(() => {
            setUser({
                name: 'Petruff',
                title: 'Sir',
                isAuthenticated: true,
            });
            setIsScanning(false);
        }, 2000);

        // Listen for remote identity updates
        const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });

        socket.on('jarvis/control', (msg: { type: string, data: any }) => {
            if (msg.type === 'set_identity' && msg.data?.name) {
                console.log("[Identity] Updating user to:", msg.data.name);
                setUser(prev => ({
                    ...prev!,
                    name: msg.data.name,
                    title: `Mr. ${msg.data.name}`,
                    isAuthenticated: true
                }));
            }
        });

        return () => {
            clearTimeout(timer);
            socket.disconnect();
        };
    }, []);

    return { user, isScanning };
};
