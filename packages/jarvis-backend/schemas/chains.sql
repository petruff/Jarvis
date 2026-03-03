-- Story 4.4: Tool Chaining Intelligence - Database Schema

CREATE TABLE IF NOT EXISTS tool_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id VARCHAR(100) NOT NULL,
  depends_on VARCHAR(100) NOT NULL,
  constraint_type VARCHAR(50) DEFAULT 'required',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tool_id, depends_on),
  INDEX idx_tool (tool_id),
  INDEX idx_depends (depends_on)
);

CREATE TABLE IF NOT EXISTS chain_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id VARCHAR(100),
  squad_id UUID NOT NULL,
  original_steps INTEGER NOT NULL,
  optimized_steps INTEGER NOT NULL,
  step_reduction DECIMAL(5,2),
  execution_time_original BIGINT,
  execution_time_optimized BIGINT,
  time_saved_percent DECIMAL(5,2),
  cost_saved DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad_chain FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  INDEX idx_squad (squad_id),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS tool_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id VARCHAR(100) NOT NULL,
  input_hash VARCHAR(64) NOT NULL,
  output_data JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  UNIQUE(tool_id, input_hash),
  INDEX idx_tool_hash (tool_id, input_hash),
  INDEX idx_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id VARCHAR(100) UNIQUE NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  inputs JSONB,
  outputs JSONB,
  estimated_duration_ms INTEGER,
  parallelizable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tool_id (tool_id)
);
