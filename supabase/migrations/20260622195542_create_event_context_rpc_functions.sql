/*
# Event Context RPC Functions — Deduplication + Lineage Tracing

## Purpose

### 1. find_or_create_event_context (DEDUPLICATION RULE)
"Jangan membuat context baru jika data sudah ada." This function checks
for an existing event_context by dedup_key (or action_type + entity combination)
and returns it if found, otherwise creates a new one. This is the core of
"store once, consume many."

### 2. get_event_context_chain (TRACING RULE)
"Semua action harus dapat ditelusuri kembali (traceable)." This function
recursively walks event_context_links to return the full lineage chain for
a given event — both ancestors (what led to this event) and descendants
(what this event triggered).

### 3. link_event_contexts (LINEAGE RULE)
Creates a parent-child link between two event contexts, recording the
traceability relationship.

## Security
- SECURITY DEFINER so they work for both authenticated and anon callers
  (guest checkout needs to create and find event contexts).
- Uses COALESCE for safe NULL handling in dedup_key construction.
*/

-- 1. find_or_create_event_context
-- Deduplication: returns existing context if dedup_key matches, else creates new
CREATE OR REPLACE FUNCTION find_or_create_event_context(
  p_action_type text,
  p_dedup_key text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_visitor_id text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_purchase_context_id uuid DEFAULT NULL,
  p_parent_event_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_product_slug text DEFAULT NULL,
  p_product_name text DEFAULT NULL,
  p_variant_id uuid DEFAULT NULL,
  p_variant_slug text DEFAULT NULL,
  p_variant_name text DEFAULT NULL,
  p_affiliate_id uuid DEFAULT NULL,
  p_affiliate_slug text DEFAULT NULL,
  p_affiliate_code text DEFAULT NULL,
  p_commission_type text DEFAULT NULL,
  p_commission_value numeric DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_campaign_slug text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_page_id uuid DEFAULT NULL,
  p_page_slug text DEFAULT NULL,
  p_component_id text DEFAULT NULL,
  p_component_type text DEFAULT NULL,
  p_base_price numeric DEFAULT NULL,
  p_final_price numeric DEFAULT NULL,
  p_currency varchar DEFAULT 'USD',
  p_order_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_cart_item_id uuid DEFAULT NULL,
  p_user_product_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referral_url text DEFAULT NULL,
  p_click_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_context_snapshot jsonb DEFAULT '{}'::jsonb,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  action_type text,
  dedup_key text,
  purchase_context_id uuid,
  parent_event_id uuid,
  session_id text,
  visitor_id text,
  user_id uuid,
  status text,
  created_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz,
  product_id uuid,
  product_slug text,
  product_name text,
  variant_id uuid,
  variant_slug text,
  variant_name text,
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
  base_price numeric,
  final_price numeric,
  currency varchar,
  order_id uuid,
  payment_id uuid,
  cart_item_id uuid,
  user_product_id uuid,
  ip_address text,
  user_agent text,
  referral_url text,
  click_id text,
  metadata jsonb,
  context_snapshot jsonb,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_effective_dedup text;
  v_new_id uuid;
BEGIN
  -- Build dedup_key if not provided: action_type + product_id/slug + session_id + variant_id
  v_effective_dedup := COALESCE(p_dedup_key,
    p_action_type || ':' ||
    COALESCE(p_product_id::text, p_product_slug, 'none') || ':' ||
    COALESCE(p_variant_id::text, p_variant_slug, 'any') || ':' ||
    COALESCE(p_session_id, p_visitor_id, 'anonymous'));

  -- Check for existing context with this dedup_key
  SELECT id INTO v_existing_id
  FROM event_contexts
  WHERE dedup_key = v_effective_dedup
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Return existing context (DON'T create a new one)
    RETURN QUERY
    SELECT
      ec.id, ec.action_type, ec.dedup_key, ec.purchase_context_id,
      ec.parent_event_id, ec.session_id, ec.visitor_id, ec.user_id,
      ec.status, ec.created_at, ec.consumed_at, ec.expires_at,
      ec.product_id, ec.product_slug, ec.product_name,
      ec.variant_id, ec.variant_slug, ec.variant_name,
      ec.affiliate_id, ec.affiliate_slug, ec.affiliate_code,
      ec.commission_type, ec.commission_value,
      ec.campaign_id, ec.campaign_slug, ec.utm_source, ec.utm_medium, ec.utm_campaign,
      ec.page_id, ec.page_slug, ec.component_id, ec.component_type,
      ec.base_price, ec.final_price, ec.currency,
      ec.order_id, ec.payment_id, ec.cart_item_id, ec.user_product_id,
      ec.ip_address, ec.user_agent, ec.referral_url, ec.click_id,
      ec.metadata, ec.context_snapshot,
      false AS is_new
    FROM event_contexts ec
    WHERE ec.id = v_existing_id;
  ELSE
    -- Create new event context
    v_new_id := gen_random_uuid();

    INSERT INTO event_contexts (
      id, action_type, dedup_key, purchase_context_id, parent_event_id,
      session_id, visitor_id, user_id, status, created_at, expires_at,
      product_id, product_slug, product_name,
      variant_id, variant_slug, variant_name,
      affiliate_id, affiliate_slug, affiliate_code, commission_type, commission_value,
      campaign_id, campaign_slug, utm_source, utm_medium, utm_campaign,
      page_id, page_slug, component_id, component_type,
      base_price, final_price, currency,
      order_id, payment_id, cart_item_id, user_product_id,
      ip_address, user_agent, referral_url, click_id,
      metadata, context_snapshot
    ) VALUES (
      v_new_id, p_action_type, v_effective_dedup, p_purchase_context_id, p_parent_event_id,
      p_session_id, p_visitor_id, p_user_id, 'active', now(), p_expires_at,
      p_product_id, p_product_slug, p_product_name,
      p_variant_id, p_variant_slug, p_variant_name,
      p_affiliate_id, p_affiliate_slug, p_affiliate_code, p_commission_type, p_commission_value,
      p_campaign_id, p_campaign_slug, p_utm_source, p_utm_medium, p_utm_campaign,
      p_page_id, p_page_slug, p_component_id, p_component_type,
      p_base_price, p_final_price, p_currency,
      p_order_id, p_payment_id, p_cart_item_id, p_user_product_id,
      p_ip_address, p_user_agent, p_referral_url, p_click_id,
      p_metadata, p_context_snapshot
    );

    -- Create lineage link if parent_event_id is provided
    IF p_parent_event_id IS NOT NULL THEN
      INSERT INTO event_context_links (parent_id, child_id, link_type)
      VALUES (p_parent_event_id, v_new_id, 'led_to')
      ON CONFLICT (parent_id, child_id) DO NOTHING;
    END IF;

    RETURN QUERY
    SELECT
      ec.id, ec.action_type, ec.dedup_key, ec.purchase_context_id,
      ec.parent_event_id, ec.session_id, ec.visitor_id, ec.user_id,
      ec.status, ec.created_at, ec.consumed_at, ec.expires_at,
      ec.product_id, ec.product_slug, ec.product_name,
      ec.variant_id, ec.variant_slug, ec.variant_name,
      ec.affiliate_id, ec.affiliate_slug, ec.affiliate_code,
      ec.commission_type, ec.commission_value,
      ec.campaign_id, ec.campaign_slug, ec.utm_source, ec.utm_medium, ec.utm_campaign,
      ec.page_id, ec.page_slug, ec.component_id, ec.component_type,
      ec.base_price, ec.final_price, ec.currency,
      ec.order_id, ec.payment_id, ec.cart_item_id, ec.user_product_id,
      ec.ip_address, ec.user_agent, ec.referral_url, ec.click_id,
      ec.metadata, ec.context_snapshot,
      true AS is_new
    FROM event_contexts ec
    WHERE ec.id = v_new_id;
  END IF;
END;
$$;

-- 2. get_event_context_chain
-- Returns the full lineage chain for a given event context
CREATE OR REPLACE FUNCTION get_event_context_chain(
  p_event_id uuid,
  p_direction text DEFAULT 'both'  -- 'ancestors', 'descendants', 'both'
)
RETURNS TABLE (
  id uuid,
  action_type text,
  status text,
  created_at timestamptz,
  product_id uuid,
  product_name text,
  affiliate_id uuid,
  affiliate_code text,
  order_id uuid,
  payment_id uuid,
  user_product_id uuid,
  parent_event_id uuid,
  depth integer,
  direction text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Ancestors (what led to this event)
  WITH RECURSIVE ancestors AS (
    SELECT ec.id, ec.action_type, ec.status, ec.created_at,
           ec.product_id, ec.product_name, ec.affiliate_id, ec.affiliate_code,
           ec.order_id, ec.payment_id, ec.user_product_id,
           ec.parent_event_id, 0 AS depth, 'ancestor' AS direction
    FROM event_contexts ec
    WHERE ec.id = p_event_id

    UNION ALL

    SELECT parent.id, parent.action_type, parent.status, parent.created_at,
           parent.product_id, parent.product_name, parent.affiliate_id, parent.affiliate_code,
           parent.order_id, parent.payment_id, parent.user_product_id,
           parent.parent_event_id, a.depth - 1, 'ancestor' AS direction
    FROM event_contexts parent
    INNER JOIN event_context_links ecl ON ecl.parent_id = parent.id
    INNER JOIN ancestors a ON a.parent_event_id = parent.id
    WHERE p_direction IN ('ancestors', 'both')
  ),
  -- Descendants (what this event triggered)
  descendants AS (
    SELECT ec.id, ec.action_type, ec.status, ec.created_at,
           ec.product_id, ec.product_name, ec.affiliate_id, ec.affiliate_code,
           ec.order_id, ec.payment_id, ec.user_product_id,
           ec.parent_event_id, 0 AS depth, 'descendant' AS direction
    FROM event_contexts ec
    WHERE ec.id = p_event_id

    UNION ALL

    SELECT child.id, child.action_type, child.status, child.created_at,
           child.product_id, child.product_name, child.affiliate_id, child.affiliate_code,
           child.order_id, child.payment_id, child.user_product_id,
           child.parent_event_id, d.depth + 1, 'descendant' AS direction
    FROM event_contexts child
    INNER JOIN event_context_links ecl ON ecl.child_id = child.id
    INNER JOIN descendants d ON d.id = ecl.parent_id
    WHERE p_direction IN ('descendants', 'both')
  )
  SELECT * FROM ancestors
  WHERE p_direction IN ('ancestors', 'both')
    AND id != p_event_id  -- exclude self from ancestors
  UNION ALL
  SELECT * FROM descendants
  WHERE p_direction IN ('descendants', 'both')
    AND id != p_event_id  -- exclude self from descendants
  UNION ALL
  -- Include the event itself
  SELECT ec.id, ec.action_type, ec.status, ec.created_at,
         ec.product_id, ec.product_name, ec.affiliate_id, ec.affiliate_code,
         ec.order_id, ec.payment_id, ec.user_product_id,
         ec.parent_event_id, 0 AS depth, 'self' AS direction
  FROM event_contexts ec
  WHERE ec.id = p_event_id
  ORDER BY direction, depth;
$$;

-- 3. link_event_contexts
-- Creates a parent-child link between two event contexts
CREATE OR REPLACE FUNCTION link_event_contexts(
  p_parent_id uuid,
  p_child_id uuid,
  p_link_type text DEFAULT 'led_to'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO event_context_links (parent_id, child_id, link_type)
  VALUES (p_parent_id, p_child_id, p_link_type)
  ON CONFLICT (parent_id, child_id) DO NOTHING;
  SELECT true;
$$;

-- 4. consume_event_context
-- Marks an event context as consumed by a downstream module
-- Sets consumed_at and optionally updates entity links
CREATE OR REPLACE FUNCTION consume_event_context(
  p_event_id uuid,
  p_order_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_user_product_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status text,
  consumed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE event_contexts
  SET
    status = 'consumed',
    consumed_at = now(),
    order_id = COALESCE(p_order_id, order_id),
    payment_id = COALESCE(p_payment_id, payment_id),
    user_product_id = COALESCE(p_user_product_id, user_product_id),
    metadata = CASE WHEN p_metadata IS NOT NULL
      THEN metadata || p_metadata
      ELSE metadata END
  WHERE id = p_event_id;

  RETURN QUERY
  SELECT id, status, consumed_at FROM event_contexts WHERE id = p_event_id;
END;
$$;
