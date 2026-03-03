/**
 * Consensus History Tracker — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Track all consensus decisions over time
 * - Timeline visualization data
 * - Decision quality trending
 * - Dispute resolution history
 * - Decision reversals and updates
 */

import { ConsensusDecision } from './types';
import Redis from 'redis';
import { Pool } from 'pg';

export interface HistoricalConsensus {
  id: string;
  query: string;
  decision: string;
  confidence: number;
  timestamp: number;
  expertsConsulted: number;
  domain?: string;
  status: 'active' | 'reversed' | 'updated' | 'disputed';
  reasonForChange?: string;
  tags: string[];
}

export interface ConsensusTimeline {
  period: string; // '1d', '7d', '30d'
  decisions: HistoricalConsensus[];
  metrics: {
    totalDecisions: number;
    avgConfidence: number;
    reversalRate: number;
    disputeRate: number;
    topDomains: { domain: string; count: number }[];
  };
}

export class ConsensusHistoryTracker {
  private db: Pool;
  private cache: Redis.RedisClient;

  constructor(db: Pool, cache: Redis.RedisClient) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * Initialize consensus history schema
   */
  async initialize(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS consensus_history (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        decision TEXT NOT NULL,
        confidence FLOAT,
        timestamp BIGINT,
        experts_consulted INTEGER,
        domain TEXT,
        status TEXT DEFAULT 'active',
        reason_for_change TEXT,
        tags TEXT[] DEFAULT '{}',
        created_at BIGINT,
        updated_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS consensus_disputes (
        id TEXT PRIMARY KEY,
        consensus_id TEXT NOT NULL,
        disputed_by TEXT NOT NULL,
        reason TEXT NOT NULL,
        resolution TEXT,
        timestamp BIGINT,
        resolved_at BIGINT,
        FOREIGN KEY (consensus_id) REFERENCES consensus_history(id)
      );

      CREATE INDEX IF NOT EXISTS idx_consensus_timestamp ON consensus_history(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_consensus_domain ON consensus_history(domain);
      CREATE INDEX IF NOT EXISTS idx_consensus_status ON consensus_history(status);
    `);
  }

  /**
   * Record a new consensus decision in history
   */
  async recordConsensus(consensus: ConsensusDecision, domain?: string): Promise<string> {
    const id = consensus.id;
    const timestamp = consensus.timestamp || Date.now();
    const now = Date.now();

    await this.db.query(
      `INSERT INTO consensus_history
       (id, query, decision, confidence, timestamp, experts_consulted, domain, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        consensus.query,
        consensus.decision,
        parseFloat(consensus.confidence),
        timestamp,
        consensus.profile.cloneIds.length,
        domain || 'unknown',
        'active',
        now,
        now,
      ]
    );

    // Cache in Redis
    await this.cache.set(
      `consensus:${id}`,
      JSON.stringify({
        id,
        query: consensus.query,
        decision: consensus.decision,
        confidence: consensus.confidence,
        timestamp,
        experts: consensus.profile.cloneIds.length,
        domain,
        status: 'active',
      }),
      { EX: 86400 } // 24 hours
    );

    return id;
  }

  /**
   * Mark consensus as reversed (incorrect decision)
   */
  async reverseConsensus(
    consensusId: string,
    correctedDecision: string,
    reason: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE consensus_history
       SET status = $1, reason_for_change = $2, updated_at = $3
       WHERE id = $4`,
      ['reversed', reason, Date.now(), consensusId]
    );

    // Create new record for corrected decision
    const correctedId = `${consensusId}-correction-${Date.now()}`;
    const original = await this.db.query(
      `SELECT * FROM consensus_history WHERE id = $1`,
      [consensusId]
    );

    if (original.rows.length > 0) {
      const row = original.rows[0];
      await this.db.query(
        `INSERT INTO consensus_history
         (id, query, decision, confidence, timestamp, experts_consulted, domain, status, reason_for_change, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          correctedId,
          row.query,
          correctedDecision,
          row.confidence,
          Date.now(),
          row.experts_consulted,
          row.domain,
          'active',
          `Correction of ${consensusId}: ${reason}`,
          Date.now(),
          Date.now(),
        ]
      );
    }
  }

  /**
   * Dispute a consensus decision
   */
  async disputeConsensus(
    consensusId: string,
    disputedBy: string,
    reason: string
  ): Promise<string> {
    const disputeId = `dispute-${Date.now()}`;

    await this.db.query(
      `INSERT INTO consensus_disputes (id, consensus_id, disputed_by, reason, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [disputeId, consensusId, disputedBy, reason, Date.now()]
    );

    // Update consensus status
    await this.db.query(
      `UPDATE consensus_history SET status = $1 WHERE id = $2`,
      ['disputed', consensusId]
    );

    return disputeId;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE consensus_disputes
       SET resolution = $1, resolved_at = $2
       WHERE id = $3`,
      [resolution, Date.now(), disputeId]
    );
  }

  /**
   * Get consensus timeline for period
   */
  async getTimeline(period: '1d' | '7d' | '30d'): Promise<ConsensusTimeline> {
    const now = Date.now();
    const periodMs = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[period];

    const startTime = now - periodMs;

    // Get all consensus decisions in period
    const result = await this.db.query(
      `SELECT * FROM consensus_history
       WHERE timestamp >= $1 AND status IN ('active', 'reversed', 'disputed')
       ORDER BY timestamp DESC`,
      [startTime]
    );

    const decisions: HistoricalConsensus[] = result.rows.map((row) => ({
      id: row.id,
      query: row.query,
      decision: row.decision,
      confidence: row.confidence,
      timestamp: row.timestamp,
      expertsConsulted: row.experts_consulted,
      domain: row.domain,
      status: row.status,
      reasonForChange: row.reason_for_change,
      tags: row.tags || [],
    }));

    // Calculate metrics
    const totalDecisions = decisions.length;
    const avgConfidence =
      totalDecisions > 0
        ? decisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions
        : 0;

    const reversalCount = decisions.filter((d) => d.status === 'reversed').length;
    const reversalRate = totalDecisions > 0 ? reversalCount / totalDecisions : 0;

    const disputeCount = decisions.filter((d) => d.status === 'disputed').length;
    const disputeRate = totalDecisions > 0 ? disputeCount / totalDecisions : 0;

    const domainCounts: Record<string, number> = {};
    decisions.forEach((d) => {
      domainCounts[d.domain || 'unknown'] = (domainCounts[d.domain || 'unknown'] || 0) + 1;
    });

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period,
      decisions,
      metrics: {
        totalDecisions,
        avgConfidence,
        reversalRate,
        disputeRate,
        topDomains,
      },
    };
  }

  /**
   * Get decision quality trending (improvement over time)
   */
  async getTrendAnalysis(
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    trend: 'improving' | 'degrading' | 'stable';
    confidenceTrend: number; // -1 to 1
    reversalTrend: number; // -1 to 1
    disputeTrend: number; // -1 to 1
  }> {
    const periodMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    }[period];

    const now = Date.now();
    const midpoint = now - periodMs / 2;

    // Get first half metrics
    const firstHalf = await this.db.query(
      `SELECT confidence, status FROM consensus_history
       WHERE timestamp >= $1 AND timestamp < $2`,
      [now - periodMs, midpoint]
    );

    // Get second half metrics
    const secondHalf = await this.db.query(
      `SELECT confidence, status FROM consensus_history
       WHERE timestamp >= $1 AND timestamp <= $2`,
      [midpoint, now]
    );

    const getMetrics = (rows: any[]) => {
      const avgConfidence =
        rows.length > 0 ? rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length : 0;
      const reversalRate = rows.filter((r) => r.status === 'reversed').length / Math.max(1, rows.length);
      const disputeRate = rows.filter((r) => r.status === 'disputed').length / Math.max(1, rows.length);
      return { avgConfidence, reversalRate, disputeRate };
    };

    const first = getMetrics(firstHalf.rows);
    const second = getMetrics(secondHalf.rows);

    const confidenceTrend = second.avgConfidence - first.avgConfidence;
    const reversalTrend = -(second.reversalRate - first.reversalRate); // Lower reversal = better
    const disputeTrend = -(second.disputeRate - first.disputeRate); // Lower dispute = better

    const overallTrend = (confidenceTrend + reversalTrend + disputeTrend) / 3;

    return {
      trend:
        overallTrend > 0.05
          ? 'improving'
          : overallTrend < -0.05
            ? 'degrading'
            : 'stable',
      confidenceTrend,
      reversalTrend,
      disputeTrend,
    };
  }

  /**
   * Search consensus history
   */
  async searchHistory(
    query: string,
    filters?: { domain?: string; status?: string; minConfidence?: number }
  ): Promise<HistoricalConsensus[]> {
    let sql = `SELECT * FROM consensus_history WHERE query ILIKE $1`;
    const params: any[] = [`%${query}%`];

    if (filters?.domain) {
      sql += ` AND domain = $${params.length + 1}`;
      params.push(filters.domain);
    }

    if (filters?.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters?.minConfidence) {
      sql += ` AND confidence >= $${params.length + 1}`;
      params.push(filters.minConfidence);
    }

    sql += ` ORDER BY timestamp DESC LIMIT 100`;

    const result = await this.db.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      query: row.query,
      decision: row.decision,
      confidence: row.confidence,
      timestamp: row.timestamp,
      expertsConsulted: row.experts_consulted,
      domain: row.domain,
      status: row.status,
      reasonForChange: row.reason_for_change,
      tags: row.tags || [],
    }));
  }
}

export default ConsensusHistoryTracker;
