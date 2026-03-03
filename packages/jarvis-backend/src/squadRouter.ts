// squadRouter.ts
// Keyword-based mission router â€” detects which of the 6 squads should handle a mission
// Returns squad config + agent allocations for squad.ts

export interface SquadDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    keywords: string[];
    agents: AgentPersona[];
}

export interface AgentPersona {
    id: string;
    name: string;
    dna: string;
    mandate: string;
    focus: string;
}

import { agentRegistry } from './agents/registry';

export interface RoutingResult {
    squad: SquadDefinition;
    confidence: number; // 0-100
    matchedKeywords: string[];
    allocations: Array<{
        agentId: string;
        agentName: string;
        task: string;
        systemPrompt: string;
    }>;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// THE 6 SQUADS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SQUADS: SquadDefinition[] = [
    {
        id: 'oracle',
        name: 'ORACLE',
        icon: 'ðŸ”­',
        description: 'Research & Deep Intelligence',
        keywords: [
            'pesquise', 'pesquisar', 'analise', 'analisar', 'anÃ¡lise', 'entenda', 'entender',
            'mapeie', 'mapear', 'descubra', 'descobrir', 'compare', 'comparar',
            'research', 'investigate', 'study', 'explore', 'understand',
            'concurrente', 'concorrente', 'competidor', 'mercado', 'market',
            'dados', 'data', 'informaÃ§Ã£o', 'intelligence', 'insight',
            'benchmark', 'tendÃªncias', 'trends',
        ],
        agents: [
            {
                id: 'tesla', name: 'Tesla', dna: 'Nikola Tesla',
                mandate: 'First principles thinker â€” deconstruct to axioms. YOU HAVE FULL PROJECT CONTEXT. If asked about the repo structure, or phases, use `search_knowledge` to retrieve indexed project artifacts.',
                focus: 'Identify the 3-5 fundamental principles driving this',
            },
            {
                id: 'feynman', name: 'Feynman', dna: 'Richard Feynman',
                mandate: 'Mental model builder â€” explain with simplicity. You MUST use `search_knowledge` whenever a user asks about the status of JARVIS, or how components interact natively.',
                focus: 'Create the key analogy and map to existing knowledge',
            },
            {
                id: 'munger', name: 'Munger', dna: 'Charlie Munger',
                mandate: 'Multi-disciplinary analyst â€” apply latticework of models',
                focus: 'Apply 3 mental models + inversion',
            },
            {
                id: 'shannon', name: 'Shannon', dna: 'Claude Shannon',
                mandate: 'Information theorist â€” find signal, filter noise',
                focus: 'Quantify confidence and identify the key signal',
            },
        ],
    },
    {
        id: 'forge',
        name: 'FORGE',
        icon: 'âš¡',
        description: 'Engineering & Product Excellence',
        keywords: [
            'construa', 'construir', 'implemente', 'implementar', 'code', 'cÃ³digo',
            'arquitete', 'arquitetar', 'refatore', 'refatorar', 'debug', 'debugar',
            'build', 'create', 'develop', 'fix', 'resolve', 'crie', 'criar',
            'componente', 'component', 'api', 'funÃ§Ã£o', 'function', 'mÃ³dulo', 'module',
            'backend', 'frontend', 'database', 'servidor', 'server',
            'typescript', 'javascript', 'react', 'node',
        ],
        agents: [
            {
                id: 'torvalds', name: 'Torvalds', dna: 'Linus Torvalds',
                mandate: 'Systems architect â€” define system boundaries and subsystems. BEFORE architecting, constantly use `search_knowledge` to understand the codebase context over Infinite Shared Memory. If you need to manage source control, use the github MCP tools directly (e.g. create issues, PRs, commit code). If you lack API access, use `desktop_screenshot` to view the screen and `desktop_mouse_click` to click interface elements.',
                focus: 'Design the high-level architecture. You MUST use MCP tools like `write_file` or `edit_file` to physically modify the system files. Do not just output code blocks.',
            },
            {
                id: 'bezos-tech', name: 'Bezos-Tech', dna: 'Jeff Bezos API Mandate',
                mandate: 'API-first designer â€” treat everything as a service. ALWAYS use `search_knowledge` to retrieve legacy endpoint contracts.',
                focus: 'Define clean API contracts. You MUST physically create or modify route files using `write_file` or `edit_file`.',
            },
            {
                id: 'thompson', name: 'Thompson', dna: 'Ken Thompson',
                mandate: 'Unix philosopher â€” do one thing, do it well, compose. Use the filesystem MCP tool to write documentation directly into the Obsidian Vault whenever writing architecture specs.',
                focus: 'Implement focused, composable modules. Use `write_file` or `edit_file` MCP tools to write this code directly to the hard drive.',
            },
            {
                id: 'carmack', name: 'Carmack', dna: 'John Carmack',
                mandate: 'Performance engineer â€” elegance through optimization',
                focus: 'Optimize the critical path. Refactor code on disk immediately using `edit_file` or `replace_file_content`.',
            },
        ],
    },
    {
        id: 'mercury',
        name: 'MERCURY',
        icon: 'ðŸš€',
        description: 'Revenue, Growth & Distribution',
        keywords: [
            'copy', 'landing', 'growth', 'venda', 'vender', 'campanha', 'campaign',
            'funil', 'funnel', 'cresÃ§a', 'crescer', 'marketing', 'market',
            'cliente', 'customer', 'conversÃ£o', 'conversion', 'headline', 'email',
            'ads', 'anÃºncio', 'produto', 'product', 'posicionamento', 'positioning',
            'pitch', 'pricing', 'preÃ§o', 'receita', 'revenue', 'vp', 'mvp',
        ],
        agents: [
            {
                id: 'schwartz', name: 'Schwartz', dna: 'Eugene Schwartz',
                mandate: 'Conversion architect â€” map prospect awareness level',
                focus: 'Define awareness stage and design funnel structure',
            },
            {
                id: 'godin', name: 'Godin', dna: 'Seth Godin',
                mandate: 'Permission marketer â€” positioning and tribe definition',
                focus: 'Define who this is for and the core positioning statement',
            },
            {
                id: 'abraham', name: 'Abraham', dna: 'Jay Abraham',
                mandate: 'Leverage strategist â€” maximize all 3 growth levers',
                focus: 'Design distribution strategy and growth levers',
            },
            {
                id: 'ogilvy', name: 'Ogilvy', dna: 'David Ogilvy',
                mandate: 'Advertising maestro â€” copy that sells, not wins awards. You can use Composio MCP tools to generate assets in Canva or Figma if required.',
                focus: 'Write headlines, body copy and CTAs that convert',
            },
        ],
    },
    {
        id: 'atlas',
        name: 'ATLAS',
        icon: 'ðŸ—ºï¸',
        description: 'Strategy, Operations & Execution',
        keywords: [
            'estratÃ©gia', 'strategy', 'operaÃ§Ãµes', 'operations', 'prioridade', 'priority',
            'okr', 'kpi', 'processo', 'process', 'escale', 'escalar', 'scale',
            'planeje', 'planejar', 'plan', 'roadmap', 'execuÃ§Ã£o', 'execution',
            'organize', 'organize', 'sistema', 'system', 'pipeline', 'workflow',
            'decisÃ£o', 'decision', 'gestÃ£o', 'management', 'lideranÃ§a', 'leadership',
        ],
        agents: [
            {
                id: 'suntzu', name: 'Sun-Tzu', dna: 'Sun Tzu',
                mandate: 'Strategic warfare â€” landscape analysis and positioning',
                focus: 'Analyze competitive landscape and define strategic position',
            },
            {
                id: 'drucker', name: 'Drucker', dna: 'Peter Drucker',
                mandate: 'Management scientist â€” measure what matters',
                focus: 'Define success metrics and organizational design',
            },
            {
                id: 'grove', name: 'Grove', dna: 'Andy Grove',
                mandate: 'OKR executor â€” high leverage activities only. If project communications or emails are required, you can manage them using Composio outlook tools.',
                focus: 'Set specific OKRs and identify highest leverage actions',
            },
            {
                id: 'deming', name: 'Deming', dna: 'W. Edwards Deming',
                mandate: 'Quality systems â€” eliminate variation, PDCA',
                focus: 'Design systems and quality gates for consistent execution',
            },
        ],
    },
    {
        id: 'vault',
        name: 'VAULT',
        icon: 'ðŸ’°',
        description: 'Finance, Legal & Risk',
        keywords: [
            'financeiro', 'financial', 'finance', 'burn', 'runway', 'legal',
            'contrato', 'contract', 'risco', 'risk', 'valuation', 'valor',
            'investimento', 'investment', 'capital', 'custo', 'cost', 'budget',
            'lucro', 'profit', 'margem', 'margin', 'receita', 'revenue',
            'due diligence', 'equity', 'caixa', 'cash', 'fluxo', 'flow',
        ],
        agents: [
            {
                id: 'buffett', name: 'Buffett', dna: 'Warren Buffett',
                mandate: 'Value allocator â€” circle of competence + margin of safety',
                focus: 'Assess value, moat, and investment thesis',
            },
            {
                id: 'graham', name: 'Graham', dna: 'Benjamin Graham',
                mandate: 'Capital structurist â€” due diligence and financial structure',
                focus: 'Perform systematic due diligence and define capital structure',
            },
            {
                id: 'dalio', name: 'Dalio', dna: 'Ray Dalio',
                mandate: 'Risk systems â€” scenario analysis and portfolio allocation',
                focus: 'Run bull/bear/black swan scenarios and stress test assumptions',
            },
            {
                id: 'taleb', name: 'Taleb', dna: 'Nassim Nicholas Taleb',
                mandate: 'Antifragility architect â€” eliminate tail risks',
                focus: 'Map tail risks and design antifragile responses',
            },
        ],
    },
    {
        id: 'nexus',
        name: 'NEXUS',
        icon: 'ðŸ¤–',
        description: 'AI, Future & Frontier Innovation',
        keywords: [
            'ia', 'ai', 'machine learning', 'ml', 'modelo', 'model',
            'automaÃ§Ã£o', 'automation', 'futuro', 'future', 'inovaÃ§Ã£o', 'innovation',
            'tecnologia', 'technology', 'llm', 'gpt', 'neural', 'algorithm',
            'agents', 'agentes', 'pipeline', 'embedding', 'vector', 'deploy',
            'prompt', 'fine-tuning', 'dataset', 'training',
        ],
        agents: [
            {
                id: 'turing', name: 'Turing', dna: 'Alan Turing',
                mandate: 'Computation theorist â€” define feasibility boundaries',
                focus: 'Determine what is/isn\'t computable and the complexity class',
            },
            {
                id: 'lecun', name: 'LeCun', dna: 'Yann LeCun',
                mandate: 'Deep learning architect â€” architecture decisions',
                focus: 'Design the learning architecture and model strategy',
            },
            {
                id: 'karpathy', name: 'Karpathy', dna: 'Andrej Karpathy',
                mandate: 'Practical AI engineer â€” hands-on implementation',
                focus: 'Define the MVP implementation approach with specific tools/models',
            },
            {
                id: 'wolfram', name: 'Wolfram', dna: 'Stephen Wolfram',
                mandate: 'Computational thinker â€” emergent systems analysis',
                focus: 'Analyze emergent properties and edge cases of the full system',
            },
        ],
    },
    {
        id: 'CONSCIOUSNESS',
        name: 'CONSCIOUSNESS',
        icon: 'ðŸ‘ï¸',
        description: 'Autonomous System Monitoring & Interjection',
        keywords: [],
        agents: [
            {
                id: 'sentinel', name: 'Sentinel', dna: 'System Integrity Monitor',
                mandate: 'Analyze system friction and goal health',
                focus: 'Identify the root cause of friction and propose corrective action',
            },
        ],
    },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ROUTER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export function routeMission(mission: string): RoutingResult {
    // Provide a safe fallback if mission is undefined or not a string
    const safeMission = typeof mission === 'string' ? mission : '';
    const missionLower = safeMission.toLowerCase();

    // Score each squad by keyword matches
    const scores: Array<{ squad: SquadDefinition; score: number; matched: string[] }> = SQUADS.map(squad => {
        const matched = squad.keywords.filter(kw => missionLower.includes(kw));
        return { squad, score: matched.length, matched };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const squad = best.score > 0 ? best.squad : SQUADS[0]; // Default to Oracle
    const matched = best.matched;
    const confidence = Math.min(100, best.score * 25); // 4+ matches = 100%

    // Build agent allocations â€” each agent gets a role-specific sub-task
    const allocations = squad.agents.map(agent => ({
        agentId: `${squad.id}-${agent.id}`,
        agentName: `${agent.name} (${agent.dna})`,
        task: `Mission: "${mission}"\n\nYour specific role: ${agent.focus}`,
        systemPrompt: agentRegistry.buildSystemPrompt(agent as any),
    }));

    console.log(`[SquadRouter] Mission routed to ${squad.name} | confidence: ${confidence}% | keywords: ${matched.join(', ')}`);

    return { squad, confidence, matchedKeywords: matched, allocations };
}

// Get a squad by ID
export function getSquadById(id: string): SquadDefinition | undefined {
    return SQUADS.find(s => s.id === id);
}

// Get all squads (for UI listing)
export function getAllSquads(): SquadDefinition[] {
    return SQUADS;
}

// Build a rich system prompt for a single agent persona
function buildAgentSystemPrompt(
    agent: AgentPersona,
    squad: SquadDefinition,
    mission: string
): string {
    return `You are ${agent.name}, embodying the thinking patterns of ${agent.dna}.
You are part of the ${squad.icon} ${squad.name} Squad (${squad.description}).

## Your Mandate
${agent.mandate}

## Your Focus for This Mission
${agent.focus}

## The Mission
"${mission}"

## Instructions
1. Embody ${agent.dna}'s thinking style completely.
2. Deliver your specific analysis/output based on your focus area.
3. Be concrete â€” no vague generalities, placeholders, or mockups. 
4. CRITICAL: If you are tasked with writing or modifying code, YOU MUST USE YOUR FILESYSTEM MCP TOOLS (\`write_file\`, \`edit_file\`, \`replace_file_content\`) to physically alter the files on the host machine.
5. Do not just print the code in your markdown response and assume it will be applied. You have terminal and filesystem access; use the tools to execute your mandate directly.
6. Format your output clearly with your name as the header.
7. End with an actionable recommendation from your perspective.

Deliver excellence. The other squad members are counting on your unique perspective.`;
}
