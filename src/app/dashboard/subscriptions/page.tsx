'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { CreditCard, Loader2 } from 'lucide-react'

interface Subscription { id: string; status: string; current_period_start: string; current_period_end: string; product: { name: string } }
interface SubscriptionRow { id: string; status: string; current_period_start: string; current_period_end: string; product: { name: string }[] }

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('subscriptions').select('id, status, current_period_start, current_period_end, product:products(name)').eq('user_id', user.id).order('created_at', { ascending: false })
      const formatted: Subscription[] = (data as SubscriptionRow[])?.map(row => ({
        id: row.id, status: row.status, current_period_start: row.current_period_start, current_period_end: row.current_period_end,
        product: row.product?.[0] || { name: '-' }
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
      <div className="mb-8"><h1 className="text-3xl font-bold">Subscriptions</h1><p className="text-muted-foreground">Manage your active subscriptions</p></div>
      {subscriptions.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">No subscriptions</h3><p className="text-muted-foreground">You do not have any active subscriptions</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div><h3 className="font-semibold">{sub.product?.name || 'Subscription'}</h3><p className="text-sm text-muted-foreground">{new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-4"><Badge className={getStatusColor(sub.status)}>{sub.status}</Badge><Button variant="outline" size="sm">Manage</Button></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
