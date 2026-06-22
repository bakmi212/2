'use client'

import { createBrowserClient } from '@/lib/supabase/client'

/**
 * SINGLE SOURCE OF TRUTH: SUPABASE
 *
 * All data MUST be loaded from Supabase.
 * NO hardcoded product data.
 * NO mock data.
 * NO fallback static data.
 *
 * Flow:
 * 1. checkout receives: product_id, variant_id (from URL or component_actions)
 * 2. Load fresh data from Supabase
 * 3. Create order with product_id, variant_id references
 * 4. Payment success: create user_products with access period
 */

// ============================================
// TYPES
// ============================================

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  thumbnail: string | null
  image_url: string | null
  price: number
  status: string
  is_active: boolean
  variants_enabled: boolean
  enable_license: boolean
  license_enabled: boolean
  download_enabled: boolean
  license_duration: string | null
  custom_license_days: number | null
}

export interface ProductVariant {
  id: string
  product_id: string
  variant_type: string
  name: string
  variant_name: string // alias for display
  price: number
  description: string | null
  duration_days: number | null
  device_limit: number | null
  is_active: boolean
  is_default: boolean
}

export interface PurchaseContext {
  // Core IDs (from URL or component_actions)
  product_id: string
  variant_id: string | null

  // Loaded fresh from Supabase
  product: Product | null
  variant: ProductVariant | null

  // Calculated values
  price: number
  quantity: number
  total: number

  // User
  user_id: string | null

  // Validation
  validated: boolean
  error: string | null
}

export interface OrderResult {
  success: boolean
  order?: {
    order_id: string
    order_number: string
    product_id: string
    variant_id: string | null
    total: number
  }
  error?: string
}

// ============================================
// LOAD FROM SUPABASE (SINGLE SOURCE OF TRUTH)
// ============================================

/**
 * Load product from Supabase by ID or slug
 */
export async function loadProduct(
  supabase: ReturnType<typeof createBrowserClient>,
  productRef: string // ID or slug
): Promise<Product | null> {
  console.log('[loadProduct] ========== START ==========')
  console.log('[loadProduct] Product Param:', productRef)

  // Detect if productRef is UUID or slug
  const isUUID = isValidUUID(productRef)
  console.log('[loadProduct] Detected Type:', isUUID ? 'UUID' : 'slug')

  let product: Product | null = null

  if (isUUID) {
    // Query by UUID
    console.log('[loadProduct] Querying by UUID:', productRef)
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, short_description,
        image_url, price, status, is_active, variants_enabled,
        enable_license, license_enabled, license_duration,
        custom_license_days, download_enabled
      `)
      .eq('id', productRef)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('[loadProduct] UUID query error:', error.message)
    }
    product = data
  } else {
    // Query by slug
    console.log('[loadProduct] Querying by slug:', productRef)
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, short_description,
        image_url, price, status, is_active, variants_enabled,
        enable_license, license_enabled, license_duration,
        custom_license_days, download_enabled
      `)
      .eq('slug', productRef)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('[loadProduct] Slug query error:', error.message)
    }
    product = data
  }

  if (!product) {
    console.error('[loadProduct] Product not found for:', productRef)
    return null
  }

  console.log('[loadProduct] Loaded Product:', JSON.stringify({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price
  }))
  console.log('[loadProduct] ========== END ==========')

  return product
}

/**
 * Load variant from Supabase
 */
