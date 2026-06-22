-- Create order_timelines table for tracking order status changes
CREATE TABLE IF NOT EXISTS order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_timelines_order_id ON order_timelines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timelines_created_at ON order_timelines(created_at DESC);

-- Enable RLS
ALTER TABLE order_timelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_timelines
CREATE POLICY "users_view_own_order_timelines" ON order_timelines FOR SELECT
  TO authenticated USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "admins_insert_order_timelines" ON order_timelines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    OR EXISTS (SELECT 1 FROM orders WHERE id = order_timelines.order_id AND user_id = auth.uid())
  );