
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Force load .env from current directory
const envPath = path.resolve(__dirname, '.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env:", result.error);
}

const API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || 'cydNMBtVvlgLGYp5M3ZB';

console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 5) + '...' : 'MISSING'}`);
console.log(`Voice ID: ${VOICE_ID}`);

if (!API_KEY) {
    console.error("CRITICAL: API Key is missing in process.env");
    process.exit(1);
}

const test = async () => {
    console.log("Sending request to ElevenLabs...");
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': API_KEY
            },
            body: JSON.stringify({
                text: "System check. Voice initialization complete.",
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            const text = await response.text();
            console.error(`Error Body: ${text}`);
            process.exit(1);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`SUCCESS: Audio received! Size: ${arrayBuffer.byteLength} bytes.`);

        // Write to file to prove it works
        fs.writeFileSync('test_audio.mp3', Buffer.from(arrayBuffer));
        console.log("Saved to test_audio.mp3");
        process.exit(0);

    } catch (e: any) {
        console.error("EXCEPTION:", e.message);
        process.exit(1);
    }
};

test();
