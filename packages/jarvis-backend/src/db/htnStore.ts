import { Pool } from 'pg';

export interface HTNNode {
    id: string;
    parentId: string | null;
    missionId: string;
    name: string;
    description: string;
    type: 'compound' | 'primitive' | 'suspended';
    status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'suspended' | 'waiting';
    preconditions: string[];
    effects: string[];
    context: Record<string, any>;
    priority: number;
    estimatedDuration: number;
    actualDuration?: number;
    createdAt: number;
    updatedAt: number;
}

/**
 * HTN Store — Phase 8 Strategic Persistence
 * 
 * Manages the persistence of complex hierarchical task networks.
 */
export class HTNStore {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    /**
     * Initialize HTN tables
     */
    async initialize(): Promise<void> {
        await this.db.query(`
      CREATE TABLE IF NOT EXISTS htn_nodes (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        mission_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        preconditions TEXT[],
        effects TEXT[],
        context JSONB DEFAULT '{}',
        priority INTEGER DEFAULT 0,
        estimated_duration BIGINT,
        actual_duration BIGINT,
        created_at BIGINT,
        updated_at BIGINT,
        FOREIGN KEY (parent_id) REFERENCES htn_nodes(id)
      );

      CREATE INDEX IF NOT EXISTS idx_htn_mission ON htn_nodes(mission_id);
      CREATE INDEX IF NOT EXISTS idx_htn_status ON htn_nodes(status);
      CREATE INDEX IF NOT EXISTS idx_htn_parent ON htn_nodes(parent_id);
    `);
    }

    /**
     * Save a node to the store
     */
    async saveNode(node: HTNNode): Promise<void> {
        await this.db.query(
            `INSERT INTO htn_nodes (id, parent_id, mission_id, name, description, type, status, preconditions, effects, context, priority, estimated_duration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         context = EXCLUDED.context,
         updated_at = EXCLUDED.updated_at,
         actual_duration = EXCLUDED.actual_duration`,
            [
                node.id,
                node.parentId,
                node.missionId,
                node.name,
                node.description,
                node.type,
                node.status,
                node.preconditions,
                node.effects,
                JSON.stringify(node.context),
                node.priority,
                node.estimatedDuration,
                node.createdAt,
                node.updatedAt
            ]
        );
    }

    /**
     * Get all nodes for a specific mission
     */
    async getMissionNodes(missionId: string): Promise<HTNNode[]> {
        const result = await this.db.query(
            'SELECT * FROM htn_nodes WHERE mission_id = $1 ORDER BY created_at ASC',
            [missionId]
        );

        return result.rows.map(row => ({
            id: row.id,
            parentId: row.parent_id,
            missionId: row.mission_id,
            name: row.name,
            description: row.description,
            type: row.type as any,
            status: row.status as any,
            preconditions: row.preconditions || [],
            effects: row.effects || [],
            context: row.context || {},
            priority: row.priority,
            estimatedDuration: Number(row.estimated_duration),
            actualDuration: row.actual_duration ? Number(row.actual_duration) : undefined,
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at)
        }));
    }
}
