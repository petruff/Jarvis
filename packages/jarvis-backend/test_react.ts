import { mcpClient } from './src/tools/mcpClient';
import * as fs from 'fs';

async function verify() {
    console.log('[Test] Triggering MCP FileSystem verification...');
    // Initialize MCP with dummy fastify/io logger
    await mcpClient.initialize(
        { log: { info: console.log, error: console.error } } as any,
        { emit: () => { } } as any
    );

    try {
        const payloadArgs = {
            path: 'C:/Users/ppetr/OneDrive/Desktop/Jarvis-Platform/workspace/deliverables/agent_test.ts',
            content: 'export const hello = () => "World";'
        };
        await mcpClient.callTool('filesystem', 'write_file', payloadArgs);
        console.log('[Test] MCP write_file completed!');

        const exists = fs.existsSync(payloadArgs.path);
        console.log(`[Test] Verification: File exists on disk = ${exists}`);
    } catch (e) {
        console.error('[Test] File injection failed:', e);
    }

    process.exit(0);
}

verify();
