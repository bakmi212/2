-- License templates table
CREATE TABLE IF NOT EXISTS license_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  pattern VARCHAR(200) NOT NULL DEFAULT 'LICENSE-{RANDOM}',
  validity_days INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for license_templates
ALTER TABLE license_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_select" ON license_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "lt_insert" ON license_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lt_update" ON license_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lt_delete" ON license_templates FOR DELETE TO authenticated USING (true);

-- Seed a default template
INSERT INTO license_templates (name, pattern, validity_days, is_active)
VALUES ('Default License', 'LICENSE-{RANDOM}', NULL, true)
ON CONFLICT DO NOTHING;

-- Add missing columns to licenses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='order_id') THEN
    ALTER TABLE licenses ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='activated_at') THEN
    ALTER TABLE licenses ADD COLUMN activated_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='template_id') THEN
    ALTER TABLE licenses ADD COLUMN template_id UUID REFERENCES license_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure licenses status supports new values (no constraint to change since it's varchar)

-- Add order_id to user_downloads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_downloads' AND column_name='order_id') THEN
    ALTER TABLE user_downloads ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure user_downloads has unique constraint on user_id + product_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_downloads_user_product_unique') THEN
    ALTER TABLE user_downloads ADD CONSTRAINT user_downloads_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;

-- Update licenses RLS to allow admin full access and user own access
DO $$ BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "users_own_licenses" ON licenses;
  DROP POLICY IF EXISTS "admin_all_licenses" ON licenses;
END $$;

CREATE POLICY "licenses_select_own" ON licenses FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "licenses_insert" ON licenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "licenses_update" ON licenses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')) WITH CHECK (true);
CREATE POLICY "licenses_delete" ON licenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_order_id ON licenses(order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user_product ON licenses(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_user_downloads_order ON user_downloads(order_id);
