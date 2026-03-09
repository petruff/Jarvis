import { captureScreen } from './desktop';
import { queryVisionLLM, queryLLM } from './llm';
import { mcpClient } from './tools/mcpClient';
import { canExecuteTool } from './tools/registry';
import { episodicMemory, semanticMemory } from './index';
import { missionControl } from './missionControl';
import { agentBus } from './agent-bus/redis-streams';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dynamicInterpreter } from './tools/dynamicInterpreter';

const execAsync = promisify(exec);

// ─── Internal Memory Tools (Advanced RAG Mid-Thought) ────────────────────────
// These tools are injected into the agent's tool context alongside MCP tools.
// When the agent calls them, they are intercepted BEFORE the MCP dispatch
// and resolved directly from episodic/semantic memory — enabling true
// mid-reasoning retrieval without external server overhead.

const INTERNAL_MEMORY_TOOLS = [
    {
        name: 'recall_memory',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Search past JARVIS missions for relevant context similar to a query. Returns summarized past mission results. Use this when you need to know if JARVIS handled a similar task before and what worked.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Natural language query to search in past mission history' },
                squad: { type: 'string', description: 'Optional: filter results to a specific squad (e.g. forge, oracle, mercury)' }
            },
            required: ['query']
        }
    },
    {
        name: 'query_goals',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Retrieve current company goals, OKRs, key metrics, and lessons from semantic memory. Use this to align the current mission with strategic context.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'query_fact',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Retrieve a specific fact stored in semantic memory by its key (e.g. "founderLanguage", "currentRevenue", a key result identifier).',
        inputSchema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'The exact key of the fact to retrieve from semantic memory' }
            },
            required: ['key']
        }
    },
    {
        name: 'dispatch_squad',
        _serverId: 'JARVIS_INTERNAL',
        description: 'CROSS-SQUAD MISSION HANDOFF: Send a new mission/task to a different squad (e.g., pass research to Mercury for marketing, or send marketing copy to Forge for engineering). Use this when your part of the job is done but the global objective requires another department.',
        inputSchema: {
            type: 'object',
            properties: {
                targetSquad: { type: 'string', description: 'The squad to send to (e.g., "forge", "mercury", "oracle", "produto", "atlas").' },
                mission: { type: 'string', description: 'The detailed instructions and context for what they need to do.' },
                priority: { type: 'string', description: 'LOW, MEDIUM, or HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] }
            },
            required: ['targetSquad', 'mission', 'priority']
        }
    },
    {
        name: 'encode_document',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Store massive documents, code files, or architectural specs into Infinite Shared Memory (ChromaDB) for future queries across squads.',
        inputSchema: {
            type: 'object',
            properties: {
                docId: { type: 'string', description: 'Unique identifier for this document, e.g. "auth_api_v1"' },
                text: { type: 'string', description: 'The absolute raw string content to memorize. Do not summarize, pass it all.' }
            },
            required: ['docId', 'text']
        }
    },
    {
        name: 'search_knowledge',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Search Infinite Shared Memory (ChromaDB) for encoded code snippets, guides, or document chunks injected by encode_document.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The exact question or snippet pattern to retrieve' }
            },
            required: ['query']
        }
    },
    {
        name: 'deep_synthesis',
        _serverId: 'JARVIS_INTERNAL',
        description: 'QUIMERA ENGINE: Perform a deep synthesis of a topic using both Vector RAG and Knowledge Graph traversals. Use this for complex geopolitical, market, or technical analysis where standard search is not enough.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The complex topic to analyze' }
            },
            required: ['query']
        }
    },
    {
        name: 'query_graph',
        _serverId: 'JARVIS_INTERNAL',
        description: 'KNOWLEDGE GRAPH: Retrieve the local neighborhood (connected entities/relations) of a specific entity in the knowledge graph.',
        inputSchema: {
            type: 'object',
            properties: {
                entityId: { type: 'string', description: 'The entity ID to search for (e.g. "btc", "oil", or a discovered alert ID)' }
            },
            required: ['entityId']
        }
    },
    {
        name: 'deep_web_search',
        _serverId: 'JARVIS_INTERNAL',
        description: 'SENTINEL RECON: Perform a reconnaissance mission on the Deep Web / TOR network. Use this to find information about leaks, anonymous security threats, or non-public market sentiment. REQUIRES TOR.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The intel target to search for' }
            },
            required: ['query']
        }
    },
    {
        name: 'execute_bash',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Execute a terminal/bash command natively on the host machine strictly inside the project root workspace. Use this to run `npm install`, compile code (`npm run build`), or verify git status. DANGEROUS COMMANDS WILL BE BLOCKED.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The exact bash/cli command to run (e.g. "npm run build" or "dir")' }
            },
            required: ['command']
        }
    },
    {
        name: 'browser_navigate',
        _serverId: 'JARVIS_INTERNAL',
        description: 'GHOSTHAND: Navigate to a URL in the autonomous browser.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The URL to visit' }
            },
            required: ['url']
        }
    },
    {
        name: 'browser_click',
        _serverId: 'JARVIS_INTERNAL',
        description: 'GHOSTHAND: Click an element in the autonomous browser using a CSS selector.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'The CSS selector to click' }
            },
            required: ['selector']
        }
    },
    {
        name: 'browser_type',
        _serverId: 'JARVIS_INTERNAL',
        description: 'GHOSTHAND: Type text into an input field in the autonomous browser.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'The CSS selector of the input field' },
                text: { type: 'string', description: 'The text to type' }
            },
            required: ['selector', 'text']
        }
    },
    {
        name: 'desktop_screenshot',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Take a screenshot of the main desktop monitor. If you provide a query, JARVIS will use Vision AI to analyze the screen and return what it sees (coordinates, elements, text).',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Question or instruction for the Vision AI to process the screen. E.g. "What are the X, Y coordinates of the Start button?"' }
            }
        }
    },
    {
        name: 'desktop_mouse_click',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Moves the mouse strictly to the X and Y coordinates and triggers a left click. Use this to click on GUI elements you found with desktop_screenshot.',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number', description: 'X coordinate' },
                y: { type: 'number', description: 'Y coordinate' }
            },
            required: ['x', 'y']
        }
    },
    // ─── Phase 8: AGI Dynamic Tooling ──────────────────────────────────────────
    {
        name: 'create_dynamic_tool',
        _serverId: 'JARVIS_INTERNAL',
        description: 'AGI Dynamic Tooling. Use this when you absolutely need a capability that does not exist in your predefined tools. This will write and compile a custom tool on the fly using standard JS running in an isolated Node VM.',
        inputSchema: {
            type: 'object',
            properties: {
                toolName: { type: 'string', description: 'Name of the tool (no spaces, e.g. "parse_yaml")' },
                intent: { type: 'string', description: 'What the tool should do technically (e.g. "convert xml string to json")' },
                description: { type: 'string', description: 'Agentic description of the tool for your own reference later' }
            },
            required: ['toolName', 'intent', 'description']
        }
    },
    {
        name: 'execute_dynamic_tool',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Execute a custom tool previously compiled by create_dynamic_tool. Ensure you pass the correct arguments structure you defined when creating it.',
        inputSchema: {
            type: 'object',
            properties: {
                toolName: { type: 'string', description: 'Name of the tool to run' },
                args: { type: 'object', description: 'JSON object parameters to pass to the tool' }
            },
            required: ['toolName', 'args']
        }
    },
    // ─── Phase J: 14 New Internal Agent Tools ──────────────────────────────────
    {
        name: 'recall_patterns',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Search Pattern Memory for recurring code patterns, solution templates, or best practices learned from past missions. Use this before building anything to check if JARVIS has already solved a similar problem.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The pattern or solution to search for (e.g. "stripe webhook handler", "auth middleware")' },
                squad: { type: 'string', description: 'Optional: filter to patterns from a specific squad (forge, oracle, mercury etc.)' }
            },
            required: ['query']
        }
    },
    {
        name: 'send_to_channel',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Send a message to any connected channel: whatsapp, telegram, email. Use this when you need to notify the operator or stakeholders of a result, alert, or milestone.',
        inputSchema: {
            type: 'object',
            properties: {
                channel: { type: 'string', description: 'Target channel: "whatsapp", "telegram", or "email"', enum: ['whatsapp', 'telegram', 'email'] },
                message: { type: 'string', description: 'The message content to send.' },
                to: { type: 'string', description: 'For email: recipient address. For whatsapp/telegram: leave blank to use operator default.' }
            },
            required: ['channel', 'message']
        }
    },
    {
        name: 'list_sessions',
        _serverId: 'JARVIS_INTERNAL',
        description: 'List all active sessions managed by JARVIS Session Manager. Returns active user sessions, their context, and expiry. Use this to understand who is currently connected and what they are working on.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'read_email',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Read the operator inbox for recent emails. Returns a list of email summaries. Use this when asked to check emails, find information from an email, or summarize the inbox.',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Maximum number of emails to return (default: 10)' },
                query: { type: 'string', description: 'Optional: keyword to filter emails by subject or sender' }
            }
        }
    },
    {
        name: 'send_email',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Compose and send an email on behalf of the operator. Use this when asked to draft and send an email, notify a stakeholder, or respond to a message.',
        inputSchema: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Full HTML or plaintext email body' }
            },
            required: ['to', 'subject', 'body']
        }
    },
    {
        name: 'register_webhook',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Dynamically register a new inbound webhook endpoint. The webhook can trigger agent missions when called. Use this when you need to receive events from external services (Stripe, GitHub, Shopify, etc.).',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'The URL path for the webhook (e.g. "stripe-payments"). Will be accessible at /webhook/stripe-payments' },
                description: { type: 'string', description: 'What this webhook receives and what JARVIS should do with it' },
                missionTemplate: { type: 'string', description: 'Template for the mission JARVIS auto-creates when this webhook fires. Use {{body}} for the payload.' }
            },
            required: ['path', 'description']
        }
    },
    {
        name: 'search_skills',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Search the JarvisHub skill registry for available skills that match a capability or domain. Use this before starting a complex mission to discover if a relevant skill already exists.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Natural language description of the capability you need (e.g. "stripe payment processing", "image resizing", "GitHub PR automation")' }
            },
            required: ['query']
        }
    },
    {
        name: 'install_skill',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Install a skill from JarvisHub into the active agent context. Once installed, the skill\'s capabilities become available as tools in the current mission.',
        inputSchema: {
            type: 'object',
            properties: {
                skillId: { type: 'string', description: 'The skill ID to install (obtained from search_skills)' }
            },
            required: ['skillId']
        }
    },
    {
        name: 'canvas_push',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Push HTML, CSS, and/or JavaScript to the A2UI Canvas Workspace in the operator\'s browser. Use this to render dashboards, charts, forms, reports, or any visual artifact from a mission. The canvas replaces the need to open a browser.',
        inputSchema: {
            type: 'object',
            properties: {
                html: { type: 'string', description: 'The HTML markup to render in the canvas' },
                css: { type: 'string', description: 'Optional: CSS styles to apply' },
                js: { type: 'string', description: 'Optional: JavaScript to execute in the canvas context' },
                title: { type: 'string', description: 'Optional: A title for this canvas artifact' }
            },
            required: ['html']
        }
    },
    {
        name: 'canvas_eval',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Execute a JavaScript expression inside the current Canvas Workspace and return its result. Use this to query canvas state, extract values, or chain canvas operations.',
        inputSchema: {
            type: 'object',
            properties: {
                jsCode: { type: 'string', description: 'JavaScript code to evaluate in the canvas (e.g. "document.querySelector(\'#result\').textContent")' }
            },
            required: ['jsCode']
        }
    },
    {
        name: 'canvas_snapshot',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Capture the current state of the A2UI Canvas Workspace as an HTML string. Use this to inspect what is currently rendered, or to save the canvas output before pushing new content.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'create_worktree',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Create an isolated git worktree for a mission. This is REQUIRED before Forge agents write any code. Isolates changes from the main branch so nothing touches live code until approved.',
        inputSchema: {
            type: 'object',
            properties: {
                missionId: { type: 'string', description: 'The unique mission or task ID (used as the branch name)' },
                baseBranch: { type: 'string', description: 'The branch to base the worktree on (default: main)' }
            },
            required: ['missionId']
        }
    },
    {
        name: 'commit_worktree',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Stage and commit all changes in a mission\'s worktree. Use this after each significant code change in an isolated Forge mission.',
        inputSchema: {
            type: 'object',
            properties: {
                missionId: { type: 'string', description: 'The mission ID whose worktree to commit' },
                message: { type: 'string', description: 'Commit message describing what was built or changed' }
            },
            required: ['missionId', 'message']
        }
    },
    {
        name: 'merge_worktree',
        _serverId: 'JARVIS_INTERNAL',
        description: 'Merge a completed mission\'s worktree back into the main branch. Only call this after QA has passed and all changes are approved. This is the final step in an autonomous Forge mission.',
        inputSchema: {
            type: 'object',
            properties: {
                missionId: { type: 'string', description: 'The mission ID whose worktree to merge into main' }
            },
            required: ['missionId']
        }
    }
];

