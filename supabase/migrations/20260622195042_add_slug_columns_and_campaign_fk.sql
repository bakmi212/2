/*
# Add slug columns and FK constraint for Full Purchase Context

## 1. Add slug to product_variants
The Full Purchase Context requires variant_slug for fallback lookups.
product_variants currently lacks a slug column. We add it as nullable text
with a unique constraint.

## 2. Add slug to affiliates
The Full Purchase Context requires affiliate_slug. The affiliates table has
`username` (text) but no explicit `slug`. We add `slug` as a unique text column.

## 3. Add FK from purchase_contexts.campaign_id to campaigns
The purchase_contexts table was created before campaigns existed; now we
add the foreign key constraint.

## Changes
- product_variants: + slug (text, unique, nullable)
- affiliates: + slug (text, unique, nullable)
- purchase_contexts: ADD CONSTRAINT campaign_id → campaigns(id)
*/

-- 1. Add slug to product_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'slug'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN slug text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_slug ON product_variants(slug);
  END IF;
END $$;

-- 2. Add slug to affiliates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'slug'
  ) THEN
    ALTER TABLE affiliates ADD COLUMN slug text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_slug ON affiliates(slug);
  END IF;
END $$;

-- Backfill affiliate slug from username if slug is null
UPDATE affiliates SET slug = username WHERE slug IS NULL AND username IS NOT NULL;

-- 3. Add FK from purchase_contexts to campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_contexts_campaign_id_fkey'
      AND table_name = 'purchase_contexts'
  ) THEN
    ALTER TABLE purchase_contexts
      ADD CONSTRAINT purchase_contexts_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;
