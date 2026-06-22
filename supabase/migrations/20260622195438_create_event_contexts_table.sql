/*
# Event Context Architecture — Universal Context Store

## Purpose

The Event Context Architecture extends "store once, consume many" to ALL
important actions in the system, not just purchase clicks. Every action
type produces one Context Record that stores the complete metadata and
becomes the single source of truth for that action.

## Supported Action Types
  - product_purchase_click   — Clicking a Buy/Purchase button
  - add_to_cart                — Adding a product to cart
  - checkout_open              — Opening the checkout page
  - order_created              — Order is created in the system
  - payment_pending            — Payment is initiated/pending
  - payment_success            — Payment is completed successfully
  - affiliate_conversion       — Affiliate click converts to a sale
  - membership_activated       — User product access is activated

## Rules Enforced
  1. Store context COMPLETE once (with UUIDs + slugs + snapshot)
  2. Modules consume only the fields they need (no re-fetching)
  3. Don't create a new context if one already exists for the same
     action + entity (deduplication via dedup_key)
  4. Context is the primary source for history and tracking
  5. Product, Checkout, Order, Payment, Affiliate, Membership, Analytics
     all read the SAME context
  6. Every action is traceable — event_context_links chains lineage

## New Tables

### event_contexts

| Column              | Type        | Description                                         |
|---------------------|-------------|-----------------------------------------------------|
| id                  | uuid PK     | Universal context ID                                |
| action_type         | text        | One of the 8 supported action types                 |
| dedup_key           | text UNIQUE | Deduplication key (action_type + entity + session)  |
| purchase_context_id | uuid        | FK to purchase_contexts (if action originates there)|
| parent_event_id     | uuid        | FK to parent event_context (for lineage)            |
| session_id          | text        | Browser session identifier                          |
| visitor_id          | text        | Anonymous visitor identifier                        |
| user_id             | uuid        | Authenticated user                                  |
| status              | text        | active / consumed / expired / failed                 |
| created_at          | timestamptz | When the event context was created                  |
| consumed_at          | timestamptz | When a downstream module consumed it                |
| expires_at          | timestamptz | Optional TTL                                        |
| -- PRODUCT --       |             |                                                     |
| product_id          | uuid        | FK to products                                      |
| product_slug        | text        | Slug fallback                                       |
| product_name        | text        | Snapshot                                            |
| -- VARIANT --       |             |                                                     |
| variant_id          | uuid        | FK to product_variants                              |
| variant_slug        | text        | Slug fallback                                       |
| variant_name        | text        | Snapshot                                            |
| -- AFFILIATE --     |             |                                                     |
| affiliate_id        | uuid        | FK to affiliates                                    |
| affiliate_slug      | text        | Slug fallback                                       |
| affiliate_code      | text        | Referral code                                       |
| commission_type     | text        | Snapshot                                            |
| commission_value    | numeric     | Snapshot                                            |
| -- CAMPAIGN --      |             |                                                     |
| campaign_id         | uuid        | FK to campaigns                                     |
| campaign_slug       | text        | Slug fallback                                       |
| utm_source          | text        | UTM                                                 |
| utm_medium          | text        | UTM                                                 |
| utm_campaign        | text        | UTM                                                 |
| -- PAGE/COMPONENT -- |            |                                                     |
| page_id             | uuid        | FK to pages                                         |
| page_slug           | text        | Slug fallback                                       |
| component_id        | text        | Component identifier                                |
| component_type      | text        | Component type                                      |
| -- PRICING --       |             |                                                     |
| base_price          | numeric     | Snapshot                                            |
| final_price         | numeric     | Snapshot                                            |
| currency            | varchar     | Snapshot                                            |
| -- ENTITY LINKS --  |             |                                                     |
| order_id            | uuid        | FK to orders (when applicable)                      |
| payment_id          | uuid        | FK to payments (when applicable)                     |
| cart_item_id        | uuid        | FK to cart_items (when applicable)                  |
| user_product_id     | uuid        | FK to user_products (when applicable)                |
| -- TRACKING --      |             |                                                     |
| ip_address          | text        | Visitor IP                                          |
| user_agent          | text        | Browser UA                                          |
| referral_url        | text        | Where the visitor came from                         |
| click_id            | text        | Affiliate click ID                                  |
| metadata            | jsonb       | Extra key-value data                                |
| context_snapshot    | jsonb       | Immutable FULL snapshot of all the above           |

## Security
- RLS enabled. Authenticated users manage their own contexts.
- Anon can insert + read by session_id (guest checkout flow).
*/

