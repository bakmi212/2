-- Product actions table (workflow steps per product)
CREATE TABLE IF NOT EXISTS product_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'product_purchase',
  component_id UUID NULL,
  sort_order INTEGER DEFAULT 0,
  enable_tracking BOOLEAN DEFAULT true,
  save_execution_log BOOLEAN DEFAULT true,
  retry_on_failure BOOLEAN DEFAULT false,
  retry_limit INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action executions table (runtime log per order)
CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_code VARCHAR(50) NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  action_id UUID REFERENCES product_actions(id) ON DELETE SET NULL,
  action_name VARCHAR(200),
  action_type VARCHAR(50),
  component_id UUID NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed','cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  output_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component execution logs
CREATE TABLE IF NOT EXISTS component_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES action_executions(id) ON DELETE CASCADE,
  component_id UUID NULL,
  component_name VARCHAR(200),
  version VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: product_actions
ALTER TABLE product_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_select" ON product_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "pa_insert" ON product_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pa_update" ON product_actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pa_delete" ON product_actions FOR DELETE TO authenticated USING (true);

-- RLS: action_executions
ALTER TABLE action_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae_select_own" ON action_executions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "ae_insert" ON action_executions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ae_update" ON action_executions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS: component_logs
ALTER TABLE component_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_select" ON component_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "cl_insert" ON component_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cl_update" ON component_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_executions_order ON action_executions(order_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_user ON action_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(status);
CREATE INDEX IF NOT EXISTS idx_component_logs_exec ON component_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_product_actions_product ON product_actions(product_id);

-- Seed default actions for existing products that have license/download enabled
-- (will be picked up automatically by the engine on next approve)
