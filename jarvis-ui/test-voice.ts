
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

console.log("Connecting to backend...");

socket.on('connect', () => {
    console.log("Connected! Sending 'jarvis/speak' request...");
    socket.emit('jarvis/speak', {
        text: "Testing voice systems.",
        voiceId: "cydNMBtVvlgLGYp5M3ZB"
    });
});

socket.on('jarvis/audio', (data) => {
    console.log(`SUCCESS: Received Audio Data! Length: ${data.audio.length}`);
    socket.disconnect();
    process.exit(0);
});

socket.on('jarvis/response', (data) => {
    console.log("Received Response text:", data.text);
});

setTimeout(() => {
    console.error("TIMEOUT: No audio received in 10 seconds.");
    socket.disconnect();
    process.exit(1);
}, 10000);
