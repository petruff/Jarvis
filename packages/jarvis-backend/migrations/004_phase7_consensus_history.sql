-- Phase 7: Consensus History Tracking System
-- Creates tables for tracking consensus decisions and quality metrics

-- ============================================================================
-- TABLE: consensus_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS consensus_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  domain VARCHAR(100),
  confidence_score NUMERIC(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reasoning_summary TEXT,
  clones_involved TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'reversed', 'updated', 'disputed', 'archived')) DEFAULT 'active',
  reversals_count INT DEFAULT 0,
  reversal_reason TEXT,
  disputed_by TEXT[] DEFAULT ARRAY[]::TEXT[],
  dispute_details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- ============================================================================
-- TABLE: consensus_disputes
-- ============================================================================
CREATE TABLE IF NOT EXISTS consensus_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consensus_decision_id UUID NOT NULL REFERENCES consensus_history(id) ON DELETE CASCADE,
  disputed_by VARCHAR(255) NOT NULL,
  dispute_reason TEXT NOT NULL,
  alternative_decision TEXT,
  alternative_confidence NUMERIC(5, 2),
  resolution_status VARCHAR(50) NOT NULL CHECK (resolution_status IN ('open', 'resolved', 'escalated')) DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- ============================================================================
-- INDEXES for Consensus History System
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_consensus_history_tenant_id ON consensus_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consensus_history_status ON consensus_history(status);
CREATE INDEX IF NOT EXISTS idx_consensus_history_domain ON consensus_history(domain);
CREATE INDEX IF NOT EXISTS idx_consensus_history_confidence ON consensus_history(confidence_score);
CREATE INDEX IF NOT EXISTS idx_consensus_history_timestamp ON consensus_history(created_at);
CREATE INDEX IF NOT EXISTS idx_consensus_history_text_search ON consensus_history USING GIN (to_tsvector('english', decision_text));
CREATE INDEX IF NOT EXISTS idx_consensus_disputes_decision_id ON consensus_disputes(consensus_decision_id);
CREATE INDEX IF NOT EXISTS idx_consensus_disputes_tenant_id ON consensus_disputes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consensus_disputes_status ON consensus_disputes(resolution_status);
CREATE INDEX IF NOT EXISTS idx_consensus_disputes_timestamp ON consensus_disputes(created_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on consensus_history table
ALTER TABLE consensus_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_consensus_history ON consensus_history
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on consensus_disputes table
ALTER TABLE consensus_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_consensus_disputes ON consensus_disputes
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- View: Consensus Timeline Metrics
CREATE OR REPLACE VIEW v_consensus_timeline_metrics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_decisions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_decisions,
  COUNT(CASE WHEN status = 'reversed' THEN 1 END) as reversed_decisions,
  COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_decisions,
  ROUND(AVG(confidence_score)::NUMERIC, 2) as avg_confidence,
  ROUND((COUNT(CASE WHEN status = 'reversed' THEN 1 END)::NUMERIC / COUNT(*) * 100), 2) as reversal_rate_pct,
  ROUND((COUNT(CASE WHEN status = 'disputed' THEN 1 END)::NUMERIC / COUNT(*) * 100), 2) as dispute_rate_pct
FROM consensus_history
GROUP BY tenant_id, DATE_TRUNC('day', created_at);

-- View: Consensus Quality Trends
CREATE OR REPLACE VIEW v_consensus_quality_trends AS
SELECT
  tenant_id,
  domain,
  COUNT(*) as total_decisions,
  ROUND(AVG(confidence_score)::NUMERIC, 2) as avg_confidence,
  ROUND((COUNT(CASE WHEN status = 'reversed' THEN 1 END)::NUMERIC / COUNT(*) * 100), 2) as reversal_rate_pct,
  COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_count,
  MAX(created_at) as latest_decision
FROM consensus_history
GROUP BY tenant_id, domain;

-- View: Top Disputed Domains
CREATE OR REPLACE VIEW v_disputed_domains AS
SELECT
  ch.tenant_id,
  ch.domain,
  COUNT(DISTINCT cd.id) as dispute_count,
  COUNT(DISTINCT ch.id) as decision_count,
  ROUND((COUNT(DISTINCT cd.id)::NUMERIC / COUNT(DISTINCT ch.id) * 100), 2) as dispute_rate_pct
FROM consensus_history ch
LEFT JOIN consensus_disputes cd ON ch.id = cd.consensus_decision_id
WHERE cd.id IS NOT NULL
GROUP BY ch.tenant_id, ch.domain
ORDER BY dispute_count DESC;

-- ============================================================================
-- FUNCTION to record consensus decision
-- ============================================================================
CREATE OR REPLACE FUNCTION record_consensus_decision(
  p_tenant_id UUID,
  p_decision_text TEXT,
  p_domain VARCHAR,
  p_confidence NUMERIC,
  p_reasoning TEXT,
  p_clones_involved TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_decision_id UUID;
BEGIN
  INSERT INTO consensus_history (
    tenant_id,
    decision_text,
    domain,
    confidence_score,
    reasoning_summary,
    clones_involved
  )
  VALUES (
    p_tenant_id,
    p_decision_text,
    p_domain,
    p_confidence,
    p_reasoning,
    p_clones_involved
  )
  RETURNING id INTO v_decision_id;

  RETURN v_decision_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION to record decision reversal
-- ============================================================================
CREATE OR REPLACE FUNCTION reverse_consensus_decision(
  p_decision_id UUID,
  p_reversal_reason TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE consensus_history
  SET
    status = 'reversed',
    reversal_reason = p_reversal_reason,
    reversals_count = reversals_count + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_decision_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION to add dispute to decision
-- ============================================================================
CREATE OR REPLACE FUNCTION dispute_consensus_decision(
  p_decision_id UUID,
  p_disputed_by VARCHAR,
  p_dispute_reason TEXT,
  p_alternative_decision TEXT,
  p_alternative_confidence NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_dispute_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM consensus_history
  WHERE id = p_decision_id;

  INSERT INTO consensus_disputes (
    tenant_id,
    consensus_decision_id,
    disputed_by,
    dispute_reason,
    alternative_decision,
    alternative_confidence
  )
  VALUES (
    v_tenant_id,
    p_decision_id,
    p_disputed_by,
    p_dispute_reason,
    p_alternative_decision,
    p_alternative_confidence
  )
  RETURNING id INTO v_dispute_id;

  UPDATE consensus_history
  SET
    status = 'disputed',
    disputed_by = array_append(disputed_by, p_disputed_by),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_decision_id;

  RETURN v_dispute_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (Optional)
-- ============================================================================
-- No seed data needed - populated during consensus operations