// Handle JARVIS_INTERNAL tool calls — bypasses MCP, queries memory directly
async function handleInternalTool(toolName: string, args: Record<string, any>, agentId: string): Promise<string> {
    try {
        if (toolName === 'execute_bash') {
            const { command } = args;
            if (!command) return "Error: command is missing.";

            // SECURITY INTERCEPTOR
            const DENY_LIST = [/rm -rf \//, /del \/f \/s \/q \\/, /format C:/i, /^rmdir \/s \/q \\/];
            for (const rx of DENY_LIST) {
                if (rx.test(command)) {
                    return `[ACTION BLOCKED]: The requested command was flagged as strictly prohibited by the Jarvis Kernel parameters.`;
                }
            }

            try {
                console.log(`[AGENT:${agentId}][BASH] Executing: ${command}`);
                const { stdout, stderr } = await execAsync(command, { cwd: process.cwd(), timeout: 30000 });
                const output = stdout.trim() || stderr.trim() || "Command executed successfully with no output.";
                return `[BASH OUTPUT]:\n${output.slice(0, 3000)}`; // Trim massive terminal returns
            } catch (bashErr: any) {
                return `[BASH ERROR]:\n${bashErr.message}\nSTDOUT:\n${bashErr.stdout}\nSTDERR:\n${bashErr.stderr}`.slice(0, 3000);
            }
        }

        if (toolName === 'encode_document') {
            const { hybridMemory } = require('./index');
            if (!hybridMemory) return 'Hybrid memory not available.';
            await hybridMemory.encodeDocument(args.docId, args.text);
            return `Successfully encoded document "${args.docId}" into ChromaDB Infinite Shared Memory.`;
        }

        if (toolName === 'search_knowledge') {
            const { hybridMemory } = require('./index');
            if (!hybridMemory) return 'Hybrid memory not available.';
            const chunks = await hybridMemory.searchKnowledge(args.query);
            if (!chunks.length) return "No matches found in ChromaDB.";
            const results = chunks.map((c: any) => `[ID: ${c.metadata.docId}]\n...\n${c.text}\n...\n`).join('\n--------\n');
            return `ChromaDB Search Results:\n${results}`;
        }

        if (toolName === 'deep_synthesis') {
            const { quimera } = require('./intelligence/quimera');
            const result = await quimera.analyze(args.query);
            return `[QUIMERA RESULT (Confidence: ${result.confidence})]\n\nRational Core: ${result.rational_core}\n\nConnections Found:\n${result.connections.map((c: string) => `- ${c}`).join('\n')}`;
        }

        if (toolName === 'query_graph') {
            const { knowledgeGraph } = require('./memory/graph');
            const neighbors = await knowledgeGraph.getNeighborhood(args.entityId);
            return `Knowledge Graph Neighborhood for "${args.entityId}":\n\nNODES:\n${neighbors.nodes.map((n: any) => `- [${n.id}] ${n.label} (${n.type})`).join('\n')}\n\nEDGES:\n${neighbors.edges.map((e: any) => `- ${e.from} --(${e.relation})--> ${e.to}`).join('\n')}`;
        }

        if (toolName === 'deep_web_search') {
            const { torSentinel } = require('./recon/torClient');
            const results = await torSentinel.searchIntel(args.query);
            return `--- TOR SENTINEL RECON RESULTS ---\n\n${results.map((r: any) => `[TITLE]: ${r.title}\n[SOURCE]: ${r.source}\n[INTEL]: ${r.snippet}`).join('\n---\n')}\n\n--- RECON COMPLETE ---`;
        }

        if (toolName === 'browser_navigate') {
            const { domCortex } = require('./autonomy/domCortex');
            return await domCortex.navigate(args.url);
        }

        if (toolName === 'browser_click') {
            const { domCortex } = require('./autonomy/domCortex');
            return await domCortex.click(args.selector);
        }

        if (toolName === 'browser_type') {
            const { domCortex } = require('./autonomy/domCortex');
            return await domCortex.type(args.selector, args.text);
        }

        if (toolName === 'desktop_screenshot') {
            try {
                const screenshot = require('screenshot-desktop');
                const fs = require('fs');
                const path = require('path');
                const filename = path.join(process.cwd(), '.temp', `screen_${Date.now()}.png`);

                if (!fs.existsSync(path.join(process.cwd(), '.temp'))) {
                    fs.mkdirSync(path.join(process.cwd(), '.temp'), { recursive: true });
                }

                await screenshot({ filename });

                if (args.query) {
                    const imgBuffer = fs.readFileSync(filename);
                    console.log(`[AGENT:${agentId}][VISION] Analyzing screenshot for query: ${args.query}`);
                    const visionPrompt = "You are JARVIS. You have been given a screenshot of your operator's computer monitor. Your mandate is to perceive the exact screen layout to assist with UI-based operations that lack programatic APIs. If asked to find coordinates, look carefully for the element across the width and height, estimate the pixel (X, Y) coordinates, and provide a single JSON response or concise coordinate pair that can be fed to a mouse macro.";
                    const visionResponse = await queryVisionLLM(visionPrompt, args.query, imgBuffer);
                    return `VLM Analysis of Desktop:\n${visionResponse}\n(Image stored at: ${filename})`;
                }

                return `Desktop screenshot taken successfully and saved to: ${filename}. Please use this path to analyze the screen using vision if needed.`;
            } catch (err: any) {
                return `Error taking screenshot: ${err.message}`;
            }
        }

        if (toolName === 'desktop_mouse_click') {
            try {
                const { x, y } = args;
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms
                    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
                    $signature = @'
                    [DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
                    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
'@
                    $mouse = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru
                    $mouse::mouse_event(0x0002, 0, 0, 0, 0)
                    $mouse::mouse_event(0x0004, 0, 0, 0, 0)
                `;
                console.log(`[AGENT:${agentId}][MOUSE] Clicking at (${x}, ${y})`);
                await execAsync(`powershell -Command "${psScript}"`);
                return `Successfully moved mouse to (${x}, ${y}) and initiated a Left Click.`;
            } catch (err: any) {
                return `Error clicking mouse: ${err.message}`;
            }
        }

        if (toolName === 'recall_memory') {
            if (!episodicMemory) return 'Episodic memory not available.';
            const episodes = await episodicMemory.recall(args.query || '', args.squad);
            if (!episodes.length) return 'No relevant past missions found matching this query.';
            const summaries = episodes.map((ep, i) =>
                `[${i + 1}] Squad:${ep.squad} | Quality:${ep.qualityScore}/100\n  Task: ${ep.prompt.slice(0, 150)}\n  Result: ${ep.result.slice(0, 300)}`
            ).join('\n\n');
            return `Found ${episodes.length} relevant past mission(s):\n\n${summaries}`;
        }

        if (toolName === 'query_goals') {
            if (!semanticMemory) return 'Semantic memory not available.';
            const ctx = await semanticMemory.getCompanyContext();
            return JSON.stringify({
                goals: ctx.goals,
                metrics: ctx.metrics,
                lessons: ctx.lessons,
                founderLanguage: ctx.founderLanguage
            }, null, 2);
        }

        if (toolName === 'query_fact') {
            if (!semanticMemory) return 'Semantic memory not available.';
            const value = await semanticMemory.getFact(args.key || '');
            return value ? `Fact "${args.key}": ${value}` : `Fact "${args.key}" not found in semantic memory.`;
        }

        if (toolName === 'dispatch_squad') {
            const { targetSquad, mission, priority } = args;
            if (!targetSquad || !mission) return 'Error: targetSquad and mission are required.';

            try {
                // Determine source agent id or fallback
                // Need to import crypto for correlation id if not imported (it is imported at top)
                await agentBus.publish({
                    fromSquad: 'autonomy', // Default source, exact source could be passed down later
                    fromAgent: agentId,
                    toSquad: targetSquad,
                    type: 'AUTONOMOUS_ACTION',
                    payload: `[HANDOFF MISSION]\n${mission}`,
                    mission: mission,
                    priority: priority || 'MEDIUM',
                    correlationId: crypto.randomUUID()
                });
                return `Mission dispatched successfully to the ${targetSquad} squad. You may now mark your task as done if you have nothing else to do.`;
            } catch (err: any) {
                return `Failed to dispatch squad: ${err.message}`;
            }
        }

        // ─── Phase 8 AGI: Dynamic Interpreters ────────────────────────────────────
        if (toolName === 'create_dynamic_tool') {
            try {
                const { toolName: name, intent, description } = args;
                if (!name || !intent) return 'Error: toolName and intent are required.';
                const res = await dynamicInterpreter.generateAndRegisterTool(name, intent, description);
                return res;
            } catch (err: any) {
                return `Failed to create dynamic tool: ${err.message}`;
            }
        }

        if (toolName === 'execute_dynamic_tool') {
            try {
                const { toolName: name, args: toolArgs } = args;
                if (!name) return 'Error: toolName is required.';
                const result = await dynamicInterpreter.executeTool(name, toolArgs || {});
                return `Execution Result:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
            } catch (err: any) {
                return `Failed to execute dynamic tool: ${err.message}`;
            }
        }

        // ─── Phase J Resolvers ────────────────────────────────────────────────────

        if (toolName === 'recall_patterns') {
            try {
                const { patternMemory } = require('./index');
                if (!patternMemory) return 'Pattern memory not available.';
                const results = await patternMemory.search(args.query, args.squad);
                if (!results || results.length === 0) return `No patterns found matching "${args.query}".`;
                return `Pattern Memory Results:\n${results.map((r: any, i: number) =>
                    `[${i + 1}] ${r.name || 'Pattern'} (${r.squad || 'general'})\n  ${r.description || r.content?.slice(0, 200)}`
                ).join('\n\n')}`;
            } catch (err: any) {
                return `Pattern recall error: ${err.message}`;
            }
        }

        if (toolName === 'send_to_channel') {
            const { channel, message, to } = args;
            try {
                if (channel === 'telegram') {
                    const { sendTelegramMessage } = require('./telegram');
                    const config = require('./config/loader').config;
                    const chatId = config.messaging.founder_telegram_id || process.env.FOUNDER_TELEGRAM_ID;
                    if (!chatId) return 'No Telegram chat ID configured. Set FOUNDER_TELEGRAM_ID in .env.';
                    await sendTelegramMessage(chatId, message);
                    return `Message sent via Telegram successfully.`;
                }
                if (channel === 'whatsapp') {
                    const { sendWhatsAppMessage } = require('./whatsapp');
                    const config = require('./config/loader').config;
                    const phone = config.messaging.owner_whatsapp_phone || process.env.OWNER_PHONE;
                    if (!phone) return 'No WhatsApp phone configured. Set OWNER_PHONE in .env.';
                    await sendWhatsAppMessage(`${phone}@s.whatsapp.net`, message);
                    return `Message sent via WhatsApp successfully.`;
                }
                if (channel === 'email') {
                    const { sendTelegramMessage } = require('./channels/email');
                    // Use nodemailer via the email channel module
                    const nodemailer = require('nodemailer');
                    const config = require('./config/loader').config;
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
                    });
                    await transporter.sendMail({
                        from: process.env.GMAIL_USER,
                        to: to || process.env.GMAIL_USER,
                        subject: `JARVIS Agent Notification`,
                        text: message
                    });
                    return `Email sent to ${to || process.env.GMAIL_USER} successfully.`;
                }
                return `Unknown channel: ${channel}. Use: whatsapp, telegram, or email.`;
            } catch (err: any) {
                return `Channel dispatch error: ${err.message}`;
            }
        }

        if (toolName === 'list_sessions') {
            try {
                const { sessionManager } = require('./index');
                if (!sessionManager) return 'Session manager not available.';
                const sessions = sessionManager.getAll ? sessionManager.getAll() : [];
                if (!sessions.length) return 'No active sessions found.';
                return `Active Sessions (${sessions.length}):\n${sessions.map((s: any) =>
                    `  - [${s.id}] User: ${s.userId || 'anonymous'} | Channel: ${s.channel} | Created: ${s.createdAt}`
                ).join('\n')}`;
            } catch (err: any) {
                return `Session list error: ${err.message}`;
            }
        }

        if (toolName === 'read_email') {
            try {
                const Imap = require('node-imap');
                const simpleParser = require('mailparser').simpleParser;
                const limit = args.limit || 10;
                return new Promise((resolve) => {
                    try {
                        const imap = new Imap({
                            user: process.env.GMAIL_USER,
                            password: process.env.GMAIL_APP_PASSWORD,
                            host: 'imap.gmail.com',
                            port: 993,
                            tls: true,
                            tlsOptions: { rejectUnauthorized: false }
                        });
                        const emails: string[] = [];
                        imap.once('ready', () => {
                            imap.openBox('INBOX', true, (err: any, box: any) => {
                                if (err) { imap.end(); resolve(`IMAP error: ${err.message}`); return; }
                                const total = box.messages.total;
                                const start = Math.max(1, total - limit + 1);
                                const fetch = imap.seq.fetch(`${start}:${total}`, { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'] });
                                fetch.on('message', (msg: any) => {
                                    let header = '';
                                    msg.on('body', (stream: any) => {
                                        stream.on('data', (chunk: Buffer) => { header += chunk.toString(); });
                                        stream.once('end', () => { emails.push(header.trim()); });
                                    });
                                });
                                fetch.once('end', () => { imap.end(); });
                            });
                        });
                        imap.once('end', () => resolve(`Recent ${emails.length} emails:\n\n${emails.join('\n---\n')}`));
                        imap.once('error', (err: any) => resolve(`Email connection error: ${err.message}`));
                        imap.connect();
                    } catch (e: any) {
                        resolve(`read_email setup error: ${e.message}`);
                    }
                });
            } catch (err: any) {
                return `read_email error: ${err.message}`;
            }
        }

        if (toolName === 'send_email') {
            try {
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
                });
                await transporter.sendMail({
                    from: `"JARVIS" <${process.env.GMAIL_USER}>`,
                    to: args.to,
                    subject: args.subject,
                    html: args.body
                });
                return `Email sent to ${args.to} with subject "${args.subject}" successfully.`;
            } catch (err: any) {
                return `send_email error: ${err.message}`;
            }
        }

        if (toolName === 'register_webhook') {
            try {
                const { webhookRegistry } = require('./index');
                if (!webhookRegistry) return 'Webhook registry not available.';
                webhookRegistry.register({
                    path: args.path,
                    description: args.description,
                    missionTemplate: args.missionTemplate || `Process inbound webhook event from ${args.path}: {{body}}`
                });
                return `Webhook registered at /webhook/${args.path}. It will trigger a JARVIS mission when called.`;
            } catch (err: any) {
                return `register_webhook error: ${err.message}`;
            }
        }

        if (toolName === 'search_skills') {
            try {
                const fs = require('fs');
                const path = require('path');
                // Scan the .jarvis/skills directory for skill manifests
                const skillsDir = path.join(process.cwd(), '../../.jarvis/skills');
                if (!fs.existsSync(skillsDir)) return `No skills directory found. JarvisHub not yet initialized.`;
                const skillFiles = fs.readdirSync(skillsDir).filter((f: string) => f.endsWith('.json'));
                if (!skillFiles.length) return `No skills found in JarvisHub registry.`;
                const queryLower = (args.query || '').toLowerCase();
                const matches = skillFiles
                    .map((f: string) => {
                        try { return { id: f.replace('.json', ''), ...JSON.parse(fs.readFileSync(path.join(skillsDir, f), 'utf-8')) }; }
                        catch { return null; }
                    })
                    .filter((s: any) => s && (
                        (s.name || '').toLowerCase().includes(queryLower) ||
                        (s.description || '').toLowerCase().includes(queryLower) ||
                        (s.tags || []).some((t: string) => t.toLowerCase().includes(queryLower))
                    ));
                if (!matches.length) return `No skills found matching "${args.query}".`;
                return `JarvisHub Skills matching "${args.query}":\n${matches.map((s: any) =>
                    `  - [${s.id}] ${s.name}: ${s.description?.slice(0, 100)}`
                ).join('\n')}`;
            } catch (err: any) {
                return `search_skills error: ${err.message}`;
            }
        }

        if (toolName === 'install_skill') {
            try {
                const fs = require('fs');
                const path = require('path');
                const skillPath = path.join(process.cwd(), '../../.jarvis/skills', `${args.skillId}.json`);
                if (!fs.existsSync(skillPath)) return `Skill "${args.skillId}" not found in JarvisHub registry.`;
                const skill = JSON.parse(fs.readFileSync(skillPath, 'utf-8'));
                // For now, inject skill instructions into the agent's context via a special token
                return `Skill "${skill.name || args.skillId}" installed. Instructions:\n${skill.instructions || skill.description}\n\nAvailable tools added: ${(skill.tools || []).join(', ') || 'none'}`;
            } catch (err: any) {
                return `install_skill error: ${err.message}`;
            }
        }

        if (toolName === 'canvas_push') {
            try {
                const { io } = require('./index');
                if (!io) return 'Socket.io not available — cannot push to canvas.';
                const payload = {
                    html: args.html,
                    css: args.css || '',
                    js: args.js || '',
                    title: args.title || 'Agent Canvas Output',
                    type: 'full'
                };
                io.emit('jarvis/a2ui_render', payload);
                return `Canvas updated successfully. Pushed ${args.html.length} bytes of HTML to the operator's workspace.`;
            } catch (err: any) {
                return `canvas_push error: ${err.message}`;
            }
        }

        if (toolName === 'canvas_eval') {
            // Canvas eval is a client-side operation — we emit a request and return a placeholder
            try {
                const { io } = require('./index');
                if (!io) return 'Socket.io not available — cannot evaluate in canvas.';
                io.emit('jarvis/canvas_eval', { jsCode: args.jsCode });
                return `canvas_eval emitted to client. Result will appear in the next canvas_snapshot call.`;
            } catch (err: any) {
                return `canvas_eval error: ${err.message}`;
            }
        }

        if (toolName === 'canvas_snapshot') {
            try {
                const { io } = require('./index');
                if (!io) return 'Socket.io not available.';
                io.emit('jarvis/canvas_snapshot_req', {});
                return `Canvas snapshot requested. The canvas HTML will be returned asynchronously. Use this in combination with canvas_eval for inspection.`;
            } catch (err: any) {
                return `canvas_snapshot error: ${err.message}`;
            }
        }

        if (toolName === 'create_worktree') {
            try {
                const { missionId, baseBranch = 'main' } = args;
                const branchName = `jarvis/mission-${missionId}`;
                const worktreePath = `../../.jarvis/worktrees/${missionId}`;
                const cmd = `git worktree add ${worktreePath} -b ${branchName} ${baseBranch}`;
                console.log(`[AGENT:${agentId}][WORKTREE] Creating: ${branchName}`);
                const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
                return `Worktree created for mission "${missionId}". Branch: ${branchName}. Path: ${worktreePath}.\n${stdout || stderr}`;
            } catch (err: any) {
                return `create_worktree error: ${err.message}`;
            }
        }

        if (toolName === 'commit_worktree') {
            try {
                const { missionId, message } = args;
                const worktreePath = `../../.jarvis/worktrees/${missionId}`;
                const cmds = [
                    `git -C ${worktreePath} add -A`,
                    `git -C ${worktreePath} commit -m "${message.replace(/"/g, "'")}"`
                ];
                const results: string[] = [];
                for (const cmd of cmds) {
                    const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
                    results.push(stdout.trim() || stderr.trim());
                }
                return `Worktree commit successful for mission "${missionId}".\n${results.join('\n')}`;
            } catch (err: any) {
                return `commit_worktree error: ${err.message}`;
            }
        }

        if (toolName === 'merge_worktree') {
            try {
                const { missionId } = args;
                const branchName = `jarvis/mission-${missionId}`;
                const worktreePath = `../../.jarvis/worktrees/${missionId}`;
                const mergeCmd = `git merge ${branchName} --no-ff -m "feat: merge mission ${missionId} from JARVIS autonomous agent"`;
                const { stdout, stderr } = await execAsync(mergeCmd, { cwd: process.cwd() });
                // Cleanup worktree after merge
                await execAsync(`git worktree remove --force ${worktreePath}`, { cwd: process.cwd() }).catch(() => { });
                return `Branch "${branchName}" merged successfully into main.\n${stdout || stderr}`;
            } catch (err: any) {
                return `merge_worktree error: ${err.message}`;
            }
        }

        return `Unknown internal tool: ${toolName}`;
    } catch (err: any) {
        return `Internal tool error: ${err.message}`;
    }
}

