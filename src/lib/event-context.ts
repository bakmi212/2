// Event Context Architecture — TypeScript client
// Store once, consume many. Every action produces one context record.
//
// Supported action types:
//   product_purchase_click, add_to_cart, checkout_open,
//   order_created, payment_pending, payment_success,
//   affiliate_conversion, membership_activated

export type EventType =
  | "product_purchase_click"
  | "add_to_cart"
  | "checkout_open"
  | "order_created"
  | "payment_pending"
  | "payment_success"
  | "affiliate_conversion"
  | "membership_activated";

export interface EventContextRow {
  id: string;
  action_type: string;
  dedup_key: string | null;
  purchase_context_id: string | null;
  parent_event_id: string | null;
  session_id: string | null;
  visitor_id: string | null;
  user_id: string | null;
  status: "active" | "consumed" | "expired" | "failed";
  created_at: string;
  consumed_at: string | null;
  expires_at: string | null;

  product_id: string | null;
  product_slug: string | null;
  product_name: string | null;
  variant_id: string | null;
  variant_slug: string | null;
  variant_name: string | null;

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

  base_price: number | null;
  final_price: number | null;
  currency: string;

  order_id: string | null;
  payment_id: string | null;
  cart_item_id: string | null;
  user_product_id: string | null;

  ip_address: string | null;
  user_agent: string | null;
  referral_url: string | null;
  click_id: string | null;

  metadata: Record<string, any>;
  context_snapshot: Record<string, any>;
  is_new?: boolean;
}

export interface EventChainEntry {
  id: string;
  action_type: string;
  status: string;
  created_at: string;
  product_id: string | null;
  product_name: string | null;
  affiliate_id: string | null;
  affiliate_code: string | null;
  order_id: string | null;
  payment_id: string | null;
  user_product_id: string | null;
  parent_event_id: string | null;
  depth: number;
  direction: "ancestor" | "descendant" | "self";
}

export interface CreateEventInput {
  action_type: EventType | string;
  dedup_key?: string;
  purchase_context_id?: string;
  parent_event_id?: string;
  session_id?: string;
  visitor_id?: string;
  user_id?: string;
  product_id?: string;
  product_slug?: string;
  product_name?: string;
  variant_id?: string;
  variant_slug?: string;
  variant_name?: string;
  affiliate_id?: string;
  affiliate_slug?: string;
  affiliate_code?: string;
  commission_type?: string;
  commission_value?: number;
  campaign_id?: string;
  campaign_slug?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  page_id?: string;
  page_slug?: string;
  component_id?: string;
  component_type?: string;
  base_price?: number;
  final_price?: number;
  currency?: string;
  order_id?: string;
  payment_id?: string;
  cart_item_id?: string;
  user_product_id?: string;
  ip_address?: string;
  user_agent?: string;
  referral_url?: string;
  click_id?: string;
  metadata?: Record<string, any>;
  context_snapshot?: Record<string, any>;
  expires_in_hours?: number;
}

function getApiUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  return `${url}/functions/v1/event-context`;
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
  };
}

