-- ========================================
-- COMPREHENSIVE SCHEMA REDESIGN
-- Single Source of Truth: Supabase
-- ========================================

-- 1. Add missing columns to orders (for direct product/variant tracking alongside order_items)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_id') THEN
    ALTER TABLE orders ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'variant_id') THEN
    ALTER TABLE orders ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add missing columns to user_products (access period tracking)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_products' AND column_name = 'access_start') THEN
    ALTER TABLE user_products ADD COLUMN access_start TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_products' AND column_name = 'access_end') THEN
    ALTER TABLE user_products ADD COLUMN access_end TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Add target_page_id to component_actions if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'component_actions' AND column_name = 'target_page_id') THEN
    ALTER TABLE component_actions ADD COLUMN target_page_id UUID REFERENCES pages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_variant_id ON orders(variant_id);
CREATE INDEX IF NOT EXISTS idx_user_products_variant_id ON user_products(variant_id);
CREATE INDEX IF NOT EXISTS idx_component_actions_product_variant ON component_actions(product_id, variant_id);

-- 5. Update user_products to recalculate access_end based on variant duration_days
-- This will be done by a trigger or function instead of direct update

-- 6. Create function to calculate access_end based on variant duration
CREATE OR REPLACE FUNCTION calculate_access_end(
  p_variant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT now()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_duration_days INTEGER;
BEGIN
  SELECT duration_days INTO v_duration_days
  FROM product_variants
  WHERE id = p_variant_id;
  
  IF v_duration_days IS NOT NULL AND v_duration_days > 0 THEN
    RETURN p_start_date + (v_duration_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NULL; -- Lifetime access if no duration
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-calculate access_end on user_products insert
CREATE OR REPLACE FUNCTION trigger_user_products_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_start := COALESCE(NEW.access_start, now());
  
  IF NEW.variant_id IS NOT NULL AND NEW.access_end IS NULL THEN
    NEW.access_end := calculate_access_end(NEW.variant_id, NEW.access_start);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_products_access ON user_products;
CREATE TRIGGER trg_user_products_access
  BEFORE INSERT ON user_products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_user_products_access();

-- 8. Add page_components table if not exists
CREATE TABLE IF NOT EXISTS page_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  component_name TEXT,
  component_id TEXT,
  settings JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE page_components ENABLE ROW LEVEL SECURITY;

-- RLS for page_components
CREATE POLICY "select_page_pages_admin" ON page_components FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "insert_page_pages_admin" ON page_components FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "update_page_pages_admin" ON page_components FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "delete_page_pages_admin" ON page_components FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

-- 9. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_components_page_id ON page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_component_actions_page_component ON component_actions(page_id, component_id);

-- 10. Add variant_name column to product_variants if not exists (alias for 'name')
-- Actually, we use 'name' column, so this is fine

COMMENT ON TABLE component_actions IS 'Stores component actions linked to products/variants for page builder';
COMMENT ON TABLE page_components IS 'Stores page builder component configurations';
COMMENT ON TABLE user_products IS 'Stores user product access with automatic access period calculation';

-- Success message
SELECT 'Schema migration completed successfully' AS status;