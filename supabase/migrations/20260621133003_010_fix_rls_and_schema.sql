-- Add DEFAULT auth.uid() to user_id columns to prevent INSERT RLS errors
ALTER TABLE orders ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_licenses ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_downloads ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notifications ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_products ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE cart_items ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE affiliates ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE referrals ALTER COLUMN affiliate_id SET DEFAULT auth.uid();

-- Add SEO fields to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_title') THEN
    ALTER TABLE products ADD COLUMN seo_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_description') THEN
    ALTER TABLE products ADD COLUMN seo_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_keywords') THEN
    ALTER TABLE products ADD COLUMN seo_keywords text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'best_seller') THEN
    ALTER TABLE products ADD COLUMN best_seller boolean DEFAULT false;
  END IF;
END $$;

-- Ensure categories has image_url
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'image_url') THEN
    ALTER TABLE categories ADD COLUMN image_url text;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(best_seller);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
