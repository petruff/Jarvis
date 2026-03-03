
import { io } from 'socket.io-client';

console.log("Attempting to connect to WS at http://localhost:3000...");

const socket = io('http://localhost:3000', {
    transports: ['websocket', 'polling'], // Try both
    reconnection: false
});

socket.on('connect', () => {
    console.log("SUCCESS: Connected to Socket.IO server!");
    console.log(`Socket ID: ${socket.id}`);
    socket.emit('jarvis/command', { command: 'status', user: 'TEST_SCRIPT' });
});

socket.on('jarvis/response', (data) => {
    console.log("RECEIVED RESPONSE:", data);
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error("CONNECTION ERROR:", err.message);
    process.exit(1);
});

// Timeout
setTimeout(() => {
    console.error("TIMEOUT: Could not connect in 5 seconds.");
    process.exit(1);
}, 5000);