export const runAgentLoop = async (
    objective: string,
    maxSteps: number = 10,
    customSystemPrompt?: string,
    socket?: any,
    agentId: string = "jarvis",
    mode: 'visual' | 'headless' = 'headless'
): Promise<string> => {
    console.log(`[AGENT:${agentId}] Starting ${mode.toUpperCase()} ReAct Loop for: "${objective}"`);

    if (socket) {
        socket.emit('squad/update', { agentId, status: 'working', task: objective });
        socket.emit('squad/log', { agentId, message: `Starting objective (${mode}): ${objective}` });
    }

    const startTime = Date.now();
    const TIMEOUT_MS = 120000;
    const history: any[] = [];
    let toolsContext = '';

    // Extract the pure squad name (e.g. 'forge-torvalds' -> 'forge') to pass routing and registry checks
    const squadIdForTools = agentId.includes('-') ? agentId.split('-')[0] : agentId;

    try {
        const mcpTools = await mcpClient.getTools();
        // Inject internal memory tools alongside MCP tools (Advanced RAG Mid-Thought)
        const allTools = [...INTERNAL_MEMORY_TOOLS, ...mcpTools];
        toolsContext = `AVAILABLE TOOLS:\n${JSON.stringify(allTools, null, 2)}`;
    } catch (e: any) {
        console.error("Failed to get MCP tools", e);
        // Still expose internal memory tools even if MCP is down
        toolsContext = `AVAILABLE TOOLS:\n${JSON.stringify(INTERNAL_MEMORY_TOOLS, null, 2)}`;
    }

    const basePrompt = `
You are an autonomous ReAct Agent.
Your goal is to solve the objective completely using the provided tools.
You MUST output valid JSON ONLY for every step. Do NOT output raw text.

CRITICAL INSTRUCTIONS:
1. You are an autonomous software engineer. DO NOT just write code in your "final_answer". 
2. You MUST use the \`write_file\`, \`edit_file\`, or \`create_directory\` tools to save your work physically to the disk.
3. Your default workspace is: \`c:/Users/ppetr/OneDrive/Desktop/Jarvis-Platform/workspace/deliverables\`. Always build projects there.
4. When your task is to "build a page" or "create a file", you are not finished until you have successfully executed tool calls to write the files to the filesystem.
5. If your mission requires another department's expertise (e.g. you wrote copy and now it needs code, or you researched something and now it needs marketing), use the \`dispatch_squad\` tool to hand off the work.
6. Before acting, consider using recall_memory to search for relevant past missions. Use query_goals to align actions with current company strategy.

Format:
{
    "thought": "Reasoning step",
    "done": boolean,
    "tool_name": "name of tool to use, or null",
    "tool_args": { "arg1": "value" },
    "final_answer": "Final result if done is true (explain what you built and the exact file paths)"
}

${toolsContext}
    `;

    const effectiveSystemPrompt = customSystemPrompt
        ? `${customSystemPrompt}\n\n---\n\n${basePrompt}`
        : basePrompt;

    let finalAnswer = "Mission unfinished.";

    for (let i = 0; i < maxSteps; i++) {
        if (missionControl.shouldStop()) {
            finalAnswer = "Mission aborted by global stop command.";
            break;
        }

        if (Date.now() - startTime > TIMEOUT_MS) {
            finalAnswer = "Mission timed out after 120s.";
            break;
        }

        console.log(`\n[AGENT:${agentId}] Step ${i + 1}/${maxSteps}`);
        if (socket) socket.emit('squad/log', { agentId, message: `Step ${i + 1}/${maxSteps}` });

        // 1. REASON
        const historyText = history.map(h => `Action: ${h.action}\nResult: ${h.result}`).join("\n\n");
        const prompt = `Objective: ${objective}\n\nHistory:\n${historyText}\n\nWhat is your next JSON response?`;

        if (socket) socket.emit('squad/update', { agentId, status: 'thinking', task: `Reasoning...` });

        let response = "";
        let screenshot: Buffer | null = null;
        if (mode === 'visual') {
            try { screenshot = await captureScreen(); } catch (e) { }
        }

        if (mode === 'visual' && screenshot) {
            // Note: Vision LLM explicitly does not use Reasoning capabilities as R1 cannot observe images
            response = await queryVisionLLM(effectiveSystemPrompt, prompt, screenshot);
        } else {
            response = await queryLLM(effectiveSystemPrompt, prompt, squadIdForTools);
        }

        let plan;
        try {
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanJson.indexOf('{');
            const end = cleanJson.lastIndexOf('}');
            plan = JSON.parse(cleanJson.substring(start, end + 1));
        } catch (e) {
            console.error("Failed to parse reasoning JSON", response);
            history.push({ action: 'REASON_ERROR', result: 'Failed to produce valid JSON. Must output JSON.' });
            continue;
        }

        console.log(`[REASON] ${plan.thought}`);
        if (socket) socket.emit('squad/log', { agentId, message: `Thought: ${plan.thought}` });

        if (plan.done) {
            finalAnswer = plan.final_answer || plan.thought;
            break;
        }

        if (!plan.tool_name) {
            history.push({ action: 'SKIP', result: 'No tool provided.' });
            continue;
        }

        // 2. ACT
        let toolResult = "";
        const toolActionStr = `${plan.tool_name}(${JSON.stringify(plan.tool_args)})`;
        if (socket) socket.emit('squad/update', { agentId, status: 'working', task: `Running ${plan.tool_name}...` });

        // Check if this is an internal memory tool (Advanced RAG Mid-Thought)
        const isInternalTool = INTERNAL_MEMORY_TOOLS.some(t => t.name === plan.tool_name);

        if (isInternalTool) {
            console.log(`[AGENT:${agentId}] Internal memory tool: ${plan.tool_name}`);
            if (socket) socket.emit('squad/log', { agentId, message: `[RAG] Querying memory: ${plan.tool_name}` });
            toolResult = await handleInternalTool(plan.tool_name, plan.tool_args || {}, agentId);
        } else {
            const permission = canExecuteTool(plan.tool_name, squadIdForTools);
            if (!permission.allowed) {
                toolResult = `ERROR: Permission Denied - ${permission.reason}`;
            } else {
                try {
                    const serverName = (await mcpClient.getTools()).find((t: any) => t.name === plan.tool_name)?._serverId;
                    if (!serverName) throw new Error("Tool not found on any connected server.");
                    const mcpRes = await mcpClient.callTool(serverName, plan.tool_name, plan.tool_args || {});
                    toolResult = JSON.stringify(mcpRes);
                } catch (e: any) {
                    toolResult = `ERROR: ${e.message}`;
                }
            }
        }

        // 3. OBSERVE
        console.log(`[OBSERVE] ${toolActionStr} => ${toolResult.substring(0, 100)}...`);
        if (socket) socket.emit('squad/log', { agentId, message: `Observed ${plan.tool_name} result.` });

        // 4. EVALUATE
        const evalPrompt = `Given the objective "${objective}", tool "${plan.tool_name}", and the result:\n${toolResult.substring(0, 1000)}\n\nDid this tool execution succeed and provide useful information? Output a JSON exactly like {"score": 0.0 to 1.0, "reason": "why"}`;
        let score = 1.0;
        try {
            const evalRes = await queryLLM("You are an evaluator.", evalPrompt);
            const cln = evalRes.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cln.indexOf('{');
            const end = cln.lastIndexOf('}');
            const evalJson = JSON.parse(cln.substring(start, end + 1));
            score = evalJson.score || 0;
            console.log(`[EVALUATE] Score: ${score} - ${evalJson.reason}`);
            if (socket) socket.emit('squad/log', { agentId, message: `Eval Score: ${score}` });
        } catch (e) {
            console.error("Eval failed, defaulting to 1.0");
        }

        history.push({
            action: toolActionStr,
            result: toolResult,
            evaluation_score: score
        });

        if (score < 0.5) {
            history.push({ action: 'SYSTEM', result: 'Warning: Last tool call scored < 0.5. Try a different approach or fix arguments.' });
        }
    }

    // 5. REFLECT
    const reflectionPrompt = `Summarize the lesson learned from this mission in ONE sentence, focusing on tool efficacy. Like "For [mission type], [tool] returned [quality] results."
Objective: ${objective}
Tools used: ${[...new Set(history.map(h => h.action))].join(', ')}
Outcome: ${finalAnswer}`;

    try {
        const lesson = await queryLLM("You are a reflective assistant capturing lessons.", reflectionPrompt);
        if (episodicMemory) {
            const uuid = crypto.randomUUID();
            await episodicMemory.consolidate({
                id: uuid,
                prompt: objective,
                result: lesson,
                status: 'DONE',
                qualityScore: 100,
                squad: agentId,
                agentIds: [agentId],
                source: 'ui',
                createdAt: new Date().toISOString()
            });
            console.log(`[REFLECT] Stored lesson: ${lesson}`);
        }
    } catch (e) { }

    if (socket) {
        socket.emit('squad/update', { agentId, status: 'idle', task: 'Mission Complete' });
        socket.emit('squad/log', { agentId, message: `Mission Complete.` });
    }

    return finalAnswer;
};
