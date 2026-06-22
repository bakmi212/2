/*
# Create indexes for purchase_context_id lookups across all downstream tables

## Purpose

Every downstream table that has purchase_context_id needs an index so that
lookup by purchase_context_id is fast. This enables:

- Checkout: retrieve orders/payments by purchase_context_id
- Analytics: aggregate conversion events by context dimensions
- Affiliate dashboard: find commissions by context
- Membership/User Products: find access grants by context

## Indexes created (8 tables x 1 index each)
  - orders.purchase_context_id
  - order_items.purchase_context_id
  - payments.purchase_context_id
  - cart_items.purchase_context_id
  - user_products.purchase_context_id
  - affiliate_commissions.purchase_context_id
  - action_executions.purchase_context_id
  - last_purchase_actions.purchase_context_id
*/

CREATE INDEX IF NOT EXISTS idx_orders_purchase_context_id ON orders(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_order_items_purchase_context_id ON order_items(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_context_id ON payments(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_purchase_context_id ON cart_items(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_user_products_purchase_context_id ON user_products(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_purchase_context_id ON affiliate_commissions(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_purchase_context_id ON action_executions(purchase_context_id);
CREATE INDEX IF NOT EXISTS idx_last_purchase_actions_purchase_context_id ON last_purchase_actions(purchase_context_id);
