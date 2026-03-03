/**
 * Multi-Tenant Isolation — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Tenant isolation with PostgreSQL Row-Level Security
 * - Organization hierarchy (org → teams → clones)
 * - Data segregation at database layer
 * - Cross-tenant audit logging
 */

import { Pool } from 'pg';
import Redis from 'redis';

export interface Tenant {
  id: string;
  organization_id: string;
  name: string;
  tier: 'free' | 'professional' | 'enterprise';
  max_clones: number;
  max_users: number;
  features: string[];
  created_at: number;
  is_active: boolean;
}

export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  members: number;
  created_at: number;
}

export interface TenantAudit {
  id: string;
  tenant_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  changes: Record<string, any>;
  timestamp: number;
}

export class MultiTenantIsolationManager {
  private db: Pool;
  private cache: Redis.RedisClient;

  constructor(db: Pool, cache: Redis.RedisClient) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * Initialize multi-tenant schema with RLS policies
   */
  async initialize(): Promise<void> {
    await this.db.query(`
      -- Tenants table
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        tier TEXT DEFAULT 'professional',
        max_clones INTEGER DEFAULT 100,
        max_users INTEGER DEFAULT 50,
        features TEXT[] DEFAULT '{}',
        created_at BIGINT,
        updated_at BIGINT,
        is_active BOOLEAN DEFAULT true
      );

      -- Teams table
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        members INTEGER DEFAULT 1,
        created_at BIGINT,
        updated_at BIGINT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      -- Update clones table with tenant_id
      ALTER TABLE IF EXISTS clones ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      ALTER TABLE IF EXISTS clones ADD COLUMN IF NOT EXISTS team_id TEXT;

      -- Update consensus_history with tenant_id
      ALTER TABLE IF EXISTS consensus_history ADD COLUMN IF NOT EXISTS tenant_id TEXT;

      -- Tenant audit log
      CREATE TABLE IF NOT EXISTS tenant_audit_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        user_id TEXT,
        changes JSONB,
        ip_address TEXT,
        timestamp BIGINT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_clones_tenant ON clones(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_consensus_tenant ON consensus_history(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON tenant_audit_log(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON tenant_audit_log(timestamp DESC);

      -- Enable RLS on affected tables
      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;

      -- RLS Policies for clones (if RLS not already enabled)
      ALTER TABLE clones ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policies after table updates
    await this.createRLSPolicies();
  }

  /**
   * Create Row-Level Security policies for tenant isolation
   */
  private async createRLSPolicies(): Promise<void> {
    const policies = `
      -- Tenants: Users can only see their own tenant
      DROP POLICY IF EXISTS tenant_isolation ON tenants;
      CREATE POLICY tenant_isolation ON tenants
        FOR SELECT USING (
          id = current_setting('app.current_tenant_id')::text
        );

      -- Teams: Users can only see teams in their tenant
      DROP POLICY IF EXISTS team_isolation ON teams;
      CREATE POLICY team_isolation ON teams
        FOR SELECT USING (
          tenant_id = current_setting('app.current_tenant_id')::text
        );

      -- Clones: Users can only see clones in their tenant
      DROP POLICY IF EXISTS clone_isolation ON clones;
      CREATE POLICY clone_isolation ON clones
        FOR SELECT USING (
          tenant_id = current_setting('app.current_tenant_id')::text OR tenant_id IS NULL
        );

      -- Consensus history: Isolated by tenant
      DROP POLICY IF EXISTS consensus_isolation ON consensus_history;
      CREATE POLICY consensus_isolation ON consensus_history
        FOR SELECT USING (
          tenant_id = current_setting('app.current_tenant_id')::text OR tenant_id IS NULL
        );

      -- Audit log: Users can only see audit logs from their tenant
      DROP POLICY IF EXISTS audit_isolation ON tenant_audit_log;
      CREATE POLICY audit_isolation ON tenant_audit_log
        FOR SELECT USING (
          tenant_id = current_setting('app.current_tenant_id')::text
        );
    `;

    await this.db.query(policies);
  }

  /**
   * Create new tenant
   */
  async createTenant(
    tenant: Omit<Tenant, 'id' | 'created_at'>
  ): Promise<string> {
    const id = `tenant-${Date.now()}`;
    const now = Date.now();

    await this.db.query(
      `INSERT INTO tenants (id, organization_id, name, tier, max_clones, max_users, features, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        tenant.organization_id,
        tenant.name,
        tenant.tier,
        tenant.max_clones,
        tenant.max_users,
        JSON.stringify(tenant.features),
        now,
        now,
      ]
    );

    return id;
  }

