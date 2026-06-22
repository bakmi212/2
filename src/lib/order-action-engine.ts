import { SupabaseClient } from '@supabase/supabase-js'
import { buildAffiliateExecutionContext, replaceTemplateVariables } from './affiliate-tracking'

export type OrderActionType =
  | 'product_purchase'
  | 'create_license'
  | 'create_download_access'
  | 'send_notification'
  | 'webhook'
  | 'api_request'
  | 'trigger_component'
  | 'send_email'

export interface OrderActionDefinition {
  id: string
  name: string
  type: OrderActionType
  sort_order: number
  enable_tracking: boolean
  save_execution_log: boolean
  retry_on_failure: boolean
  retry_limit: number
  timeout_seconds: number
  config: Record<string, any>
  is_active: boolean
}

export interface ExecutionContext {
  orderId: string
  userId: string
  productId: string
  product: Record<string, any>
  order: Record<string, any>
  licenseTemplate: Record<string, any> | null
  // Affiliate context
  affiliate: {
    id: string | null
    code: string | null
    name: string | null
    email: string | null
  } | null
  referral: {
    source: string | null
    click_id: string | null
    url: string | null
  } | null
  commission: {
    id: string | null
    type: string | null
    rate: number | null
    amount: number | null
    status: string | null
  } | null
}

function generateExecutionCode(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `EXEC-${dateStr}-${rand}`
}

function generateLicenseKey(pattern: string, ctx: ExecutionContext): string {
  const random = () => Math.random().toString(36).substr(2, 8).toUpperCase()
  const now = new Date()
  return pattern
    .replace(/{RANDOM}/g, random())
    .replace(/{YYYY}/g, String(now.getFullYear()))
    .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
    .replace(/{DD}/g, String(now.getDate()).padStart(2, '0'))
    .replace(/{ORDER_ID}/g, ctx.orderId.slice(0, 8).toUpperCase())
    .replace(/{USER_ID}/g, ctx.userId.slice(0, 8).toUpperCase())
}

async function executeAction(
  supabase: SupabaseClient,
  action: OrderActionDefinition,
  ctx: ExecutionContext
): Promise<{ success: boolean; output?: Record<string, any>; error?: string }> {
  try {
    switch (action.type) {
      case 'product_purchase':
        return { success: true, output: { message: 'Order recorded', order_id: ctx.orderId } }

      case 'create_license': {
        const { product } = ctx
        if (!product.license_enabled) return { success: true, output: { skipped: true, reason: 'license_enabled=false' } }

        const { data: existing } = await supabase.from('licenses')
          .select('id').eq('order_id', ctx.orderId).eq('product_id', ctx.productId).limit(1)
        if (existing && existing.length > 0) return { success: true, output: { skipped: true, reason: 'already_exists', license_id: existing[0].id } }

        const template = ctx.licenseTemplate
        const pattern = template?.pattern || 'LICENSE-{RANDOM}'
        const licKey = generateLicenseKey(pattern, ctx)

        let expiresAt: string | null = null
        if (template?.validity_days) {
          const d = new Date(); d.setDate(d.getDate() + template.validity_days); expiresAt = d.toISOString()
        } else if (product.license_duration === 'days' && product.custom_license_days) {
          const d = new Date(); d.setDate(d.getDate() + product.custom_license_days); expiresAt = d.toISOString()
        } else if (product.license_duration === '1_year') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1); expiresAt = d.toISOString()
        }

        const { data: lic, error } = await supabase.from('licenses').insert({
          user_id: ctx.userId,
          product_id: ctx.productId,
          order_id: ctx.orderId,
          template_id: template?.id || null,
          license_key: licKey,
          status: 'active',
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          purchase_date: new Date().toISOString(),
        }).select('id').single()

        if (error) return { success: false, error: error.message }
        return { success: true, output: { license_id: lic.id, license_key: licKey, expires_at: expiresAt } }
      }

      case 'create_download_access': {
        const { product } = ctx
        if (!product.download_type) return { success: true, output: { skipped: true, reason: 'no_download_type' } }

        const { error } = await supabase.from('user_downloads').upsert({
          user_id: ctx.userId,
          product_id: ctx.productId,
          order_id: ctx.orderId,
          download_count: 0,
          is_disabled: false,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,product_id' })

        if (error) return { success: false, error: error.message }
        return { success: true, output: { product_id: ctx.productId, download_type: product.download_type } }
      }

      case 'send_notification': {
        const { data: profile } = await supabase.from('profiles')
          .select('id').eq('user_id', ctx.userId).single()
        if (!profile) return { success: false, error: 'Profile not found' }

        await supabase.from('notifications').insert({
          user_id: ctx.userId,
          title: action.config.title || 'Order Confirmed',
          message: action.config.message || `Your order has been confirmed and is being processed.`,
          type: 'order',
          read: false,
        })
        return { success: true, output: { notification_sent: true } }
      }

      case 'webhook': {
        const { url, method = 'POST', headers = {} } = action.config
        if (!url) return { success: false, error: 'Webhook URL not configured' }

        // Build payload with affiliate context
        const payload = {
          order_id: ctx.orderId,
          user_id: ctx.userId,
          product_id: ctx.productId,
          event: 'order.paid',
          // Affiliate context
          affiliate_id: ctx.affiliate?.id || null,
          affiliate_code: ctx.affiliate?.code || null,
          affiliate_name: ctx.affiliate?.name || null,
          referral_source: ctx.referral?.source || null,
          referral_click_id: ctx.referral?.click_id || null,
          commission_amount: ctx.commission?.amount || null,
          commission_status: ctx.commission?.status || null
        }
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(payload),
        })
        if (!res.ok) return { success: false, error: `Webhook failed: HTTP ${res.status}` }
        return { success: true, output: { status: res.status, url } }
      }

      case 'api_request': {
        const { url, method = 'GET', headers = {}, body } = action.config
        if (!url) return { success: false, error: 'API URL not configured' }

        // Build API request with affiliate context
        const requestBody = body ? {
          ...body,
          affiliate_id: ctx.affiliate?.id || null,
          affiliate_code: ctx.affiliate?.code || null,
          commission_amount: ctx.commission?.amount || null
        } : undefined

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: requestBody ? JSON.stringify(requestBody) : undefined,
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) return { success: false, error: `API request failed: HTTP ${res.status}`, output: data }
        return { success: true, output: data || { status: res.status } }
      }

      case 'trigger_component':
      case 'send_email': {
        // Stub — in production these call edge functions / email providers
        return { success: true, output: { stubbed: true, type: action.type } }
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error' }
  }
}

