/**
 * Advanced RBAC — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Role-based access control with granular permissions
 * - Permission matrix for clone operations
 * - Dynamic permission evaluation
 * - Audit trail for authorization decisions
 */

import { RedisClient, Pool } from './types';

export type Permission =
  | 'clone:create'
  | 'clone:read'
  | 'clone:update'
  | 'clone:delete'
  | 'clone:rollback'
  | 'clone:archive'
  | 'consensus:execute'
  | 'consensus:review'
  | 'history:view'
  | 'team:manage'
  | 'rbac:manage'
  | 'tenant:admin'
  | 'audit:view';

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  created_at: number;
  is_built_in: boolean;
}

export interface UserRole {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  granted_at: number;
  granted_by: string;
}

export interface AuthorizationContext {
  user_id: string;
  tenant_id: string;
  roles: string[];
  resource_type: string;
  resource_id?: string;
  action: Permission;
}

// Default role definitions
const DEFAULT_ROLES: Record<string, { name: string; permissions: Permission[] }> = {
  admin: {
    name: 'Administrator',
    permissions: [
      'clone:create',
      'clone:read',
      'clone:update',
      'clone:delete',
      'clone:rollback',
      'clone:archive',
      'consensus:execute',
      'consensus:review',
      'history:view',
      'team:manage',
      'rbac:manage',
      'tenant:admin',
      'audit:view',
    ],
  },
  manager: {
    name: 'Manager',
    permissions: [
      'clone:create',
      'clone:read',
      'clone:update',
      'clone:rollback',
      'consensus:execute',
      'consensus:review',
      'history:view',
      'team:manage',
      'audit:view',
    ],
  },
  user: {
    name: 'User',
    permissions: [
      'clone:read',
      'clone:update',
      'consensus:execute',
      'history:view',
    ],
  },
  viewer: {
    name: 'Viewer',
    permissions: ['clone:read', 'history:view', 'consensus:review'],
  },
  restricted: {
    name: 'Restricted',
    permissions: ['clone:read'],
  },
};

export class AdvancedRBACManager {
  private db: Pool;
  private cache: RedisClient;
  private permissionCache: Map<string, Permission[]> = new Map();

  constructor(db: Pool, cache: RedisClient) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * Initialize RBAC schema
   */
  async initialize(): Promise<void> {
    await this.db.query(`
      -- Roles table
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        created_at BIGINT,
        is_built_in BOOLEAN DEFAULT false,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      -- User roles table
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        granted_at BIGINT,
        granted_by TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (role_id) REFERENCES roles(id),
        UNIQUE(tenant_id, user_id, role_id)
      );

      -- Permission audit log
      CREATE TABLE IF NOT EXISTS permission_audit_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        permission TEXT,
        result TEXT,
        timestamp BIGINT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_permission_audit ON permission_audit_log(tenant_id, timestamp DESC);
    `);

    // Initialize default roles for new tenants
    await this.initializeDefaultRoles('tenant-default');
  }

