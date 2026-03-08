// src/squad.ts
// True parallel squad execution — runs multiple agents simultaneously

import { queryLLM, queryLLMStream, getAndResetTokenMetrics } from './llm';
import { writeFile } from './filesystem';
import { agentBus } from './agent-bus/redis-streams';
import { SQUAD_TO_MESSAGE_TYPE } from './agent-bus/squad-routing';
import { selfCritiqueLoop } from './ade/selfCritiqueLoop';
import { hookSystem } from './ade/hookSystem';
import * as fs from 'fs';
import * as path from 'path';

interface AgentAllocation {
    agentId: string;
    agentName: string;
    task: string;
    systemPrompt: string;
}

interface AgentResult {
    agentId: string;
    agentName: string;
    task: string;
    result: string;
    filesCreated: string[];
    duration: number;
}

// Extract code blocks from agent response and save them as files
export function extractAndSaveFiles(
    response: string,
    agentId: string,
    taskHint: string = ''
): string[] {
    const savedFiles: string[] = [];
    // Route files to a visible workspace folder at the project root
    const outputDir = path.resolve(process.cwd(), '../../workspace/deliverables', agentId);

    // Match ```language filename.ext\ncode\n``` blocks
    const codeBlockRegex = /```(\w+)?(?:[ \t]+([^\n]+))?\n([\s\S]*?)```/g;
    let match;
    let fileIndex = 0;

    const extMap: Record<string, string> = {
        html: 'html', css: 'css', javascript: 'js', js: 'js',
        typescript: 'ts', ts: 'ts', python: 'py', json: 'json',
        markdown: 'md', md: 'md', bash: 'sh', shell: 'sh',
        sql: 'sql', yaml: 'yaml', txt: 'txt',
    };

    // Create base output dir
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    while ((match = codeBlockRegex.exec(response)) !== null) {
        const lang = (match[1] || 'txt').toLowerCase();
        let requestedFilename = match[2] ? match[2].trim() : undefined;
        let code = match[3].trim();
        if (!code || code.length < 10) continue;

        const ext = extMap[lang] || lang || 'txt';

        // Support fallback: filename defined in the very first line of code as a comment
        if (!requestedFilename) {
            const firstLine = code.split('\n')[0].trim();
            const commentRegex = /^(?:\/\/|#|\/\*|<!--|--)\s*([\w.-]+\.\w+)\s*(?:\*\/|-->)?$/;
            const commentMatch = firstLine.match(commentRegex);
            if (commentMatch) {
                requestedFilename = commentMatch[1];
            }
        }

        let filename = '';
        if (requestedFilename) {
            // Sanitize requested filename to avoid path traversal attacks
            filename = requestedFilename.replace(/(\.\.[\/\\])+/g, '').replace(/^[\\\/]+/, '');
        } else {
            const baseStr = taskHint
                ? taskHint.replace(/^Mission:\s*"?|"?$/ig, '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30)
                : `output`;
            filename = `${baseStr || 'output'}${fileIndex > 0 ? `_${fileIndex}` : ''}.${ext}`;
        }

        const filePath = path.resolve(outputDir, filename);

        // Security check: ensure path is within outputDir
        if (!filePath.startsWith(outputDir)) {
            continue;
        }

        // Support sub-folders the agent might specify
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
        }

        fs.writeFileSync(filePath, code);
        savedFiles.push(filePath);
        fileIndex++;
        console.log(`[Squad] Delivered real file to workspace: ${filePath} (${code.length} bytes)`);
    }

    return savedFiles;
}

// Run a single agent task and return its result
async function runSingleAgent(
    alloc: AgentAllocation,
    io: any,
    mainSystemPrompt: string
): Promise<AgentResult> {
    const start = Date.now();

    console.log(`[Squad:${alloc.agentId}] Starting: "${alloc.task}"`);
    io.emit('squad/update', { agentId: alloc.agentId, status: 'working', task: alloc.task });
    io.emit('squad/log', { agentId: alloc.agentId, message: `Starting: ${alloc.task}` });

    let result = '';
    let filesCreated: string[] = [];

    // Lazy import runAgentLoop to avoid circular dependency issues during load
    const { runAgentLoop } = require('./agent');
    // Lazy import SkillLoader
    const { augmentSystemPrompt, getRelevantSkillsForAgent } = require('./SkillLoader');

    // Augment Prompt with Antigravity Skills
    const baseSystemPrompt = alloc.systemPrompt || mainSystemPrompt;
    const skills = getRelevantSkillsForAgent(alloc.agentName + " " + alloc.task); // Use name + task
    const enhancedSystemPrompt = augmentSystemPrompt(baseSystemPrompt, alloc.agentName + " " + alloc.task);

    if (skills.length > 0) {
        console.log(`[Squad:${alloc.agentId}] Injected skills: ${skills.join(', ')}`);
        io.emit('squad/log', { agentId: alloc.agentId, message: `[SKILLS] Loaded: ${skills.join(', ')}` });
    }

    try {
        console.log(`[Squad:${alloc.agentId}] Routing to AUTONOMOUS AGENT LOOP + Self-Critique (v6.0).`);
        io.emit('squad/log', { agentId: alloc.agentId, message: `[MODE] Autonomous Tool Execution + 13-Step Self-Critique` });

        // ── Sprint 1: Wrap execution in 13-step Self-Critique Loop ──────────
        const critiqueResult = await selfCritiqueLoop.run({
            missionId: alloc.agentId,
            prompt: alloc.task,
            squadId: alloc.agentId.split('-')[0],
            agentId: alloc.agentId,
            socket: io,
            systemPrompt: enhancedSystemPrompt,
            executeFn: async () => {
                // Fire onBeforeTool hook for the LLM call itself
                await hookSystem.fire('onBeforeTool', {
                    missionId: alloc.agentId,
                    squadId: alloc.agentId.split('-')[0],
                    toolName: 'runAgentLoop',
                    toolArgs: { agentId: alloc.agentId },
                });

                const output = await runAgentLoop(
                    alloc.task,
                    25, // Max steps for autonomous building
                    enhancedSystemPrompt,
                    io,
                    alloc.agentId,
                    'headless'
                );

                // Fire onAfterTool hook
                await hookSystem.fire('onAfterTool', {
                    missionId: alloc.agentId,
                    squadId: alloc.agentId.split('-')[0],
                    toolName: 'runAgentLoop',
                    toolResult: output.slice(0, 200),
                });

                return output;
            },
        });

        result = critiqueResult.output;
        io.emit('squad/log', {
            agentId: alloc.agentId,
            message: `[CRITIQUE] Score: ${critiqueResult.qualityScore}/100 | Steps: ${critiqueResult.stepsCompleted.length} | Retries: ${critiqueResult.retries}`
        });

        // Files will be written by MCP, but we can still extract from final_answer just in case
        filesCreated = extractAndSaveFiles(result, alloc.agentId, alloc.task);

    } catch (err: any) {
        result = `Error: ${err.message}`;
        console.error(`[Squad:${alloc.agentId}] Error:`, err);
    }

    const duration = Date.now() - start;
    console.log(`[Squad:${alloc.agentId}] Done in ${duration}ms, result len: ${result.length}`);

    io.emit('squad/update', { agentId: alloc.agentId, status: 'idle', task: 'Done ✓' });
    io.emit('squad/log', {
        agentId: alloc.agentId,
        message: filesCreated.length > 0
            ? `✅ Done — saved ${filesCreated.length} file(s)`
            : `✅ Done`
    });

    return {
        agentId: alloc.agentId,
        agentName: alloc.agentName,
        task: alloc.task,
        result,
        filesCreated,
        duration,
    };
}

// Run all agents in TRUE parallel using Promise.all
export async function runSquadPlan(
    missionId: string,
    narrative: string,
    allocations: AgentAllocation[],
    io: any,
    mainSystemPrompt: string,
    orchestrator?: any,
    squadId?: string  // Optional: source squad ID for Redis Streams publish
): Promise<string> {
    console.log(`[Squad] Starting parallel plan: "${narrative}"`);
    console.log(`[Squad] Agents: ${allocations.map(a => a.agentId).join(', ')}`);

    io.emit('jarvis/output', {
        source: 'SQUAD',
        content: `⚡ Launching ${allocations.length} agents in parallel...`
    });

    // Fire all agents simultaneously
    const results = await Promise.all(
        allocations.map(alloc => runSingleAgent(alloc, io, mainSystemPrompt))
    );

    // Compile summary
    const totalFiles = results.flatMap(r => r.filesCreated);
    const summary = results
        .map(r => `**${r.agentName}** (${Math.round(r.duration / 1000)}s): ${r.result.slice(0, 200)}${r.result.length > 200 ? '...' : ''}`)
        .join('\n\n');

    const metrics = getAndResetTokenMetrics();
    const tokenStats = `\n\n**Mission Cost:** $${metrics.costUsd.toFixed(4)} USD (${metrics.promptTokens} prompt tokens, ${metrics.completionTokens} completion tokens)`;

    const finalReport = `## Squad Plan Complete: ${narrative}\n\n${summary}${totalFiles.length > 0 ? `\n\n**Files Created:** ${totalFiles.map(f => {
        const relative = path.relative(path.resolve(process.cwd(), '../../workspace/deliverables'), f);
        return relative.replace(/\\/g, '/'); // normalize for URL
    }).join(', ')}` : ''}${tokenStats}`;

    console.log(`[Squad] Plan complete. ${results.length} agents, ${totalFiles.length} files. Cost: $${metrics.costUsd.toFixed(4)}`);
    io.emit('jarvis/output', { source: 'SQUAD', content: `✅ Squad plan complete. ${totalFiles.length} files created. Mission cost: $${metrics.costUsd.toFixed(4)}` });

    if (orchestrator) {
        await orchestrator.finalizeMission(missionId, finalReport);
    }

    // Publish to Redis Streams Agent Bus if squadId is known
    if (squadId) {
        const messageType = SQUAD_TO_MESSAGE_TYPE[squadId] || 'AUTONOMOUS_ACTION';
        agentBus.publish({
            fromSquad: squadId,
            fromAgent: allocations[0]?.agentId || squadId,
            toSquad: '',  // resolved by routing map on subscriber side
            type: messageType as any,
            payload: finalReport.slice(0, 2000), // cap payload size
            mission: missionId,
            priority: 'MEDIUM',
            correlationId: missionId,
        }).catch(err => console.warn(`[AgentBus] Publish failed (non-fatal): ${err.message}`));
    }

    return finalReport;
}
