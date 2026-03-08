/**
 * Phase 7: Enterprise Features API Endpoints
 *
 * REST endpoints for:
 * - Clone comparison
 * - Consensus history tracking
 * - Multi-tenant isolation
 * - Advanced RBAC
 * - Backup & disaster recovery
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import CloneComparison, { ComparisonMetrics } from '../mindclones/cloneComparison';
import { ConsensusHistoryTracker } from '../mindclones/consensusHistory';
import MultiTenantIsolationManager from '../mindclones/multiTenantIsolation';
import { AdvancedRBACManager } from '../mindclones/advancedRBAC';
import { BackupDisasterRecoveryManager } from '../mindclones/backupDisasterRecovery';
import { Pool, RedisClient, MindClone } from '../mindclones/types';

// Phase 7 enterprise routes - supports both direct call and plugin pattern
export async function registerEnterpriseRoutes(fastify: FastifyInstance, opts: any = {}) {
  // Handle both calling patterns:
  // 1. Direct call: registerEnterpriseRoutes(fastify, { db, cache })
  // 2. Global fallback: uses (global as any).__phase7Db and __phase7Cache
  const db: Pool = opts?.db || (global as any).__phase7Db;
  const cache: RedisClient = opts?.cache || (global as any).__phase7Cache;

  console.log('[Phase 7 API] Registering 22 endpoints...', {
    hasDb: !!db,
    hasCache: !!cache,
    dbType: db?.constructor?.name,
    cacheType: cache?.constructor?.name
  });

  if (!db || !cache) {
    console.error('❌ Phase 7 API: Database or cache adapter not available');
    return;
  }

  let routeCount = 0;

  // ===== CLONE COMPARISON ENDPOINTS =====

  /**
   * POST /api/mindclones/enterprise/compare
   * Compare two clones side-by-side
   */
  fastify.post<{ Body: { cloneId1: string; cloneId2: string } }>(
    '/api/mindclones/enterprise/compare',
    async (request: FastifyRequest<{ Body: { cloneId1: string; cloneId2: string } }>, reply: FastifyReply) => {
      const { cloneId1, cloneId2 } = request.body;

      try {
        // Fetch clone data from database
        const clone1 = await db.query(
          'SELECT * FROM clones WHERE id = $1',
          [cloneId1]
        );
        const clone2 = await db.query(
          'SELECT * FROM clones WHERE id = $2',
          [cloneId2]
        );

        if (clone1.rows.length === 0 || clone2.rows.length === 0) {
          return reply.status(404).send({ error: 'Clone not found' });
        }

        const cloneData1: MindClone = {
          id: clone1.rows[0].id,
          cloneId: clone1.rows[0].id,
          dna: clone1.rows[0].dna,
          createdAt: Number(clone1.rows[0].created_at),
          updatedAt: Number(clone1.rows[0].updated_at),
          activationCount: Number(clone1.rows[0].activation_count),
          successRate: Number(clone1.rows[0].success_rate),
          sourceDocuments: [],
          extractionConfidence: 1.0,
          metadata: { version: '1.0', extractedBy: 'system', notes: '', tags: [] }
        };
        const cloneData2: MindClone = {
          id: clone2.rows[0].id,
          cloneId: clone2.rows[0].id,
          dna: clone2.rows[0].dna,
          createdAt: Number(clone2.rows[0].created_at),
          updatedAt: Number(clone2.rows[0].updated_at),
          activationCount: Number(clone2.rows[0].activation_count),
          successRate: Number(clone2.rows[0].success_rate),
          sourceDocuments: [],
          extractionConfidence: 1.0,
          metadata: { version: '1.0', extractedBy: 'system', notes: '', tags: [] }
        };

        // Compare using CloneComparison
        const metrics = await CloneComparison.compareClones(
          cloneData1,
          cloneData2,
          { confidence: 0.85, claim: 'Default insight 1', reasoning: 'Analysis' } as any,
          { confidence: 0.75, claim: 'Default insight 2', reasoning: 'Analysis' } as any
        );

        const analysis = CloneComparison.generateAnalysis(
          cloneData1,
          cloneData2,
          metrics
        );

        return reply.send({
          metrics,
          analysis,
          timestamp: Date.now(),
        });
      } catch (error: any) {
        fastify.log.error(`Clone comparison failed: ${error.message}`);
        return reply.status(500).send({ error: 'Comparison failed' });
      }
    }
  );

  // ===== CONSENSUS HISTORY ENDPOINTS =====

  /**
   * POST /api/mindclones/enterprise/history/timeline
   * Get consensus timeline for period
   */
  fastify.post<{ Querystring: { period?: '1d' | '7d' | '30d' } }>(
    '/api/mindclones/enterprise/history/timeline',
    async (request, reply) => {
      const { period = '7d' } = request.query;

      try {
        const tracker = new ConsensusHistoryTracker(db, cache);
        const timeline = await tracker.getTimeline(period as any);

        return reply.send(timeline);
      } catch (error: any) {
        fastify.log.error(`Timeline fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Timeline fetch failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/history/trends
   * Get trend analysis for consensus quality
   */
  fastify.post<{ Querystring: { period?: '7d' | '30d' | '90d' } }>(
    '/api/mindclones/enterprise/history/trends',
    async (request, reply) => {
      const { period = '30d' } = request.query;

      try {
        const tracker = new ConsensusHistoryTracker(db, cache);
        const trends = await tracker.getTrendAnalysis(period as any);

        return reply.send(trends);
      } catch (error: any) {
        fastify.log.error(`Trend analysis failed: ${error.message}`);
        return reply.status(500).send({ error: 'Trend analysis failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/history/search
   * Search consensus history
   */
  fastify.post<{
    Body: {
      query: string;
      filters?: { domain?: string; status?: string; minConfidence?: number };
    };
  }>(
    '/api/mindclones/enterprise/history/search',
    async (request: FastifyRequest<{ Body: { query: string; filters?: { domain?: string; status?: string; minConfidence?: number } } }>, reply: FastifyReply) => {
      const { query, filters } = request.body;

      try {
        const tracker = new ConsensusHistoryTracker(db, cache);
        const results = await tracker.searchHistory(query, filters);

        return reply.send({
          count: results.length,
          results,
        });
      } catch (error: any) {
        fastify.log.error(`History search failed: ${error.message}`);
        return reply.status(500).send({ error: 'Search failed' });
      }
    }
  );

  // ===== MULTI-TENANT ENDPOINTS =====

  /**
   * POST /api/mindclones/enterprise/tenant/create
   * Create new tenant
   */
  fastify.post<{ Body: any }>(
    '/api/mindclones/enterprise/tenant/create',
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      const tenantData = request.body;

      try {
        const manager = new MultiTenantIsolationManager(db, cache);
        const tenantId = await manager.createTenant(tenantData as any);

        return reply.status(201).send({
          tenantId,
          message: 'Tenant created successfully',
        });
      } catch (error: any) {
        fastify.log.error(`Tenant creation failed: ${error.message}`);
        return reply.status(500).send({ error: 'Tenant creation failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/tenant/:id/limits
   * Check tenant limits
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/mindclones/enterprise/tenant/:id/limits',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const manager = new MultiTenantIsolationManager(db, cache);
        const limits = await manager.checkTenantLimits(id);

        return reply.send(limits);
      } catch (error: any) {
        fastify.log.error(`Tenant limits fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Limits fetch failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/tenant/:id/audit
   * Get audit log for tenant
   */
  fastify.post<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>(
    '/api/mindclones/enterprise/tenant/:id/audit',
    async (request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { limit = 100, offset = 0 } = request.query;

      try {
        const manager = new MultiTenantIsolationManager(db, cache);
        const auditLog = await manager.getAuditLog(id, Number(limit), Number(offset));

        return reply.send({
          count: auditLog.length,
          limit,
          offset,
          logs: auditLog,
        });
      } catch (error: any) {
        fastify.log.error(`Audit log fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Audit log fetch failed' });
      }
    }
  );

  // ===== RBAC ENDPOINTS =====

  /**
   * POST /api/mindclones/enterprise/rbac/roles
   * List all roles for tenant
   */
  fastify.post<{ Body: { tenantId: string } }>(
    '/api/mindclones/enterprise/rbac/roles',
    async (request: FastifyRequest<{ Body: { tenantId: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.body;

      try {
        const manager = new AdvancedRBACManager(db, cache);
        const roles = await manager.listRoles(tenantId);

        return reply.send(roles);
      } catch (error: any) {
        fastify.log.error(`Roles fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Roles fetch failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/rbac/roles/create
   * Create custom role
   */
  fastify.post<{ Body: { tenantId: string; name: string; permissions: string[] } }>(
    '/api/mindclones/enterprise/rbac/roles/create',
    async (request: FastifyRequest<{ Body: { tenantId: string; name: string; permissions: string[] } }>, reply: FastifyReply) => {
      const { tenantId, name, permissions } = request.body;

      try {
        const manager = new AdvancedRBACManager(db, cache);
        const roleId = await manager.createRole(tenantId, {
          tenant_id: tenantId,
          name,
          permissions: permissions as any,
        });

        return reply.status(201).send({
          roleId,
          message: 'Role created successfully',
        });
      } catch (error: any) {
        fastify.log.error(`Role creation failed: ${error.message}`);
        return reply.status(500).send({ error: 'Role creation failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/rbac/users/:userId/assign
   * Assign role to user
   */
  fastify.post<{
    Params: { userId: string };
    Body: { tenantId: string; roleId: string; grantedBy: string };
  }>(
    '/api/mindclones/enterprise/rbac/users/:userId/assign',
    async (request: FastifyRequest<{ Params: { userId: string }; Body: { tenantId: string; roleId: string; grantedBy: string } }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const { tenantId, roleId, grantedBy } = request.body;

      try {
        const manager = new AdvancedRBACManager(db, cache);
        await manager.assignRoleToUser(tenantId, userId, roleId, grantedBy);

        return reply.send({
          message: 'Role assigned successfully',
        });
      } catch (error: any) {
        fastify.log.error(`Role assignment failed: ${error.message}`);
        return reply.status(500).send({ error: 'Assignment failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/rbac/check
   * Check user permission
   */
  fastify.post<{
    Body: {
      tenantId: string;
      userId: string;
      action: string;
      resourceType: string;
      resourceId?: string;
    };
  }>(
    '/api/mindclones/enterprise/rbac/check',
    async (request: FastifyRequest<{ Body: { tenantId: string; userId: string; action: string; resourceType: string; resourceId?: string } }>, reply: FastifyReply) => {
      const { tenantId, userId, action, resourceType, resourceId } = request.body;

      try {
        const manager = new AdvancedRBACManager(db, cache);
        const allowed = await manager.hasPermission({
          tenant_id: tenantId,
          user_id: userId,
          roles: [],
          resource_type: resourceType,
          resource_id: resourceId,
          action: action as any,
        });

        return reply.send({
          allowed,
          action,
          resourceType,
        });
      } catch (error: any) {
        fastify.log.error(`Permission check failed: ${error.message}`);
        return reply.status(500).send({ error: 'Permission check failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/rbac/audit
   * Get RBAC audit log
   */
  fastify.post<{ Body: { tenantId: string; userId?: string; limit?: number } }>(
    '/api/mindclones/enterprise/rbac/audit',
    async (request: FastifyRequest<{ Body: { tenantId: string; userId?: string; limit?: number } }>, reply: FastifyReply) => {
      const { tenantId, userId, limit = 50 } = request.body;

      try {
        const manager = new AdvancedRBACManager(db, cache);
        const auditLog = await manager.getPermissionAuditLog(tenantId, userId, Number(limit));

        return reply.send({
          count: auditLog.length,
          logs: auditLog,
        });
      } catch (error: any) {
        fastify.log.error(`RBAC audit log fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Audit log fetch failed' });
      }
    }
  );

  // ===== BACKUP & DISASTER RECOVERY ENDPOINTS =====

  /**
   * POST /api/mindclones/enterprise/backup/perform
   * Perform backup
   */
  fastify.post<{ Body: { tenantId?: string } }>(
    '/api/mindclones/enterprise/backup/perform',
    async (request: FastifyRequest<{ Body: { tenantId?: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.body;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        const metadata = await manager.performBackup(tenantId);

        return reply.status(201).send({
          backup_id: metadata.id,
          status: metadata.status,
          tables_backed_up: metadata.tables_backed_up,
          row_count: metadata.row_count,
          duration_ms: metadata.duration_ms,
        });
      } catch (error: any) {
        fastify.log.error(`Backup failed: ${error.message}`);
        return reply.status(500).send({ error: 'Backup failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/backup/history
   * Get backup history
   */
  fastify.post<{ Body: { tenantId: string; limit?: number } }>(
    '/api/mindclones/enterprise/backup/history',
    async (request: FastifyRequest<{ Body: { tenantId: string; limit?: number } }>, reply: FastifyReply) => {
      const { tenantId, limit = 10 } = request.body;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        const history = await manager.getBackupHistory(tenantId, Number(limit));

        return reply.send({
          count: history.length,
          backups: history,
        });
      } catch (error: any) {
        fastify.log.error(`Backup history fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'History fetch failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/backup/stats
   * Get backup statistics
   */
  fastify.post<{ Body: { tenantId: string } }>(
    '/api/mindclones/enterprise/backup/stats',
    async (request: FastifyRequest<{ Body: { tenantId: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.body;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        const stats = await manager.getBackupStatistics(tenantId);

        return reply.send(stats);
      } catch (error: any) {
        fastify.log.error(`Backup stats fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Stats fetch failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/recovery/plan/create
   * Create recovery plan
   */
  fastify.post<{
    Body: {
      tenantId: string;
      backupId: string;
      targetTime: number;
      recoveryType?: 'full' | 'point-in-time' | 'table-level';
      tablesToRecover?: string[];
    };
  }>(
    '/api/mindclones/enterprise/recovery/plan/create',
    async (request: FastifyRequest<{ Body: { tenantId: string; backupId: string; targetTime: number; recoveryType?: 'full' | 'point-in-time' | 'table-level'; tablesToRecover?: string[] } }>, reply: FastifyReply) => {
      const { tenantId, backupId, targetTime, recoveryType = 'full', tablesToRecover } = request.body;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        const planId = await manager.createRecoveryPlan(
          tenantId,
          backupId,
          Number(targetTime),
          recoveryType,
          tablesToRecover
        );

        return reply.status(201).send({
          plan_id: planId,
          message: 'Recovery plan created successfully',
        });
      } catch (error: any) {
        fastify.log.error(`Recovery plan creation failed: ${error.message}`);
        return reply.status(500).send({ error: 'Plan creation failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/recovery/plan/:id/execute
   * Execute recovery plan
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/mindclones/enterprise/recovery/plan/:id/execute',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        await manager.executeRecoveryPlan(id);

        return reply.send({
          status: 'completed',
          message: 'Recovery plan executed successfully',
        });
      } catch (error: any) {
        fastify.log.error(`Recovery plan execution failed: ${error.message}`);
        return reply.status(500).send({ error: 'Plan execution failed' });
      }
    }
  );

  /**
   * POST /api/mindclones/enterprise/recovery/plans
   * List all recovery plans
   */
  fastify.post<{ Body: { tenantId?: string; limit?: number } }>(
    '/api/mindclones/enterprise/recovery/plans',
    async (request: FastifyRequest<{ Body: { tenantId?: string; limit?: number } }>, reply: FastifyReply) => {
      const { tenantId, limit = 20 } = request.body;

      try {
        const config = {
          enabled: true,
          schedule: '0 2 * * *',
          retention_days: 30,
          backup_path: './backups',
          incremental: true,
          verify_after_backup: true,
        };

        const manager = new BackupDisasterRecoveryManager(db, cache, config);
        const plans = await manager.listRecoveryPlans(tenantId || 'system');

        return reply.send({
          count: plans.length,
          plans,
        });
      } catch (error: any) {
        fastify.log.error(`Recovery plans fetch failed: ${error.message}`);
        return reply.status(500).send({ error: 'Plans fetch failed' });
      }
    }
  );

  fastify.log.info('Phase 7: Enterprise Features API endpoints registered');
}
