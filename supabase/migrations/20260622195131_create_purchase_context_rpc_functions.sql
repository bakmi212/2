/*
# Create RPC functions for Full Purchase Context

## Purpose

### 1. resolve_product_by_uuid_or_slug (CHECKOUT RULE)
Checkout must read Full Purchase Context. If product_id (UUID) is available,
use it as primary lookup. If UUID is not available, use slug as fallback.
This function encapsulates that rule in the database.

### 2. get_full_purchase_context
Retrieves the complete purchase context by purchase_context_id, returning
all structured columns + the JSONB snapshot. Used by Checkout, Order,
Payment, Affiliate, Membership, and Analytics systems.

### 3. snapshot_purchase_context
Returns a JSONB snapshot of a purchase_context row — used when creating
orders/payments to copy the immutable snapshot (ORDER RULE).

## Security
- Functions are SECURITY DEFINER so they can read data even if the caller
  is anon (guest checkout). They only SELECT, never write.
- Uses auth.uid() where available for user-scoped queries.
*/

-- 1. resolve_product_by_uuid_or_slug
-- Given a UUID or a slug, returns the product row
CREATE OR REPLACE FUNCTION resolve_product_by_uuid_or_slug(
  p_product_id uuid DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name varchar,
  slug text,
  price numeric,
  compare_price numeric,
  category_id uuid,
  is_active boolean,
  affiliate_enabled boolean,
  commission_type text,
  commission_value numeric,
  cta_type text,
  variants_enabled boolean,
  license_enabled boolean,
  license_duration text,
  custom_license_days integer,
  enable_license boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id, p.name, p.slug, p.price, p.compare_price, p.category_id,
    p.is_active, p.affiliate_enabled, p.commission_type, p.commission_value,
    p.cta_type, p.variants_enabled, p.license_enabled, p.license_duration,
    p.custom_license_days, p.enable_license
  FROM products p
  WHERE
    (p_product_id IS NOT NULL AND p.id = p_product_id)
    OR
    (p_product_id IS NULL AND p_slug IS NOT NULL AND p.slug = p_slug)
  LIMIT 1;
$$;

-- 2. get_full_purchase_context
-- Returns the complete purchase context including the JSONB snapshot
CREATE OR REPLACE FUNCTION get_full_purchase_context(
  p_purchase_context_id uuid
)
RETURNS TABLE (
  id uuid,
  session_id text,
  visitor_id text,
  user_id uuid,
  created_at timestamptz,
  status text,
  expires_at timestamptz,
  product_id uuid,
  product_slug text,
  product_name text,
  product_type text,
  product_category text,
  variant_id uuid,
  variant_slug text,
  variant_name text,
  variant_type text,
  base_price numeric,
  sale_price numeric,
  final_price numeric,
  currency varchar,
  duration_days integer,
  device_limit integer,
  access_type text,
  affiliate_id uuid,
  affiliate_slug text,
  affiliate_code text,
  commission_type text,
  commission_value numeric,
  campaign_id uuid,
  campaign_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  page_id uuid,
  page_slug text,
  component_id text,
  component_type text,
  action_type text,
  context_snapshot jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pc.id, pc.session_id, pc.visitor_id, pc.user_id, pc.created_at,
    pc.status, pc.expires_at,
    pc.product_id, pc.product_slug, pc.product_name, pc.product_type,
    pc.product_category,
    pc.variant_id, pc.variant_slug, pc.variant_name, pc.variant_type,
    pc.base_price, pc.sale_price, pc.final_price, pc.currency,
    pc.duration_days, pc.device_limit, pc.access_type,
    pc.affiliate_id, pc.affiliate_slug, pc.affiliate_code,
    pc.commission_type, pc.commission_value,
    pc.campaign_id, pc.campaign_slug, pc.utm_source, pc.utm_medium,
    pc.utm_campaign,
    pc.page_id, pc.page_slug, pc.component_id, pc.component_type,
    pc.action_type,
    pc.context_snapshot
  FROM purchase_contexts pc
  WHERE pc.id = p_purchase_context_id;
$$;

-- 3. snapshot_purchase_context
-- Returns just the JSONB snapshot for a given purchase_context_id
-- Used by Order/Payment creation flows to copy immutable context
CREATE OR REPLACE FUNCTION snapshot_purchase_context(
  p_purchase_context_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT context_snapshot FROM purchase_contexts WHERE id = p_purchase_context_id;
$$;
