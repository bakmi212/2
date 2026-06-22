/*
# Product Builder, CTA, Download & License Fields

1. New columns on products table:
   - `cta_type` (text) - 'buy_now', 'whatsapp', 'order_form', 'external_link'
   - `whatsapp_number` (text) - for WhatsApp CTA
   - `external_url` (text) - for external link CTA
   - `download_type` (text) - 'file_upload', 'external_url', null
   - `download_file` (text) - Supabase Storage path for uploaded file
   - `download_url` (text) - external download URL
   - `license_enabled` (boolean, default false)
   - `license_type` (text) - 'manual', 'auto_generated'
   - `license_duration` (text) - 'lifetime', '30_days', '90_days', '180_days', '1_year', 'custom'
   - `custom_license_days` (integer) - for custom duration
   - `builder_content` (jsonb) - stores builder blocks/layout
   - `builder_published` (boolean, default false)

2. New table: `product_pages` - stores published builder content per product
   - `id`, `product_id`, `slug`, `content` (jsonb), `is_published`, `created_at`, `updated_at`

3. New table: `user_downloads` - tracks member downloads
   - `id`, `user_id`, `product_id`, `download_count`, `max_downloads`, `last_downloaded_at`, `created_at`

4. New table: `user_licenses` - stores generated licenses
   - `id`, `user_id`, `product_id`, `license_key`, `expires_at`, `status`, `created_at`
*/

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cta_type') THEN
    ALTER TABLE products ADD COLUMN cta_type TEXT DEFAULT 'buy_now' CHECK (cta_type IN ('buy_now', 'whatsapp', 'order_form', 'external_link'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'whatsapp_number') THEN
    ALTER TABLE products ADD COLUMN whatsapp_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'external_url') THEN
    ALTER TABLE products ADD COLUMN external_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'download_type') THEN
    ALTER TABLE products ADD COLUMN download_type TEXT CHECK (download_type IN ('file_upload', 'external_url'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'download_file') THEN
    ALTER TABLE products ADD COLUMN download_file TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'download_url') THEN
    ALTER TABLE products ADD COLUMN download_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'license_enabled') THEN
    ALTER TABLE products ADD COLUMN license_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'license_type') THEN
    ALTER TABLE products ADD COLUMN license_type TEXT CHECK (license_type IN ('manual', 'auto_generated'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'license_duration') THEN
    ALTER TABLE products ADD COLUMN license_duration TEXT CHECK (license_duration IN ('lifetime', '30_days', '90_days', '180_days', '1_year', 'custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'custom_license_days') THEN
    ALTER TABLE products ADD COLUMN custom_license_days INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'builder_content') THEN
    ALTER TABLE products ADD COLUMN builder_content JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'builder_published') THEN
    ALTER TABLE products ADD COLUMN builder_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create product_pages table for published builder pages
CREATE TABLE IF NOT EXISTS product_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  content JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, slug)
);

-- Create user_downloads table
CREATE TABLE IF NOT EXISTS user_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 10,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create user_licenses table
CREATE TABLE IF NOT EXISTS user_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  license_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE product_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_licenses ENABLE ROW LEVEL SECURITY;

-- RLS for product_pages (admin manage, public read published)
DROP POLICY IF EXISTS "select_product_pages" ON product_pages;
CREATE POLICY "select_product_pages" ON product_pages FOR SELECT
  USING (is_published = true OR is_admin_role());
DROP POLICY IF EXISTS "insert_product_pages" ON product_pages;
CREATE POLICY "insert_product_pages" ON product_pages FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
DROP POLICY IF EXISTS "update_product_pages" ON product_pages;
CREATE POLICY "update_product_pages" ON product_pages FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
DROP POLICY IF EXISTS "delete_product_pages" ON product_pages;
CREATE POLICY "delete_product_pages" ON product_pages FOR DELETE
  TO authenticated USING (is_admin_role());

-- RLS for user_downloads (own + admin)
DROP POLICY IF EXISTS "select_user_downloads" ON user_downloads;
CREATE POLICY "select_user_downloads" ON user_downloads FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "insert_user_downloads" ON user_downloads;
CREATE POLICY "insert_user_downloads" ON user_downloads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "update_user_downloads" ON user_downloads;
CREATE POLICY "update_user_downloads" ON user_downloads FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role()) WITH CHECK (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "delete_user_downloads" ON user_downloads;
CREATE POLICY "delete_user_downloads" ON user_downloads FOR DELETE
  TO authenticated USING (is_admin_role());

-- RLS for user_licenses (own + admin)
DROP POLICY IF EXISTS "select_user_licenses" ON user_licenses;
CREATE POLICY "select_user_licenses" ON user_licenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "insert_user_licenses" ON user_licenses;
CREATE POLICY "insert_user_licenses" ON user_licenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "update_user_licenses" ON user_licenses;
CREATE POLICY "update_user_licenses" ON user_licenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role()) WITH CHECK (auth.uid() = user_id OR is_admin_role());
DROP POLICY IF EXISTS "delete_user_licenses" ON user_licenses;
CREATE POLICY "delete_user_licenses" ON user_licenses FOR DELETE
  TO authenticated USING (is_admin_role());
