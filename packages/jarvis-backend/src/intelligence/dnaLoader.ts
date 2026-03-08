import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import logger from '../logger';

export interface MindCloneDNA {
    version: string;
    metadata: {
        expert_id: string;
        author: string;
        description: string;
    };
    philosophy: {
        beliefs: string[];
        alignment: {
            moral_north: string;
            voice: string;
        };
    };
    mental_models: Array<{ id: string; description: string }>;
    heuristics: string[];
    frameworks: Array<{ id: string; name: string; focus: string }>;
    methodologies: Array<{ id: string; focus: string }>;
    context_buckets: Record<string, string>;
}

class DnaLoader {
    private readonly dnaDir: string;

    constructor() {
        // Path adjusted for execution from packages/jarvis-backend
        this.dnaDir = path.resolve(process.cwd(), 'dna');
    }

    async loadDNA(expertId: string): Promise<MindCloneDNA | null> {
        const dnaPath = path.join(this.dnaDir, `${expertId}.yaml`);

        if (!fs.existsSync(dnaPath)) {
            // Fallback for different working directories
            const altPath = path.resolve(__dirname, '../../dna', `${expertId}.yaml`);
            if (fs.existsSync(altPath)) {
                try {
                    const raw = fs.readFileSync(altPath, 'utf-8');
                    return yaml.load(raw) as MindCloneDNA;
                } catch { }
            }
            logger.warn(`[DNA] No DNA definition found for expert: ${expertId} at ${dnaPath}`);
            return null;
        }

        try {
            const raw = fs.readFileSync(dnaPath, 'utf-8');
            return yaml.load(raw) as MindCloneDNA;
        } catch (err: any) {
            logger.error(`[DNA] Failed to parse DNA for ${expertId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Transforms DNA layers into a flattened system prompt fragment.
     */
    async injectDNA(expertId: string): Promise<string> {
        const dna = await this.loadDNA(expertId);
        if (!dna) return '';

        let prompt = `\n\n[MIND CLONE DNA: ${dna.metadata.expert_id.toUpperCase()}]\n`;

        prompt += `\nPHILOSOPHY:\n- ${dna.philosophy.beliefs.join('\n- ')}\n`;
        prompt += `ALIGNMENT: ${dna.philosophy.alignment.moral_north}\n`;
        prompt += `VOICE: ${dna.philosophy.alignment.voice}\n`;

        prompt += `\nMENTAL MODELS:\n- ${dna.mental_models.map(m => `${m.id}: ${m.description}`).join('\n- ')}\n`;

        prompt += `\nHEURISTICS:\n- ${dna.heuristics.join('\n- ')}\n`;

        prompt += `\nFRAMEWORKS:\n- ${dna.frameworks.map(f => `${f.name} (Focus: ${f.focus})`).join('\n- ')}\n`;

        prompt += `\nMETHODOLOGIES:\n- ${dna.methodologies.map(m => `${m.id}: ${m.focus}`).join('\n- ')}\n`;

        prompt += `\nCONTEXT BOUNDARIES (Tridimensional):\n- ${Object.entries(dna.context_buckets).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n- ')}\n`;

        return prompt;
    }
}

export const dnaLoader = new DnaLoader();
export default dnaLoader;
