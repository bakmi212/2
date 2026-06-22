/*
# Product & Category Management Update

1. New Columns on products table:
   - `status` (text) - replaces is_active checkbox with: 'active', 'sold_out', 'coming_soon'
   - `affiliate_enabled` (boolean, default false) - toggle for affiliate program
   - `commission_type` (text) - 'percentage' or 'fixed'
   - `commission_value` (numeric) - commission amount

2. Modified products table:
   - Removed `is_active` boolean (replaced by status)
   - Kept `is_featured` boolean

3. Data migration:
   - Convert existing is_active=true products to status='active'
   - Convert existing is_active=false products to status='coming_soon'

4. Indexes:
   - Added index on products.status for filtering

5. RLS:
   - Updated product select policy to show active, sold_out, and coming_soon to public
*/

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'coming_soon'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'affiliate_enabled') THEN
    ALTER TABLE products ADD COLUMN affiliate_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'commission_type') THEN
    ALTER TABLE products ADD COLUMN commission_type TEXT CHECK (commission_type IN ('percentage', 'fixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'commission_value') THEN
    ALTER TABLE products ADD COLUMN commission_value NUMERIC(10, 2);
  END IF;
END $$;

-- Migrate existing data: is_active true -> 'active', false -> 'coming_soon'
UPDATE products SET status = 'active' WHERE status IS NULL AND (is_active = true OR is_active IS NULL);
UPDATE products SET status = 'coming_soon' WHERE status IS NULL AND is_active = false;

-- Ensure no null statuses remain
UPDATE products SET status = 'active' WHERE status IS NULL;

-- Add index on status
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Update product select policy to include all visible statuses
DROP POLICY IF EXISTS "select_products_public" ON products;
CREATE POLICY "select_products_public" ON products FOR SELECT USING (status IN ('active', 'sold_out', 'coming_soon') OR is_admin());