export const eventContextClient = {
  // Store once: find_or_create with deduplication
  // Returns existing context if dedup_key matches, else creates new
  async findOrCreate(input: CreateEventInput): Promise<EventContextRow> {
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create event context (${response.status})`);
    }

    return response.json();
  },

  // Retrieve a single event context by ID
  async get(eventId: string): Promise<EventContextRow> {
    const response = await fetch(`${getApiUrl()}/${eventId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to retrieve event context (${response.status})`);
    }

    return response.json();
  },

  // Trace the full lineage chain: ancestors + descendants + self
  async getChain(
    eventId: string,
    direction: "ancestors" | "descendants" | "both" = "both"
  ): Promise<EventChainEntry[]> {
    const response = await fetch(
      `${getApiUrl()}/${eventId}/chain?direction=${direction}`,
      { method: "GET", headers: getHeaders() }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to retrieve chain (${response.status})`);
    }

    return response.json();
  },

  // Link a parent event to a child event (establish lineage)
  async link(
    parentEventId: string,
    childEventId: string,
    linkType: string = "led_to"
  ): Promise<void> {
    const response = await fetch(`${getApiUrl()}/link`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        parent_event_id: parentEventId,
        child_event_id: childEventId,
        link_type: linkType,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to link events (${response.status})`);
    }
  },

  // Mark an event context as consumed by a downstream module
  async consume(
    eventId: string,
    options?: {
      order_id?: string;
      payment_id?: string;
      user_product_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const response = await fetch(`${getApiUrl()}/${eventId}/consume`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to consume event (${response.status})`);
    }
  },

  // Convenience: track a product purchase click (the start of the funnel)
  async trackPurchaseClick(input: Omit<CreateEventInput, "action_type">): Promise<EventContextRow> {
    return this.findOrCreate({ ...input, action_type: "product_purchase_click" });
  },

  // Convenience: track add to cart
  async trackAddToCart(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "add_to_cart",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track checkout open
  async trackCheckoutOpen(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "checkout_open",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track order created
  async trackOrderCreated(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "order_created",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track payment pending
  async trackPaymentPending(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "payment_pending",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track payment success
  async trackPaymentSuccess(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "payment_success",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track affiliate conversion
  async trackAffiliateConversion(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "affiliate_conversion",
      parent_event_id: parentEventId,
    });
  },

  // Convenience: track membership activated
  async trackMembershipActivated(
    input: Omit<CreateEventInput, "action_type">,
    parentEventId?: string
  ): Promise<EventContextRow> {
    return this.findOrCreate({
      ...input,
      action_type: "membership_activated",
      parent_event_id: parentEventId,
    });
  },

  // Extract product context for modules that need to look up the product
  // Checkout Rule: UUID primary, slug fallback
  getProductLookup(row: EventContextRow): { product_id?: string; product_slug?: string } {
    if (row.product_id) return { product_id: row.product_id };
    if (row.product_slug) return { product_slug: row.product_slug };
    return {};
  },

  // Extract affiliate context — commission from the time the event was created
  // Affiliate Rule: never re-fetch, use the snapshot
  extractAffiliate(row: EventContextRow): {
    affiliate_id: string | null;
    affiliate_slug: string | null;
    affiliate_code: string | null;
    commission_type: string | null;
    commission_value: number | null;
  } {
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

  // Build the context_snapshot JSONB for an event
  buildSnapshot(input: CreateEventInput): Record<string, any> {
    return {
      product: {
        product_id: input.product_id || null,
        product_slug: input.product_slug || null,
        product_name: input.product_name || null,
      },
      variant: {
        variant_id: input.variant_id || null,
        variant_slug: input.variant_slug || null,
        variant_name: input.variant_name || null,
      },
      affiliate: {
        affiliate_id: input.affiliate_id || null,
        affiliate_slug: input.affiliate_slug || null,
        affiliate_code: input.affiliate_code || null,
        commission_type: input.commission_type || null,
        commission_value: input.commission_value || null,
      },
      campaign: {
        campaign_id: input.campaign_id || null,
        campaign_slug: input.campaign_slug || null,
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
      },
      page: {
        page_id: input.page_id || null,
        page_slug: input.page_slug || null,
        component_id: input.component_id || null,
        component_type: input.component_type || null,
      },
      pricing: {
        base_price: input.base_price || null,
        final_price: input.final_price || null,
        currency: input.currency || "USD",
      },
      tracking: {
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null,
        referral_url: input.referral_url || null,
        click_id: input.click_id || null,
      },
      session: {
        session_id: input.session_id || null,
        visitor_id: input.visitor_id || null,
        user_id: input.user_id || null,
      },
      created_at: new Date().toISOString(),
    };
  },
};
