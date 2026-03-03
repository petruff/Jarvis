import { FastifyInstance } from 'fastify';
import { Socket } from 'socket.io';
import { config } from './config/loader';
import OpenAI from 'openai';

export const processTextToSpeech = async (
    fastify: FastifyInstance,
    socket: Socket | any,
    text: string,
    voiceId?: string,
    agentId: string = 'jarvis'
) => {
    try {
        // Double Cleanse
        const safeText = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .replace(/`/g, '');

        if (!safeText.trim()) return;

        if (!config.llm.openai_api_key) {
            fastify.log.error("[VOICE] OpenAI API Key missing for TTS!");
            socket.emit('jarvis/control', { type: 'voice_error', message: 'OpenAI API Key Missing. Please check your configuration.' });
            return;
        }

        const openai = new OpenAI({ apiKey: config.llm.openai_api_key });
        const voice = (config.voice.openai_voice as any) || 'onyx';
        const model = (config.voice.openai_model as any) || 'tts-1';

        fastify.log.info(`[TTS-OpenAI] Generating audio for: "${safeText.substring(0, 30)}..." (Voice: ${voice})`);

        const response = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: safeText,
            speed: 1.0
        });

        // Stream audio back to client
        const arrayBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');
        socket.emit('jarvis/audio', { audio: base64Audio, agent: agentId });

    } catch (err: any) {
        fastify.log.error(`[VOICE] Error: ${err.message}`);
    }
};

export const generateAudioBuffer = async (text: string, voiceId?: string): Promise<Buffer | null> => {
    try {
        const safeText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '');
        if (!safeText.trim()) return null;

        if (!config.llm.openai_api_key) {
            console.error("[VOICE] OpenAI API Key missing for buffer generation!");
            return null;
        }

        const openai = new OpenAI({ apiKey: config.llm.openai_api_key });
        const voice = (config.voice?.openai_voice as any) || 'echo';
        const model = (config.voice?.openai_model as any) || 'tts-1';

        console.log(`[TTS-OpenAI] Requesting audio buffer for: "${safeText.substring(0, 30)}..." (Voice: ${voice})`);

        const response = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: safeText,
            speed: 1.0
        });

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (err: any) {
        console.error(`[VOICE] Buffer Error: ${err.message}`);
        return null;
    }
};
