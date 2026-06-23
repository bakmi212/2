// Full Purchase Context — TypeScript types and client utility
// Used by: Builder → Checkout → Order → Payment → Affiliate → Membership → Analytics

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// formatIDR — used by Checkout, Orders pages
// ---------------------------------------------------------------------------
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// PurchaseContext — runtime context built in Checkout
// ---------------------------------------------------------------------------
export interface PurchaseContext {
  product_id: string
  variant_id: string | null
  user_id: string | null
  product: any
  variant: any | null
  price: number
  total: number
  validated: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// createPurchaseContext — loads product + variant from Supabase, builds context
// UUID primary, slug fallback (Checkout Rule)
// ---------------------------------------------------------------------------
export async function createPurchaseContext(
  supabase: SupabaseClient,
  params: { productId: string; variantId?: string }
): Promise<PurchaseContext> {
  const base: PurchaseContext = {
    product_id: params.productId,
    variant_id: params.variantId || null,
    user_id: null,
    product: null,
    variant: null,
    price: 0,
    total: 0,
    validated: false,
    error: null,
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    params.productId
  )
  const col = isUUID ? 'id' : 'slug'
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq(col, params.productId)
    .maybeSingle()

  if (productError || !product) {
    return { ...base, error: productError?.message || 'Product not found' }
  }

  let variant: any = null
  if (params.variantId) {
    const { data: v } = await supabase
      .from('product_variants')
      .select('*')
      .eq('id', params.variantId)
      .eq('product_id', product.id)
      .maybeSingle()
    variant = v
    if (!v) {
      return { ...base, product, error: 'Variant not found' }
    }
  }

  const price = variant?.price ?? product.price ?? 0
  return {
    product_id: product.id,
    variant_id: variant?.id || null,
    user_id: null,
    product,
    variant,
    price,
    total: price,
    validated: true,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// createOrderFromContext — creates an order from a validated PurchaseContext
// ---------------------------------------------------------------------------
export async function createOrderFromContext(
  supabase: SupabaseClient,
  context: PurchaseContext,
  form: { name: string; email: string; phone?: string; notes?: string },
  options: { payment_method?: string; payment_account_id?: string } = {}
): Promise<{ success: boolean; order?: any; error?: string }> {
  if (!context.validated || !context.product) {
    return { success: false, error: 'Invalid purchase context' }
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: context.user_id,
      order_number: orderNumber,
      total_amount: context.total,
      status: 'pending',
      payment_status: 'pending_payment',
      order_status: 'pending',
      payment_method: options.payment_method || null,
      payment_account_id: options.payment_account_id || null,
      billing_name: form.name,
      billing_email: form.email,
      billing_phone: form.phone || null,
      notes: form.notes || null,
      product_id: context.product_id,
      variant_id: context.variant_id,
    })
    .select()
    .single()

  if (orderError || !order) {
    return { success: false, error: orderError?.message || 'Failed to create order' }
  }

  await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: context.product_id,
    variant_id: context.variant_id,
    quantity: 1,
    price: context.price,
    product_name: context.product?.name || null,
    variant_name: context.variant?.name || null,
  })

  return { success: true, order: { ...order, order_id: order.id } }
}

export interface ProductContext {
  product_id: string | null;
  product_slug: string | null;
  product_name: string | null;
  product_type: string | null;
  product_category: string | null;
}

export interface VariantContext {
  variant_id: string | null;
  variant_slug: string | null;
  variant_name: string | null;
  variant_type: string | null;
}

export interface PricingSnapshot {
  base_price: number | null;
  sale_price: number | null;
  final_price: number | null;
  currency: string;
}

export interface AccessSnapshot {
  duration_days: number | null;
  device_limit: number | null;
  access_type: string | null;
}

export interface AffiliateContext {
  affiliate_id: string | null;
  affiliate_slug: string | null;
  affiliate_code: string | null;
  commission_type: string | null;
  commission_value: number | null;
}