export async function loadVariant(
  supabase: ReturnType<typeof createBrowserClient>,
  variantId: string,
  productId: string
): Promise<ProductVariant | null> {
  console.log('[loadVariant] Loading variant:', variantId, 'for product:', productId)

  const { data: variant, error } = await supabase
    .from('product_variants')
    .select(`
      id, product_id, variant_type, name, price, description,
      duration_days, device_limit, is_active, is_default
    `)
    .eq('id', variantId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .single()

  if (error || !variant) {
    console.error('[loadVariant] Variant not found or mismatch:', error)
    return null
  }

  console.log('[loadVariant] Loaded:', variant.name, '| Price:', variant.price, '| Duration:', variant.duration_days)
  return variant
}

/**
 * Get default or first variant for a product with variants enabled
 */
export async function getDefaultVariant(
  supabase: ReturnType<typeof createBrowserClient>,
  productId: string
): Promise<ProductVariant | null> {
  console.log('[getDefaultVariant] Loading default variant for:', productId)

  // Try to get the is_default variant
  let { data: variant } = await supabase
    .from('product_variants')
    .select(`
      id, product_id, variant_type, name, price, description,
      duration_days, device_limit, is_active, is_default
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (!variant) {
    // Get first active variant
    const { data: first } = await supabase
      .from('product_variants')
      .select(`
        id, product_id, variant_type, name, price, description,
        duration_days, device_limit, is_active, is_default
      `)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .single()

    variant = first
  }

  if (variant) {
    console.log('[getDefaultVariant] Found:', variant.name, '| Price:', variant.price)
  } else {
    console.warn('[getDefaultVariant] No variants found')
  }

  return variant
}

// ============================================
// CREATE PURCHASE CONTEXT
// ============================================

/**
 * Create Purchase Context from IDs only
 * ALL data loaded fresh from Supabase
 */
export async function createPurchaseContext(
  supabase: ReturnType<typeof createBrowserClient>,
  params: {
    productId: string
    variantId?: string | null
  }
): Promise<PurchaseContext> {
  console.log('[createPurchaseContext] ========== START ==========')
  console.log('[createPurchaseContext] Product Param:', params.productId)
  console.log('[createPurchaseContext] Variant Param:', params.variantId)

  const emptyContext: PurchaseContext = {
    product_id: '',
    variant_id: null,
    product: null,
    variant: null,
    price: 0,
    quantity: 1,
    total: 0,
    user_id: null,
    validated: false,
    error: null
  }

  // Validate product_id exists
  if (!params.productId) {
    console.error('[createPurchaseContext] Missing product parameter')
    return {
      ...emptyContext,
      error: 'Product ID is required'
    }
  }

  // Detect parameter type
  const isUUID = isValidUUID(params.productId)
  console.log('[createPurchaseContext] Detected Product Param Type:', isUUID ? 'UUID' : 'slug')

  // 1. Load product from Supabase (handles both UUID and slug)
  console.log('[createPurchaseContext] Loading product...')
  const product = await loadProduct(supabase, params.productId)

  if (!product) {
    console.error('[createPurchaseContext] Product not found for:', params.productId)
    return {
      ...emptyContext,
      product_id: params.productId,
      error: 'Product not found'
    }
  }

  console.log('[createPurchaseContext] Product loaded:', JSON.stringify({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price
  }))

  // 2. Determine variant
  let variant: ProductVariant | null = null

  if (params.variantId) {
    // Load specific variant - validate it belongs to this product
    console.log('[createPurchaseContext] Loading variant:', params.variantId)
    variant = await loadVariant(supabase, params.variantId, product.id)

    if (!variant) {
      console.error('[createPurchaseContext] Variant not found or does not belong to product:', product.id)
      return {
        ...emptyContext,
        product_id: product.id,
        product,
        error: 'Variant not found or does not belong to this product'
      }
    }
    console.log('[createPurchaseContext] Variant loaded:', JSON.stringify({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      product_id: variant.product_id
    }))
  } else if (product.variants_enabled) {
    // Get default variant
    console.log('[createPurchaseContext] Product has variants enabled, loading default variant')
    variant = await getDefaultVariant(supabase, product.id)

    if (!variant) {
      console.error('[createPurchaseContext] Product requires variant but none found')
      return {
        ...emptyContext,
        product_id: product.id,
        product,
        error: 'Product requires a variant but none available'
      }
    }
    console.log('[createPurchaseContext] Default variant loaded:', variant.name)
  }

  // 3. Calculate price (from variant if exists, else from product)
  const finalPrice = variant ? variant.price : product.price

  console.log('[createPurchaseContext] Final price:', finalPrice)
  console.log('[createPurchaseContext] Validated: TRUE')

  // 4. Get current user
  const { data: { user } } = await supabase.auth.getUser()

  console.log('[createPurchaseContext] ========== END ==========')

  return {
    product_id: product.id,
    variant_id: variant?.id || null,
    product,
    variant,
    price: finalPrice,
    quantity: 1,
    total: finalPrice,
    user_id: user?.id || null,
    validated: true,
    error: null
  }
}

// ============================================
// CREATE ORDER
// ============================================

/**
 * Create order from Purchase Context
 * Stores product_id and variant_id in orders AND order_items
 */
export async function createOrderFromContext(
  supabase: ReturnType<typeof createBrowserClient>,
  context: PurchaseContext,
  billingData: {
    name: string
    email: string
    phone: string
    notes?: string
  },
  paymentData: {
    payment_method: string
    payment_account_id: string
  }
): Promise<OrderResult> {
  console.log('[createOrderFromContext] Start')
  console.log('[createOrderFromContext] Product ID:', context.product_id)
  console.log('[createOrderFromContext] Variant ID:', context.variant_id)
  console.log('[createOrderFromContext] Price:', context.price)

  // Validate
  if (!context.validated || !context.product) {
    console.error('[createOrderFromContext] Invalid context')
    return { success: false, error: 'Invalid purchase context' }
  }

  if (context.price <= 0) {
    console.error('[createOrderFromContext] Invalid price:', context.price)
    return { success: false, error: 'Invalid price' }
  }

  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[createOrderFromContext] User not authenticated')
    return { success: false, error: 'User not authenticated' }
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  console.log('[createOrderFromContext] Creating order:', orderNumber)

  // Create order with product_id and variant_id
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      product_id: context.product_id,
      variant_id: context.variant_id,
      total_amount: context.total,
      status: 'pending',
      payment_status: 'pending_payment',
      payment_method: paymentData.payment_method,
      payment_account_id: paymentData.payment_account_id,
      billing_name: billingData.name,
      billing_email: billingData.email,
      billing_phone: billingData.phone,
      notes: billingData.notes || null
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('[createOrderFromContext] Order error:', orderError)
    return { success: false, error: 'Failed to create order' }
  }

  console.log('[createOrderFromContext] Order created:', order.id)

  // Create order_items WITH variant_id
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: context.product_id,
      variant_id: context.variant_id,
      quantity: context.quantity,
      price: context.price
    })

  if (itemsError) {
    console.error('[createOrderFromContext] Order items error:', itemsError)
    // Continue, order is created
  } else {
    console.log('[createOrderFromContext] Order items created')
  }

  // Create timeline
  await supabase.from('order_timelines').insert({
    order_id: order.id,
    status: 'order_created',
    description: 'Order created',
    created_by: user.id
  })

  console.log('[createOrderFromContext] Success!')

  return {
    success: true,
    order: {
      order_id: order.id,
      order_number: orderNumber,
      product_id: context.product_id,
      variant_id: context.variant_id,
      total: context.total
    }
  }
}

// ============================================
// PROCESS PAYMENT SUCCESS
// ============================================

/**
 * Process order after payment confirmed
 * Creates user_products with access period from variant.duration_days
 */
export async function processOrderOnPaymentPaid(
  supabase: ReturnType<typeof createBrowserClient>,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[processOrderOnPaymentPaid] Processing order:', orderId)

  // Load order with product and variant
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id, order_number, user_id, product_id, variant_id,
      total_amount, payment_status
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('[processOrderOnPaymentPaid] Order not found:', orderError)
    return { success: false, error: 'Order not found' }
  }

  if (order.payment_status !== 'paid') {
    console.error('[processOrderOnPaymentPaid] Order not paid:', order.payment_status)
    return { success: false, error: 'Order not paid' }
  }

  console.log('[processOrderOnPaymentPaid] Order:', order.order_number)
  console.log('[processOrderOnPaymentPaid] Product ID:', order.product_id)
  console.log('[processOrderOnPaymentPaid] Variant ID:', order.variant_id)

  // Check if user_products already exists
  const { data: existingAccess } = await supabase
    .from('user_products')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existingAccess) {
    console.log('[processOrderOnPaymentPaid] Access already exists')
    return { success: true }
  }

  // Load variant to get duration_days (if variant_id exists)
  let durationDays: number | null = null
  let deviceLimit: number | null = null

  if (order.variant_id) {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('duration_days, device_limit')
      .eq('id', order.variant_id)
      .single()

    if (variant) {
      durationDays = variant.duration_days
      deviceLimit = variant.device_limit
      console.log('[processOrderOnPaymentPaid] Variant duration:', durationDays, 'days')
    }
  }

  // Calculate access period
  const accessStart = new Date()
  let accessEnd: Date | null = null

  if (durationDays && durationDays > 0) {
    accessEnd = new Date(accessStart.getTime() + durationDays * 24 * 60 * 60 * 1000)
    console.log('[processOrderOnPaymentPaid] Access ends:', accessEnd.toISOString())
  } else {
    console.log('[processOrderOnPaymentPaid] Lifetime access (no expiry)')
  }

  // Create user_products record
  console.log('[processOrderOnPaymentPaid] Creating user_products...')

  const { error: userProductError } = await supabase
    .from('user_products')
    .insert({
      user_id: order.user_id,
      product_id: order.product_id,
      variant_id: order.variant_id,
      order_id: order.id,
      purchased_at: accessStart.toISOString(),
      access_start: accessStart.toISOString(),
      access_end: accessEnd?.toISOString() || null
    })

  if (userProductError) {
    console.error('[processOrderOnPaymentPaid] User products error:', userProductError)
    // Non-fatal, continue
  } else {
    console.log('[processOrderOnPaymentPaid] User products created')
  }

  // Create license if enabled
  const { data: product } = await supabase
    .from('products')
    .select('enable_license, license_enabled, name')
    .eq('id', order.product_id)
    .single()

  if (product && (product.enable_license || product.license_enabled)) {
    const licenseKey = `LICENSE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const { error: licenseError } = await supabase
      .from('user_licenses')
      .insert({
        user_id: order.user_id,
        product_id: order.product_id,
        license_key: licenseKey,
        status: 'active',
        expires_at: accessEnd?.toISOString() || null
      })

    if (licenseError) {
      console.error('[processOrderOnPaymentPaid] License error:', licenseError)
    } else {
      console.log('[processOrderOnPaymentPaid] License created:', licenseKey)

      await supabase.from('order_timelines').insert({
        order_id: order.id,
        status: 'license_generated',
        description: `License generated: ${licenseKey}`,
        created_by: order.user_id
      })
    }
  }

  // Create timeline
  await supabase.from('order_timelines').insert({
    order_id: order.id,
    status: 'order_completed',
    description: 'Order processing completed',
    created_by: order.user_id
  })

  console.log('[processOrderOnPaymentPaid] Success!')

  return { success: true }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  console.log('[isValidUUID] Checking:', value, 'Result:', UUID_REGEX.test(value))
  return UUID_REGEX.test(value)
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function createEmptyContext(): PurchaseContext {
  return {
    product_id: '',
    variant_id: null,
    product: null,
    variant: null,
    price: 0,
    quantity: 1,
    total: 0,
    user_id: null,
    validated: false,
    error: null
  }
}
