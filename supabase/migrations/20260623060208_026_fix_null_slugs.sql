-- Fix existing products with null/empty slugs
-- Generate slugs from product names

-- First, create a function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug_from_name(name_text TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug: lowercase, replace non-alphanumeric with hyphens, trim hyphens
  base_slug := lower(trim(name_text));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'product-' || to_char(now(), 'YYYYMMDDHH24MISS');
  END IF;
  
  final_slug := base_slug;
  
  -- Ensure uniqueness by checking existing slugs
  WHILE EXISTS (SELECT 1 FROM products WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update products with null or empty slugs
UPDATE products
SET slug = generate_slug_from_name(name)
WHERE slug IS NULL OR slug = '' OR slug = 'null';

-- Add unique constraint to slug column
DO $$
BEGIN
  -- Check if unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_slug_unique' 
    AND conrelid = 'products'::regclass
  ) THEN
    -- First, make sure there are no duplicate slugs
    -- Add unique constraint
    ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Set default for slug to be NOT NULL going forward
-- We won't alter the column to NOT NULL since it could break inserts
-- Instead, we add a check constraint for new rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_slug_not_empty' 
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_slug_not_empty CHECK (slug IS NOT NULL AND slug != '' AND slug != 'null');
  END IF;
END $$;

-- Drop the helper function
DROP FUNCTION IF EXISTS generate_slug_from_name(TEXT);

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);