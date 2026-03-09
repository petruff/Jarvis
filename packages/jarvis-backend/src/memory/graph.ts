import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../logger';

export interface GraphNode {
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
}

export interface GraphEdge {
    from: string;
    to: string;
    relation: string;
    weight: number;
}

/**
 * KnowledgeGraph — Local GraphRAG Engine for JARVIS.
 * 
 * Uses SQLite to store entities (nodes) and their connections (edges).
 * This allows ORACLE to find "Quimera" truths by walking traversal paths.
 */
export class KnowledgeGraph {
    private db: Database.Database | null = null;

    constructor() { }

    async initialize(): Promise<void> {
        try {
            const dataDir = path.resolve(process.cwd(), 'data', 'graph');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const dbPath = path.join(dataDir, 'knowledge_graph.db');
            this.db = new Database(dbPath);

            // Nodes (Entities)
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    type TEXT NOT NULL,
                    properties TEXT,
                    updatedAt TEXT NOT NULL
                )
            `);

            // Edges (Relationships)
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS edges (
                    from_id TEXT NOT NULL,
                    to_id TEXT NOT NULL,
                    relation TEXT NOT NULL,
                    weight REAL DEFAULT 1.0,
                    updatedAt TEXT NOT NULL,
                    PRIMARY KEY (from_id, to_id, relation),
                    FOREIGN KEY (from_id) REFERENCES nodes(id),
                    FOREIGN KEY (to_id) REFERENCES nodes(id)
                )
            `);

            logger.info('[GraphMemory] Knowledge Graph Online — Locally Sovereign.');
        } catch (err: any) {
            logger.error(`[GraphMemory] Init failure: ${err.message}`);
        }
    }

    async upsertNode(node: GraphNode): Promise<void> {
        if (!this.db) return;
        const stmt = this.db.prepare(`
            INSERT INTO nodes (id, label, type, properties, updatedAt)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            type = excluded.type,
            properties = excluded.properties,
            updatedAt = excluded.updatedAt
        `);
        stmt.run(node.id, node.label, node.type, JSON.stringify(node.properties), new Date().toISOString());
    }

    async addEdge(edge: GraphEdge): Promise<void> {
        if (!this.db) return;
        const stmt = this.db.prepare(`
            INSERT INTO edges (from_id, to_id, relation, weight, updatedAt)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(from_id, to_id, relation) DO UPDATE SET
            weight = excluded.weight,
            updatedAt = excluded.updatedAt
        `);
        stmt.run(edge.from, edge.to, edge.relation, edge.weight, new Date().toISOString());
    }

    /**
     * Finds paths between two entities to discover "Quimera" connections
     */
    async findQuimeraConnections(entityId: string, depth: number = 2): Promise<any[]> {
        if (!this.db) return [];
        // Recursive Common Table Expression for BFS pathfinding in SQLite
        const query = `
            WITH RECURSIVE traversal(id, path, level) AS (
                SELECT id, id, 0 FROM nodes WHERE id = ?
                UNION ALL
                SELECT e.to_id, t.path || ' -> ' || e.relation || ' -> ' || e.to_id, t.level + 1
                FROM edges e
                JOIN traversal t ON e.from_id = t.id
                WHERE t.level < ?
            )
            SELECT * FROM traversal WHERE level > 0;
        `;
        return this.db.prepare(query).all(entityId, depth);
    }

    /**
     * Get local neighborhood of a node
     */
    async getNeighborhood(entityId: string): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
        if (!this.db) return { nodes: [], edges: [] };

        const edges = this.db.prepare('SELECT * FROM edges WHERE from_id = ? OR to_id = ?').all(entityId, entityId) as any[];
        const nodeIds = [...new Set(edges.flatMap(e => [e.from_id, e.to_id]))];

        const nodes = nodeIds.length > 0
            ? this.db.prepare(`SELECT * FROM nodes WHERE id IN (${nodeIds.map(() => '?').join(',')})`).all(...nodeIds) as any[]
            : [];

        return {
            nodes: nodes.map(n => ({ ...n, properties: JSON.parse(n.properties) })),
            edges: edges.map(e => ({ from: e.from_id, to: e.to_id, relation: e.relation, weight: e.weight }))
        };
    }
}

export const knowledgeGraph = new KnowledgeGraph();
