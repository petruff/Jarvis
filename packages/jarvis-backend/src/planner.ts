import { queryLLM } from './llm';
import { SubTask } from './types/mission';
import crypto from 'crypto';

export class RecursivePlanner {

    /**
     * Synthesizes a high-level, complex prompt into an acyclic graph (array with dependencies) of actionable SubTasks.
     */
    public async decomposeMission(prompt: string, parentMissionId: string): Promise<SubTask[]> {
        console.log(`[Planner] Decomposing mission: ${parentMissionId}`);

        const systemPrompt = `You are the Alpha Strategist for an autonomous AI operating system.
Your job is to take a massively complex user request and break it down into an array of isolated, sequential sub-tasks.

AVAILABLE SQUADS TO ASSIGN:
- FORGE: Engineering, coding, building APIs, fixing bugs.
- MERCURY: Copywriting, marketing, sales funnels, growth.
- ORACLE: Deep research, data analysis, strategy formulation.
- VAULT: Financial models, risk assessment, constraints.
- ATLAS: Project management, OKRs.
- NEXUS: Visionary AI architecture, machine learning.

RULES:
1. You MUST output ONLY valid JSON. No markdown ticks around it, no conversational text.
2. The format must be an exact match to this schema:
[
  {
    "id": "unique-task-id-1",
    "description": "Clear, standalone context of what exactly needs to be built/done in this step.",
    "targetSquad": "forge",
    "dependencies": [] 
  },
  {
    "id": "unique-task-id-2",
    "description": "Another step.",
    "targetSquad": "mercury",
    "dependencies": ["unique-task-id-1"] 
  }
]
3. 'dependencies' must be an array of string IDs referencing earlier tasks that must finish before this task starts.
4. Keep the 'description' rich enough that an agent isolated from the parent context can still understand exactly what to do.`;

        try {
            // Using deepseek-reasoner to guarantee ultra-high quality logic graph separation
            const response = await queryLLM(systemPrompt, prompt, 'board'); // 'board' triggers deepseek-reasoner

            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');

            if (start === -1 || end === -1) {
                console.error("[Planner] Failed to extract JSON array from planner response.");
                return [];
            }

            const tasks: any[] = JSON.parse(cleanJson.substring(start, end + 1));

            // Map and validate the output against SubTask strictly
            return tasks.map((t: any) => ({
                id: t.id || crypto.randomUUID(),
                description: t.description || 'Unknown task',
                targetSquad: t.targetSquad || 'forge',
                status: 'PENDING',
                dependencies: Array.isArray(t.dependencies) ? t.dependencies : []
            }));

        } catch (error: any) {
            console.error(`[Planner] Error decomposing mission: ${error.message}`);
            return [];
        }
    }
}

export const planner = new RecursivePlanner();
