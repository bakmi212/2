/*
# RLS Audit & Authorization Fix

## Problem Summary
1. `is_admin()` function checks `user_roles` table which is EMPTY. The actual admin role is stored in `profiles.role = 'admin'`.
2. Categories: INSERT/UPDATE/DELETE policies use broken `is_admin()`, so admins cannot manage categories.
3. Products: Duplicate/conflicting policies exist (`admin_manage_products` FOR ALL alongside individual policies). Admin write fails due to broken `is_admin()`.
4. Profiles: Duplicate SELECT/UPDATE policies. Admin cannot view other profiles. No INSERT policy for new users.
5. Many tables have missing INSERT/UPDATE/DELETE policies.
6. No helper function exists that checks `profiles.role` for admin access.

## Changes
1. Create `is_admin_role()` helper that checks `profiles.role = 'admin'`.
2. Update `is_admin()` to also check `profiles.role` as fallback.
3. Fix categories policies to use `is_admin_role()`.
4. Fix products policies: remove duplicates, use `is_admin_role()`.
5. Fix profiles policies: remove duplicates, allow admin full access, add INSERT for new users.
6. Add missing policies across all tables.
7. Ensure `public.profiles.role` is the source of truth for admin checks.

## Affected Tables
- categories, products, profiles, user_roles, roles, activity_logs, affiliate_payments, affiliates, cart_items, contact_messages, invoices, licenses, notifications, order_items, orders, pages, payments, product_reviews, referrals, site_settings, subscriptions, transactions, user_products
*/

-- ============================================================
-- 1. Create improved admin check using profiles.role
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing is_admin() to also check profiles.role as fallback
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. FIX CATEGORIES
-- ============================================================
-- Categories already have: select (public), insert/update/delete (admin via is_admin)
-- Replace admin checks to use is_admin_role()

DROP POLICY IF EXISTS "insert_categories_admin" ON categories;
DROP POLICY IF EXISTS "update_categories_admin" ON categories;
DROP POLICY IF EXISTS "delete_categories_admin" ON categories;

CREATE POLICY "insert_categories_admin" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_categories_admin" ON categories FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_categories_admin" ON categories FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 3. FIX PRODUCTS
-- ============================================================
-- Remove duplicate/conflicting policies
DROP POLICY IF EXISTS "admin_manage_products" ON products;
DROP POLICY IF EXISTS "delete_products_admin" ON products;
DROP POLICY IF EXISTS "insert_products_admin" ON products;
DROP POLICY IF EXISTS "update_products_admin" ON products;
DROP POLICY IF EXISTS "select_products_public" ON products;

-- Recreate clean policies
CREATE POLICY "select_products_public" ON products FOR SELECT
  USING (status IN ('active', 'sold_out', 'coming_soon') OR is_admin_role());
CREATE POLICY "insert_products_admin" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_products_admin" ON products FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_products_admin" ON products FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 4. FIX PROFILES
-- ============================================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "select_profiles_own" ON profiles;
DROP POLICY IF EXISTS "insert_profiles_own" ON profiles;
DROP POLICY IF EXISTS "update_profiles_own" ON profiles;
DROP POLICY IF EXISTS "delete_profiles_admin" ON profiles;

-- Recreate clean policies
-- SELECT: users can read own, admin can read all
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
-- INSERT: new users can insert their own profile (required for sign-up flow)
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- UPDATE: users can update own, admin can update all
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
-- DELETE: admin only
CREATE POLICY "delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 5. FIX USER_ROLES
-- ============================================================
-- Remove existing and recreate with is_admin_role()
DROP POLICY IF EXISTS "select_user_roles_own" ON user_roles;
DROP POLICY IF EXISTS "insert_user_roles_admin" ON user_roles;
DROP POLICY IF EXISTS "delete_user_roles_admin" ON user_roles;

CREATE POLICY "select_user_roles" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_user_roles" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_user_roles" ON user_roles FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_user_roles" ON user_roles FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 6. FIX ROLES
-- ============================================================
DROP POLICY IF EXISTS "select_roles_admin" ON roles;
DROP POLICY IF EXISTS "insert_roles_admin" ON roles;
DROP POLICY IF EXISTS "update_roles_admin" ON roles;
DROP POLICY IF EXISTS "delete_roles_admin" ON roles;

