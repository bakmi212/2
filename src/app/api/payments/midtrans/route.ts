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
  const { order_id, amount, customer } = body

  if (!order_id || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get Midtrans config from payment_providers
  const { data: provider } = await supabase.from('payment_providers').select('config').eq('name', 'midtrans').single()
  const serverKey = provider?.config?.server_key || process.env.MIDTRANS_SERVER_KEY

  if (!serverKey) {
    return NextResponse.json({ error: 'Midtrans not configured' }, { status: 500 })
  }

  const isProduction = provider?.config?.is_production || false
  const baseUrl = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'

  try {
    const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      },
      body: JSON.stringify({
        transaction_details: { order_id, gross_amount: Math.round(amount) },
        customer_details: {
          first_name: customer?.name || 'Customer',
          email: customer?.email || '',
          phone: customer?.phone || '',
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error_messages?.[0] || 'Midtrans error' }, { status: res.status })
    }

    return NextResponse.json({ token: data.token, redirect_url: data.redirect_url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Payment initialization failed' }, { status: 500 })
  }
}
