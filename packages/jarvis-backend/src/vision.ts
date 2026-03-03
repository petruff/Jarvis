import { queryLLM } from './llm';
import { config } from './config/loader';

export async function analyzeImage(base64Image: string, prompt: string): Promise<string> {
    try {
        console.log(`[Vision] Analyzing image (length: ${base64Image.length})...`);

        // Ensure standard data URI prefix (assuming it's JPEG for safety, though LLMs often handle raw base64 well)
        let formattedBase64 = base64Image;
        if (!base64Image.startsWith('data:image')) {
            formattedBase64 = `data:image/jpeg;base64,${base64Image}`;
        }

        // We use the existing queryLLM function but we need to pass the multimodal message format.
        // Since queryLLM currently only accepts a string, we need to bypass the standard queryLLM
        // or add a multimodal query function. For Phase 6, we will implement the direct request here.

        // In a true production environment, we would use the Gateway's routing logic.
        // For now, we will use the OpenAI API directly if OPENAI_API_KEY is available,
        // or Anthropic if ANTHROPIC_API_KEY is available because they support Vision out of the box.

        if (config.llm.openai_api_key) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.llm.openai_api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt || 'Analyze this image and describe its contents in detail.' },
                                { type: 'image_url', image_url: { url: formattedBase64 } }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI Vision API Error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } else if (process.env.ANTHROPIC_API_KEY) {

            // Clean base64 for Anthropic (no data:image/jpeg;base64, prefix)
            const cleanBase64 = formattedBase64.replace(/^data:image\/\w+;base64,/, '');

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1000,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt || 'Analyze this image and describe its contents in detail.' },
                                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: cleanBase64 } }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Anthropic Vision API Error: ${error}`);
            }

            const data = await response.json();
            return data.content[0].text;

        } else {
            throw new Error('No Vision-capable API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env');
        }

    } catch (err: any) {
        console.error(`[Vision] Failed to analyze image: ${err.message}`);
        return `[VISION ERROR] Could not analyze image: ${err.message}`;
    }
}
