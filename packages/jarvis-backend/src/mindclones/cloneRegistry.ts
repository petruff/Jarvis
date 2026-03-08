/**
 * Clone Registry — Distributed Clone Persistence & Versioning
 *
 * Responsibilities:
 * - Persist clones to PostgreSQL with versioning
 * - Track clone evolution and mutations
 * - Manage clone lifecycle (active, archived, deprecated)
 * - Distributed cache (Redis) for fast lookup
 */

import { MindClone, MindCloneDNA, RedisClient, Pool } from './types';

export interface CloneRecord {
  id: string;
  expertName: string;
  domain: string;
  dna: MindCloneDNA;
  version: number;
  status: 'active' | 'archived' | 'deprecated';
  createdAt: number;
  updatedAt: number;
  activationCount: number;
  successRate: number;
}

export interface CloneVersion {
  version: number;
  dna: MindCloneDNA;
  timestamp: number;
  reason: string; // "initial" | "mutation" | "evolved" | "retrained"
  metrics: {
    accuracyBefore: number;
    accuracyAfter: number;
    confidenceShift: number;
  };
}

export class CloneRegistry {
  private db: Pool;
  private cache: RedisClient;
  private cachePrefix = 'clone:';
  private versionPrefix = 'clone-versions:';

  constructor(db: Pool, cache: RedisClient) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * Initialize clone registry schema
   */
  async initialize(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS clones (
        id TEXT PRIMARY KEY,
        expert_name TEXT NOT NULL,
        domain TEXT NOT NULL,
        dna JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at BIGINT,
        updated_at BIGINT,
        activation_count INTEGER DEFAULT 0,
        success_rate FLOAT DEFAULT 0.0
      );

      CREATE TABLE IF NOT EXISTS clone_versions (
        clone_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        dna JSONB NOT NULL,
        reason TEXT,
        metrics JSONB,
        timestamp BIGINT,
        PRIMARY KEY (clone_id, version),
        FOREIGN KEY (clone_id) REFERENCES clones(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_clones_domain ON clones(domain);
      CREATE INDEX IF NOT EXISTS idx_clones_status ON clones(status);
      CREATE INDEX IF NOT EXISTS idx_clones_success_rate ON clones(success_rate DESC);
    `);
  }

  /**
   * Create and persist a new clone
   */
  async createClone(clone: MindClone, dna: MindCloneDNA): Promise<void> {
    const now = Date.now();
    const record: CloneRecord = {
      id: clone.id,
      expertName: clone.dna.expertName,
      domain: clone.dna.domain,
      dna,
      version: 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      activationCount: 0,
      successRate: 0.0,
    };

    await this.db.query(
      `INSERT INTO clones (id, expert_name, domain, dna, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.id, record.expertName, record.domain, JSON.stringify(dna), 1, now, now]
    );

    // Store initial version
    await this.storeVersion(clone.id, 1, dna, 'initial', {
      accuracyBefore: 0,
      accuracyAfter: 0.75,
      confidenceShift: 0,
    });

    // Cache it
    await this.cache.set(
      `${this.cachePrefix}${clone.id}`,
      JSON.stringify(record),
      { EX: 3600 }
    );
  }

  /**
   * Get clone from cache (fallback to DB)
   */
  async getClone(cloneId: string): Promise<CloneRecord | null> {
    // Try cache first
    const cached = await this.cache.get(`${this.cachePrefix}${cloneId}`);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Fallback to DB
    const result = await this.db.query(
      `SELECT * FROM clones WHERE id = $1 AND status = 'active'`,
      [cloneId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const record: CloneRecord = {
      id: row.id,
      expertName: row.expert_name,
      domain: row.domain,
      dna: row.dna,
      version: row.version,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activationCount: row.activation_count,
      successRate: row.success_rate,
    };

    // Cache for next time
    await this.cache.set(
      `${this.cachePrefix}${cloneId}`,
      JSON.stringify(record),
      { EX: 3600 }
    );

    return record;
  }

  /**
   * List all clones (paginated, filtered by domain/status)
   */
  async listClones(
    domain?: string,
    status: 'active' | 'archived' | 'deprecated' = 'active',
    limit = 50,
    offset = 0
  ): Promise<CloneRecord[]> {
    let query = `SELECT * FROM clones WHERE status = $1`;
    const params: any[] = [status];

    if (domain) {
      query += ` AND domain = $${params.length + 1}`;
      params.push(domain);
    }

    query += ` ORDER BY success_rate DESC, activation_count DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      expertName: row.expert_name,
      domain: row.domain,
      dna: row.dna,
      version: row.version,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activationCount: row.activation_count,
      successRate: row.success_rate,
    }));
  }

  /**
   * Update clone metrics (activation count, success rate)
   */
  async updateMetrics(cloneId: string, successful: boolean): Promise<void> {
    await this.db.query(
      `UPDATE clones
       SET activation_count = activation_count + 1,
           success_rate = CASE
             WHEN $2 THEN (success_rate * activation_count + 1) / (activation_count + 1)
             ELSE (success_rate * activation_count) / (activation_count + 1)
           END,
           updated_at = $3
       WHERE id = $1`,
      [cloneId, successful, Date.now()]
    );

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}${cloneId}`);
  }

  /**
   * Store new version (mutation, evolution, retraining)
   */
  async storeVersion(
    cloneId: string,
    version: number,
    dna: MindCloneDNA,
    reason: string,
    metrics: { accuracyBefore: number; accuracyAfter: number; confidenceShift: number }
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO clone_versions (clone_id, version, dna, reason, metrics, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cloneId, version, JSON.stringify(dna), reason, JSON.stringify(metrics), Date.now()]
    );
  }

  /**
   * Get version history for clone
   */
  async getVersionHistory(cloneId: string): Promise<CloneVersion[]> {
    const result = await this.db.query(
      `SELECT version, dna, reason, metrics, timestamp FROM clone_versions
       WHERE clone_id = $1 ORDER BY version ASC`,
      [cloneId]
    );

    return result.rows.map((row) => ({
      version: row.version,
      dna: row.dna,
      reason: row.reason,
      timestamp: row.timestamp,
      metrics: row.metrics,
    }));
  }

  /**
   * Rollback clone to previous version
   */
  async rollbackToVersion(cloneId: string, targetVersion: number): Promise<MindCloneDNA> {
    const result = await this.db.query(
      `SELECT dna FROM clone_versions WHERE clone_id = $1 AND version = $2`,
      [cloneId, targetVersion]
    );

    if (result.rows.length === 0) {
      throw new Error(`Version ${targetVersion} not found for clone ${cloneId}`);
    }

    const dna = result.rows[0].dna;

    // Update current version
    await this.db.query(
      `UPDATE clones SET dna = $1, version = $2, updated_at = $3 WHERE id = $4`,
      [JSON.stringify(dna), targetVersion, Date.now(), cloneId]
    );

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}${cloneId}`);

    return dna;
  }

  /**
   * Archive clone (preserve, don't delete)
   */
  async archiveClone(cloneId: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE clones SET status = 'archived', updated_at = $1 WHERE id = $2`,
      [Date.now(), cloneId]
    );