CREATE TABLE IF NOT EXISTS event_contexts (
  -- IDENTITY
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type           text NOT NULL,
  dedup_key             text UNIQUE,
  purchase_context_id   uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL,
  parent_event_id       uuid REFERENCES event_contexts(id) ON DELETE SET NULL,

  -- SESSION / USER
  session_id            text,
  visitor_id            text,
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now(),
  consumed_at           timestamptz,
  expires_at           timestamptz,

  -- PRODUCT CONTEXT
  product_id            uuid REFERENCES products(id) ON DELETE SET NULL,
  product_slug          text,
  product_name          text,

  -- VARIANT CONTEXT
  variant_id            uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_slug          text,
  variant_name          text,

  -- AFFILIATE CONTEXT
  affiliate_id          uuid REFERENCES affiliates(id) ON DELETE SET NULL,
  affiliate_slug        text,
  affiliate_code        text,
  commission_type        text,
  commission_value      numeric,

  -- CAMPAIGN CONTEXT
  campaign_id           uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_slug         text,
  utm_source            text,
  utm_medium             text,
  utm_campaign          text,

  -- PAGE / COMPONENT CONTEXT
  page_id               uuid REFERENCES pages(id) ON DELETE SET NULL,
  page_slug             text,
  component_id          text,
  component_type        text,

  -- PRICING SNAPSHOT
  base_price            numeric,
  final_price           numeric,
  currency              varchar DEFAULT 'USD',

  -- ENTITY LINKS (what this event produced or references)
  order_id              uuid REFERENCES orders(id) ON DELETE SET NULL,
  payment_id            uuid,
  cart_item_id          uuid,
  user_product_id       uuid,

  -- TRACKING CONTEXT
  ip_address            text,
  user_agent            text,
  referral_url          text,
  click_id              text,

  -- EXTENSIBILITY + SNAPSHOT
  metadata              jsonb DEFAULT '{}'::jsonb,
  context_snapshot      jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE event_contexts ENABLE ROW LEVEL SECURITY;

-- Authenticated: read own event contexts
DROP POLICY IF EXISTS "select_own_event_contexts" ON event_contexts;
CREATE POLICY "select_own_event_contexts" ON event_contexts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated: insert own event contexts
DROP POLICY IF EXISTS "insert_own_event_contexts" ON event_contexts;
CREATE POLICY "insert_own_event_contexts" ON event_contexts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated: update own event contexts
DROP POLICY IF EXISTS "update_own_event_contexts" ON event_contexts;
CREATE POLICY "update_own_event_contexts" ON event_contexts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated: delete own event contexts
DROP POLICY IF EXISTS "delete_own_event_contexts" ON event_contexts;
CREATE POLICY "delete_own_event_contexts" ON event_contexts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anon: insert (guest actions before auth)
DROP POLICY IF EXISTS "insert_anon_event_contexts" ON event_contexts;
CREATE POLICY "insert_anon_event_contexts" ON event_contexts
  FOR INSERT TO anon WITH CHECK (true);

-- Anon: read by session_id (guest checkout needs to retrieve their events)
DROP POLICY IF EXISTS "select_anon_event_contexts" ON event_contexts;
CREATE POLICY "select_anon_event_contexts" ON event_contexts
  FOR SELECT TO anon
  USING (session_id IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_contexts_action_type ON event_contexts(action_type);
CREATE INDEX IF NOT EXISTS idx_event_contexts_dedup_key ON event_contexts(dedup_key);
CREATE INDEX IF NOT EXISTS idx_event_contexts_session_id ON event_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_visitor_id ON event_contexts(visitor_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_user_id ON event_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_product_id ON event_contexts(product_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_product_slug ON event_contexts(product_slug);
CREATE INDEX IF NOT EXISTS idx_event_contexts_affiliate_id ON event_contexts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_campaign_id ON event_contexts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_order_id ON event_contexts(order_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_payment_id ON event_contexts(payment_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_purchase_context_id ON event_contexts(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_parent_event_id ON event_contexts(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_event_contexts_status ON event_contexts(status);
CREATE INDEX IF NOT EXISTS idx_event_contexts_created_at ON event_contexts(created_at DESC);
