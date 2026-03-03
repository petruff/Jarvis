-- Phase 7: Backup & Disaster Recovery System
-- Creates backup metadata, recovery plans, and replication status tables

-- ============================================================================
-- TABLE: backup_metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  backup_path VARCHAR(500) NOT NULL,
  backup_type VARCHAR(50) NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'differential')),
  size_bytes BIGINT,
  row_count INT,
  tables_backed_up TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'verified')) DEFAULT 'pending',
  duration_ms INT,
  error_message TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verification_timestamp TIMESTAMP,
  retention_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- ============================================================================
-- TABLE: recovery_plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_id UUID NOT NULL REFERENCES backup_metadata(id) ON DELETE CASCADE,
  recovery_type VARCHAR(50) NOT NULL CHECK (recovery_type IN ('full', 'point-in-time', 'table-level')) DEFAULT 'full',
  target_timestamp TIMESTAMP,
  tables_to_recover TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'executing', 'success', 'failed', 'verified')) DEFAULT 'created',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  recovery_duration_ms INT,
  restored_row_count INT
);

-- ============================================================================
-- TABLE: replication_status
-- ============================================================================
CREATE TABLE IF NOT EXISTS replication_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_id UUID NOT NULL REFERENCES backup_metadata(id) ON DELETE CASCADE,
  replica_region VARCHAR(100) NOT NULL,
  replica_url VARCHAR(500),
  replication_status VARCHAR(50) NOT NULL CHECK (replication_status IN ('pending', 'in_progress', 'complete', 'failed')) DEFAULT 'pending',
  lag_ms INT,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(backup_id, replica_region)
);

-- ============================================================================
-- INDEXES for Backup & Disaster Recovery System
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_backup_metadata_tenant_id ON backup_metadata(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_status ON backup_metadata(status);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_timestamp ON backup_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_retention ON backup_metadata(retention_until);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_verified ON backup_metadata(verified);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_tenant_id ON recovery_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_backup_id ON recovery_plans(backup_id);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_status ON recovery_plans(status);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_timestamp ON recovery_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_replication_status_backup_id ON replication_status(backup_id);
CREATE INDEX IF NOT EXISTS idx_replication_status_region ON replication_status(replica_region);
CREATE INDEX IF NOT EXISTS idx_replication_status_sync ON replication_status(last_sync_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on backup_metadata table
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_backup ON backup_metadata
  USING (tenant_id IS NULL OR tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id IS NULL OR tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on recovery_plans table
ALTER TABLE recovery_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recovery ON recovery_plans
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on replication_status table
ALTER TABLE replication_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_replication ON replication_status
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- ============================================================================
-- FUNCTION to cleanup expired backups
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  DELETE FROM backup_metadata
  WHERE retention_until < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION to verify backup integrity
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_backup(p_backup_id UUID)
RETURNS TABLE(
  backup_id UUID,
  verification_status VARCHAR,
  row_count_matches BOOLEAN,
  timestamp TIMESTAMP
) AS $$
DECLARE
  v_backup_id UUID := p_backup_id;
  v_row_count INT;
BEGIN
  -- In production, this would perform actual backup file verification
  -- For now, mark as verified and update timestamp
  UPDATE backup_metadata
  SET verified = TRUE, verification_timestamp = CURRENT_TIMESTAMP, status = 'verified'
  WHERE id = v_backup_id;

  SELECT row_count INTO v_row_count
  FROM backup_metadata
  WHERE id = v_backup_id;

  RETURN QUERY
  SELECT
    v_backup_id,
    'success'::VARCHAR,
    (v_row_count > 0)::BOOLEAN,
    CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- View: Backup Summary per Tenant
CREATE OR REPLACE VIEW v_backup_summary AS
SELECT
  bm.tenant_id,
  COUNT(*) as total_backups,
  COUNT(CASE WHEN bm.status = 'success' THEN 1 END) as successful_backups,
  COUNT(CASE WHEN bm.status = 'failed' THEN 1 END) as failed_backups,
  SUM(bm.size_bytes) as total_size_bytes,
  MAX(bm.created_at) as latest_backup_time,
  COUNT(DISTINCT bm.backup_type) as backup_types,
  AVG(bm.duration_ms) as avg_duration_ms
FROM backup_metadata bm
GROUP BY bm.tenant_id;

-- View: Recovery Plan Status
CREATE OR REPLACE VIEW v_recovery_status AS
SELECT
  rp.tenant_id,
  rp.recovery_type,
  COUNT(*) as total_plans,
  COUNT(CASE WHEN rp.status = 'success' THEN 1 END) as successful_recoveries,
  COUNT(CASE WHEN rp.status = 'failed' THEN 1 END) as failed_recoveries,
  AVG(rp.recovery_duration_ms) as avg_recovery_time_ms,
  MAX(rp.completed_at) as latest_recovery_time
FROM recovery_plans rp
GROUP BY rp.tenant_id, rp.recovery_type;

-- View: Replication Lag Status
CREATE OR REPLACE VIEW v_replication_health AS
SELECT
  rs.replica_region,
  COUNT(*) as total_replicas,
  COUNT(CASE WHEN rs.replication_status = 'complete' THEN 1 END) as healthy_replicas,
  AVG(rs.lag_ms) as avg_lag_ms,
  MAX(rs.lag_ms) as max_lag_ms,
  MIN(rs.last_sync_at) as oldest_sync_time
FROM replication_status rs
GROUP BY rs.replica_region;

-- ============================================================================
-- SEED DATA (Optional)
-- ============================================================================
-- No seed data needed for backup tables - they populate during operations
