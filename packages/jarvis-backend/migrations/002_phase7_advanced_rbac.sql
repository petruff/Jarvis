-- Phase 7: Advanced RBAC System
-- Creates roles, user_roles, and permission audit log tables

-- ============================================================================
-- TABLE: roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_built_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- ============================================================================
-- TABLE: user_roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  granted_by VARCHAR(255),
  UNIQUE(tenant_id, user_id, role_id)
);

-- ============================================================================
-- TABLE: permission_audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  permission VARCHAR(100) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('ALLOW', 'DENY')) DEFAULT 'DENY',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for RBAC System
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_built_in ON roles(is_built_in);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_tenant_user ON permission_audit_log(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_action ON permission_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_timestamp ON permission_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_resource ON permission_audit_log(resource_type, resource_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_roles ON roles
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on permission_audit_log table
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permission_audit ON permission_audit_log
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- ============================================================================
-- FUNCTION to initialize default RBAC roles for a tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_tenant_roles(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
  v_admin_id UUID;
  v_manager_id UUID;
  v_user_id UUID;
  v_viewer_id UUID;
  v_restricted_id UUID;
BEGIN
  -- Admin role (13 permissions - all)
  INSERT INTO roles (tenant_id, name, description, permissions, is_built_in)
  VALUES (
    p_tenant_id,
    'Admin',
    'Full access to all resources',
    ARRAY[
      'clone:create', 'clone:read', 'clone:update', 'clone:delete', 'clone:rollback', 'clone:archive',
      'consensus:execute', 'consensus:review',
      'history:view',
      'team:manage',
      'rbac:manage',
      'tenant:admin',
      'audit:view'
    ],
    TRUE
  ) ON CONFLICT DO NOTHING;

  -- Manager role (10 permissions)
  INSERT INTO roles (tenant_id, name, description, permissions, is_built_in)
  VALUES (
    p_tenant_id,
    'Manager',
    'Can create clones, manage teams, view audit',
    ARRAY[
      'clone:create', 'clone:read', 'clone:update', 'clone:delete',
      'consensus:execute', 'consensus:review',
      'history:view',
      'team:manage',
      'audit:view'
    ],
    TRUE
  ) ON CONFLICT DO NOTHING;

  -- User role (5 permissions)
  INSERT INTO roles (tenant_id, name, description, permissions, is_built_in)
  VALUES (
    p_tenant_id,
    'User',
    'Can query clones and execute consensus',
    ARRAY[
      'clone:read',
      'consensus:execute',
      'history:view'
    ],
    TRUE
  ) ON CONFLICT DO NOTHING;

  -- Viewer role (3 permissions)
  INSERT INTO roles (tenant_id, name, description, permissions, is_built_in)
  VALUES (
    p_tenant_id,
    'Viewer',
    'Read-only access to clones and history',
    ARRAY[
      'clone:read',
      'history:view'
    ],
    TRUE
  ) ON CONFLICT DO NOTHING;

  -- Restricted role (1 permission)
  INSERT INTO roles (tenant_id, name, description, permissions, is_built_in)
  VALUES (
    p_tenant_id,
    'Restricted',
    'Can only read clone info',
    ARRAY[
      'clone:read'
    ],
    TRUE
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (Optional - initialize default roles when needed)
-- ============================================================================
-- SELECT initialize_tenant_roles(id) FROM tenants WHERE is_active = TRUE;
