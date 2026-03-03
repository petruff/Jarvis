// src/jarvis/dispatcher.ts
// Agent dispatcher — classifies intent and routes to the right department/provider

import { TaskType } from '../providers/types';

export interface DispatchResult {
    agent: string;
    department: string;
    taskType: TaskType;
    systemPromptHint: string;
}

interface IntentRule {
    keywords: string[];
    agent: string;
    department: string;
    taskType: TaskType;
    hint: string;
}

const INTENT_RULES: IntentRule[] = [
    {
        keywords: ['build', 'code', 'implement', 'fix', 'bug', 'test', 'deploy', 'refactor', 'endpoint', 'api', 'function', 'class', 'component'],
        agent: '@dev',
        department: 'ENGINEERING',
        taskType: 'CODE',
        hint: 'You are the Lead Developer. Write clean, production-ready code. Save all deliverables to files.',
    },
    {
        keywords: ['market', 'copy', 'landing', 'campaign', 'seo', 'content', 'post', 'email', 'ads', 'headline', 'hook'],
        agent: '@copywriter',
        department: 'MARKETING',
        taskType: 'MARKETING',
        hint: 'You are the Head of Marketing. Create compelling copy and marketing assets.',
    },
    {
        keywords: ['revenue', 'pricing', 'sales', 'funnel', 'conversion', 'checkout', 'offer', 'upsell', 'close'],
        agent: '@cro',
        department: 'REVENUE',
        taskType: 'CODE',
        hint: 'You are the Chief Revenue Officer. Focus on conversion, pricing strategy, and revenue optimization.',
    },
    {
        keywords: ['strategy', 'think', 'analyze', 'compare', 'decision', 'plan', 'roadmap', 'prioritize', 'tradeoff'],
        agent: '@advisor',
        department: 'ADVISOR',
        taskType: 'REASONING',
        hint: 'You are a senior strategic advisor. Think deeply, surface second-order consequences, make recommendations.',
    },
    {
        keywords: ['status', 'brief', 'update', 'where', "what's happening", 'progress', 'summary', 'recap'],
        agent: '@cpo',
        department: 'OPERATIONS',
        taskType: 'FAST',
        hint: 'You are the Chief of Staff. Provide concise, accurate status updates from memory context.',
    },
    {
        keywords: ['finance', 'money', 'runway', 'burn', 'budget', 'cost', 'revenue forecast', 'p&l', 'cash'],
        agent: '@cfo',
        department: 'FINANCE',
        taskType: 'CODE',
        hint: 'You are the CFO. Provide financial analysis, projections, and budget recommendations.',
    },
    {
        keywords: ['legal', 'compliance', 'contract', 'terms', 'gdpr', 'privacy', 'risk', 'liability'],
        agent: '@legal',
        department: 'LEGAL',
        taskType: 'REASONING',
        hint: 'You are the Legal Counsel. Analyze legal risks and compliance requirements carefully.',
    },
    {
        keywords: ['research', 'competitor', 'market size', 'landscape', 'benchmark', 'investigate', 'find out'],
        agent: '@researcher',
        department: 'RESEARCH',
        taskType: 'REASONING',
        hint: 'You are the Head of Research. Gather, synthesize, and present findings clearly.',
    },
    {
        keywords: ['data', 'analytics', 'metric', 'kpi', 'dashboard', 'report', 'sql', 'pipeline'],
        agent: '@data-analyst',
        department: 'DATA',
        taskType: 'CODE',
        hint: 'You are the Data Analyst. Provide data-driven insights, write queries, build pipelines.',
    },
];

export function dispatch(message: string): DispatchResult {
    const lower = message.toLowerCase();

    for (const rule of INTENT_RULES) {
        if (rule.keywords.some(kw => lower.includes(kw))) {
            return {
                agent: rule.agent,
                department: rule.department,
                taskType: rule.taskType,
                systemPromptHint: rule.hint,
            };
        }
    }

    // Default: JARVIS direct response
    return {
        agent: '@jarvis',
        department: 'CORE',
        taskType: 'DEFAULT',
        systemPromptHint: 'Respond as JARVIS directly. Be concise and decisive.',
    };
}
