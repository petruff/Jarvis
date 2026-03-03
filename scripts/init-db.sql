-- Jarvis Platform Database Initialization
-- Creates initial schema and tables for the system

-- Create extensions
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Squads table
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(50), -- founder, mercury, forge, oracle, sentinel, nexus, etc.
  agents_config JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  agent_type VARCHAR(50),
  dna JSONB, -- 5-layer DNA: Voice, Models, Constraints, Obsession, BlindSpot
  status VARCHAR(50), -- active, inactive, pending
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_agent_per_squad UNIQUE(name, squad_id)
);

-- Tasks table for task queue
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL, -- desktop, telegram, whatsapp, ui, gateway, autonomy, consciousness
  mission_id VARCHAR(100),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(50), -- queued, processing, approved, pending_approval, done, failed
  result TEXT,
  confidence_score DECIMAL(5, 2),
  requires_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  execution_id VARCHAR(100) NOT NULL UNIQUE,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  duration_ms INTEGER,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6),
  model_used VARCHAR(100),
  status VARCHAR(50), -- success, failure, timeout
  error_message TEXT,
  task_type VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_squad_time (squad_id, created_at),
  INDEX idx_agent_time (agent_id, created_at)
);

-- Mutations table
CREATE TABLE IF NOT EXISTS mutations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  mutation_type VARCHAR(50), -- voice, models, constraints, obsession, blindspot
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  status VARCHAR(50), -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMPTZ,
  CONSTRAINT unique_pending_mutation UNIQUE(agent_id, mutation_type, status) WHERE status = 'pending'
);

-- RBAC tables
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_role_squad UNIQUE(user_id, role_id, squad_id)
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL, -- execution, modification, access, approval
  actor VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  action VARCHAR(100),
  details JSONB,
  result VARCHAR(50), -- success, failure
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_time (event_type, created_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_squad ON tasks(squad_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_squad ON agents(squad_id);
CREATE INDEX IF NOT EXISTS idx_mutations_agent ON mutations(agent_id);
CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER squads_update_timestamp
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER agents_update_timestamp
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER tasks_update_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_timestamp();

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access', '{"*": true}'),
  ('manager', 'Squad management', '{"squad.*": true, "agent.read": true}'),
  ('user', 'Standard user', '{"task.create": true, "task.read": true, "squad.read": true}'),
  ('viewer', 'Read-only access', '{"squad.read": true, "task.read": true, "agent.read": true}'),
  ('restricted', 'Limited access', '{"task.read": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default squads
INSERT INTO squads (name, type, description) VALUES
  ('founder-squad', 'founder', 'Primary founder agent for business decisions'),
  ('mercury-squad', 'mercury', 'Growth and marketing operations'),
  ('forge-squad', 'forge', 'Technical implementation and engineering'),
  ('oracle-squad', 'oracle', 'Research and intelligence gathering'),
  ('sentinel-squad', 'sentinel', 'Security and compliance monitoring'),
  ('nexus-squad', 'nexus', 'Technology and future innovation'),
  ('vault-squad', 'vault', 'Financial and legal operations'),
  ('atlas-squad', 'atlas', 'Strategic operations and planning')
ON CONFLICT (name) DO NOTHING;
