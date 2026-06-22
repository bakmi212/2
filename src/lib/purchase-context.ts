// Full Purchase Context — TypeScript types and client utility
// Used by: Builder → Checkout → Order → Payment → Affiliate → Membership → Analytics

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
