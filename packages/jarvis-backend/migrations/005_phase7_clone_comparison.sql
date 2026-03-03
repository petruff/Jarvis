-- Phase 7: Clone Comparison System
-- Creates tables for tracking clone comparisons and metrics

-- ============================================================================
-- TABLE: clone_comparisons
-- ============================================================================
CREATE TABLE IF NOT EXISTS clone_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clone_id_1 VARCHAR(255) NOT NULL,
  clone_id_2 VARCHAR(255) NOT NULL,
  reasoning_similarity NUMERIC(5, 2) NOT NULL CHECK (reasoning_similarity >= 0 AND reasoning_similarity <= 100),
  confidence_delta NUMERIC(5, 2) NOT NULL,
  decision_alignment NUMERIC(5, 2) NOT NULL CHECK (decision_alignment >= 0 AND decision_alignment <= 100),
  performance_delta NUMERIC(5, 2) NOT NULL,
  clone_1_strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  clone_1_weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  clone_2_strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  clone_2_weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_recommendation TEXT,
  comparison_basis TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  viewed_count INT DEFAULT 0,
  last_viewed_at TIMESTAMP
);

-- ============================================================================
-- TABLE: clone_comparison_metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS clone_comparison_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clone_id VARCHAR(255) NOT NULL,
  comparison_count INT DEFAULT 0,
  avg_reasoning_similarity NUMERIC(5, 2),
  avg_confidence_delta NUMERIC(5, 2),
  avg_decision_alignment NUMERIC(5, 2),
  avg_performance_delta NUMERIC(5, 2),
  strengths_mentioned TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses_mentioned TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_compared_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for Clone Comparison System
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clone_comparisons_tenant_id ON clone_comparisons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clone_comparisons_clones ON clone_comparisons(clone_id_1, clone_id_2);
CREATE INDEX IF NOT EXISTS idx_clone_comparisons_similarity ON clone_comparisons(reasoning_similarity);
CREATE INDEX IF NOT EXISTS idx_clone_comparisons_alignment ON clone_comparisons(decision_alignment);
CREATE INDEX IF NOT EXISTS idx_clone_comparisons_timestamp ON clone_comparisons(created_at);
CREATE INDEX IF NOT EXISTS idx_clone_comparison_metrics_tenant_id ON clone_comparison_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clone_comparison_metrics_clone_id ON clone_comparison_metrics(clone_id);
CREATE INDEX IF NOT EXISTS idx_clone_comparison_metrics_timestamp ON clone_comparison_metrics(updated_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on clone_comparisons table
ALTER TABLE clone_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_clone_comparisons ON clone_comparisons
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- Enable RLS on clone_comparison_metrics table
ALTER TABLE clone_comparison_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_clone_metrics ON clone_comparison_metrics
  USING (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID)
  WITH CHECK (tenant_id = CAST(current_setting('app.current_tenant_id') AS UUID)::UUID);

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- View: Clone Comparison Summary
CREATE OR REPLACE VIEW v_clone_comparison_summary AS
SELECT
  tenant_id,
  COUNT(*) as total_comparisons,
  COUNT(DISTINCT clone_id_1) as unique_clones_1,
  COUNT(DISTINCT clone_id_2) as unique_clones_2,
  ROUND(AVG(reasoning_similarity)::NUMERIC, 2) as avg_reasoning_similarity,
  ROUND(AVG(decision_alignment)::NUMERIC, 2) as avg_decision_alignment,
  ROUND(AVG(ABS(performance_delta))::NUMERIC, 2) as avg_performance_delta,
  MAX(created_at) as latest_comparison
FROM clone_comparisons
GROUP BY tenant_id;

-- View: Top Clone Matches
CREATE OR REPLACE VIEW v_top_clone_matches AS
SELECT
  tenant_id,
  clone_id_1,
  clone_id_2,
  reasoning_similarity,
  decision_alignment,
  performance_delta,
  created_at
FROM clone_comparisons
WHERE reasoning_similarity >= 80
  AND decision_alignment >= 80
ORDER BY reasoning_similarity DESC, decision_alignment DESC
LIMIT 100;

-- View: Clone Strength Analysis
CREATE OR REPLACE VIEW v_clone_strength_analysis AS
SELECT
  tenant_id,
  clone_id,
  COUNT(*) as mentioned_count,
  ARRAY_AGG(DISTINCT strength) as common_strengths,
  COUNT(*) FILTER (WHERE strength IS NOT NULL) as strength_count
FROM (
  SELECT tenant_id, clone_id_1 as clone_id, UNNEST(clone_1_strengths) as strength
  FROM clone_comparisons
  UNION ALL
  SELECT tenant_id, clone_id_2 as clone_id, UNNEST(clone_2_strengths) as strength
  FROM clone_comparisons
) strengths
GROUP BY tenant_id, clone_id;

-- View: Clone Weakness Analysis
CREATE OR REPLACE VIEW v_clone_weakness_analysis AS
SELECT
  tenant_id,
  clone_id,
  COUNT(*) as mentioned_count,
  ARRAY_AGG(DISTINCT weakness) as common_weaknesses,
  COUNT(*) FILTER (WHERE weakness IS NOT NULL) as weakness_count
FROM (
  SELECT tenant_id, clone_id_1 as clone_id, UNNEST(clone_1_weaknesses) as weakness
  FROM clone_comparisons
  UNION ALL
  SELECT tenant_id, clone_id_2 as clone_id, UNNEST(clone_2_weaknesses) as weakness
  FROM clone_comparisons
) weaknesses
GROUP BY tenant_id, clone_id;

-- ============================================================================
-- FUNCTION to record clone comparison
-- ============================================================================
CREATE OR REPLACE FUNCTION record_clone_comparison(
  p_tenant_id UUID,
  p_clone_id_1 VARCHAR,
  p_clone_id_2 VARCHAR,
  p_reasoning_similarity NUMERIC,
  p_confidence_delta NUMERIC,
  p_decision_alignment NUMERIC,
  p_performance_delta NUMERIC,
  p_clone_1_strengths TEXT[],
  p_clone_1_weaknesses TEXT[],
  p_clone_2_strengths TEXT[],
  p_clone_2_weaknesses TEXT[],
  p_ai_recommendation TEXT
)
RETURNS UUID AS $$
DECLARE
  v_comparison_id UUID;
BEGIN
  INSERT INTO clone_comparisons (
    tenant_id,
    clone_id_1,
    clone_id_2,
    reasoning_similarity,
    confidence_delta,
    decision_alignment,
    performance_delta,
    clone_1_strengths,
    clone_1_weaknesses,
    clone_2_strengths,
    clone_2_weaknesses,
    ai_recommendation,
    comparison_basis
  )
  VALUES (
    p_tenant_id,
    p_clone_id_1,
    p_clone_id_2,
    p_reasoning_similarity,
    p_confidence_delta,
    p_decision_alignment,
    p_performance_delta,
    p_clone_1_strengths,
    p_clone_1_weaknesses,
    p_clone_2_strengths,
    p_clone_2_weaknesses,
    p_ai_recommendation,
    CONCAT('Compared ', p_clone_id_1, ' vs ', p_clone_id_2)
  )
  RETURNING id INTO v_comparison_id;

  -- Update metrics for clone 1
  INSERT INTO clone_comparison_metrics (
    tenant_id,
    clone_id,
    comparison_count,
    avg_reasoning_similarity,
    avg_decision_alignment,
    strengths_mentioned,
    weaknesses_mentioned,
    last_compared_at
  )
  VALUES (
    p_tenant_id,
    p_clone_id_1,
    1,
    p_reasoning_similarity,
    p_decision_alignment,
    p_clone_1_strengths,
    p_clone_1_weaknesses,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (tenant_id, clone_id)
  DO UPDATE SET
    comparison_count = clone_comparison_metrics.comparison_count + 1,
    avg_reasoning_similarity = (
      (clone_comparison_metrics.avg_reasoning_similarity * clone_comparison_metrics.comparison_count + p_reasoning_similarity) /
      (clone_comparison_metrics.comparison_count + 1)
    ),
    avg_decision_alignment = (
      (clone_comparison_metrics.avg_decision_alignment * clone_comparison_metrics.comparison_count + p_decision_alignment) /
      (clone_comparison_metrics.comparison_count + 1)
    ),
    last_compared_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

  -- Update metrics for clone 2
  INSERT INTO clone_comparison_metrics (
    tenant_id,
    clone_id,
    comparison_count,
    avg_reasoning_similarity,
    avg_decision_alignment,
    strengths_mentioned,
    weaknesses_mentioned,
    last_compared_at
  )
  VALUES (
    p_tenant_id,
    p_clone_id_2,
    1,
    p_reasoning_similarity,
    p_decision_alignment,
    p_clone_2_strengths,
    p_clone_2_weaknesses,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (tenant_id, clone_id)
  DO UPDATE SET
    comparison_count = clone_comparison_metrics.comparison_count + 1,
    avg_reasoning_similarity = (
      (clone_comparison_metrics.avg_reasoning_similarity * clone_comparison_metrics.comparison_count + p_reasoning_similarity) /
      (clone_comparison_metrics.comparison_count + 1)
    ),
    avg_decision_alignment = (
      (clone_comparison_metrics.avg_decision_alignment * clone_comparison_metrics.comparison_count + p_decision_alignment) /
      (clone_comparison_metrics.comparison_count + 1)
    ),
    last_compared_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

  RETURN v_comparison_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (Optional)
-- ============================================================================
-- No seed data needed - populated during clone comparison operations
