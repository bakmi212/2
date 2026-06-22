-- Affiliate Clicks Table (for tracking each click/referral link visit)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  click_id TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'direct',
  url TEXT,
  referral_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  converted BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_clicks
CREATE POLICY "select_own_clicks" ON affiliate_clicks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_clicks.affiliate_id AND affiliates.user_id = auth.uid())
  );

CREATE POLICY "select_all_clicks_admin" ON affiliate_clicks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "insert_clicks_public" ON affiliate_clicks FOR INSERT
  TO public WITH CHECK (true);

CREATE POLICY "update_clicks_admin" ON affiliate_clicks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

-- Affiliate Commissions Table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_rate NUMERIC DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_commissions
CREATE POLICY "select_own_commissions" ON affiliate_commissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_commissions.affiliate_id AND affiliates.user_id = auth.uid())
  );

CREATE POLICY "select_all_commissions_admin" ON affiliate_commissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "insert_commissions_admin" ON affiliate_commissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "update_commissions_admin" ON affiliate_commissions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

-- Add missing columns to affiliates table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliates' AND column_name = 'username') THEN
    ALTER TABLE affiliates ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliates' AND column_name = 'commission_type') THEN
    ALTER TABLE affiliates ADD COLUMN commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed'));
  END IF;
END $$;

-- Add missing columns to referrals table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'click_id') THEN
    ALTER TABLE referrals ADD COLUMN click_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'source') THEN
    ALTER TABLE referrals ADD COLUMN source TEXT DEFAULT 'direct';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'url') THEN
    ALTER TABLE referrals ADD COLUMN url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'product_id') THEN
    ALTER TABLE referrals ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'commission_status') THEN
    ALTER TABLE referrals ADD COLUMN commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'paid', 'rejected'));
  END IF;
END $$;

-- Add missing columns to orders table for affiliate tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'click_id') THEN
    ALTER TABLE orders ADD COLUMN click_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'referral_source') THEN
    ALTER TABLE orders ADD COLUMN referral_source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'referral_url') THEN
    ALTER TABLE orders ADD COLUMN referral_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commission_status') THEN
    ALTER TABLE orders ADD COLUMN commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'paid', 'rejected'));
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_click_id ON affiliate_clicks(click_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_order_id ON affiliate_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_orders_referral_code ON orders(referral_code);

-- Create a trigger to calculate and create commission when order is paid
CREATE OR REPLACE FUNCTION calculate_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate RECORD;
  v_commission_amount NUMERIC;
  v_commission_rate NUMERIC;
  v_commission_type TEXT;
BEGIN
  -- Only process when order status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if order has affiliate assigned
    IF NEW.affiliate_id IS NOT NULL THEN
      -- Get affiliate details
      SELECT * INTO v_affiliate FROM affiliates WHERE id = NEW.affiliate_id;
      
      IF v_affiliate IS NOT NULL THEN
        -- Get commission type and rate from affiliate
        v_commission_type := COALESCE(v_affiliate.commission_type, 'percentage');
        v_commission_rate := COALESCE(v_affiliate.commission_rate, 0.10);
        
        -- Calculate commission amount
        IF v_commission_type = 'percentage' THEN
          v_commission_amount := NEW.total_amount * v_commission_rate;
        ELSE
          v_commission_amount := v_commission_rate;
        END IF;
        
        -- Update order with commission amount and status
        UPDATE orders 
        SET commission_amount = v_commission_amount,
            commission_status = 'pending'
        WHERE id = NEW.id;
        
        -- Create commission record
        INSERT INTO affiliate_commissions (
          affiliate_id,
          order_id,
          commission_type,
          commission_rate,
          amount,
          status
        ) VALUES (
          v_affiliate.id,
          NEW.id,
          v_commission_type,
          v_commission_rate,
          v_commission_amount,
          'pending'
        );
        
        -- Update affiliate total referrals
        UPDATE affiliates 
        SET total_referrals = total_referrals + 1,
            total_earnings = total_earnings + v_commission_amount
        WHERE id = v_affiliate.id;
        
        -- Update referral record if exists
        UPDATE referrals 
        SET status = 'converted',
            commission_amount = v_commission_amount,
            commission_status = 'pending'
        WHERE affiliate_id = v_affiliate.id 
        AND referred_user_id = NEW.user_id
        AND status != 'converted';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS order_commission_trigger ON orders;
CREATE TRIGGER order_commission_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_affiliate_commission();

-- Function to mark click as converted
CREATE OR REPLACE FUNCTION mark_click_converted(
  p_click_id TEXT,
  p_order_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE affiliate_clicks 
  SET converted = true,
      order_id = p_order_id
  WHERE click_id = p_click_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update commission status
CREATE OR REPLACE FUNCTION update_commission_status(
  p_commission_id UUID,
  p_new_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_order_id UUID;
  v_affiliate_id UUID;
  v_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Get commission details
  SELECT order_id, affiliate_id, amount, status INTO v_order_id, v_affiliate_id, v_amount, v_current_status
  FROM affiliate_commissions WHERE id = p_commission_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;
  
  -- Update commission status
  UPDATE affiliate_commissions 
  SET status = p_new_status,
      rejection_reason = p_rejection_reason,
      approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE approved_at END,
      paid_at = CASE WHEN p_new_status = 'paid' THEN NOW() ELSE paid_at END,
      updated_at = NOW()
  WHERE id = p_commission_id;
  
  -- Update order commission status
  UPDATE orders 
  SET commission_status = p_new_status
  WHERE id = v_order_id;
  
  -- Update referral commission status
  UPDATE referrals
  SET commission_status = p_new_status
  WHERE order_id = v_order_id;
  
  -- Update affiliate totals based on status change
  IF p_new_status = 'rejected' AND v_current_status != 'rejected' THEN
    -- Subtract from total earnings if rejected
    UPDATE affiliates 
    SET total_earnings = GREATEST(0, total_earnings - v_amount)
    WHERE id = v_affiliate_id;
  ELSIF p_new_status = 'paid' AND v_current_status != 'paid' THEN
    -- Add to total paid
    UPDATE affiliates 
    SET total_paid = total_paid + v_amount
    WHERE id = v_affiliate_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get affiliate stats
CREATE OR REPLACE FUNCTION get_affiliate_stats(p_affiliate_id UUID)
RETURNS TABLE (
  total_clicks BIGINT,
  total_orders BIGINT,
  total_sales NUMERIC,
  pending_commission NUMERIC,
  approved_commission NUMERIC,
  paid_commission NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_id = p_affiliate_id), 0)::BIGINT as total_clicks,
    COALESCE((SELECT COUNT(*) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id), 0)::BIGINT as total_orders,
    COALESCE((SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id), 0) as total_sales,
    COALESCE((SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id AND status = 'pending'), 0) as pending_commission,
    COALESCE((SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id AND status = 'approved'), 0) as approved_commission,
    COALESCE((SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id AND status = 'paid'), 0) as paid_commission,
    CASE 
      WHEN (SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_id = p_affiliate_id) > 0 
      THEN ROUND((SELECT COUNT(*) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id)::NUMERIC / 
           (SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_id = p_affiliate_id)::NUMERIC * 100, 2)
      ELSE 0
    END as conversion_rate;
END;
$$ LANGUAGE plpgsql;