  /**
   * Initialize default roles for a tenant
   */
  async initializeDefaultRoles(tenantId: string): Promise<void> {
    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const roleId = `role-${tenantId}-${roleKey}`;

      // Check if role already exists
      const existing = await this.db.query(
        'SELECT id FROM roles WHERE id = $1',
        [roleId]
      );

      if (existing.rows.length === 0) {
        const now = Date.now();
        await this.db.query(
          `INSERT INTO roles (id, tenant_id, name, description, permissions, created_at, is_built_in)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            roleId,
            tenantId,
            roleData.name,
            `Built-in ${roleData.name} role`,
            JSON.stringify(roleData.permissions),
            now,
            true,
          ]
        );
      }
    }
  }

  /**
   * Create custom role
   */
  async createRole(
    tenantId: string,
    role: Omit<Role, 'id' | 'created_at' | 'is_built_in'>
  ): Promise<string> {
    const roleId = `role-${Date.now()}`;
    const now = Date.now();

    await this.db.query(
      `INSERT INTO roles (id, tenant_id, name, description, permissions, created_at, is_built_in)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        roleId,
        tenantId,
        role.name,
        role.description || null,
        JSON.stringify(role.permissions),
        now,
        false,
      ]
    );

    // Clear permission cache
    this.permissionCache.clear();

    return roleId;
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    tenantId: string,
    userId: string,
    roleId: string,
    grantedBy: string
  ): Promise<void> {
    const id = `user-role-${Date.now()}`;
    const now = Date.now();

    await this.db.query(
      `INSERT INTO user_roles (id, tenant_id, user_id, role_id, granted_at, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, user_id, role_id) DO NOTHING`,
      [id, tenantId, userId, roleId, now, grantedBy]
    );

    // Clear cache for this user
    await this.cache.del(`user-permissions:${tenantId}:${userId}`);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(
    tenantId: string,
    userId: string,
    roleId: string
  ): Promise<void> {
    await this.db.query(
      'DELETE FROM user_roles WHERE tenant_id = $1 AND user_id = $2 AND role_id = $3',
      [tenantId, userId, roleId]
    );

    // Clear cache
    await this.cache.del(`user-permissions:${tenantId}:${userId}`);
  }

  /**
   * Get user permissions (cached)
   */
  async getUserPermissions(
    tenantId: string,
    userId: string
  ): Promise<Permission[]> {
    const cacheKey = `user-permissions:${tenantId}:${userId}`;

    // Check Redis cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Query database
    const result = await this.db.query(
      `SELECT DISTINCT UNNEST(permissions) as permission
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE r.tenant_id = $1 AND ur.user_id = $2`,
      [tenantId, userId]
    );

    const permissions: Permission[] = result.rows.map((row) => row.permission);

    // Cache for 1 hour
    await this.cache.set(cacheKey, JSON.stringify(permissions), { EX: 3600 });

    return permissions;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(context: AuthorizationContext): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(
      context.tenant_id,
      context.user_id
    );

    const hasPermission = userPermissions.includes(context.action);

    // Log authorization decision
    await this.logAuthorizationDecision({
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      action: context.action,
      resource_type: context.resource_type,
      resource_id: context.resource_id || null,
      permission: context.action,
      result: hasPermission ? 'ALLOW' : 'DENY',
      timestamp: Date.now(),
    });

    return hasPermission;
  }

  /**
   * Enforce permission (throw if denied)
   */
  async enforcePermission(context: AuthorizationContext): Promise<void> {
    const allowed = await this.hasPermission(context);

    if (!allowed) {
      throw new Error(
        `Unauthorized: ${context.user_id} does not have permission '${context.action}' on ${context.resource_type}${context.resource_id ? ` (${context.resource_id})` : ''
        }`
      );
    }
  }

  /**
   * Log authorization decision
   */
  private async logAuthorizationDecision(audit: {
    tenant_id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    permission: string;
    result: 'ALLOW' | 'DENY';
    timestamp: number;
  }): Promise<void> {
    const id = `auth-audit-${Date.now()}`;

    await this.db.query(
      `INSERT INTO permission_audit_log
       (id, tenant_id, user_id, action, resource_type, resource_id, permission, result, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        audit.tenant_id,
        audit.user_id,
        audit.action,
        audit.resource_type,
        audit.resource_id,
        audit.permission,
        audit.result,
        audit.timestamp,
      ]
    );
  }

  /**
   * Get permission audit log
   */
  async getPermissionAuditLog(
    tenantId: string,
    userId?: string,
    limit: number = 100
  ): Promise<any[]> {
    let query = 'SELECT * FROM permission_audit_log WHERE tenant_id = $1';
    const params: any[] = [tenantId];

    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * List all roles for tenant
   */
  async listRoles(tenantId: string): Promise<Role[]> {
    const result = await this.db.query(
      'SELECT * FROM roles WHERE tenant_id = $1 ORDER BY is_built_in DESC, name ASC',
      [tenantId]
    );

    return result.rows;
  }

  /**
   * List user roles
   */
  async listUserRoles(tenantId: string, userId: string): Promise<Role[]> {
    const result = await this.db.query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE r.tenant_id = $1 AND ur.user_id = $2`,
      [tenantId, userId]
    );

    return result.rows;
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissions: Permission[]
  ): Promise<void> {
    // Cannot update built-in roles
    const role = await this.db.query('SELECT is_built_in FROM roles WHERE id = $1', [roleId]);

    if (role.rows.length === 0) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (role.rows[0].is_built_in) {
      throw new Error('Cannot modify built-in roles');
    }

    await this.db.query(
      'UPDATE roles SET permissions = $1 WHERE id = $2',
      [JSON.stringify(permissions), roleId]
    );

    // Clear permission cache
    this.permissionCache.clear();
    await this.cache.del(`role:${roleId}`);
  }

  /**
   * Delete custom role
   */
  async deleteRole(roleId: string): Promise<void> {
    // Check if role is built-in
    const role = await this.db.query('SELECT is_built_in FROM roles WHERE id = $1', [roleId]);

    if (role.rows.length === 0) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (role.rows[0].is_built_in) {
      throw new Error('Cannot delete built-in roles');
    }

    // Remove all user role assignments
    await this.db.query('DELETE FROM user_roles WHERE role_id = $1', [roleId]);

    // Delete role
    await this.db.query('DELETE FROM roles WHERE id = $1', [roleId]);

    // Clear cache
    this.permissionCache.clear();
    await this.cache.del(`role:${roleId}`);
  }

  /**
   * Get permission matrix for tenant
   */
  async getPermissionMatrix(
    tenantId: string
  ): Promise<Record<string, Permission[]>> {
    const roles = await this.listRoles(tenantId);
    const matrix: Record<string, Permission[]> = {};

    for (const role of roles) {
      matrix[role.name] = role.permissions;
    }

    return matrix;
  }
}

export default AdvancedRBACManager;