export interface CampaignContext {
  campaign_id: string | null;
  campaign_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export interface PageContext {
  page_id: string | null;
  page_slug: string | null;
  component_id: string | null;
  component_type: string | null;
  action_type: string | null;
}

export interface PurchaseContextMeta {
  created_at: string;
  session_id: string | null;
  visitor_id: string | null;
  user_id: string | null;
}

export interface FullPurchaseContextSnapshot {
  product: ProductContext;
  variant: VariantContext;
  pricing: PricingSnapshot;
  access: AccessSnapshot;
  affiliate: AffiliateContext;
  campaign: CampaignContext;
  page: PageContext;
  purchase: PurchaseContextMeta;
}

export interface PurchaseContextRow {
  id: string;
  session_id: string | null;
  visitor_id: string | null;
  user_id: string | null;
  created_at: string;
  status: "pending" | "consumed" | "expired" | "cancelled";
  expires_at: string | null;

  product_id: string | null;
  product_slug: string | null;
  product_name: string | null;
  product_type: string | null;
  product_category: string | null;

  variant_id: string | null;
  variant_slug: string | null;
  variant_name: string | null;
  variant_type: string | null;

  base_price: number | null;
  sale_price: number | null;
  final_price: number | null;
  currency: string;

  duration_days: number | null;
  device_limit: number | null;
  access_type: string | null;

  affiliate_id: string | null;
  affiliate_slug: string | null;
  affiliate_code: string | null;
  commission_type: string | null;
  commission_value: number | null;

  campaign_id: string | null;
  campaign_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;

  page_id: string | null;
  page_slug: string | null;
  component_id: string | null;
  component_type: string | null;
  action_type: string | null;

  context_snapshot: FullPurchaseContextSnapshot;
}

export interface CreatePurchaseContextInput {
  session_id?: string;
  visitor_id?: string;
  user_id?: string;
  product_id?: string;
  product_slug?: string;
  variant_id?: string;
  variant_slug?: string;
  affiliate_id?: string;
  affiliate_slug?: string;
  affiliate_code?: string;
  campaign_id?: string;
  campaign_slug?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  page_id?: string;
  page_slug?: string;
  component_id?: string;
  component_type?: string;
  action_type?: string;
  expires_in_hours?: number;
}

function getApiUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  return `${url}/functions/v1/purchase-context`;
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
  };
}

export const purchaseContextClient = {
  async create(input: CreatePurchaseContextInput): Promise<PurchaseContextRow> {
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create purchase context (${response.status})`);
    }

    return response.json();
  },

  async get(contextId: string): Promise<PurchaseContextRow> {
    const response = await fetch(`${getApiUrl()}/${contextId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to retrieve purchase context (${response.status})`);
    }

    return response.json();
  },

  async updateStatus(contextId: string, status: PurchaseContextRow["status"]): Promise<PurchaseContextRow> {
    const response = await fetch(`${getApiUrl()}/${contextId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update purchase context (${response.status})`);
    }

    return response.json();
  },

  // Extract affiliate context from a purchase context for commission calculation
  // AFFILIATE RULE: commission is calculated from context captured at purchase click time
  extractAffiliate(row: PurchaseContextRow): AffiliateContext {
    return {
      affiliate_id: row.affiliate_id || row.context_snapshot?.affiliate?.affiliate_id || null,
      affiliate_slug: row.affiliate_slug || row.context_snapshot?.affiliate?.affiliate_slug || null,
      affiliate_code: row.affiliate_code || row.context_snapshot?.affiliate?.affiliate_code || null,
      commission_type:
        row.commission_type || row.context_snapshot?.affiliate?.commission_type || null,
      commission_value:
        row.commission_value ?? row.context_snapshot?.affiliate?.commission_value ?? null,
    };
  },

  // Checkout rule: UUID primary, slug fallback
  getProductLookup(row: PurchaseContextRow): { product_id?: string; product_slug?: string } {
    if (row.product_id) return { product_id: row.product_id };
    if (row.product_slug) return { product_slug: row.product_slug };
    const snap = row.context_snapshot?.product;
    if (snap?.product_id) return { product_id: snap.product_id };
    if (snap?.product_slug) return { product_slug: snap.product_slug };
    return {};
  },
};
