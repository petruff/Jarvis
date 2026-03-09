import { hybridMemory } from '../index';
import { knowledgeGraph, GraphNode, GraphEdge } from '../memory/graph';
import { queryLLM } from '../llm';
import logger from '../logger';

export interface QuimeraResult {
    rational_core: string;
    connections: string[];
    confidence: number;
}

/**
 * QuimeraEngine — The reasoning soul of JARVIS ORACLE.
 * 
 * Combines standard Vector RAG with Knowledge Graph traversals to uncover
 * non-obvious links in global monitor data.
 */
export class QuimeraEngine {

    async analyze(query: string): Promise<QuimeraResult> {
        logger.info(`[Quimera] Initiating deep synthesis for: "${query}"`);

        // 1. Vector Retrieval (Search fragments)
        const fragments = await hybridMemory.searchKnowledge(query, 5);
        const contextText = fragments.map(f => f.text).join('\n---\n');

        // 2. Entity Discovery (LLM identifies nodes in the context)
        const entities = await this.discoverEntities(contextText);
        logger.info(`[Quimera] Discovered ${entities.length} potential entities.`);

        // 3. Graph Retrieval (Walk the graph for connections)
        const connections: string[] = [];
        for (const entity of entities) {
            const paths = await knowledgeGraph.findQuimeraConnections(entity, 2);
            paths.forEach(p => connections.push(p.path));
        }

        // 4. Quimera Synthesis (LLM merges Vector + Graph)
        const synthesisPrompt = `
You are the QUIMERA ENGINE Core.
Your task is to merge Vector Context (fragments) with Graph Context (traversal paths) to find the "Rational Core" of the following query.

QUERY: ${query}

VECTOR CONTEXT:
${contextText}

GRAPH CONNECTIONS:
${connections.join('\n')}

INSTRUCTIONS:
1. Isolate the "Rational Core" (the absolute factual truth).
2. List non-obvious connections found via the Graph paths.
3. Assign a confidence score (0.0 to 1.0).

Return ONLY valid JSON:
{
    "rational_core": "...",
    "connections": ["connection1", "connection2"],
    "confidence": 0.95
}
`;
        try {
            const rawResponse = await queryLLM("System: You are the QUIMERA synthesis kernel.", synthesisPrompt);
            const jsonStr = rawResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
            return JSON.parse(jsonStr);
        } catch (error: any) {
            logger.error(`[Quimera] Synthesis failed: ${error.message}`);
            return {
                rational_core: "Deep synthesis failed. Falling back to standard RAG.",
                connections: [],
                confidence: 0.2
            };
        }
    }

    private async discoverEntities(text: string): Promise<string[]> {
        const prompt = `Extract exactly 3-5 unique technical or geographical entity IDs from this text that would be useful for graph traversal. Return ONLY a comma-separated list.
Text: ${text.slice(0, 2000)}`;

        try {
            const response = await queryLLM("System: Data Extractor.", prompt);
            return response.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    /**
     * Ingests a new fact into the Quimera Graph
     */
    async feed(node: GraphNode, edges: GraphEdge[]) {
        await knowledgeGraph.upsertNode(node);
        for (const edge of edges) {
            await knowledgeGraph.addEdge(edge);
        }
    }
}

export const quimera = new QuimeraEngine();
