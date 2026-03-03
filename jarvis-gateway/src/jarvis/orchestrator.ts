// src/jarvis/orchestrator.ts
// JARVIS v5.0 Orchestrator — detects squads, runs in parallel, consolidates with Kimi

import { ProviderRouter } from '../providers/router';
import { Message } from '../providers/types';
import { loadContext, appendContext, logDecision, logSquadTask, saveDeliverable } from './memory';
import { detectSquads, runSquadsParallel, SquadResult, SQUAD_REGISTRY } from './squads/index';
import { logger } from '../logger';

const router = new ProviderRouter();

const ORCHESTRATOR_SYSTEM = `
Você é JARVIS — AI Operating System do Fundador.

## Identidade
Único ponto de contato entre Fundador e 9 squads especializados.
Não executa tasks diretamente — orquestra, delega e consolida.
Tem memória persistente e aprende com cada ciclo.

## Squads Disponíveis
🔭 ORACLE — pesquisa, inteligência competitiva, análise
⚡ FORGE — engenharia, código, arquitetura, DevOps
🚀 MERCURY — marketing, growth, copy, campanhas, SEO
🗺️ ATLAS — estratégia, operações, OKRs, processos
💰 VAULT — finanças, legal, risco, compliance, LGPD
🎯 BOARD — advisors (Thiel, Musk, Bezos, Graham, Dalio, Hormozi, Jobs, Ovens)
🎨 PRODUTO — visão de produto, PRDs, UX, roadmap
💸 REVENUE — vendas, customer success, pricing
🤖 NEXUS — IA, inovação tecnológica, fronteira técnica

## Protocolo de Consolidação
Ao receber resultados de múltiplos squads:
1. Identifique o insight mais importante de cada squad
2. Resolva contradições explicitamente
3. Apresente recomendação clara e acionável
4. Liste próximos passos numerados
5. Sinalize qualquer item que requer aprovação do Fundador

## Formato Telegram (Markdown)
Use *negrito* para pontos principais. Emojis para escaneabilidade.
Conciso no resumo. Detalhado quando pedido.
Divida em seções claras por squad.
Termine sempre com ⚡ **Próximos Passos** numerados.

## Guardrails Invioláveis
- NUNCA git push sem "APPROVE PUSH" explícito
- NUNCA gaste dinheiro sem aprovação
- Em dúvida sobre risco: consulte VAULT primeiro
`;

export interface OrchestratorResult {
    response: string;
    squadsUsed: string[];
    needsApproval: boolean;
    approvalMessage?: string;
}

export class JarvisOrchestrator {
    private currentSource: 'telegram' | 'whatsapp' | 'gateway' | 'ui' = 'gateway';

    setSource(source: 'telegram' | 'whatsapp' | 'gateway' | 'ui'): this {
        this.currentSource = source;
        return this;
    }

    async process(mission: string): Promise<OrchestratorResult> {
        const memory = loadContext();

        // 1. Detect which squads to activate
        const selectedSquads = detectSquads(mission);
        const squadNames = selectedSquads.map(s => `${s.icon} ${s.name}`).join(', ');

        logger.info(`[Orchestrator] Mission: "${mission.slice(0, 80)}" → Squads: ${squadNames}`);

        // 2. Run all squads in parallel (Promise.all — equivalent to Claude Code Task tool)
        const results = await runSquadsParallel(selectedSquads, mission, memory, memory);

        // 3. Save deliverables and log squad history
        for (const result of results) {
            await saveDeliverable(result.squadId, `result-${Date.now()}.md`, result.result);
            logSquadTask(result.squadId, mission, result.result);
        }

        // 4. Consolidate with Kimi K2.5
        const consolidated = await this.consolidate(mission, results, memory);

        // 5. Bridge to jarvis-backend — makes this task visible in the desktop UI
        const backendUrl = process.env.JARVIS_BACKEND_URL || 'http://localhost:3000';
        try {
            await fetch(`${backendUrl}/api/tasks/external`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission,
                    squad: selectedSquads.map(s => s.name).join(' + '),
                    squadIcon: selectedSquads.length === 1 ? selectedSquads[0].icon : '⚡',
                    agentIds: selectedSquads.flatMap(s => s.agents.map(a => `${s.id}-${a}`)),
                    status: 'DONE',
                    result: consolidated,
                    source: this.currentSource || 'gateway',
                    durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
                }),
            });
        } catch {
            // Backend unreachable — silent fail, gateway still works standalone
            logger.warn('[Orchestrator] Could not bridge task to backend (backend may not be running)');
        }

        // 6. Update memory
        appendContext(
            `**Missão:** ${mission.slice(0, 100)}\n**Squads:** ${squadNames}\n**Resposta (resumo):** ${consolidated.slice(0, 300)}`
        );

        // Check if any response requires approval
        const needsApproval = consolidated.includes('[AGUARDANDO APROVAÇÃO]');

        const header = `⚡ *JARVIS* — ${squadNames}\n\n`;
        const fullResponse = header + consolidated;

        return {
            response: fullResponse,
            squadsUsed: selectedSquads.map(s => s.id),
            needsApproval,
        };
    }

    private async consolidate(
        mission: string,
        results: SquadResult[],
        memory: string
    ): Promise<string> {
        // Single squad — return directly, no overhead
        if (results.length === 1) {
            return `## ${results[0].squadName.toUpperCase()}\n\n${results[0].result}`;
        }

        const resultsText = results
            .map(r => `### ${r.squadName.toUpperCase()} (${r.durationMs}ms)\n${r.result}`)
            .join('\n\n---\n\n');

        const messages: Message[] = [
            {
                role: 'system',
                content: `${ORCHESTRATOR_SYSTEM}\n\n## MEMÓRIA\n${memory.slice(0, 3000)}`,
            },
            {
                role: 'user',
                content: `Consolide estes resultados de múltiplos squads em uma resposta clara e acionável.

MISSÃO: ${mission}

RESULTADOS DOS SQUADS:
${resultsText}

Use Telegram Markdown. Formato:
1. *Síntese Principal* — o insight mais importante de tudo
2. Uma seção por squad com os pontos essenciais
3. *Recomendação Final* — o que fazer agora
4. ⚡ *Próximos Passos* — lista numerada, cada item com responsável
5. Se houver item que requer aprovação, marque com [AGUARDANDO APROVAÇÃO]

Seja direto, escaneável, acionável. Máximo 1500 caracteres no total.`,
            },
        ];

        const response = await router.call(messages, 'MARKETING'); // MARKETING → Kimi K2.5
        return response.content;
    }
}

// Export singleton for easy import
export const orchestrator = new JarvisOrchestrator();

// Export squad list for /squads command
export { SQUAD_REGISTRY };
