'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Users, Package, DollarSign, ShoppingCart, Loader2 } from 'lucide-react'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, products: 0, revenue: 0, orders: 0 })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount'),
      ])
      const totalRevenue = ordersRes.data?.reduce((sum: number, o: { amount: number }) => sum + (o.amount || 0), 0) || 0
      setStats({ users: usersRes.count || 0, products: productsRes.count || 0, revenue: totalRevenue, orders: ordersRes.data?.length || 0 })
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const statCards = [
    { icon: Users, title: 'Total Users', value: stats.users, desc: 'Registered users' },
    { icon: Package, title: 'Products', value: stats.products, desc: 'Active products' },
    { icon: DollarSign, title: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, desc: 'Total revenue' },
    { icon: ShoppingCart, title: 'Payments', value: stats.orders, desc: 'Total payments' },
  ]

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground">Overview of platform metrics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium">{stat.title}</CardTitle><stat.icon className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.value}</div><p className="text-xs text-muted-foreground">{stat.desc}</p></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Quick Actions</CardTitle><CardDescription>Common admin tasks</CardDescription></CardHeader><CardContent className="space-y-2"><a href="/dashboard/admin/products" className="block text-sm text-primary hover:underline">Manage Products</a><a href="/dashboard/admin/users" className="block text-sm text-primary hover:underline">Manage Users</a><a href="/dashboard/admin/settings" className="block text-sm text-primary hover:underline">Site Settings</a></CardContent></Card>
        <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Latest platform activity</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Activity monitoring coming soon</p></CardContent></Card>
      </div>
    </div>
  )
}
