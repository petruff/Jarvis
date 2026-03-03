-- Story 4.5: Cost Optimization Engine - Database Schema

CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL,
  agent_id UUID,
  user_id VARCHAR(100),
  model_used VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,6) NOT NULL,
  execution_id VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  INDEX idx_squad_time (squad_id, created_at),
  INDEX idx_agent_time (agent_id, created_at),
  INDEX idx_model (model_used)
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID UNIQUE NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  current_spend DECIMAL(10,6) NOT NULL DEFAULT 0,
  alert_50_sent BOOLEAN DEFAULT FALSE,
  alert_80_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad_budget FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cost_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL,
  period VARCHAR(50) NOT NULL,
  total_cost DECIMAL(10,6) NOT NULL,
  model_breakdown JSONB,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_squad_report FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  INDEX idx_squad_period (squad_id, period)
);

-- Model pricing reference table
CREATE TABLE IF NOT EXISTS model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(100) UNIQUE NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  input_price_per_1m_tokens DECIMAL(10,6) NOT NULL,
  output_price_per_1m_tokens DECIMAL(10,6) NOT NULL,
  min_cost_per_call DECIMAL(10,6) DEFAULT 0,
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default model pricing
INSERT INTO model_pricing (model_id, model_name, input_price_per_1m_tokens, output_price_per_1m_tokens, category) VALUES
  ('deepseek-chat', 'DeepSeek Chat', 0.14, 0.28, 'cheap'),
  ('llama-2-local', 'Llama 2 (Local)', 0, 0, 'free'),
  ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 0.50, 1.50, 'standard'),
  ('claude-3-haiku', 'Claude 3 Haiku', 0.25, 0.75, 'standard'),
  ('gpt-4-turbo', 'GPT-4 Turbo', 3.00, 6.00, 'premium'),
  ('claude-3-opus', 'Claude 3 Opus', 3.00, 15.00, 'premium')
ON CONFLICT (model_id) DO NOTHING;