CREATE POLICY "select_roles" ON roles FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_roles" ON roles FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_roles" ON roles FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_roles" ON roles FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 7. FIX ACTIVITY_LOGS
-- ============================================================
DROP POLICY IF EXISTS "select_logs_own" ON activity_logs;
DROP POLICY IF EXISTS "insert_logs_authenticated" ON activity_logs;

CREATE POLICY "select_activity_logs" ON activity_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_activity_logs" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "update_activity_logs" ON activity_logs FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_activity_logs" ON activity_logs FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 8. FIX AFFILIATE_PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_affiliate_payments_own" ON affiliate_payments;
DROP POLICY IF EXISTS "insert_affiliate_payments_admin" ON affiliate_payments;
DROP POLICY IF EXISTS "update_affiliate_payments_admin" ON affiliate_payments;
DROP POLICY IF EXISTS "delete_affiliate_payments_admin" ON affiliate_payments;

CREATE POLICY "select_affiliate_payments" ON affiliate_payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_id AND user_id = auth.uid())
    OR is_admin_role()
  );
CREATE POLICY "insert_affiliate_payments" ON affiliate_payments FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_affiliate_payments" ON affiliate_payments FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_affiliate_payments" ON affiliate_payments FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 9. FIX AFFILIATES
-- ============================================================
DROP POLICY IF EXISTS "select_affiliates_own" ON affiliates;
DROP POLICY IF EXISTS "insert_affiliates_own" ON affiliates;
DROP POLICY IF EXISTS "update_affiliates_own" ON affiliates;
DROP POLICY IF EXISTS "delete_affiliates_admin" ON affiliates;

CREATE POLICY "select_affiliates" ON affiliates FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_affiliates" ON affiliates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_affiliates" ON affiliates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_affiliates" ON affiliates FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 10. FIX CART_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "users_own_cart" ON cart_items;

CREATE POLICY "select_cart_items" ON cart_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_cart_items" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_cart_items" ON cart_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_cart_items" ON cart_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 11. FIX CONTACT_MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "select_contact_admin" ON contact_messages;
DROP POLICY IF EXISTS "insert_contact_public" ON contact_messages;
DROP POLICY IF EXISTS "update_contact_admin" ON contact_messages;
DROP POLICY IF EXISTS "delete_contact_admin" ON contact_messages;

CREATE POLICY "select_contact_messages" ON contact_messages FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_contact_messages" ON contact_messages FOR INSERT
  WITH CHECK (true);
CREATE POLICY "update_contact_messages" ON contact_messages FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_contact_messages" ON contact_messages FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 12. FIX INVOICES
-- ============================================================
DROP POLICY IF EXISTS "select_invoices_own" ON invoices;
DROP POLICY IF EXISTS "insert_invoices_authenticated" ON invoices;
DROP POLICY IF EXISTS "update_invoices_admin" ON invoices;
DROP POLICY IF EXISTS "delete_invoices_admin" ON invoices;

CREATE POLICY "select_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "update_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_invoices" ON invoices FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 13. FIX LICENSES
-- ============================================================
DROP POLICY IF EXISTS "select_licenses_own" ON licenses;
DROP POLICY IF EXISTS "insert_licenses_admin" ON licenses;
DROP POLICY IF EXISTS "update_licenses_own" ON licenses;
DROP POLICY IF EXISTS "delete_licenses_admin" ON licenses;

CREATE POLICY "select_licenses" ON licenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_licenses" ON licenses FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_licenses" ON licenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_licenses" ON licenses FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 14. FIX NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_notifications_own" ON notifications;
DROP POLICY IF EXISTS "update_notifications_own" ON notifications;
DROP POLICY IF EXISTS "delete_notifications_own" ON notifications;

CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 15. FIX ORDER_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "admin_all_order_items" ON order_items;
DROP POLICY IF EXISTS "users_view_own_order_items" ON order_items;

CREATE POLICY "select_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    auth.uid() IN (SELECT user_id FROM orders WHERE orders.id = order_items.order_id)
    OR is_admin_role()
  );
CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IN (SELECT user_id FROM orders WHERE orders.id = order_items.order_id)
    OR is_admin_role()
  );
