
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = 'cydNMBtVvlgLGYp5M3ZB';

console.log(`Checking API Key: ${API_KEY ? 'Present' : 'MISSING'}`);

const test = async () => {
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': API_KEY || ''
            },
            body: JSON.stringify({
                text: "Testing connectivity.",
                model_id: "eleven_monolingual_v1"
            })
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            const text = await response.text();
            console.error(`Error: ${text}`);
            process.exit(1);
        }

        console.log("SUCCESS: Audio stream received.");
        process.exit(0);

    } catch (e: any) {
        console.error("EXCEPTION:", e.message);
        process.exit(1);
    }
};

test();
