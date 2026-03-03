-- Story 4.3: Context Window Optimization - Database Schema

CREATE TABLE IF NOT EXISTS context_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID,
  squad_id UUID NOT NULL,
  original_tokens INTEGER NOT NULL,
  optimized_tokens INTEGER NOT NULL,
  compression_ratio DECIMAL(5,2),
  task_completion BOOLEAN DEFAULT TRUE,
  quality_score DECIMAL(5,2),
  cost_saved DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad_context FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  INDEX idx_squad_time (squad_id, created_at),
  INDEX idx_agent_time (agent_id, created_at)
);

CREATE TABLE IF NOT EXISTS relevance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(100),
  query_hash VARCHAR(64) UNIQUE,
  relevance_score DECIMAL(5,2) NOT NULL,
  ttl_minutes INTEGER DEFAULT 60,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  INDEX idx_query_hash (query_hash),
  INDEX idx_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS context_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID,
  squad_id UUID NOT NULL,
  original_context TEXT NOT NULL,
  compressed_context TEXT,
  compression_stats JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad_archive FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE
);
