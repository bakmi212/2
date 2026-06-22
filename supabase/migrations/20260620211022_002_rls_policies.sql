-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Roles policies (admin only)
CREATE POLICY "select_roles_admin" ON roles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "insert_roles_admin" ON roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_roles_admin" ON roles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_roles_admin" ON roles FOR DELETE TO authenticated USING (is_admin());

-- Profiles policies (users can read/update own, admin can do all)
CREATE POLICY "select_profiles_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_profiles_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_profiles_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "delete_profiles_admin" ON profiles FOR DELETE TO authenticated USING (is_admin());

-- User roles policies
CREATE POLICY "select_user_roles_own" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_user_roles_admin" ON user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "delete_user_roles_admin" ON user_roles FOR DELETE TO authenticated USING (is_admin());

-- Categories policies (public read, admin write)
CREATE POLICY "select_categories_public" ON categories FOR SELECT USING (true);
CREATE POLICY "insert_categories_admin" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_categories_admin" ON categories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_categories_admin" ON categories FOR DELETE TO authenticated USING (is_admin());

-- Products policies (public read active, admin full access)
CREATE POLICY "select_products_public" ON products FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "insert_products_admin" ON products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_products_admin" ON products FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_products_admin" ON products FOR DELETE TO authenticated USING (is_admin());

-- Product reviews policies
CREATE POLICY "select_reviews_public" ON product_reviews FOR SELECT USING (is_published = true OR auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_reviews_authenticated" ON product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_reviews_own" ON product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "delete_reviews_own" ON product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_admin());

-- Subscriptions policies
CREATE POLICY "select_subscriptions_own" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_subscriptions_authenticated" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "update_subscriptions_own" ON subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "delete_subscriptions_admin" ON subscriptions FOR DELETE TO authenticated USING (is_admin());

-- Licenses policies
CREATE POLICY "select_licenses_own" ON licenses FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_licenses_admin" ON licenses FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_licenses_own" ON licenses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "delete_licenses_admin" ON licenses FOR DELETE TO authenticated USING (is_admin());

-- Payments policies
CREATE POLICY "select_payments_own" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_payments_authenticated" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "update_payments_admin" ON payments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_payments_admin" ON payments FOR DELETE TO authenticated USING (is_admin());

-- Invoices policies
CREATE POLICY "select_invoices_own" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_invoices_authenticated" ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "update_invoices_admin" ON invoices FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_invoices_admin" ON invoices FOR DELETE TO authenticated USING (is_admin());

-- Affiliates policies
CREATE POLICY "select_affiliates_own" ON affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_affiliates_own" ON affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_affiliates_own" ON affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "delete_affiliates_admin" ON affiliates FOR DELETE TO authenticated USING (is_admin());

-- Referrals policies
CREATE POLICY "select_referrals_affiliate" ON referrals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_id AND user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "insert_referrals_system" ON referrals FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_referrals_admin" ON referrals FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_referrals_admin" ON referrals FOR DELETE TO authenticated USING (is_admin());

-- Affiliate payments policies
CREATE POLICY "select_affiliate_payments_own" ON affiliate_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_id AND user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "insert_affiliate_payments_admin" ON affiliate_payments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_affiliate_payments_admin" ON affiliate_payments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_affiliate_payments_admin" ON affiliate_payments FOR DELETE TO authenticated USING (is_admin());

-- Activity logs policies
CREATE POLICY "select_logs_own" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "insert_logs_authenticated" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

-- Notifications policies
CREATE POLICY "select_notifications_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_notifications_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_notifications_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contact messages policies (public can insert, admin can manage)
CREATE POLICY "select_contact_admin" ON contact_messages FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "insert_contact_public" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "update_contact_admin" ON contact_messages FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_contact_admin" ON contact_messages FOR DELETE TO authenticated USING (is_admin());

-- Site settings policies (admin only)
CREATE POLICY "select_settings_admin" ON site_settings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "insert_settings_admin" ON site_settings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_settings_admin" ON site_settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_settings_admin" ON site_settings FOR DELETE TO authenticated USING (is_admin());

-- Pages policies (public read, admin write)
CREATE POLICY "select_pages_public" ON pages FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "insert_pages_admin" ON pages FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_pages_admin" ON pages FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_pages_admin" ON pages FOR DELETE TO authenticated USING (is_admin());
