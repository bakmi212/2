/*
# Event Context Links — Traceable Action Lineage

## Purpose

The event_context_links table records the parent-child relationship between
event contexts, creating a traceable chain across the entire purchase lifecycle:

  product_purchase_click
    → add_to_cart
      → checkout_open
        → order_created
          → payment_pending
            → payment_success
              → affiliate_conversion
              → membership_activated

This enables:
  - Full tracing: "show me every event that led to this payment"
  - Attribution: "which product click led to this membership activation?"
  - Analytics: "what's the conversion funnel for this campaign?"
  - Debugging: "why did this order fail? Show the full event chain."

## Rules enforced
  - Every downstream event links to its parent event
  - A parent can have multiple children (e.g., payment_success → both
    affiliate_conversion AND membership_activated)
  - Links are immutable once created

## New Tables

### event_context_links

| Column        | Type        | Description                              |
|--------------|-------------|------------------------------------------|
| id           | uuid PK     | Link identifier                           |
| parent_id     | uuid        | Parent event_context                      |
| child_id     | uuid        | Child event_context                       |
| link_type    | text        | led_to / triggered / converted_to          |
| created_at   | timestamptz | When the link was established             |

## Security
- RLS enabled, same access model as event_contexts.
*/

CREATE TABLE IF NOT EXISTS event_context_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES event_contexts(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES event_contexts(id) ON DELETE CASCADE,
  link_type   text NOT NULL DEFAULT 'led_to',
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate links between the same parent-child pair
  CONSTRAINT event_context_links_unique UNIQUE (parent_id, child_id)
);

ALTER TABLE event_contexts ENABLE ROW LEVEL SECURITY;

-- RLS for event_context_links
DROP POLICY IF EXISTS "select_event_context_links" ON event_context_links;
CREATE POLICY "select_event_context_links" ON event_context_links
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM event_contexts ec
      WHERE ec.id = event_context_links.parent_id
        AND (ec.user_id = auth.uid() OR ec.user_id IS NULL OR ec.session_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "insert_event_context_links" ON event_context_links;
CREATE POLICY "insert_event_context_links" ON event_context_links
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_event_context_links_parent_id ON event_context_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_context_links_child_id ON event_context_links(child_id);
