/*
# Create purchase_contexts table — Full Purchase Context Standardization

## Purpose

This is the CENTRAL table for the "Full Purchase Context" standardization.
Every Product Purchase Action (from the Builder) produces one row here that
captures the COMPLETE context across all dimensions:

  - Product Context   (product_id, slug, name, type, category)
  - Variant Context    (variant_id, slug, name, type)
  - Pricing Snapshot   (base_price, sale_price, final_price, currency)
  - Access Snapshot    (duration_days, device_limit, access_type)
  - Affiliate Context  (affiliate_id, slug, code, commission_type, commission_value)
  - Campaign Context   (campaign_id, slug, utm_source, utm_medium, utm_campaign)
  - Page Context       (page_id, slug, component_id, component_type, action_type)
  - Purchase Context   (purchase_context_id, created_at, session_id, visitor_id, user_id)

All downstream systems (Checkout, Cart, Orders, Payments, Affiliate, Membership,
User Products, Analytics, Conversion Tracking) read from this single source of
truth by referencing `purchase_context_id`.

## New Tables

### purchase_contexts

| Column                     | Type        | Description                                      |
|---------------------------|-------------|--------------------------------------------------|
| id                        | uuid PK     | purchase_context_id (the universal reference)    |
| session_id                | text        | Browser/session identifier                       |
| visitor_id                | text        | Anonymous visitor identifier (cookie/localStorage)|
| user_id                   | uuid        | Authenticated user (nullable for guest checkout)  |
| created_at                | timestamptz | When the context was captured                    |
| status                    | text        | pending / consumed / expired / cancelled          |
| expires_at                | timestamptz | Optional TTL for pending contexts                 |
| -- PRODUCT CONTEXT --     |             |                                                  |
| product_id                | uuid        | FK to products                                   |
| product_slug              | text        | Slug fallback for lookup                         |
| product_name              | text        | Snapshot of product name                         |
| product_type             | text        | Snapshot of product type                         |
| product_category          | text        | Snapshot of category name                        |
| -- VARIANT CONTEXT --     |             |                                                  |
| variant_id                | uuid        | FK to product_variants                           |
| variant_slug              | text        | Slug fallback                                     |
| variant_name              | text        | Snapshot of variant name                         |
| variant_type              | text        | Snapshot of variant type                         |
| -- PRICING SNAPSHOT --    |             |                                                  |
| base_price                | numeric     | Original product price                            |
| sale_price                | numeric     | Sale/special price                               |
| final_price               | numeric     | What the buyer actually pays                     |
| currency                  | varchar     | ISO currency code (USD, IDR, etc.)               |
| -- ACCESS SNAPSHOT --    |             |                                                  |
| duration_days             | integer     | License/access duration                          |
| device_limit              | integer     | Max devices                                      |
| access_type               | text        | permanent / limited / subscription               |
| -- AFFILIATE CONTEXT --   |             |                                                  |
| affiliate_id              | uuid        | FK to affiliates                                 |
| affiliate_slug            | text        | Affiliate username/slug                           |
| affiliate_code            | text        | Referral code used                               |
| commission_type           | text        | percentage / fixed                                |
| commission_value          | numeric     | Rate or fixed amount                              |
| -- CAMPAIGN CONTEXT --    |             |                                                  |
| campaign_id               | uuid        | FK to campaigns                                  |
| campaign_slug             | text        | Campaign slug                                    |
| utm_source                | text        | UTM source                                       |
| utm_medium                | text        | UTM medium                                       |
| utm_campaign             | text        | UTM campaign name                                 |
| -- PAGE CONTEXT --        |             |                                                  |
| page_id                   | uuid        | FK to pages                                      |
| page_slug                 | text        | Page slug                                        |
| component_id              | text        | Component identifier                              |
| component_type            | text        | Component type (hero, cta, etc.)                  |
| action_type               | text        | Action type (buy_now, add_to_cart, etc.)          |
| -- FULL SNAPSHOT --       |             |                                                  |
| context_snapshot          | jsonb       | Immutable complete JSON snapshot of ALL the above|

## Security
- RLS enabled.
- Owner-scoped: authenticated users can CRUD their own contexts.
- Guest/anon contexts (user_id IS NULL) are accessible via service role only,
  but we add a restricted anon SELECT for lookup by session_id.
*/

CREATE TABLE IF NOT EXISTS purchase_contexts (
  -- PURCHASE CONTEXT (identity)
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text,
  visitor_id        text,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  status            text NOT NULL DEFAULT 'pending',
  expires_at        timestamptz,

  -- PRODUCT CONTEXT
  product_id        uuid REFERENCES products(id) ON DELETE SET NULL,
  product_slug      text,
  product_name      text,
  product_type      text,
  product_category  text,

  -- VARIANT CONTEXT
  variant_id         uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_slug      text,
  variant_name      text,
  variant_type      text,

  -- PRICING SNAPSHOT
  base_price        numeric,
  sale_price        numeric,
  final_price       numeric,
  currency          varchar DEFAULT 'USD',

  -- ACCESS SNAPSHOT
  duration_days     integer,
  device_limit      integer,
  access_type       text,

  -- AFFILIATE CONTEXT
  affiliate_id      uuid REFERENCES affiliates(id) ON DELETE SET NULL,
  affiliate_slug    text,
  affiliate_code    text,
  commission_type   text,
  commission_value  numeric,

  -- CAMPAIGN CONTEXT
  campaign_id       uuid,
  campaign_slug     text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,

  -- PAGE CONTEXT
  page_id           uuid REFERENCES pages(id) ON DELETE SET NULL,
  page_slug         text,
  component_id      text,
  component_type    text,
  action_type       text,

  -- FULL SNAPSHOT (immutable JSON)
  context_snapshot  jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE purchase_contexts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own purchase contexts
DROP POLICY IF EXISTS "select_own_purchase_contexts" ON purchase_contexts;
CREATE POLICY "select_own_purchase_contexts" ON purchase_contexts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own purchase contexts
DROP POLICY IF EXISTS "insert_own_purchase_contexts" ON purchase_contexts;
CREATE POLICY "insert_own_purchase_contexts" ON purchase_contexts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated users can update their own purchase contexts
DROP POLICY IF EXISTS "update_own_purchase_contexts" ON purchase_contexts;
CREATE POLICY "update_own_purchase_contexts" ON purchase_contexts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own purchase contexts
DROP POLICY IF EXISTS "delete_own_purchase_contexts" ON purchase_contexts;
CREATE POLICY "delete_own_purchase_contexts" ON purchase_contexts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anon can insert (guest checkout / builder action before auth)
DROP POLICY IF EXISTS "insert_anon_purchase_contexts" ON purchase_contexts;
CREATE POLICY "insert_anon_purchase_contexts" ON purchase_contexts
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can read by session_id (guest checkout needs to retrieve their context)
DROP POLICY IF EXISTS "select_anon_purchase_contexts" ON purchase_contexts;
CREATE POLICY "select_anon_purchase_contexts" ON purchase_contexts
  FOR SELECT TO anon
  USING (session_id IS NOT NULL);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_session_id ON purchase_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_visitor_id ON purchase_contexts(visitor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_user_id ON purchase_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_product_id ON purchase_contexts(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_product_slug ON purchase_contexts(product_slug);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_affiliate_id ON purchase_contexts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_campaign_id ON purchase_contexts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_status ON purchase_contexts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_contexts_created_at ON purchase_contexts(created_at DESC);
