-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
  value NUMERIC NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_coupons_public" ON coupons FOR SELECT
  TO public USING (is_active = true);
CREATE POLICY "select_coupons_admin" ON coupons FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_coupons_admin" ON coupons FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_coupons_admin" ON coupons FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_coupons_admin" ON coupons FOR DELETE
  TO authenticated USING (is_admin_role());

-- Payment providers table
CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_payment_providers_public" ON payment_providers FOR SELECT
  TO public USING (is_enabled = true);
CREATE POLICY "select_payment_providers_admin" ON payment_providers FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_payment_providers_admin" ON payment_providers FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_payment_providers_admin" ON payment_providers FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_payment_providers_admin" ON payment_providers FOR DELETE
  TO authenticated USING (is_admin_role());

-- Seed payment providers
INSERT INTO payment_providers (name, display_name, is_enabled, sort_order) VALUES
  ('manual_transfer', 'Manual Bank Transfer', true, 1),
  ('midtrans', 'Midtrans', false, 2),
  ('xendit', 'Xendit', false, 3),
  ('stripe', 'Stripe', false, 4),
  ('paypal', 'PayPal', false, 5)
ON CONFLICT (name) DO NOTHING;

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_email_templates_admin" ON email_templates FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_email_templates_admin" ON email_templates FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_email_templates_admin" ON email_templates FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_email_templates_admin" ON email_templates FOR DELETE
  TO authenticated USING (is_admin_role());

-- Seed email templates
INSERT INTO email_templates (name, subject, body) VALUES
  ('welcome', 'Welcome to {{site_name}}!', '<h1>Welcome {{name}}!</h1><p>Thank you for joining {{site_name}}.</p>'),
  ('order_confirmation', 'Order Confirmation #{{order_number}}', '<h1>Thank you for your order!</h1><p>Order #{{order_number}} has been received.</p><p>Total: {{total}}</p>'),
  ('payment_success', 'Payment Successful - Order #{{order_number}}', '<h1>Payment Received!</h1><p>Your payment for order #{{order_number}} has been confirmed.</p>'),
  ('license_delivery', 'Your License Key', '<h1>Your License</h1><p>Product: {{product_name}}</p><p>License Key: {{license_key}}</p>'),
  ('password_reset', 'Password Reset Request', '<h1>Reset Your Password</h1><p>Click <a href="{{reset_url}}">here</a> to reset your password.</p>')
ON CONFLICT (name) DO NOTHING;

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_blog_posts_public" ON blog_posts FOR SELECT
  TO public USING (status = 'published');
CREATE POLICY "select_blog_posts_admin" ON blog_posts FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_blog_posts_admin" ON blog_posts FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_blog_posts_admin" ON blog_posts FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_blog_posts_admin" ON blog_posts FOR DELETE
  TO authenticated USING (is_admin_role());

-- Add language preference to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'language') THEN
    ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'en';
  END IF;
END $$;

-- Add coupon_id to orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_id') THEN
    ALTER TABLE orders ADD COLUMN coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add affiliate tracking to orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'referral_code') THEN
    ALTER TABLE orders ADD COLUMN referral_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'affiliate_id') THEN
    ALTER TABLE orders ADD COLUMN affiliate_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commission_amount') THEN
    ALTER TABLE orders ADD COLUMN commission_amount NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add click tracking to referrals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'clicks') THEN
    ALTER TABLE referrals ADD COLUMN clicks INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create site translations table
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  lang TEXT NOT NULL,
  value TEXT NOT NULL,
  section TEXT DEFAULT 'general',
  UNIQUE(key, lang)
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_translations_public" ON translations FOR SELECT
  TO public USING (true);
CREATE POLICY "insert_translations_admin" ON translations FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_translations_admin" ON translations FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_translations_admin" ON translations FOR DELETE
  TO authenticated USING (is_admin_role());

