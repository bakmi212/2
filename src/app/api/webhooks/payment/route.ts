import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet: { name: string; value: string; options?: any }[]) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
  )

  const body = await request.json()
  const { order_id, status, transaction_id, payment_method, amount } = body

  if (!order_id) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })

  // Find the order with affiliate info
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(product_id, price, quantity),
      affiliate:affiliates(
        id,
        referral_code,
        commission_rate,
        commission_type,
        status,
        profiles(full_name, email)
      )
    `)
    .eq('id', order_id)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (status === 'success' || status === 'paid' || status === 'settlement') {
    // Update order status
    await supabase.from('orders').update({
      status: 'paid',
      payment_id: transaction_id,
      payment_method: payment_method || order.payment_method,
      updated_at: new Date().toISOString(),
    }).eq('id', order_id)

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: order.user_id,
      order_id: order.id,
      amount: amount || order.total_amount,
      payment_method: payment_method || order.payment_method,
      status: 'completed',
      transaction_id: transaction_id || `TXN-${Date.now()}`,
    })

    // Handle affiliate commission - will be handled by database trigger
    // But we also handle it here as a fallback and to update related tables
    if (order.affiliate_id && order.affiliate) {
      const affiliate = order.affiliate

      // Calculate commission
      let commission = 0
      const commissionRate = affiliate.commission_rate || 0.10
      const commissionType = affiliate.commission_type || 'percentage'

      if (commissionType === 'percentage') {
        commission = order.total_amount * commissionRate
      } else {
        commission = commissionRate
      }

      // Update order with commission
      await supabase.from('orders').update({
        commission_amount: commission,
        commission_status: 'pending'
      }).eq('id', order_id)

      // Create referral record if not exists
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('affiliate_id', order.affiliate_id)
        .eq('referred_user_id', order.user_id)
        .single()

      if (!existingRef) {
        await supabase.from('referrals').insert({
          affiliate_id: order.affiliate_id,
          referred_user_id: order.user_id,
          referral_code: affiliate.referral_code,
          status: 'converted',
          commission_amount: commission,
          commission_status: 'pending',
          click_id: order.click_id,
          source: order.referral_source,
          url: order.referral_url
        })
      } else {
        await supabase.from('referrals').update({
          status: 'converted',
          commission_amount: commission,
          commission_status: 'pending'
        }).eq('id', existingRef.id)
      }

      // Update affiliate totals
      await supabase.from('affiliates').update({
        total_referrals: (affiliate.total_referrals || 0) + 1,
        total_earnings: (affiliate.total_earnings || 0) + commission
      }).eq('id', order.affiliate_id)
    }

    // Grant user products
    for (const item of order.order_items || []) {
      await supabase.from('user_products').insert({
        user_id: order.user_id,
        product_id: item.product_id,
      }).then(() => {}) // ignore duplicates

      // Generate license if enabled
      const { data: product } = await supabase.from('products').select('license_enabled, license_type, license_duration, custom_license_days, name').eq('id', item.product_id).single()
      if (product?.license_enabled) {
        const licenseKey = generateLicenseKey()
        let expiresAt = null
        if (product.license_duration === '1_year') expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        else if (product.license_duration === '1_month') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        else if (product.license_duration === 'custom' && product.custom_license_days) expiresAt = new Date(Date.now() + product.custom_license_days * 24 * 60 * 60 * 1000).toISOString()

        await supabase.from('user_licenses').insert({
          user_id: order.user_id,
          product_id: item.product_id,
          license_key: licenseKey,
          status: 'active',
          expires_at: expiresAt,
        }).then(() => {}) // ignore duplicates

        // Send license email
        await sendEmail(supabase, 'license_delivery', order.user_id, {
          product_name: product.name,
          license_key: licenseKey,
        })
      }
    }

    // Send payment success email
    await sendEmail(supabase, 'payment_success', order.user_id, {
      order_number: order.order_number,
      total: order.total_amount,
    })

    // Create activity log
    await supabase.from('activity_logs').insert({
      user_id: order.user_id,
      action: 'order_paid',
      details: { order_id: order.id, amount: order.total_amount },
    })
  }

  return NextResponse.json({ success: true })
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = 4
  const segmentLength = 4
  return Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-')
}

async function sendEmail(supabase: any, templateName: string, userId: string, vars: Record<string, string>) {
  const { data: template } = await supabase.from('email_templates').select('subject, body').eq('name', templateName).single()
  const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('user_id', userId).single()
  if (!template || !profile) return

  let subject = template.subject
  let body = template.body
  Object.entries(vars).forEach(([key, val]) => {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), val)
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), val)
  })
  body = body.replace(/{{name}}/g, profile.full_name || 'Customer')
  body = body.replace(/{{site_name}}/g, 'SaaS Platform')

  // Store in notifications as email proxy
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'email',
    title: subject,
    message: body,
    data: { template: templateName, vars },
  })
}
