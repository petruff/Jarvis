const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { config } = require('./dist/config/loader.js');

async function generateSamples() {
    const openai = new OpenAI({ apiKey: config.llm.openai_api_key });
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const text = "Hello sir, this is a sample of my voice. I am Jarvis, your artificial intelligence system.";

    const outputDir = path.join(__dirname, '../../workspace/voices');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("Generating voice samples...");
    for (const voice of voices) {
        console.log(`Generating: ${voice}...`);
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: voice,
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            const filepath = path.join(outputDir, `jarvis_sample_${voice}.mp3`);
            fs.writeFileSync(filepath, buffer);
            console.log(`Saved: ${filepath}`);
        } catch (e) {
            console.error(`Failed to generate ${voice}:`, e.message);
        }
    }
    console.log("Done.");
}

generateSamples();