-- Seed translations
INSERT INTO translations (key, lang, value, section) VALUES
  ('nav_home', 'en', 'Home', 'navbar'),
  ('nav_home', 'id', 'Beranda', 'navbar'),
  ('nav_products', 'en', 'Products', 'navbar'),
  ('nav_products', 'id', 'Produk', 'navbar'),
  ('nav_categories', 'en', 'Categories', 'navbar'),
  ('nav_categories', 'id', 'Kategori', 'navbar'),
  ('nav_dashboard', 'en', 'Dashboard', 'navbar'),
  ('nav_dashboard', 'id', 'Dashboard', 'navbar'),
  ('nav_login', 'en', 'Login', 'navbar'),
  ('nav_login', 'id', 'Masuk', 'navbar'),
  ('nav_register', 'en', 'Register', 'navbar'),
  ('nav_register', 'id', 'Daftar', 'navbar'),
  ('nav_cart', 'en', 'Cart', 'navbar'),
  ('nav_cart', 'id', 'Keranjang', 'navbar'),
  ('nav_admin', 'en', 'Admin', 'navbar'),
  ('nav_admin', 'id', 'Admin', 'navbar'),
  ('search_placeholder', 'en', 'Search products...', 'products'),
  ('search_placeholder', 'id', 'Cari produk...', 'products'),
  ('featured_products', 'en', 'Featured Products', 'products'),
  ('featured_products', 'id', 'Produk Unggulan', 'products'),
  ('best_sellers', 'en', 'Best Sellers', 'products'),
  ('best_sellers', 'id', 'Terlaris', 'products'),
  ('new_arrivals', 'en', 'New Arrivals', 'products'),
  ('new_arrivals', 'id', 'Produk Baru', 'products'),
  ('all_products', 'en', 'All Products', 'products'),
  ('all_products', 'id', 'Semua Produk', 'products'),
  ('buy_now', 'en', 'Buy Now', 'products'),
  ('buy_now', 'id', 'Beli Sekarang', 'products'),
  ('add_to_cart', 'en', 'Add to Cart', 'products'),
  ('add_to_cart', 'id', 'Tambah ke Keranjang', 'products'),
  ('sold_out', 'en', 'Sold Out', 'products'),
  ('sold_out', 'id', 'Habis Terjual', 'products'),
  ('coming_soon', 'en', 'Coming Soon', 'products'),
  ('coming_soon', 'id', 'Segera Hadir', 'products'),
  ('checkout_title', 'en', 'Checkout', 'checkout'),
  ('checkout_title', 'id', 'Pembayaran', 'checkout'),
  ('order_summary', 'en', 'Order Summary', 'checkout'),
  ('order_summary', 'id', 'Ringkasan Pesanan', 'checkout'),
  ('total', 'en', 'Total', 'checkout'),
  ('total', 'id', 'Total', 'checkout'),
  ('pay_now', 'en', 'Pay Now', 'checkout'),
  ('pay_now', 'id', 'Bayar Sekarang', 'checkout'),
  ('dashboard_welcome', 'en', 'Welcome back!', 'dashboard'),
  ('dashboard_welcome', 'id', 'Selamat datang kembali!', 'dashboard'),
  ('my_orders', 'en', 'My Orders', 'dashboard'),
  ('my_orders', 'id', 'Pesanan Saya', 'dashboard'),
  ('my_downloads', 'en', 'My Downloads', 'dashboard'),
  ('my_downloads', 'id', 'Unduhan Saya', 'dashboard'),
  ('my_licenses', 'en', 'My Licenses', 'dashboard'),
  ('my_licenses', 'id', 'Lisensi Saya', 'dashboard'),
  ('admin_dashboard', 'en', 'Admin Dashboard', 'admin'),
  ('admin_dashboard', 'id', 'Dashboard Admin', 'admin'),
  ('products', 'en', 'Products', 'admin'),
  ('products', 'id', 'Produk', 'admin'),
  ('categories', 'en', 'Categories', 'admin'),
  ('categories', 'id', 'Kategori', 'admin'),
  ('orders', 'en', 'Orders', 'admin'),
  ('orders', 'id', 'Pesanan', 'admin'),
  ('users', 'en', 'Users', 'admin'),
  ('users', 'id', 'Pengguna', 'admin'),
  ('settings', 'en', 'Settings', 'admin'),
  ('settings', 'id', 'Pengaturan', 'admin')
ON CONFLICT (key, lang) DO NOTHING;
