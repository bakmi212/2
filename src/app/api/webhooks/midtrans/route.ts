import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const body = await request.json()
  const { order_id, transaction_status, payment_type, gross_amount } = body

  return NextResponse.json({ status: 'ok', order_id, transaction_status, payment_type, gross_amount })
}
