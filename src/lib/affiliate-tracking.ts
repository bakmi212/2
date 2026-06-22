import { SupabaseClient } from '@supabase/supabase-js'

export interface AffiliateContext {
  affiliate_id: string | null
  affiliate_code: string | null
  affiliate_name: string | null
  affiliate_email: string | null
  referral_source: string | null
  click_id: string | null
  referral_url: string | null
}

export interface CommissionInfo {
  id: string
  type: 'percentage' | 'fixed'
  rate: number
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
}

export interface ProductPurchasePayload {
  order_id: string
  product_name: string
  variant_name?: string
  price: number
  affiliate_id?: string | null
  affiliate_code?: string | null
  affiliate_name?: string | null
  commission_amount?: number
  commission_status?: string
}

// Generate unique click ID
export function generateClickId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`.toUpperCase()
}

// Parse referral parameters from URL
export function parseReferralParams(url: string): {
  referralCode: string | null
  clickId: string | null
  source: string
  fullUrl: string
} {
  try {
    const urlObj = new URL(url)
    const params = urlObj.searchParams

    const referralCode = params.get('ref') || params.get('referral') || params.get('affiliate')
    const clickId = params.get('click_id') || params.get('click')

    // Detect source from UTM or ref params
    let source = params.get('utm_source') || params.get('source') || 'direct'
    const utmMedium = params.get('utm_medium')

    if (referralCode && !utmMedium) {
      if (params.has('fbclid') || params.has('fb_source')) source = 'facebook'
      else if (url.includes('instagram.com')) source = 'instagram'
      else if (url.includes('tiktok.com')) source = 'tiktok'
      else if (params.has('gclid')) source = 'google'
      else if (params.has('twclid')) source = 'twitter'
      else if (params.has('li_ug')) source = 'linkedin'
    }

    return {
      referralCode,
      clickId,
      source,
      fullUrl: url
    }
  } catch {
    return { referralCode: null, clickId: null, source: 'direct', fullUrl: url }
  }
}

// Track affiliate click
export async function trackAffiliateClick(
  supabase: SupabaseClient,
  params: {
    referralCode: string
    clickId: string
    source: string
    url: string
    userAgent?: string
    ipAddress?: string
  }
): Promise<{ success: boolean; affiliateId?: string; error?: string }> {
  try {
    // Find affiliate by referral code
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, commission_rate, commission_type')
      .eq('referral_code', params.referralCode)
      .eq('status', 'active')
      .single()

    if (affError || !affiliate) {
      return { success: false, error: 'Affiliate not found or inactive' }
    }

    // Store click data
    const { error: clickError } = await supabase
      .from('affiliate_clicks')
      .insert({
        affiliate_id: affiliate.id,
        click_id: params.clickId,
        source: params.source,
        url: params.url,
        user_agent: params.userAgent || null,
        ip_address: params.ipAddress || null,
        converted: false
      })

    if (clickError) {
      console.error('Failed to track click:', clickError)
      // Still return success but log the error
    }

    // Store click ID in localStorage for later use
    if (typeof window !== 'undefined') {
      localStorage.setItem('affiliate_click_id', params.clickId)
      localStorage.setItem('affiliate_code', params.referralCode)
      localStorage.setItem('affiliate_source', params.source)
    }

    return { success: true, affiliateId: affiliate.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Get stored affiliate context from localStorage
export function getStoredAffiliateContext(): {
  clickId: string | null
  affiliateCode: string | null
  source: string | null
} {
  if (typeof window === 'undefined') {
    return { clickId: null, affiliateCode: null, source: null }
  }

  return {
    clickId: localStorage.getItem('affiliate_click_id'),
    affiliateCode: localStorage.getItem('affiliate_code'),
    source: localStorage.getItem('affiliate_source')
  }
}

// Clear stored affiliate context
export function clearAffiliateContext(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('affiliate_click_id')
    localStorage.removeItem('affiliate_code')
    localStorage.removeItem('affiliate_source')
  }
}

// Link order to affiliate
export async function linkOrderToAffiliate(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  affiliateCode: string,
  clickId: string | null,
  source: string,
  referralUrl: string
): Promise<{ success: boolean; affiliateId?: string; error?: string }> {
  try {
    // Find affiliate by code
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, commission_rate, commission_type, status')
      .eq('referral_code', affiliateCode)
      .single()

    if (affError || !affiliate) {
      return { success: false, error: 'Affiliate not found' }
    }

    // Don't allow self-referral
    if (affiliate.user_id === userId) {
      return { success: false, error: 'Self-referral not allowed' }
    }

    // Update order with affiliate info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        affiliate_id: affiliate.id,
        referral_code: affiliateCode,
        click_id: clickId,
        referral_source: source,
        referral_url: referralUrl
      })
      .eq('id', orderId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Create or update referral record
    const { error: refError } = await supabase
      .from('referrals')
      .upsert({
        affiliate_id: affiliate.id,
        referred_user_id: userId,
        referral_code: affiliateCode,
        click_id: clickId,
        source: source,
        url: referralUrl,
        status: 'pending'
      }, {
        onConflict: 'affiliate_id,referred_user_id'
      })

    // Mark click as converted if click_id exists
    if (clickId) {
      await supabase
        .from('affiliate_clicks')
        .update({
          converted: true,
          order_id: orderId
        })
        .eq('click_id', clickId)
    }

    return { success: true, affiliateId: affiliate.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Build product purchase payload with affiliate context
export async function buildPurchasePayload(
  supabase: SupabaseClient,
  orderId: string
): Promise<ProductPurchasePayload | null> {
  try {
    // Get order with affiliate info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        affiliate_id,
        referral_code,
        commission_amount,
        commission_status,
        order_items(
          product_id,
          price,
          quantity,
          product:products(id, name)
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) return null

    const payload: ProductPurchasePayload = {
      order_id: order.order_number,
      product_name: order.order_items?.[0]?.product?.name || 'Product',
      price: order.total_amount,
      affiliate_id: order.affiliate_id,
      affiliate_code: order.referral_code,
      commission_amount: order.commission_amount,
      commission_status: order.commission_status
    }

    // Get affiliate details if exists
    if (order.affiliate_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select(`
          id,
          referral_code,
          user_id,
          profiles(full_name, email)
        `)
        .eq('id', order.affiliate_id)
        .single()

      if (affiliate) {
        payload.affiliate_name = affiliate.profiles?.full_name || null
      }
    }

    return payload
  } catch (err) {
    console.error('Error building purchase payload:', err)
    return null
  }
}

// Get affiliate info for display
export async function getAffiliateInfo(
  supabase: SupabaseClient,
  affiliateId: string
): Promise<{
  id: string
  code: string
  name: string | null
  email: string | null
} | null> {
  try {
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select(`
        id,
        referral_code,
        user_id,
        profiles(full_name, email)
      `)
      .eq('id', affiliateId)
      .single()

    if (error || !affiliate) return null

    return {
      id: affiliate.id,
      code: affiliate.referral_code,
      name: affiliate.profiles?.full_name || null,
      email: affiliate.profiles?.email || null
    }
  } catch {
    return null
  }
}

// Get commission info for order
export async function getOrderCommission(
  supabase: SupabaseClient,
  orderId: string
): Promise<CommissionInfo | null> {
  try {
    const { data: commission, error } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error || !commission) return null

    return {
      id: commission.id,
      type: commission.commission_type,
      rate: commission.commission_rate,
      amount: commission.amount,
      status: commission.status
    }
  } catch {
    return null
  }
}

// Variable replacement for templates
export interface TemplateVariables {
  order: Record<string, any>
  product: Record<string, any>
  variant: Record<string, any>
  customer: Record<string, any>
  license: Record<string, any>
  download: Record<string, any>
  affiliate: Record<string, any>
  referral: Record<string, any>
  commission: Record<string, any>
}

export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template

  const replacements: Record<string, any> = {
    // Order variables
    'order.id': variables.order?.id,
    'order.code': variables.order?.order_number,
    'order.status': variables.order?.status,
    'order.total': variables.order?.total_amount,

    // Product variables
    'product.id': variables.product?.id,
    'product.name': variables.product?.name,
    'product.price': variables.product?.price,

    // Variant variables
    'variant.id': variables.variant?.id,
    'variant.name': variables.variant?.name,
    'variant.price': variables.variant?.price,

    // Customer variables
    'customer.id': variables.customer?.id,
    'customer.name': variables.customer?.full_name || variables.order?.billing_name,
    'customer.email': variables.customer?.email || variables.order?.billing_email,

    // License variables
    'license.key': variables.license?.license_key,
    'license.status': variables.license?.status,

    // Download variables
    'download.url': variables.download?.url,

    // Affiliate variables
    'affiliate.id': variables.affiliate?.id,
    'affiliate.code': variables.affiliate?.code,
    'affiliate.name': variables.affiliate?.name,
    'affiliate.email': variables.affiliate?.email,

    // Referral variables
    'referral.source': variables.referral?.source,
    'referral.click_id': variables.referral?.click_id,
    'referral.url': variables.referral?.url,

    // Commission variables
    'commission.id': variables.commission?.id,
    'commission.type': variables.commission?.type,
    'commission.rate': variables.commission?.rate,
    'commission.amount': variables.commission?.amount,
    'commission.status': variables.commission?.status
  }

  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(replacements)) {
    const pattern = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(pattern, String(value ?? ''))
  }

  return result
}

// Build context for action execution
export async function buildAffiliateExecutionContext(
  supabase: SupabaseClient,
  orderId: string
): Promise<{
  affiliate: Record<string, any>
  referral: Record<string, any>
  commission: Record<string, any>
}> {
  const context = {
    affiliate: {},
    referral: {},
    commission: {}
  }

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) return context

    // Get affiliate info
    if (order.affiliate_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select(`
          id,
          user_id,
          referral_code,
          commission_type,
          commission_rate,
          profiles(full_name, email)
        `)
        .eq('id', order.affiliate_id)
        .single()

      if (affiliate) {
        context.affiliate = {
          id: affiliate.id,
          code: affiliate.referral_code,
          name: affiliate.profiles?.full_name,
          email: affiliate.profiles?.email
        }
      }
    }

    // Get referral info
    if (order.referral_code) {
      context.referral = {
        source: order.referral_source,
        click_id: order.click_id,
        url: order.referral_url
      }
    }

    // Get commission info
    const { data: commission } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (commission) {
      context.commission = {
        id: commission.id,
        type: commission.commission_type,
        rate: commission.commission_rate,
        amount: commission.amount,
        status: commission.status
      }
    }

    return context
  } catch {
    return context
  }
}