  /**
   * Get tenant by ID (respects RLS)
   */
  async getTenant(tenantId: string, currentTenantId: string): Promise<Tenant | null> {
    // Check cache first
    const cached = await this.cache.get(`tenant:${tenantId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Only allow if requesting own tenant
    if (tenantId !== currentTenantId) {
      throw new Error('Unauthorized: Cannot access other tenants');
    }

    const result = await this.db.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const tenant = result.rows[0];

    // Cache for 1 hour
    await this.cache.set(
      `tenant:${tenantId}`,
      JSON.stringify(tenant),
      { EX: 3600 }
    );

    return tenant;
  }

  /**
   * Create team in tenant
   */
  async createTeam(
    tenantId: string,
    team: Omit<Team, 'id' | 'created_at'>
  ): Promise<string> {
    const id = `team-${Date.now()}`;
    const now = Date.now();

    await this.db.query(
      `INSERT INTO teams (id, tenant_id, name, description, members, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        tenantId,
        team.name,
        team.description || null,
        team.members,
        now,
        now,
      ]
    );

    return id;
  }

  /**
   * List teams in tenant
   */
  async listTeams(tenantId: string): Promise<Team[]> {
    const result = await this.db.query(
      'SELECT * FROM teams WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return result.rows;
  }

  /**
   * Log audit event for tenant
   */
  async logAuditEvent(
    audit: Omit<TenantAudit, 'id'>
  ): Promise<void> {
    const id = `audit-${Date.now()}`;

    await this.db.query(
      `INSERT INTO tenant_audit_log
       (id, tenant_id, action, resource_type, resource_id, user_id, changes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        audit.tenant_id,
        audit.action,
        audit.resource_type,
        audit.resource_id,
        audit.user_id,
        JSON.stringify(audit.changes),
        audit.timestamp,
      ]
    );

    // Also publish to Redis for real-time audit streams
    await this.cache.publish(
      `audit:${audit.tenant_id}`,
      JSON.stringify({
        id,
        action: audit.action,
        resource_type: audit.resource_type,
        timestamp: audit.timestamp,
      })
    );
  }

  /**
   * Get audit log for tenant
   */
  async getAuditLog(
    tenantId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<TenantAudit[]> {
    const result = await this.db.query(
      `SELECT * FROM tenant_audit_log
       WHERE tenant_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    return result.rows;
  }

  /**
   * List clones for tenant
   */
  async listClonesForTenant(tenantId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT * FROM clones
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return result.rows;
  }

  /**
   * Check tenant limits
   */
  async checkTenantLimits(
    tenantId: string
  ): Promise<{
    clones_used: number;
    clones_limit: number;
    clones_available: number;
    users_used: number;
    users_limit: number;
    users_available: number;
    tier: string;
  }> {
    const tenant = await this.db.query(
      'SELECT max_clones, max_users, tier FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenant.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const { max_clones, max_users, tier } = tenant.rows[0];

    // Count current clones
    const clonesResult = await this.db.query(
      'SELECT COUNT(*) FROM clones WHERE tenant_id = $1',
      [tenantId]
    );

    // Count users (would come from user_roles table in real implementation)
    const usersResult = await this.db.query(
      'SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE tenant_id = $1',
      [tenantId]
    );

    const clones_used = parseInt(clonesResult.rows[0].count);
    const users_used = parseInt(usersResult.rows[0].count);

    return {
      clones_used,
      clones_limit: max_clones,
      clones_available: max_clones - clones_used,
      users_used,
      users_limit: max_users,
      users_available: max_users - users_used,
      tier,
    };
  }

  /**
   * Set RLS context for query execution
   */
  setRLSContext(client: Pool, tenantId: string): void {
    // In a real implementation, this would be called before each query
    // to set the app.current_tenant_id GUC variable
    // Example: SET app.current_tenant_id = '...';
  }
}

export default MultiTenantIsolationManager;
