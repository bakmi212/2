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
    const fetchData = async () => {
      const { data } = await supabase.from('transactions').select('id, amount, status, payment_method, created_at, user:profiles(email)').order('created_at', { ascending: false })
      const formatted: Payment[] = (data as PaymentRow[])?.map(row => ({
        id: row.id, amount: row.amount, status: row.status, payment_method: row.payment_method, created_at: row.created_at,
        user: row.user?.[0] || null
      })) || []
      setPayments(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const getStatusColor = (status: string) => {
    switch (status) { case 'paid': return 'bg-green-500/10 text-green-500'; case 'pending': return 'bg-yellow-500/10 text-yellow-500'; case 'failed': return 'bg-red-500/10 text-red-500'; default: return 'bg-gray-500/10 text-gray-500' }
  }

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Payments</h1><p className="text-muted-foreground">View payment transactions</p></div>
      <Card>
        <CardHeader><CardTitle>All Payments ({payments.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">User</th><th className="text-left py-3 px-2">Amount</th><th className="text-left py-3 px-2">Method</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Date</th></tr></thead><tbody>
            {payments.map((pay) => (<tr key={pay.id} className="border-b"><td className="py-3 px-2">{pay.user?.email || '-'}</td><td className="py-3 px-2">${pay.amount}</td><td className="py-3 px-2">{pay.payment_method}</td><td className="py-3 px-2"><Badge className={getStatusColor(pay.status)}>{pay.status}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{new Date(pay.created_at).toLocaleString()}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
