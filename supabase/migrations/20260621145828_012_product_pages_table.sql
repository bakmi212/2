-- product_pages table for storing builder content
CREATE TABLE IF NOT EXISTS product_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Landing Page',
  content JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_product_pages_public" ON product_pages FOR SELECT
  TO public USING (is_published = true);
CREATE POLICY "select_product_pages_admin" ON product_pages FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_product_pages_admin" ON product_pages FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_product_pages_admin" ON product_pages FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_product_pages_admin" ON product_pages FOR DELETE
  TO authenticated USING (is_admin_role());

-- Add builder_content to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'builder_content') THEN
    ALTER TABLE products ADD COLUMN builder_content JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'builder_published') THEN
    ALTER TABLE products ADD COLUMN builder_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add template field to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'template_name') THEN
    ALTER TABLE products ADD COLUMN template_name TEXT;
  END IF;
END $$;
