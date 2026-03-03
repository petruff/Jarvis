import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { config } from "../config/loader";

interface MCPServerDef {
    id: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export class MCPClientManager {
    private clients: Map<string, Client> = new Map();
    private fastify: FastifyInstance | null = null;
    private io: Server | null = null;

    async initialize(fastify: FastifyInstance, io: Server) {
        this.fastify = fastify;
        this.io = io;

        const allowedPaths = [...config.tools.filesystem_allowed_paths];
        if (config.tools.obsidian_vault_path) {
            allowedPaths.push(config.tools.obsidian_vault_path);
        }

        const servers: MCPServerDef[] = [
            {
                id: 'filesystem',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', ...allowedPaths]
            },
            {
                id: 'desktop',
                command: 'npx',
                args: ['-y', '@wonderwhy-er/desktop-commander']
            },
            {
                id: 'puppeteer',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-puppeteer']
            },
            {
                id: 'playwright',
                command: 'npx',
                args: ['-y', '@executeautomation/playwright-mcp-server']
            }
        ];

        // Ensure github is dynamically injected
        if (config.tools.github_token) {
            servers.push({
                id: 'github',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: { GITHUB_PERSONAL_ACCESS_TOKEN: config.tools.github_token }
            });
        }

        // Ensure composio is injected
        if (config.tools.composio_api_key) {
            servers.push({
                id: 'composio',
                command: 'npx',
                args: ['-y', 'composio-core'], // You can invoke composio tools here.
                env: { COMPOSIO_API_KEY: config.tools.composio_api_key }
            });
        }

        for (const server of servers) {
            await this.connectServer(server);
        }
    }

    private async connectServer(serverDef: MCPServerDef) {
        if (!this.fastify) return;
        console.log(`[MCP] Initializing ${serverDef.id}...`);

        try {
            const transport = new StdioClientTransport({
                command: serverDef.command,
                args: serverDef.args,
            });

            const client = new Client({
                name: `Jarvis-${serverDef.id}`,
                version: "1.0.0",
            }, {
                capabilities: {}
            });

            await client.connect(transport);
            this.clients.set(serverDef.id, client);
            this.fastify.log.info(`[MCP] Connected to ${serverDef.id}`);

            const tools = await client.listTools();
            this.fastify.log.info(`[MCP] ${serverDef.id} Tools: ${tools.tools.map(t => t.name).join(", ")}`);

            if (this.io) {
                this.io.emit('jarvis/status', { status: 'online', service: `mcp-${serverDef.id}` });
            }
        } catch (error: any) {
            this.fastify.log.error(`[MCP] Failed to connect to ${serverDef.id}: ${error?.message || error}`);
        }
    }

    async getTools(): Promise<any[]> {
        const allTools: any[] = [];
        for (const [id, client] of this.clients.entries()) {
            try {
                const tools = await client.listTools();
                allTools.push(...tools.tools.map(t => ({ ...t, _serverId: id })));
            } catch (e: any) {
                console.error(`[MCP] Error listing tools for ${id}: ${e.message}`);
            }
        }
        return allTools;
    }

    async callTool(server: string, toolName: string, args: any) {
        const client = this.clients.get(server);
        if (!client) throw new Error(`MCP Server ${server} is not connected or initialized.`);

        console.log(`[MCP ${server}] Calling ${toolName} with args:`, JSON.stringify(args).slice(0, 200));

        try {
            return await client.callTool({
                name: toolName,
                arguments: args
            });
        } catch (err: any) {
            throw new Error(`Tool execution failed [${server}:${toolName}]: ${err.message}`);
        }
    }
}

export const mcpClient = new MCPClientManager();
