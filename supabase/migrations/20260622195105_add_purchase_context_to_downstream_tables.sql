/*
# Add purchase_context_id and context_snapshot to all downstream tables

## Purpose

The ORDER RULE, PAYMENT RULE, and AFFILIATE RULE require that every
downstream table stores a reference to the purchase_context AND an immutable
copy of the full context snapshot. This ensures:

1. Order history doesn't change if product name, price, variant, or affiliate changes
2. Pending payments retain full context across retries
3. Affiliate commission is calculated from the context captured at purchase click time
4. Analytics can trace every conversion event back to product, variant, affiliate, campaign, page, component

## Tables modified (8 tables)

Each table gets two new columns:
  - purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL
  - context_snapshot jsonb DEFAULT '{}'::jsonb

| # | Table              | Purpose in standardization                     |
|---|--------------------|------------------------------------------------|
| 1 | orders             | ORDER RULE: immutable snapshot at order creation|
| 2 | order_items        | ORDER RULE: per-item snapshot                   |
| 3 | payments           | PAYMENT RULE: pending payment retains context   |
| 4 | cart_items         | Cart reads full purchase context                |
| 5 | user_products      | Membership/User product access from context     |
| 6 | affiliate_commissions | AFFILIATE RULE: commission from click-time ctx |
| 7 | action_executions  | Builder action execution traces to context      |
| 8 | last_purchase_actions | Last purchase action reference per session     |

## Security
- No RLS policy changes needed (FK columns are nullable, existing policies apply).
*/

-- Helper: conditionally add a uuid column with FK
DO $$
BEGIN
  -- orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='purchase_context_id') THEN
    ALTER TABLE orders ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='context_snapshot') THEN
    ALTER TABLE orders ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- order_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='purchase_context_id') THEN
    ALTER TABLE order_items ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='context_snapshot') THEN
    ALTER TABLE order_items ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- payments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='purchase_context_id') THEN
    ALTER TABLE payments ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='context_snapshot') THEN
    ALTER TABLE payments ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- cart_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart_items' AND column_name='purchase_context_id') THEN
    ALTER TABLE cart_items ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart_items' AND column_name='context_snapshot') THEN
    ALTER TABLE cart_items ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- user_products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_products' AND column_name='purchase_context_id') THEN
    ALTER TABLE user_products ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_products' AND column_name='context_snapshot') THEN
    ALTER TABLE user_products ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- affiliate_commissions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_commissions' AND column_name='purchase_context_id') THEN
    ALTER TABLE affiliate_commissions ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_commissions' AND column_name='context_snapshot') THEN
    ALTER TABLE affiliate_commissions ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- action_executions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='action_executions' AND column_name='purchase_context_id') THEN
    ALTER TABLE action_executions ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='action_executions' AND column_name='context_snapshot') THEN
    ALTER TABLE action_executions ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- last_purchase_actions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='last_purchase_actions' AND column_name='purchase_context_id') THEN
    ALTER TABLE last_purchase_actions ADD COLUMN purchase_context_id uuid REFERENCES purchase_contexts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='last_purchase_actions' AND column_name='context_snapshot') THEN
    ALTER TABLE last_purchase_actions ADD COLUMN context_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
