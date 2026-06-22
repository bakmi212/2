'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Payment { id: string; amount: number; status: string; payment_method: string; created_at: string; user: { email: string } | null }
interface PaymentRow { id: string; amount: number; status: string; payment_method: string; created_at: string; user: { email: string }[] }

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchPayments = async () => {
      const { data } = await supabase.from('payments').select('id, amount, status, payment_method, created_at, user:profiles(email)').order('created_at', { ascending: false })
      const formatted: Payment[] = (data as PaymentRow[])?.map(row => ({
        id: row.id, amount: row.amount, status: row.status, payment_method: row.payment_method, created_at: row.created_at,
        user: row.user?.[0] || null
      })) || []
      setPayments(formatted)
      setLoading(false)
    }
    fetchPayments()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': case 'completed': return 'bg-green-500/10 text-green-500'
      case 'pending': return 'bg-yellow-500/10 text-yellow-500'
      case 'failed': return 'bg-red-500/10 text-red-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Payments</h1><p className="text-muted-foreground">{payments.length} payments</p></div>

      <Card>
        <CardHeader><CardTitle>All Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4">Payment ID</th><th className="text-left py-3 px-4">Customer</th><th className="text-left py-3 px-4">Amount</th><th className="text-left py-3 px-4">Method</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Date</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-sm">{payment.id.slice(0, 8)}...</td>
                  <td className="py-3 px-4">{payment.user?.email || '-'}</td>
                  <td className="py-3 px-4 font-semibold">${payment.amount}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.payment_method || '-'}</td>
                  <td className="py-3 px-4"><Badge className={getStatusColor(payment.status)}>{payment.status}</Badge></td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(payment.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