// Built-in default actions derived from product configuration
function buildDefaultActions(product: Record<string, any>): OrderActionDefinition[] {
  const actions: OrderActionDefinition[] = []
  let sort = 0

  actions.push({
    id: 'builtin-purchase',
    name: 'Product Purchase',
    type: 'product_purchase',
    sort_order: sort++,
    enable_tracking: true,
    save_execution_log: true,
    retry_on_failure: false,
    retry_limit: 0,
    timeout_seconds: 10,
    config: {},
    is_active: true,
  })

  if (product.license_enabled) {
    actions.push({
      id: 'builtin-license',
      name: 'Generate License',
      type: 'create_license',
      sort_order: sort++,
      enable_tracking: true,
      save_execution_log: true,
      retry_on_failure: true,
      retry_limit: 3,
      timeout_seconds: 15,
      config: {},
      is_active: true,
    })
  }

  if (product.download_type) {
    actions.push({
      id: 'builtin-download',
      name: 'Create Download Access',
      type: 'create_download_access',
      sort_order: sort++,
      enable_tracking: true,
      save_execution_log: true,
      retry_on_failure: true,
      retry_limit: 2,
      timeout_seconds: 10,
      config: {},
      is_active: true,
    })
  }

  actions.push({
    id: 'builtin-notify',
    name: 'Send Notification',
    type: 'send_notification',
    sort_order: sort++,
    enable_tracking: true,
    save_execution_log: true,
    retry_on_failure: false,
    retry_limit: 1,
    timeout_seconds: 10,
    config: { title: 'Order Confirmed', message: 'Your payment has been confirmed. Thank you!' },
    is_active: true,
  })

  return actions
}

export async function runOrderActions(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ success: boolean; executions: { name: string; status: string }[] }> {
  // Fetch order + items + products
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, user_id, affiliate_id, referral_code, click_id, referral_source, referral_url, commission_status, order_items(product_id, product:products(id, name, license_enabled, download_type, download_file, download_url, license_duration, custom_license_days))')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return { success: false, executions: [] }

  const { data: templates } = await supabase.from('license_templates').select('*').eq('is_active', true).limit(1)
  const licenseTemplate = templates?.[0] || null

  // Build affiliate context
  const affiliateContext = await buildAffiliateExecutionContext(supabase, orderId)

  const results: { name: string; status: string }[] = []

  for (const item of (order.order_items as any[]) || []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product
    if (!product) continue

    // Get product-specific custom actions, fall back to default
    const { data: customActions } = await supabase
      .from('product_actions')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('sort_order')

    const actions: OrderActionDefinition[] =
      (customActions && customActions.length > 0)
        ? (customActions as OrderActionDefinition[])
        : buildDefaultActions(product)

    const ctx: ExecutionContext = {
      orderId,
      userId: order.user_id,
      productId: product.id,
      product,
      order,
      licenseTemplate,
      // Include affiliate context
      affiliate: affiliateContext.affiliate?.id ? affiliateContext.affiliate as any : null,
      referral: affiliateContext.referral?.source ? affiliateContext.referral as any : null,
      commission: affiliateContext.commission?.id ? affiliateContext.commission as any : null
    }

    for (const action of actions) {
      if (!action.is_active) continue
      const execCode = generateExecutionCode()
      const startedAt = new Date()

      let execId: string | null = null

      if (action.enable_tracking || action.save_execution_log) {
        const { data: execRow } = await supabase.from('action_executions').insert({
          execution_code: execCode,
          order_id: orderId,
          user_id: order.user_id,
          product_id: product.id,
          action_id: action.id.startsWith('builtin-') ? null : action.id,
          action_name: action.name,
          action_type: action.type,
          component_id: action.config?.component_id || null,
          status: 'running',
          started_at: startedAt.toISOString(),
        }).select('id').single()
        execId = execRow?.id || null
      }

      let result = await executeAction(supabase, action, ctx)
      let retries = 0

      while (!result.success && action.retry_on_failure && retries < (action.retry_limit || 1)) {
        retries++
        await new Promise(r => setTimeout(r, 500 * retries))
        result = await executeAction(supabase, action, ctx)
      }

      const completedAt = new Date()
      const duration = completedAt.getTime() - startedAt.getTime()
      const finalStatus = result.success ? 'success' : 'failed'

      if (execId && (action.enable_tracking || action.save_execution_log)) {
        await supabase.from('action_executions').update({
          status: finalStatus,
          completed_at: completedAt.toISOString(),
          duration_ms: duration,
          retry_count: retries,
          error_message: result.error || null,
          output_data: result.output || null,
        }).eq('id', execId)
      }

      results.push({ name: action.name, status: finalStatus })
    }
  }

  return { success: true, executions: results }
}
