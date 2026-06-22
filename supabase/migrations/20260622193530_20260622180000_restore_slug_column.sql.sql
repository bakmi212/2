-- Migration: Restore slug column for backwards compatibility
-- This adds the slug column back to maintain compatibility with existing flows

-- Add slug column if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products(slug) WHERE slug IS NOT NULL;

-- Create regular index for slug lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Generate slugs for existing products that don't have one
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'gi'))
WHERE slug IS NULL OR slug = '';

-- Make slug unique by appending ID if duplicates exist
UPDATE products p1
SET slug = p1.slug || '-' || LEFT(p1.id::text, 8)
WHERE p1.slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM products p2 
    WHERE p2.slug = p1.slug AND p2.id != p1.id
  );

-- Add comment
COMMENT ON COLUMN products.slug IS 'URL-friendly identifier for the product. Auto-generated from name if not provided.';
