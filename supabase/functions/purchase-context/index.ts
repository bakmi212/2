import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PurchaseContextInput {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/purchase-context", "");

  try {
    // GET /:id — retrieve a purchase context by ID
    if (req.method === "GET" && path.startsWith("/") && path.length > 1) {
      const contextId = path.slice(1);
      const { data, error } = await supabase.rpc("get_full_purchase_context", {
        p_purchase_context_id: contextId,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return new Response(JSON.stringify({ error: "Purchase context not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const row = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify(row), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST / — create a new purchase context (called by Builder on purchase action)
    if (req.method === "POST") {
      const body: PurchaseContextInput = await req.json();

      if (!body.product_id && !body.product_slug) {
        return new Response(
          JSON.stringify({ error: "Either product_id or product_slug is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // STEP 1: Resolve product (CHECKOUT RULE — UUID primary, slug fallback)
      const { data: productRows, error: productError } = await supabase.rpc(
        "resolve_product_by_uuid_or_slug",
        {
          p_product_id: body.product_id || null,
          p_slug: body.product_slug || null,
        }
      );

      if (productError) {
        return new Response(JSON.stringify({ error: `Product lookup failed: ${productError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const product = productRows?.[0] || productRows;
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get category name for snapshot
      let categoryName: string | null = null;
      if (product.category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("name")
          .eq("id", product.category_id)
          .maybeSingle();
        categoryName = cat?.name || null;
      }

      // STEP 2: Resolve variant if provided
      let variantRow: any = null;
      if (body.variant_id || body.variant_slug) {
        let variantQuery = supabase.from("product_variants").select("*");
        if (body.variant_id) {
          variantQuery = variantQuery.eq("id", body.variant_id);
        } else if (body.variant_slug) {
          variantQuery = variantQuery.eq("slug", body.variant_slug);
        }
        const { data: vRow } = await variantQuery.eq("product_id", product.id).maybeSingle();
        variantRow = vRow;
      }

      // STEP 3: Resolve affiliate if provided
      let affiliateRow: any = null;
      if (body.affiliate_id || body.affiliate_slug || body.affiliate_code) {
        let affQuery = supabase.from("affiliates").select("id, referral_code, slug, username, commission_type, commission_rate");
        if (body.affiliate_id) {
          affQuery = affQuery.eq("id", body.affiliate_id);
        } else if (body.affiliate_slug) {
          affQuery = affQuery.eq("slug", body.affiliate_slug);
        } else if (body.affiliate_code) {
          affQuery = affQuery.eq("referral_code", body.affiliate_code);
        }
        const { data: aRow } = await affQuery.maybeSingle();
        affiliateRow = aRow;
      }

      // STEP 4: Resolve campaign if provided
      let campaignRow: any = null;
      if (body.campaign_id || body.campaign_slug) {
        let campQuery = supabase.from("campaigns").select("*");
        if (body.campaign_id) {
          campQuery = campQuery.eq("id", body.campaign_id);
        } else {
          campQuery = campQuery.eq("slug", body.campaign_slug);
        }
        const { data: cRow } = await campQuery.maybeSingle();
        campaignRow = cRow;
      }

      // STEP 5: Build the full context snapshot JSONB
      const basePrice = variantRow?.price || product.price;
      const finalPrice = basePrice;
      const salePrice = product.compare_price || null;

      const snapshot = {
        product: {
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name,
          product_type: product.license_type || "standard",
          product_category: categoryName,
        },
        variant: variantRow
          ? {
              variant_id: variantRow.id,
              variant_slug: variantRow.slug || null,
              variant_name: variantRow.name,
              variant_type: variantRow.variant_type,
            }
          : { variant_id: null, variant_slug: null, variant_name: null, variant_type: null },
        pricing: {
          base_price: basePrice,
          sale_price: salePrice,
          final_price: finalPrice,
          currency: "USD",
        },
        access: {
          duration_days: variantRow?.duration_days || variantRow?.access_duration_days || product.custom_license_days || null,
          device_limit: variantRow?.device_limit || product.license_limit || null,
          access_type: product.license_type || (product.enable_license ? "limited" : "permanent"),
        },
        affiliate: affiliateRow
          ? {
              affiliate_id: affiliateRow.id,
              affiliate_slug: affiliateRow.slug || affiliateRow.username || null,
              affiliate_code: affiliateRow.referral_code,
              commission_type: affiliateRow.commission_type || "percentage",
              commission_value: affiliateRow.commission_rate || 0,
            }
          : {
              affiliate_id: body.affiliate_id || null,
              affiliate_slug: body.affiliate_slug || null,
              affiliate_code: body.affiliate_code || null,
              commission_type: null,
              commission_value: null,
            },
        campaign: campaignRow
          ? {
              campaign_id: campaignRow.id,
              campaign_slug: campaignRow.slug,
              utm_source: body.utm_source || campaignRow.utm_source || null,
              utm_medium: body.utm_medium || campaignRow.utm_medium || null,
              utm_campaign: body.utm_campaign || campaignRow.utm_campaign || null,
            }
          : {
              campaign_id: body.campaign_id || null,
              campaign_slug: body.campaign_slug || null,
              utm_source: body.utm_source || null,
              utm_medium: body.utm_medium || null,
              utm_campaign: body.utm_campaign || null,
            },
        page: {
          page_id: body.page_id || null,
          page_slug: body.page_slug || null,
          component_id: body.component_id || null,
          component_type: body.component_type || null,
          action_type: body.action_type || null,
        },
        purchase: {
          created_at: new Date().toISOString(),
          session_id: body.session_id || null,
          visitor_id: body.visitor_id || null,
          user_id: body.user_id || null,
        },
      };

      // STEP 6: Insert the purchase context
      const insertRow = {
        session_id: body.session_id || null,
        visitor_id: body.visitor_id || null,
        user_id: body.user_id || null,
        status: "pending",
        expires_at: body.expires_in_hours
          ? new Date(Date.now() + body.expires_in_hours * 3600000).toISOString()
          : null,
        // Product
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        product_type: product.license_type || "standard",
        product_category: categoryName,
        // Variant
        variant_id: variantRow?.id || null,
        variant_slug: variantRow?.slug || null,
        variant_name: variantRow?.name || null,
        variant_type: variantRow?.variant_type || null,
        // Pricing
        base_price: basePrice,
        sale_price: salePrice,
        final_price: finalPrice,
        currency: "USD",
        // Access
        duration_days: snapshot.access.duration_days,
        device_limit: snapshot.access.device_limit,
        access_type: snapshot.access.access_type,
        // Affiliate
        affiliate_id: affiliateRow?.id || null,
        affiliate_slug: affiliateRow?.slug || affiliateRow?.username || body.affiliate_slug || null,
        affiliate_code: affiliateRow?.referral_code || body.affiliate_code || null,
        commission_type: affiliateRow?.commission_type || null,
        commission_value: affiliateRow?.commission_rate || null,
        // Campaign
        campaign_id: campaignRow?.id || null,
        campaign_slug: campaignRow?.slug || body.campaign_slug || null,
        utm_source: snapshot.campaign.utm_source,
        utm_medium: snapshot.campaign.utm_medium,
        utm_campaign: snapshot.campaign.utm_campaign,
        // Page
        page_id: body.page_id || null,
        page_slug: body.page_slug || null,
        component_id: body.component_id || null,
        component_type: body.component_type || null,
        action_type: body.action_type || null,
        // Snapshot
        context_snapshot: snapshot,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("purchase_contexts")
        .insert(insertRow)
        .select()
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(inserted), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /:id — update status (e.g., mark as "consumed" when order is created)
    if (req.method === "PUT" && path.startsWith("/") && path.length > 1) {
      const contextId = path.slice(1);
      const body = await req.json();
      const { status } = body;

      const validStatuses = ["pending", "consumed", "expired", "cancelled"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("purchase_contexts")
        .update({ status })
        .eq("id", contextId)
        .select()
        .single();

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
