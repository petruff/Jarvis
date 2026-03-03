// src/jarvis/squads/index.ts
// Squad registry — routes to the right squad and executes in parallel

import { Message, TaskType } from '../../providers/types';
import { ProviderRouter } from '../../providers/router';
import { logger } from '../../logger';
import { validateForgeOutput } from '../../security/sandbox';

import { buildOracleMessages } from './oracle';
import { buildForgeMessages } from './forge';
import { buildMercuryMessages } from './mercury';
import { buildAtlasMessages } from './atlas';
import { buildVaultMessages } from './vault';
import { buildBoardMessages } from './board';
import { buildProdutoMessages } from './produto';
import { buildRevenueMessages } from './revenue';
import { buildNexusMessages } from './nexus';
import { buildSentinelMessages } from './sentinel';


// ─── Types ────────────────────────────────────────────────────────────────────

export type SquadId =
    | 'oracle'
    | 'forge'
    | 'mercury'
    | 'atlas'
    | 'vault'
    | 'board'
    | 'produto'
    | 'revenue'
    | 'nexus'
    | 'sentinel';

export interface SquadMeta {
    id: SquadId;
    name: string;
    icon: string;
    tagline: string;
    agents: string[];
    keywords: string[];
    taskType: TaskType;
}

export interface SquadResult {
    squadId: SquadId;
    squadName: string;
    result: string;
    durationMs: number;
}

// ─── Squad definitions ────────────────────────────────────────────────────────

export const SQUAD_REGISTRY: SquadMeta[] = [
    {
        id: 'oracle',
        name: 'Oracle',
        icon: '🔭',
        tagline: 'Research & Intelligence',
        agents: ['Tesla', 'Feynman', 'Munger', 'Shannon'],
        keywords: ['pesquis', 'anali', 'intelig', 'competit', 'mercado', 'descubr', 'research', 'investig', 'benchmark', 'landscap'],
        taskType: 'REASONING',
    },
    {
        id: 'forge',
        name: 'Forge',
        icon: '⚡',
        tagline: 'Engineering & Product Excellence',
        agents: ['Torvalds', 'Carmack', 'Martin', 'Fowler', 'Kim-DevOps', 'Cohn'],
        keywords: ['código', 'code', 'build', 'implement', 'arquitet', 'debug', 'program', 'script', 'api', 'endpoint', 'função', 'refactor', 'deploy'],
        taskType: 'CODE',
    },
    {
        id: 'mercury',
        name: 'Mercury',
        icon: '🚀',
        tagline: 'Marketing, Growth & Distribution',
        agents: ['Ogilvy', 'Schwartz', 'Holiday', 'Ellis', 'Dean', 'Chen', 'Vaynerchuk', 'Neumeier', 'McKee'],
        keywords: ['marketing', 'copy', 'campanha', 'campaign', 'growth', 'seo', 'landing', 'anúncio', 'ads', 'headline', 'email marketing', 'conteúdo', 'content'],
        taskType: 'MARKETING',
    },
    {
        id: 'atlas',
        name: 'Atlas',
        icon: '🗺️',
        tagline: 'Strategy, Operations & Execution',
        agents: ['Sun-Tzu', 'Drucker', 'Grove', 'Deming'],
        keywords: ['estratégia', 'strategy', 'okr', 'operação', 'processo', 'escal', 'prioridad', 'roadmap', 'planejamento', 'plan'],
        taskType: 'REASONING',
    },
    {
        id: 'vault',
        name: 'Vault',
        icon: '💰',
        tagline: 'Finance, Legal & Risk',
        agents: ['Buffett', 'Taleb', 'Graham', 'Lessig', 'Schneier', 'Solove'],
        keywords: ['financ', 'legal', 'contrato', 'contract', 'risco', 'risk', 'compliance', 'lgpd', 'segurança', 'security', 'privac', 'orçamento', 'budget', 'runway'],
        taskType: 'REASONING',
    },
    {
        id: 'board',
        name: 'Board',
        icon: '🎯',
        tagline: 'Strategic Advisors',
        agents: ['Thiel', 'Musk', 'Bezos', 'Graham-PG', 'Dalio', 'Hormozi', 'Jobs', 'Ovens'],
        keywords: ['board', 'advisor', 'decisão', 'decision', 'opinião', 'perspectiva', 'convoque', 'conselho', 'dilema'],
        taskType: 'REASONING',
    },
    {
        id: 'produto',
        name: 'Produto',
        icon: '🎨',
        tagline: 'Product Vision & UX',
        agents: ['Jobs-PM', 'Ries', 'Blank', 'Norman', 'Gothelf'],
        keywords: ['produto', 'product', 'feature', 'prd', 'ux', 'roadmap', 'usuário', 'onboarding', 'mvp', 'user stor'],
        taskType: 'CODE',
    },
    {
        id: 'revenue',
        name: 'Revenue',
        icon: '💸',
        tagline: 'Sales, CS & Revenue Growth',
        agents: ['Gordon', 'Cialdini', 'Blount', 'Mehta'],
        keywords: ['vend', 'revenue', 'ltv', 'cac', 'churn', 'pricing', 'funil de ven', 'sales', 'customer success', 'oferta', 'close'],
        taskType: 'MARKETING',
    },
    {
        id: 'nexus',
        name: 'Nexus',
        icon: '🤖',
        tagline: 'AI, Technology & Innovation',
        agents: ['Turing', 'Karpathy', 'LeCun', 'Wolfram', 'Russell'],
        keywords: ['ia ', 'ai ', 'ml ', 'machine learning', 'modelo', 'llm', 'automação', 'inovação', 'tecnologia de front', 'neural', 'algoritmo'],
        taskType: 'CODE',
    },
    {
        id: 'sentinel',
        name: 'Sentinel',
        icon: '🛡️',
        tagline: 'Security, Privacy & Compliance',
        agents: ['Schneier', 'Mitnick', 'Zuboff', 'Lessig'],
        keywords: ['segurança', 'security', 'privacidade', 'privacy', 'compliance', 'lgpd', 'gdpr', 'vulnerabilidade', 'audit', 'pen test', 'hacking', 'risco de segurança', 'security risk'],
        taskType: 'REASONING',
    },
];

