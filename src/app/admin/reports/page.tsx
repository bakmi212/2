'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalRevenue: 0, monthlyRevenue: 0, totalOrders: 0, monthlyOrders: 0 })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchStats = async () => {
      const { data: orders } = await supabase.from('orders').select('total_amount, status, created_at')

      const totalRevenue = orders?.filter(o => o.status === 'paid').reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const monthlyRevenue = orders?.filter(o => o.status === 'paid' && new Date(o.created_at) > thirtyDaysAgo).reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0
      const totalOrders = orders?.length || 0
      const monthlyOrders = orders?.filter(o => new Date(o.created_at) > thirtyDaysAgo).length || 0

      setStats({ totalRevenue, monthlyRevenue, totalOrders, monthlyOrders })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Revenue and performance analytics</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-500">${stats.totalRevenue.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue (Last 30 Days)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-500">${stats.monthlyRevenue.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.totalOrders}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Orders (Last 30 Days)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.monthlyOrders}</div></CardContent>
        </Card>
      </div>
    </div>
  )
}
