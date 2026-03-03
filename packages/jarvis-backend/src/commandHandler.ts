import { agentRegistry } from './agents/registry';
import { queryLLM, queryLLMStream } from './llm';
import { runAgentLoop } from './agent';
import { memory } from './memory';
import { sendWhatsAppMessage } from './whatsapp';
import { sendTelegramMessage } from './telegram';
import { webSearch, needsWebSearch } from './search';
import { runSquadPlan, extractAndSaveFiles } from './squad';
import { analyzeScreen, isScreenCommand } from './screenshot';
import { updateTask } from './taskQueue';

export class CommandHandler {
    private io: any;
    private JARVIS_SYSTEM_PROMPT: string;

    constructor(io: any, systemPrompt: string) {
        this.io = io;
        this.JARVIS_SYSTEM_PROMPT = systemPrompt;
    }

    /**
     * Processes a command from any source.
     * @param command The text command
     * @param userId The user ID (e.g. 'Paulo', phone number)
     * @param source 'voice', 'whatsapp', 'telegram'
     * @param onResponse Callback to send immediate responses back to the source
     */
    async handle(command: string, userId: string, source: string, onResponse: (text: string) => void) {
        let cmd = command.toLowerCase().trim();
        const agent = 'jarvis'; // Default agent for responses
        const user = userId || 'User';

        // Remove "jarvis" prefix if present
        if (cmd.startsWith('jarvis ')) {
            cmd = cmd.slice(7).trim();
        }

        console.log(`[CommandHandler] Received: "${cmd}" [User: ${user}] [Source: ${source}]`);

        // --- 0. Identity / Meta Commands ---
        if (cmd.startsWith("my name is ") || cmd.startsWith("call me ") || cmd.startsWith("i am ")) {
            const newName = cmd.replace(/^(my name is|call me|i am)\s+/i, '').trim();
            const formattedName = newName.charAt(0).toUpperCase() + newName.slice(1);
            onResponse(`Hello, ${formattedName}. I have updated your voice profile.`);
            this.io.emit('jarvis/control', { type: 'set_identity', data: { name: formattedName } });
            return;
        }

        // --- 0b. STOP / CANCEL command ---
        if (['stop', 'halt', 'cancel', 'abort', 'silence', 'quiet', 'shut up'].includes(cmd)) {
            this.io.emit('jarvis/control', { type: 'stop' });
            onResponse('Halting all operations.');
            return;
        }

        // --- 0c. SCREEN VISION command ---
        if (isScreenCommand(cmd)) {
            onResponse('Analyzing your screen...');
            const analysis = await analyzeScreen(cmd);
            onResponse(analysis);
            memory.add('assistant', analysis);
            return;
        }

        // --- MEMORY INTEGRATION ---
        memory.add('user', cmd);
        const recentContext = memory.getRecentContext(5);

        // --- 1. Slash Commands (Explicit Delegation) ---
        if (cmd.startsWith('/ask ')) {
            const parts = cmd.split(' ');
            const targetName = parts[1];
            const query = parts.slice(2).join(' ');
            const targetAgent = agentRegistry.getAgent(targetName);

            if (targetAgent) {
                onResponse(`Delegating to ${targetAgent.name}...`);
                this.io.emit('jarvis/control', { type: 'switch_agent', agent: targetAgent.id });

                try {
                    const response = await queryLLM(agentRegistry.buildSystemPrompt(targetAgent), query);
                    const cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');
                    onResponse(cleanResponse);
                    memory.add('assistant', `[${targetAgent.name}]: ${cleanResponse}`);
                } catch (e: any) {
                    onResponse(`Error: ${e.message}`);
                }
                return;
            } else {
                onResponse(`Agent '${targetName}' not found.`);
                return;
            }
        }

        // --- 2. Tool Execution ---

        // Browser / Open
        if (cmd.startsWith('open ')) {
            const target = cmd.slice(5).trim();
            if (!target.includes('.') && !target.includes('http') && !target.includes('com')) {
                // Computer Agent fallback
                const objective = `open ${target}`;
                onResponse(`Initiating Computer Agent for: "${objective}"...`);
                runAgentLoop(objective, 15, undefined, this.io).then((result) => {
                    onResponse(`Computer Agent finished: ${result}`);
                });
                return;
            }
            // Standard URL
            onResponse(`Opening ${target} on main screen...`);
            // ... Puppeteer logic skipped for simplicity in this extraction, or we can move it here.
            // For now, let's keep it simple: assume if it's a URL, we only support it on the Server via Puppeteer
            // BUT, if source is WhatsApp, we can't "open" it there. We should probably just tell them we opened it on server.
            try {
                const targetUrl = target.startsWith('http') ? target : `https://${target}`;
                const { launch } = require('puppeteer');
                const browser = await launch({ headless: false, defaultViewport: null, args: ['--start-maximized', '--no-sandbox'] });
                const page = await browser.newPage();
                await page.goto(targetUrl);
                onResponse(`Displaying ${targetUrl} on server.`);
            } catch (e: any) {
                onResponse(`Navigation failed: ${e.message}`);
            }
            return;
        }

        // Messaging
        if (cmd.startsWith('whatsapp ')) {
            const parts = cmd.split(' ');
            const number = parts[1];
            const message = parts.slice(2).join(' ');
            if (number && message) {
                const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
                await sendWhatsAppMessage(formattedNumber, message);
                onResponse(`WhatsApp sent to ${number}.`);
                return;
            }
        }

        if (cmd.startsWith('telegram ')) {
            const parts = cmd.split(' ');
            const chatId = parts[1];
            const message = parts.slice(2).join(' ');
            if (chatId && message) {
                sendTelegramMessage(chatId, message);
                onResponse(`Telegram sent to ${chatId}.`);
                return;
            }
        }

        // --- 2.2 REPORTING COMMANDS (*status, *team, *brief) ---
        if (cmd === '*team' || cmd === 'team status' || cmd === 'squad status') {
            const squadYaml = require('js-yaml').load(require('fs').readFileSync('squads/ai-squad-team/squad.yaml', 'utf8'));
            let report = "## 🛡️ JARVIS SQUAD ROSTER\n\n";
            let totalAgents = 0;

            for (const [division, agents] of Object.entries(squadYaml.divisions)) {
                report += `### ${division.toUpperCase()}\n`;
                if (Array.isArray(agents)) {
                    report += agents.map((a: string) => `- ${a}`).join('\n') + '\n\n';
                    totalAgents += agents.length;
                }
            }
            report += `**Total Active Agents:** ${totalAgents}`;
            onResponse(report);
            return;
        }

        if (cmd.includes('status do sistema') || cmd.includes('system status') || cmd === '*status') {
            onResponse(`Compilando diagnóstico do sistema...`);
            try {
                const { getTelemetry } = require('./telemetry');
                const telemetry = getTelemetry();

                const { getRateLimiterStatus } = require('./rateLimiter');
                const rateLimit = getRateLimiterStatus();

                const context = `
[REAL-TIME SYSTEM TELEMETRY]
CPU Usage: ${telemetry.cpuUsage.toFixed(1)}%
Memory Usage: ${telemetry.memoryUsageMB.toFixed(0)} MB
Uptime: ${telemetry.uptimeHours.toFixed(2)} hours
Circuit Breaker: ${rateLimit.circuitOpen ? 'OPEN (BLOCKED)' : 'CLOSED (HEALTHY)'}
API Calls Today: ${rateLimit.totalCallsToday}

User Question: ${cmd}
Task: Summarize this system status briefly and highly professionally, sounding exactly like Jarvis. State the CPU, Memory and API Health.
`;
                const response = await queryLLM(this.JARVIS_SYSTEM_PROMPT, context);
                const cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');
                onResponse(cleanResponse);
                memory.add('assistant', cleanResponse);
            } catch (e: any) {
                onResponse(`System diagnostics currently unavailable: ${e.message}`);
            }
            return;
        }

        // --- 2.5 SPECIAL SKILLS (News & Scraping) ---

        // NEWS
        if (cmd.includes('news') || cmd.includes('headlines') || cmd.includes('what happened today')) {
            onResponse(`Scanning global news feeds...`);
            // We need to import getLatestNews. For now, assume it's available or move logic here.
            // To keep it clean, we'll return a special response or handle it if we can import it.
            // Let's assume we can import it at the top.
            try {
                const { getLatestNews } = require('./news');
                const articles = await getLatestNews();
                if (articles.length > 0) {
                    const context = `\n\n[REAL-TIME NEWS CONTEXT]\n${articles.map((a: any) => `- ${a.title} (${a.source})`).join('\n')}`;
                    memory.add('system', context);
                    const response = await queryLLM(this.JARVIS_SYSTEM_PROMPT, `User: ${user}\nRequest: ${cmd}\n${context}\n${recentContext}`);
                    onResponse(response);
                    memory.add('assistant', response);
                } else {
                    onResponse("I couldn't find any recent news.");
                }
            } catch (e) {
                onResponse("Error fetching news.");
            }
            return;
        }

        // VIDEO SCRAPING
        if (cmd.includes('scrape') || cmd.includes('watch this') || ((cmd.includes('youtube.com') || cmd.includes('youtu.be')) && !cmd.startsWith('open'))) {
            const urlMatch = cmd.match(/(https?:\/\/[^\s]+)/g);
            if (urlMatch) {
                const url = urlMatch[0];
                onResponse(`👀 Watching video: ${url}...`);
                try {
                    const { VideoScraper } = require('./scrapers/VideoScraper');
                    const videoData = await VideoScraper.scrape(url);
                    const context = `\n\n[VIDEO TRANSCRIPT - ${videoData.platform.toUpperCase()}]\n${videoData.transcript?.substring(0, 10000)}\n(Analyze this video content for the user)`;
                    memory.add('system', context);

                    const response = await queryLLM(this.JARVIS_SYSTEM_PROMPT, `User: ${user}\nRequest: ${cmd}\n${context}\n${recentContext}`);
                    onResponse(response);
                    memory.add('assistant', response);
                } catch (e: any) {
                    onResponse(`❌ Failed to scrape video: ${e.message}`);
                }
                return;
            }
        }

        // --- 2.5 AUTO WEB SEARCH ---
        if (needsWebSearch(cmd)) {
            console.log(`[CommandHandler] Query needs web search: "${cmd}"`);
            const searchResults = await webSearch(cmd);
            memory.add('system', searchResults);

            // Stream the response back
            onResponse('[STREAMING]');
            let fullResponse = '';
            await queryLLMStream(
                this.JARVIS_SYSTEM_PROMPT,
                `User: ${user}\nRequest: ${cmd}\n${searchResults}\nContext: ${recentContext}`,
                (chunk) => {
                    fullResponse += chunk;
                    this.io.emit('jarvis/stream', { chunk });
                }
            );
            onResponse(fullResponse);
            memory.add('assistant', fullResponse);
            return;
        }

        // --- 3. MASTER ORCHESTRATION ---
        const orchestrationPrompt = `
        You are the Master Orchestrator (Jarvis).
        User Request: "${cmd}"
        Available Agents: ${agentRegistry.getAllAgents().map(a => a.name).join(', ')}.

        Decide on the best course of action. Return JSON ONLY.
        
        Scenarios:
        1. **CREATE_AGENT**: If user wants to hire/recruit.
        2. **DELEGATE**: If request needs specific agent action.
        3. **SQUAD_PLAN**: If request is a project needing multiple agents.
        4. **ANSWER**: General question.

        JSON Formats:
        { "type": "CREATE_AGENT", "name": "...", "role": "...", "description": "...", "systemPrompt": "..." }
        { "type": "DELEGATE", "targetAgentId": "...", "task": "..." }
        { "type": "SQUAD_PLAN", "narrative": "...", "allocations": [{ "agentId": "...", "task": "..." }] }
        { "type": "ANSWER", "response": "..." }
        `;

        try {
            const analysis = await queryLLM("You are a JSON-outputting Orchestrator.", orchestrationPrompt);
            const cleanAnalysis = analysis.replace(/```json/g, '').replace(/```/g, '').trim();
            let plan;
            try {
                plan = JSON.parse(cleanAnalysis);
            } catch (jsonError) {
                console.log("Orchestration JSON parse failed, falling back to direct answer.");
            }

            if (plan) {
                if (plan.type === 'CREATE_AGENT') {
                    const success = agentRegistry.createDynamicAgent(plan.name, plan.role, plan.description, plan.systemPrompt);
                    if (success) onResponse(`✅ Recruited **${plan.name}**.`);
                    else onResponse(`❌ Failed to recruit.`);
                    return;
                }

                if (plan.type === 'SQUAD_PLAN') {
                    onResponse(`⚡ Launching Squad Protocol: ${plan.narrative}`);
                    if (plan.allocations && Array.isArray(plan.allocations)) {
                        // Cap allocations at 3 agents to prevent runaway parallel API usage
                        const cappedAllocations = plan.allocations.slice(0, 3);
                        if (plan.allocations.length > 3) {
                            console.warn(`[CommandHandler] SQUAD_PLAN trimmed from ${plan.allocations.length} → 3 agents (cap enforced)`);
                        }
                        // Enrich each allocation with agent system prompts
                        const enrichedAllocations = cappedAllocations.map((alloc: any) => {
                            const agentDef = agentRegistry.getAgent(alloc.agentId);
                            return {
                                agentId: alloc.agentId || 'jarvis',
                                agentName: agentDef?.name || alloc.agentId,
                                task: alloc.task,
                                systemPrompt: agentDef ? agentRegistry.buildSystemPrompt(agentDef) : this.JARVIS_SYSTEM_PROMPT,
                            };
                        });

                        // Run all agents in PARALLEL — non-blocking
                        const missionId = `cmd-${Date.now()}`;
                        runSquadPlan(missionId, plan.narrative, enrichedAllocations, this.io, this.JARVIS_SYSTEM_PROMPT)
                            .then(summary => {
                                onResponse(summary);
                                memory.add('assistant', summary);
                            })
                            .catch(err => {
                                onResponse(`Squad error: ${err.message}`);
                            });
                    }
                    return;
                }


                if (plan.type === 'DELEGATE') {
                    const targetAgent = agentRegistry.getAgent(plan.targetAgentId);
                    if (targetAgent) {
                        onResponse(`Delegating to **${targetAgent.name}**...`);
                        this.io.emit('jarvis/control', { type: 'switch_agent', agent: targetAgent.id });

                        const result = await runAgentLoop(
                            plan.task,
                            5, // Capped from 10 → 5 to limit API calls per delegation
                            agentRegistry.buildSystemPrompt(targetAgent),
                            this.io,
                            targetAgent.id
                        );
                        onResponse(`**${targetAgent.name}** reports: ${result}`);
                        memory.add('assistant', `[${targetAgent.name} REPORT]: ${result}`);
                    } else {
                        onResponse(`Agent '${plan.targetAgentId}' not found.`);
                    }
                    return;
                }

                if (plan.type === 'ANSWER') {
                    onResponse(plan.response);
                    memory.add('assistant', plan.response);
                    return;
                }
            }
        } catch (e) {
            console.error("Orchestration failed", e);
        }

        // Fallback: Streamed Direct Answer
        onResponse('[STREAMING]');
        let streamedResponse = '';
        await queryLLMStream(
            this.JARVIS_SYSTEM_PROMPT,
            `User: ${user}\nRequest: ${cmd}\nContext: ${recentContext}\nSource: ${source}`,
            (chunk) => {
                streamedResponse += chunk;
                this.io.emit('jarvis/stream', { chunk });
            }
        );
        this.io.emit('jarvis/stream_end', { full: streamedResponse });
        onResponse(streamedResponse);
        memory.add('assistant', streamedResponse);
    }
}
