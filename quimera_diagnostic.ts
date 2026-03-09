
import { knowledgeGraph } from './packages/jarvis-backend/src/memory/graph';
import { quimera } from './packages/jarvis-backend/src/intelligence/quimera';
import { hybridMemory } from './packages/jarvis-backend/src/index';
import logger from './packages/jarvis-backend/src/logger';

async function runDiagnostic() {
    console.log("==================================================");
    console.log("   QUIMERA NEURAL DIAGNOSTIC — SOVEREIGN CORE  ");
    console.log("==================================================\n");

    // 1. Initialize Memories
    console.log("[BOOT] Initializing Hybrid Memory (LanceDB)...");
    await hybridMemory.initialize();

    console.log("[BOOT] Initializing Knowledge Graph (SQLite)...");
    await knowledgeGraph.initialize();

    // 2. Mock Feed (To simulate real-world activity for the user)
    console.log("[FEED] Injecting diagnostic entities and relations...");

    // UPSERT NODES FIRST
    await knowledgeGraph.upsertNode({ id: 'earth', label: 'Global State', type: 'Foundation', properties: {} });
    await knowledgeGraph.upsertNode({ id: 'market', label: 'Global Market', type: 'System', properties: {} });
    await knowledgeGraph.upsertNode({ id: 'btc', label: 'Bitcoin', type: 'Asset', properties: { price: '$65,000' } });
    await knowledgeGraph.upsertNode({ id: 'conflict_a', label: 'Region A Conflict', type: 'GeopoliticalEvent', properties: { risk: 'HIGH' } });

    // NOW ADD EDGES
    await knowledgeGraph.addEdge({ from: 'btc', to: 'market', relation: 'TRADED_ON', weight: 0.95 });
    await knowledgeGraph.addEdge({ from: 'earth', to: 'conflict_a', relation: 'OCCURRED_IN', weight: 1.0 });
    await knowledgeGraph.addEdge({ from: 'conflict_a', to: 'btc', relation: 'AFFECTS_SENTIMENT', weight: 0.85 });

    // 3. Fetch Stats
    const db = (knowledgeGraph as any).db;
    if (db) {
        const nodeCount = db.prepare('SELECT count(*) as count FROM nodes').get().count;
        const edgeCount = db.prepare('SELECT count(*) as count FROM edges').get().count;
        const latestEntities = db.prepare('SELECT label, type FROM nodes ORDER BY updatedAt DESC LIMIT 5').all();

        console.log(`\n[GRAPH] Neural Capacity: ${nodeCount} Nodes | ${edgeCount} Edges`);
        console.log(`[GRAPH] Latest Encoded Entities:`);
        latestEntities.forEach((e: any) => console.log(`  - ${e.label} [${e.type}]`));
    }

    console.log("\n[QUIMERA] Performing Deep Neural Synthesis on 'BTC and Region A'...");

    // 4. Perform Synthesis
    const synthesis = await quimera.analyze("How does the conflict in Region A impact Bitcoin sentiment?");

    console.log("\n[RESULT] Rational Core:");
    console.log(synthesis.rational_core);

    console.log("\n[RESULT] Non-Obvious Neural Connections (Graph Traversal):");
    if (synthesis.connections.length > 0) {
        synthesis.connections.forEach((c: string) => console.log(`  🔗 ${c}`));
    } else {
        console.log("  (No deep connections found in current graph cycle)");
    }

    console.log(`\n[CONFIDENCE] Synthesis Confidence Grade: ${(synthesis.confidence * 100).toFixed(1)}%`);
    console.log("\n==================================================");
    process.exit(0);
}

runDiagnostic().catch(err => {
    console.error("\n[ERROR] Diagnostic Failed:", err.message);
    process.exit(1);
});
