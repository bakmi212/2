-- Add missing columns to notifications if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add missing columns to orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_name') THEN
    ALTER TABLE orders ADD COLUMN billing_name VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_email') THEN
    ALTER TABLE orders ADD COLUMN billing_email VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_phone') THEN
    ALTER TABLE orders ADD COLUMN billing_phone VARCHAR;
  END IF;
END $$;

-- Admin can manage all orders
DROP POLICY IF EXISTS "admin_manage_orders" ON orders;
CREATE POLICY "admin_manage_orders" ON orders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin can manage all products
DROP POLICY IF EXISTS "admin_manage_products" ON products;
CREATE POLICY "admin_manage_products" ON products FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Fix notifications RLS
DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add expires_at column to licenses if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'licenses' AND column_name = 'expires_at') THEN
    ALTER TABLE licenses ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;