    // Log archive reason
    await this.db.query(
      `INSERT INTO clone_versions (clone_id, version, reason, timestamp)
       VALUES ($1, -1, $2, $3)`,
      [cloneId, `ARCHIVED: ${reason}`, Date.now()]
    );

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}${cloneId}`);
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    totalClones: number;
    activeClones: number;
    clonesByDomain: Record<string, number>;
    averageSuccessRate: number;
    topClones: CloneRecord[];
  }> {
    const totalResult = await this.db.query(`
      SELECT status, COUNT(*) as count FROM clones GROUP BY status
    `);

    const domainResult = await this.db.query(`
      SELECT domain, COUNT(*) as count FROM clones WHERE status = 'active' GROUP BY domain
    `);

    const avgResult = await this.db.query(`
      SELECT AVG(success_rate) as avg FROM clones WHERE status = 'active'
    `);

    const topResult = await this.db.query(`
      SELECT * FROM clones WHERE status = 'active' ORDER BY success_rate DESC LIMIT 10
    `);

    const clonesByStatus: Record<string, number> = {};
    totalResult.rows.forEach((row) => {
      clonesByStatus[row.status] = row.count;
    });

    const clonesByDomain: Record<string, number> = {};
    domainResult.rows.forEach((row) => {
      clonesByDomain[row.domain] = row.count;
    });

    return {
      totalClones: Object.values(clonesByStatus).reduce((a, b) => a + b, 0),
      activeClones: clonesByStatus['active'] || 0,
      clonesByDomain,
      averageSuccessRate: parseFloat(avgResult.rows[0]?.avg || '0'),
      topClones: topResult.rows.map((row) => ({
        id: row.id,
        expertName: row.expert_name,
        domain: row.domain,
        dna: row.dna,
        version: row.version,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        activationCount: row.activation_count,
        successRate: row.success_rate,
      })),
    };
  }
}
