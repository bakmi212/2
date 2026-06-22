import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventContextInput {
  action_type: string;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/event-context", "");

  try {
    // POST / — find_or_create event context (deduplication)
    if (req.method === "POST" && (path === "/" || path === "")) {
      const body: EventContextInput = await req.json();

      if (!body.action_type) {
        return new Response(
          JSON.stringify({ error: "action_type is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = body.expires_in_hours
        ? new Date(Date.now() + body.expires_in_hours * 3600000).toISOString()
        : null;

      const { data, error } = await supabase.rpc("find_or_create_event_context", {
        p_action_type: body.action_type,
        p_dedup_key: body.dedup_key || null,
        p_session_id: body.session_id || null,
        p_visitor_id: body.visitor_id || null,
        p_user_id: body.user_id || null,
        p_purchase_context_id: body.purchase_context_id || null,
        p_parent_event_id: body.parent_event_id || null,
        p_product_id: body.product_id || null,
        p_product_slug: body.product_slug || null,
        p_product_name: body.product_name || null,
        p_variant_id: body.variant_id || null,
        p_variant_slug: body.variant_slug || null,
        p_variant_name: body.variant_name || null,
        p_affiliate_id: body.affiliate_id || null,
        p_affiliate_slug: body.affiliate_slug || null,
        p_affiliate_code: body.affiliate_code || null,
        p_commission_type: body.commission_type || null,
        p_commission_value: body.commission_value || null,
        p_campaign_id: body.campaign_id || null,
        p_campaign_slug: body.campaign_slug || null,
        p_utm_source: body.utm_source || null,
        p_utm_medium: body.utm_medium || null,
        p_utm_campaign: body.utm_campaign || null,
        p_page_id: body.page_id || null,
        p_page_slug: body.page_slug || null,
        p_component_id: body.component_id || null,
        p_component_type: body.component_type || null,
        p_base_price: body.base_price || null,
        p_final_price: body.final_price || null,
        p_currency: body.currency || "USD",
        p_order_id: body.order_id || null,
        p_payment_id: body.payment_id || null,
        p_cart_item_id: body.cart_item_id || null,
        p_user_product_id: body.user_product_id || null,
        p_ip_address: body.ip_address || null,
        p_user_agent: body.user_agent || null,
        p_referral_url: body.referral_url || null,
        p_click_id: body.click_id || null,
        p_metadata: body.metadata || {},
        p_context_snapshot: body.context_snapshot || {},
        p_expires_at: expiresAt,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const row = Array.isArray(data) ? data[0] : data;
      const statusCode = row?.is_new ? 201 : 200;
      return new Response(JSON.stringify(row), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /:id — retrieve a single event context
    if (req.method === "GET" && path.startsWith("/") && path.length > 1) {
      const parts = path.slice(1).split("/");
      const eventId = parts[0];

      const { data, error } = await supabase
        .from("event_contexts")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ error: "Event context not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /:id/chain — get the full lineage chain for an event
    if (req.method === "GET" && path.includes("/chain")) {
      const parts = path.split("/");
      const eventId = parts[parts.length - 2];
      const direction = url.searchParams.get("direction") || "both";

      const { data, error } = await supabase.rpc("get_event_context_chain", {
        p_event_id: eventId,
        p_direction: direction,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /link — link a parent event to a child event
    if (req.method === "PUT" && path === "/link") {
      const body = await req.json();
      const { parent_event_id, child_event_id, link_type } = body;

      if (!parent_event_id || !child_event_id) {
        return new Response(
          JSON.stringify({ error: "parent_event_id and child_event_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase.rpc("link_event_contexts", {
        p_parent_id: parent_event_id,
        p_child_id: child_event_id,
        p_link_type: link_type || "led_to",
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ linked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /:id/consume — mark an event context as consumed
    if (req.method === "PUT" && path.includes("/consume")) {
      const parts = path.split("/");
      const eventId = parts[1];
      const body = await req.json();

      const { error } = await supabase.rpc("consume_event_context", {
        p_event_id: eventId,
        p_order_id: body.order_id || null,
        p_payment_id: body.payment_id || null,
        p_user_product_id: body.user_product_id || null,
        p_metadata: body.metadata || null,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ consumed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
