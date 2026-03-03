-- Phase 7: Multi-Tenant Isolation System
-- Creates tenants, teams, and tenant audit log tables with RLS policies

-- ============================================================================
-- TABLE: tenants
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'professional', 'enterprise')) DEFAULT 'free',
  max_clones INT DEFAULT 10,
  max_users INT DEFAULT 5,
  max_storage_gb INT DEFAULT 5,
  features JSONB DEFAULT '{"analytics": false, "custom_branding": false, "api_access": false}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- TABLE: teams
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  members_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- ============================================================================
-- TABLE: tenant_audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  performed_by VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for Multi-Tenant System
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_tier ON tenants(tier);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_id ON tenant_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_action ON tenant_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_timestamp ON tenant_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_resource ON tenant_audit_log(resource_type, resource_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_teams ON teams
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on tenant_audit_log table
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit ON tenant_audit_log
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- ============================================================================
-- SEED DATA (Optional - remove for production)
-- ============================================================================
-- INSERT INTO tenants (name, tier, max_clones, max_users, features)
-- VALUES
--   ('Acme Corp', 'enterprise', 500, 100, '{"analytics": true, "custom_branding": true, "api_access": true}'),
--   ('Startup Labs', 'professional', 100, 20, '{"analytics": true, "custom_branding": false, "api_access": true}'),
--   ('Solo Developer', 'free', 10, 5, '{"analytics": false, "custom_branding": false, "api_access": false}')
-- ON CONFLICT DO NOTHING;
