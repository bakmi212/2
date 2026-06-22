'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Subscription { id: string; status: string; current_period_start: string; current_period_end: string; user: { email: string } | null; product: { name: string } | null }
interface SubscriptionRow { id: string; status: string; current_period_start: string; current_period_end: string; user: { email: string }[]; product: { name: string }[] }

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('subscriptions').select('id, status, current_period_start, current_period_end, user:profiles(email), product:products(name)').order('created_at', { ascending: false })
      const formatted: Subscription[] = (data as SubscriptionRow[])?.map(row => ({
        id: row.id, status: row.status, current_period_start: row.current_period_start, current_period_end: row.current_period_end,
        user: row.user?.[0] || null, product: row.product?.[0] || null
      })) || []
      setSubscriptions(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const getStatusColor = (status: string) => {
    switch (status) { case 'active': return 'bg-green-500/10 text-green-500'; case 'canceled': return 'bg-red-500/10 text-red-500'; case 'past_due': return 'bg-yellow-500/10 text-yellow-500'; default: return 'bg-gray-500/10 text-gray-500' }
  }

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Subscriptions</h1><p className="text-muted-foreground">Manage user subscriptions</p></div>
      <Card>
        <CardHeader><CardTitle>All Subscriptions ({subscriptions.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">User</th><th className="text-left py-3 px-2">Product</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Period</th></tr></thead><tbody>
            {subscriptions.map((sub) => (<tr key={sub.id} className="border-b"><td className="py-3 px-2">{sub.user?.email || '-'}</td><td className="py-3 px-2">{sub.product?.name || '-'}</td><td className="py-3 px-2"><Badge className={getStatusColor(sub.status)}>{sub.status}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
