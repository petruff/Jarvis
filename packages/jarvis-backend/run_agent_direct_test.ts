import { runAgentLoop } from './src/agent';
import { mcpClient } from './src/tools/mcpClient';
import { config } from './src/config/loader';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    console.log("Initializing MCP Clients...");
    await mcpClient.initialize({
        log: { info: console.log, error: console.error }
    } as any, null as any);

    console.log("MCP initialized. Running agent loop...");
    const objective = "Read the file at c:/Users/ppetr/OneDrive/Desktop/Jarvis-Platform/packages/jarvis-backend/data/test_mission.txt and summarize its contents.";

    try {
        const result = await runAgentLoop(objective, 5, "You are a test agent.", null, "oracle", 'headless');
        console.log("FINAL RESULT:", result);
    } catch (e) {
        console.error("Test Error:", e);
    }
    process.exit(0);
}

run();
