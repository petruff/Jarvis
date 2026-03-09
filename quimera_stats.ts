
import { knowledgeGraph } from './packages/jarvis-backend/src/memory/graph';
import { hybridMemory } from './packages/jarvis-backend/src/index';

async function finalStats() {
    await knowledgeGraph.initialize();
    const db = (knowledgeGraph as any).db;
    if (db) {
        const nodeCount = db.prepare('SELECT count(*) as count FROM nodes').get().count;
        const edgeCount = db.prepare('SELECT count(*) as count FROM edges').get().count;
        const nodes = db.prepare('SELECT id, label, type FROM nodes').all();
        const edges = db.prepare('SELECT from_id, to_id, relation FROM edges').all();

        console.log("\n--- QUIMERA NEURAL MAP STATUS ---");
        console.log(`TOTAL NODES: ${nodeCount}`);
        console.log(`TOTAL EDGES: ${edgeCount}`);
        console.log("\nNODES:");
        nodes.forEach((n: any) => console.log(`  [${n.type}] ${n.label} (ID: ${n.id})`));
        console.log("\nEDGES:");
        edges.forEach((e: any) => console.log(`  ${e.from_id} --(${e.relation})--> ${e.to_id}`));
        console.log("---------------------------------\n");
    }
    process.exit(0);
}

finalStats();
