-- Fix Product Variants RLS policies to use profiles.role instead of user_roles
-- Drop existing policies
DROP POLICY IF EXISTS "insert_product_variants_admin" ON product_variants;
DROP POLICY IF EXISTS "update_product_variants_admin" ON product_variants;
DROP POLICY IF EXISTS "delete_product_variants_admin" ON product_variants;

-- Create new policies using profiles.role
CREATE POLICY "insert_product_variants_admin" ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "update_product_variants_admin" ON product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "delete_product_variants_admin" ON product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Update admin user's role to admin
UPDATE profiles SET role = 'admin' WHERE email = 'admin@admin.com';