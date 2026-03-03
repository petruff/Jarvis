import * as fs from 'fs';
import * as path from 'path';
import { Mission } from '../types/mission';

export interface AgentDNA {
    id: string;
    name: string;
    dna: string;
    mandate: string;
    squadId: string;
    icon: string;
}

export class AgentRegistry {
    private agents: Map<string, AgentDNA> = new Map();
    private squads: any[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const configPath = path.join(__dirname, '../../config/agentRegistry.json');
            if (fs.existsSync(configPath)) {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.squads = data.squads;
                for (const squad of data.squads) {
                    for (const agent of squad.agents) {
                        this.registerAgent({
                            ...agent,
                            squadId: squad.id,
                            icon: squad.icon
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[AgentRegistry] Failed to load config:', e);
        }
    }

    public getAgent(id: string): AgentDNA | undefined {
        return this.agents.get(id);
    }

    public getSquadAgents(squadId: string): AgentDNA[] {
        return Array.from(this.agents.values()).filter(a => a.squadId === squadId);
    }

    public getAllAgents(): AgentDNA[] {
        return Array.from(this.agents.values());
    }

    public buildSystemPrompt(agent: AgentDNA, lang: 'en' | 'pt' | 'es' = 'en'): string {
        const languageInstruction = {
            en: 'Respond entirely in English.',
            pt: 'Responda inteiramente em Português.',
            es: 'Responda enteramente en Español.'
        }[lang];

        return `You are ${agent.name}. ${agent.dna}\n\nYour Mandate: ${agent.mandate}\n\nRespond in the language of the mission prompt. ${languageInstruction}\n\nAll output, analysis, and recommendations must be in ${lang}.`;
    }

    // Phase 5 Stubs
    public mutateAgent(id: string, newDna: Partial<AgentDNA>): void {
        const agent = this.getAgent(id);
        if (agent) {
            this.agents.set(id, { ...agent, ...newDna });
        }
    }

    public addAgent(agent: AgentDNA): void {
        this.agents.set(agent.id, agent);
    }

    public getPerformanceLeaderboard(): any[] {
        return [];
    }

    public registerAgent(agent: AgentDNA) {
        this.agents.set(agent.id, agent);
    }

    public createDynamicAgent(name: string, role: string, description: string, systemPrompt: string): boolean {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        this.registerAgent({
            id,
            name,
            dna: description, // Use description as DNA
            mandate: role,   // Use role as Mandate
            squadId: 'dynamic',
            icon: '⚡'
        });
        return true;
    }
}

export const agentRegistry = new AgentRegistry();
