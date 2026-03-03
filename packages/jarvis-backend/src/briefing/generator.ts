import * as cron from 'node-cron';
import { Server } from 'socket.io';
import { queryLLM } from '../llm';
import { GoalManager } from '../goals/goalManager';
import { EpisodicMemory } from '../memory/episodic';
import { sendTelegramMessage } from '../telegram';
import { mutationStore, PendingMutation } from '../agents/mutationStore';

export interface Briefing {
    id: string;
    timestamp: string;
    sections: {
        title: string;
        content: string;
    }[];
    pendingMutations?: PendingMutation[];
}

export class BriefingGenerator {
    private job: any | null = null;

    constructor(
        private io: Server,
        private goalManager: GoalManager,
        private episodicMemory: EpisodicMemory
    ) { }

    start(): void {
        const schedule = process.env.BRIEFING_CRON || '0 8 * * *'; // Default: 8 AM
        console.log(`[BRIEFING] Engine starting with schedule: ${schedule}`);

        this.job = cron.schedule(schedule, () => {
            this.generateAndSend().catch(err => console.error(`[BRIEFING] Generation failed: ${err.message}`));
        });
    }

    async generateAndSend(): Promise<void> {
        console.log('[BRIEFING] Generating morning briefing...');

        const goals = await this.goalManager.getActiveGoals();
        const history = await this.episodicMemory.getRecentHistory(24);

        // Pull pending DNA mutations for Section 6
        const pendingMutations = mutationStore.getPendingMutations();
        const mutationSection = pendingMutations.length > 0
            ? mutationStore.getPendingSummary()
            : '_No pending DNA mutations from last night\'s learning cycle._';

        const prompt = `Generate a high-fidelity morning briefing for the Founder (Mr. Petruff).
CONTEXT:
Active Goals: ${JSON.stringify(goals)}
Recent Activity (24h): ${JSON.stringify(history.map(h => ({ task: h.prompt, result: h.result.slice(0, 100) })))}
Pending DNA Mutations: ${pendingMutations.length} awaiting approval

The briefing must have 5 sections:
1. Executive Summary (Tone: Tactical, Command-level)
2. Strategic Progress (Goal alignment)
3. Operational Pulse (Recent squad results)
4. Decision Queue (Tasks needing approval)
5. Daily Mission Recommendation

Return JSON format:
{
  "sections": [
    { "title": "Section Title", "content": "Section Markdown Content" }
  ]
}`;

        const response = await queryLLM("System: Executive Chief of Staff", prompt, 'forge');
        const briefing = JSON.parse(response.replace(/```json|```/g, '').trim()) as Briefing;
        briefing.id = `briefing-${Date.now()}`;
        briefing.timestamp = new Date().toISOString();
        briefing.pendingMutations = pendingMutations;

        // Append DNA Mutations as Section 6 (if any)
        if (pendingMutations.length > 0) {
            briefing.sections.push({
                title: `🧬 DNA Mutations (${pendingMutations.length} pending)`,
                content: mutationSection
            });
        }

        // 1. Send via Socket.io to Web UI
        this.io.emit('jarvis/briefing', briefing);

        // 2. Send via Telegram with approve/reject buttons per mutation
        const founderId = process.env.FOUNDER_TELEGRAM_ID;
        if (founderId) {
            let telegramText = `⚡ *MORNING BRIEFING - ${new Date().toLocaleDateString()}*\n\n`;
            briefing.sections.slice(0, 5).forEach(s => {
                telegramText += `*${s.title.toUpperCase()}*\n${s.content.slice(0, 300)}\n\n`;
            });

            // Build inline keyboard: core actions + per-mutation approve buttons
            const inlineKeyboard: any[] = [
                [
                    { text: '✅ Approve All Tasks', callback_data: `briefing_approve_${briefing.id}` },
                    { text: '💬 Discuss', callback_data: `briefing_discuss_${briefing.id}` }
                ]
            ];

            // Add DNA mutation approval buttons (up to 5 per briefing)
            if (pendingMutations.length > 0) {
                telegramText += `\n🧬 *DNA MUTATIONS (${pendingMutations.length} pending)*\n`;
                pendingMutations.slice(0, 5).forEach((m, i) => {
                    telegramText += `\n${i + 1}. *${m.agentId}* (${m.field}): _${m.proposedChange.slice(0, 80)}..._\n`;
                    inlineKeyboard.push([
                        { text: `✅ Apply ${m.agentId}`, callback_data: `mutation_approve_${m.id}` },
                        { text: `❌ Reject`, callback_data: `mutation_reject_${m.id}` }
                    ]);
                });

                if (pendingMutations.length > 1) {
                    inlineKeyboard.push([
                        { text: `🧬 Apply All ${pendingMutations.length} Mutations`, callback_data: `mutation_approve_all` }
                    ]);
                }
            }

            await sendTelegramMessage(founderId, telegramText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
            console.log(`[BRIEFING] Delivered to Telegram ID: ${founderId} (${pendingMutations.length} mutations included)`);
        }
    }

    stop(): void {
        this.job?.stop();
    }
}
