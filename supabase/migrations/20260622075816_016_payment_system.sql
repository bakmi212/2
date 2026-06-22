-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('auto', 'manual')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Accounts table
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('bank_transfer', 'ewallet', 'qris')),
  payment_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  account_holder VARCHAR(255),
  merchant_name VARCHAR(255),
  qris_image TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method_id') THEN
    ALTER TABLE orders ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_account_id') THEN
    ALTER TABLE orders ADD COLUMN payment_account_id UUID REFERENCES payment_accounts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_proof') THEN
    ALTER TABLE orders ADD COLUMN payment_proof TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending_payment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_status') THEN
    ALTER TABLE orders ADD COLUMN order_status VARCHAR(50) DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='rejection_reason') THEN
    ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- RLS for payment_methods (public read, admin write)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_all" ON payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_methods_select_anon" ON payment_methods FOR SELECT TO anon USING (true);
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE TO authenticated USING (true);

-- RLS for payment_accounts (public read, admin write)
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_accounts_select_all" ON payment_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_accounts_select_anon" ON payment_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "payment_accounts_insert" ON payment_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payment_accounts_update" ON payment_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payment_accounts_delete" ON payment_accounts FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_method ON payment_accounts(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);

-- Seed default payment method
INSERT INTO payment_methods (name, type, is_active) VALUES
  ('Manual Payment', 'manual', true)
ON CONFLICT DO NOTHING;
