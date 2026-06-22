-- Create component_actions table for storing page builder component configurations
CREATE TABLE IF NOT EXISTS component_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES product_pages(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  component_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add order_id to user_products if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_products' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE user_products ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add variant_id to user_products if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_products' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE user_products ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_default to product_variants if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_variants' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS on component_actions
ALTER TABLE component_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for component_actions
CREATE POLICY "select_component_actions_admin" ON component_actions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "insert_component_actions_admin" ON component_actions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "update_component_actions_admin" ON component_actions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "delete_component_actions_admin" ON component_actions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_component_actions_page_id ON component_actions(page_id);
CREATE INDEX IF NOT EXISTS idx_component_actions_product_id ON component_actions(product_id);
CREATE INDEX IF NOT EXISTS idx_component_actions_variant_id ON component_actions(variant_id);
CREATE INDEX IF NOT EXISTS idx_user_products_order_id ON user_products(order_id);

-- Add enable_license to products if missing (rename from license_enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'enable_license'
  ) THEN
    ALTER TABLE products ADD COLUMN enable_license BOOLEAN DEFAULT false;
    -- Copy from license_enabled if exists
    UPDATE products SET enable_license = license_enabled WHERE license_enabled IS NOT NULL;
  END IF;
END $$;

COMMENT ON TABLE component_actions IS 'Stores page builder component configurations linked to products/variants';
COMMENT ON TABLE user_products IS 'Records user product purchases with order tracking';