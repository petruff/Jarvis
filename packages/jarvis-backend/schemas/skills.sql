-- Story 4.2: Skill Auto-Discovery - Database Schema

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  pattern_source UUID,
  parameters JSONB,
  success_rate DECIMAL(5,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL,
  agent_id UUID,
  squad_id UUID,
  result VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  INDEX idx_skill (skill_id),
  INDEX idx_agent (agent_id),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL,
  pattern_hash VARCHAR(64) UNIQUE NOT NULL,
  steps JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_squad (squad_id),
  INDEX idx_status (status)
);
