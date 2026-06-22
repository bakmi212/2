-- Add badge column to products for custom badges (Limited, Popular, etc)
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT NULL;

-- Add index for badge queries
CREATE INDEX IF NOT EXISTS idx_products_badge ON products(badge) WHERE badge IS NOT NULL;