// ─── Detection ─────────────────────────────────────────────────────────────

export interface SquadDetection {
    squad: SquadMeta;
    score: number;
}

export function detectSquads(message: string, maxSquads = 4): SquadMeta[] {
    const lower = message.toLowerCase();

    const scored: SquadDetection[] = SQUAD_REGISTRY.map(squad => ({
        squad,
        score: squad.keywords.filter(kw => lower.includes(kw)).length,
    })).filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

    // Always return at least oracle
    if (scored.length === 0) return [SQUAD_REGISTRY[0]];
    return scored.slice(0, maxSquads).map(s => s.squad);
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildMessages(squadId: SquadId, task: string, context: string, memory: string): Message[] {
    switch (squadId) {
        case 'oracle': return buildOracleMessages(task, context, memory);
        case 'forge': return buildForgeMessages(task, context, memory);
        case 'mercury': return buildMercuryMessages(task, context, memory);
        case 'atlas': return buildAtlasMessages(task, context, memory);
        case 'vault': return buildVaultMessages(task, context, memory);
        case 'board': return buildBoardMessages(task, context, memory);
        case 'produto': return buildProdutoMessages(task, context, memory);
        case 'revenue': return buildRevenueMessages(task, context, memory);
        case 'nexus': return buildNexusMessages(task, context, memory);
        case 'sentinel': return buildSentinelMessages(task, context, memory);
    }
}

// ─── Execution ────────────────────────────────────────────────────────────────

const router = new ProviderRouter();

// Code-generating squads whose output is validated by the Sentinel Sandbox
const SANDBOXED_SQUADS: SquadId[] = ['forge', 'nexus'];

export async function runSquad(
    squad: SquadMeta,
    task: string,
    context: string,
    memory: string
): Promise<SquadResult> {
    const start = Date.now();
    const messages = buildMessages(squad.id, task, context, memory);
    logger.info(`[Squad:${squad.id}] Starting with provider taskType=${squad.taskType}`);
    const response = await router.call(messages, squad.taskType);
    const durationMs = Date.now() - start;
    logger.info(`[Squad:${squad.id}] Done in ${durationMs}ms (${response.model})`);

    let result = response.content;

    // ── Sentinel Sandbox: validate code output from Forge / Nexus ──────────
    if (SANDBOXED_SQUADS.includes(squad.id)) {
        const validation = validateForgeOutput(result);

        if (validation.vetoed) {
            logger.warn(`[Squad:${squad.id}] SENTINEL VETO — dangerous code detected. Blocking output.`);
            result = `${validation.vetoReason}\n\n---\n\n_Original output withheld by Sentinel Sandboxing Layer._`;
        } else if (validation.warnings.length > 0) {
            logger.info(`[Squad:${squad.id}] Sandbox warnings: ${validation.warnings.join('; ')}`);
            result += `\n\n> ⚠️ **Sentinel Notice:** ${validation.warnings.length} code pattern warning(s): ${validation.warnings.slice(0, 3).join('; ')}`;
        }

        logger.info(`[Squad:${squad.id}] Sandbox validation: riskLevel=${validation.blocksAnalyzed > 0 ? 'checked' : 'no-code'}, vetoed=${validation.vetoed}`);
    }

    return { squadId: squad.id, squadName: squad.name, result, durationMs };
}

// Promise.all() — equivalent to Task tool in Claude Code
export async function runSquadsParallel(
    squads: SquadMeta[],
    task: string,
    context: string,
    memory: string
): Promise<SquadResult[]> {
    logger.info(`[Squads] Running ${squads.length} squads in parallel: ${squads.map(s => s.id).join(', ')}`);
    return Promise.all(squads.map(squad => runSquad(squad, task, context, memory)));
}