CREATE POLICY "update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 16. FIX ORDERS
-- ============================================================
DROP POLICY IF EXISTS "admin_all_orders" ON orders;
DROP POLICY IF EXISTS "admin_manage_orders" ON orders;
DROP POLICY IF EXISTS "users_insert_own_orders" ON orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON orders;
DROP POLICY IF EXISTS "users_view_own_orders" ON orders;

CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 17. FIX PAGES
-- ============================================================
DROP POLICY IF EXISTS "select_pages_public" ON pages;
DROP POLICY IF EXISTS "insert_pages_admin" ON pages;
DROP POLICY IF EXISTS "update_pages_admin" ON pages;
DROP POLICY IF EXISTS "delete_pages_admin" ON pages;

CREATE POLICY "select_pages" ON pages FOR SELECT
  USING (is_published = true OR is_admin_role());
CREATE POLICY "insert_pages" ON pages FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_pages" ON pages FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_pages" ON pages FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 18. FIX PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_payments_own" ON payments;
DROP POLICY IF EXISTS "insert_payments_authenticated" ON payments;
DROP POLICY IF EXISTS "update_payments_admin" ON payments;
DROP POLICY IF EXISTS "delete_payments_admin" ON payments;

CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 19. FIX PRODUCT_REVIEWS
-- ============================================================
DROP POLICY IF EXISTS "select_reviews_public" ON product_reviews;
DROP POLICY IF EXISTS "insert_reviews_authenticated" ON product_reviews;
DROP POLICY IF EXISTS "update_reviews_own" ON product_reviews;
DROP POLICY IF EXISTS "delete_reviews_own" ON product_reviews;

CREATE POLICY "select_product_reviews" ON product_reviews FOR SELECT
  USING (is_published = true OR auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_product_reviews" ON product_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_product_reviews" ON product_reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_product_reviews" ON product_reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());

-- ============================================================
-- 20. FIX REFERRALS
-- ============================================================
DROP POLICY IF EXISTS "select_referrals_affiliate" ON referrals;
DROP POLICY IF EXISTS "insert_referrals_system" ON referrals;
DROP POLICY IF EXISTS "update_referrals_admin" ON referrals;
DROP POLICY IF EXISTS "delete_referrals_admin" ON referrals;

CREATE POLICY "select_referrals" ON referrals FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_id AND user_id = auth.uid())
    OR is_admin_role()
  );
CREATE POLICY "insert_referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_referrals" ON referrals FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_referrals" ON referrals FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 21. FIX SITE_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "select_settings_admin" ON site_settings;
DROP POLICY IF EXISTS "insert_settings_admin" ON site_settings;
DROP POLICY IF EXISTS "update_settings_admin" ON site_settings;
DROP POLICY IF EXISTS "delete_settings_admin" ON site_settings;

CREATE POLICY "select_site_settings" ON site_settings FOR SELECT
  TO authenticated USING (is_admin_role());
CREATE POLICY "insert_site_settings" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "update_site_settings" ON site_settings FOR UPDATE
  TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "delete_site_settings" ON site_settings FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 22. FIX SUBSCRIPTIONS
-- ============================================================
DROP POLICY IF EXISTS "select_subscriptions_own" ON subscriptions;
DROP POLICY IF EXISTS "insert_subscriptions_authenticated" ON subscriptions;
DROP POLICY IF EXISTS "update_subscriptions_own" ON subscriptions;
DROP POLICY IF EXISTS "delete_subscriptions_admin" ON subscriptions;

CREATE POLICY "select_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "update_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 23. FIX TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_transactions" ON transactions;
DROP POLICY IF EXISTS "users_insert_own_transactions" ON transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON transactions;

CREATE POLICY "select_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (is_admin_role());

-- ============================================================
-- 24. FIX USER_PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "admin_all_user_products" ON user_products;
DROP POLICY IF EXISTS "users_insert_own_products" ON user_products;
DROP POLICY IF EXISTS "users_view_own_products" ON user_products;

CREATE POLICY "select_user_products" ON user_products FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "insert_user_products" ON user_products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_user_products" ON user_products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin_role())
  WITH CHECK (auth.uid() = user_id OR is_admin_role());
CREATE POLICY "delete_user_products" ON user_products FOR DELETE
  TO authenticated USING (is_admin_role());
