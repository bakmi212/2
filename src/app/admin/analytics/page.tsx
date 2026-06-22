'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, DollarSign, ShoppingCart, Users, TrendingUp, Package, MousePointer, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    revenue: 0, revenueChange: 0,
    orders: 0, ordersChange: 0,
    users: 0, usersChange: 0,
    products: 0, productsChange: 0,
    conversionRate: 0,
    avgOrderValue: 0,
  })
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topAffiliates, setTopAffiliates] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

      // Revenue
      const { data: currentRevenue } = await supabase.from('orders').select('total_amount').eq('status', 'paid').gte('created_at', thirtyDaysAgo)
      const { data: prevRevenue } = await supabase.from('orders').select('total_amount').eq('status', 'paid').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo)
      const rev = (currentRevenue || []).reduce((s, o) => s + parseFloat(o.total_amount), 0)
      const prevRev = (prevRevenue || []).reduce((s, o) => s + parseFloat(o.total_amount), 0)

      // Orders
      const { count: currentOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo)
      const { count: prevOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo)

      // Users
      const { count: currentUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo)
      const { count: prevUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo)

      // Products
      const { count: currentProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo)

      // Top products
      const { data: topProds } = await supabase.from('order_items').select('product_id, product:products(name), sum:price').order('sum', { ascending: false }).limit(5)

      // Top affiliates
      const { data: topAffs } = await supabase.from('referrals').select('affiliate_id, affiliate:affiliates(user_id, user:profiles(full_name)), sum:commission_amount').eq('status', 'converted').order('sum', { ascending: false }).limit(5)

      // Monthly revenue
      const { data: monthly } = await supabase.from('orders').select('created_at, total_amount').eq('status', 'paid').gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()).order('created_at')

      const monthlyMap = new Map()
      monthly?.forEach((o: any) => {
        const month = new Date(o.created_at).toLocaleString('en', { month: 'short', year: '2-digit' })
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + parseFloat(o.total_amount))
      })

      setStats({
        revenue: rev,
        revenueChange: prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : 0,
        orders: currentOrders || 0,
        ordersChange: prevOrders ? (((currentOrders || 0) - prevOrders) / prevOrders) * 100 : 0,
        users: currentUsers || 0,
        usersChange: prevUsers ? (((currentUsers || 0) - prevUsers) / prevUsers) * 100 : 0,
        products: currentProducts || 0,
        productsChange: 0,
        conversionRate: currentOrders && currentUsers ? ((currentOrders / (currentUsers * 10)) * 100) : 0,
        avgOrderValue: currentOrders ? rev / currentOrders : 0,
      })
      setTopProducts(topProds || [])
      setTopAffiliates(topAffs || [])
      setMonthlyRevenue(Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount })))
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const StatCard = ({ icon: Icon, label, value, change, prefix = '' }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{prefix}{value}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Analytics</h1>
      <p className="text-muted-foreground mb-8">Business performance overview</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Revenue (30d)" value={`$${stats.revenue.toFixed(2)}`} change={stats.revenueChange} />
        <StatCard icon={ShoppingCart} label="Orders (30d)" value={stats.orders} change={stats.ordersChange} />
        <StatCard icon={Users} label="New Users (30d)" value={stats.users} change={stats.usersChange} />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyRevenue.map((m: any) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-sm w-16">{m.month}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((m.amount / (stats.revenue || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium w-20 text-right">${m.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length === 0 && <p className="text-muted-foreground text-sm">No sales data yet.</p>}
              {topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <span className="font-medium">{p.product?.name || 'Unknown'}</span>
                  </div>
                  <span className="font-semibold">${parseFloat(p.sum || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Affiliates</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topAffiliates.length === 0 && <p className="text-muted-foreground text-sm">No affiliate data yet.</p>}
            {topAffiliates.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">{i + 1}</span>
                  <span className="font-medium">{a.affiliate?.user?.full_name || 'Unknown'}</span>
                </div>
                <span className="font-semibold text-green-600">+${parseFloat(a.sum || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
