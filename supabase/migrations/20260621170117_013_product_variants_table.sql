-- Product Variants Table
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_type VARCHAR(50) NOT NULL, -- license, wholesale, subscription, package, membership
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  description TEXT,
  
  -- License fields
  duration_days INTEGER,
  device_limit INTEGER,
  
  -- Wholesale fields
  min_quantity INTEGER,
  max_quantity INTEGER,
  
  -- Subscription fields
  billing_period VARCHAR(20), -- monthly, quarterly, yearly
  subscription_duration INTEGER, -- days
  
  -- Package fields
  feature_list JSONB,
  
  -- Membership fields
  access_duration_days INTEGER,
  benefits JSONB,
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add variants_enabled to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants_enabled BOOLEAN DEFAULT false;

-- Index for faster lookups
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sort_order ON product_variants(product_id, sort_order);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "select_product_variants_public" ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "insert_product_variants_admin" ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "update_product_variants_admin" ON product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "delete_product_variants_admin" ON product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();