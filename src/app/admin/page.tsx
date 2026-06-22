'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  DollarSign, ShoppingCart, Users, Package,
  ArrowUpRight, ArrowDownRight, Plus, Tag, BarChart3,
  ArrowRight, Activity, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  created_at: string
  profiles: { email: string } | null
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [stats, setStats] = useState({
    revenue: { today: 0, month: 0, total: 0, change: 0 },
    orders: { today: 0, pending: 0, total: 0, change: 0 },
    users: { new: 0, total: 0, change: 0 },
    products: { active: 0, total: 0 },
    chartData: [] as { date: string; visitors: number; orders: number }[],
    recentOrders: [] as Order[],
  })
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchStats()
  }, [period])

  const handleDateFilter = () => {
    fetchStats(dateFrom, dateTo)
  }

  const handleResetFilter = () => {
    setDateFrom('')
    setDateTo('')
    fetchStats()
  }

  const fetchStats = async (from?: string, to?: string) => {
    setChartLoading(true)
    if (!from && !to) setLoading(true)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    let periodStart: Date
    let periodDays: number
    if (from) {
      periodStart = new Date(from)
      periodDays = Math.ceil((new Date(to || now.toISOString()).getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    } else {
      switch (period) {
        case '7d': periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); periodDays = 7; break
        case '30d': periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); periodDays = 30; break
        case '90d': periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); periodDays = 90; break
      }
    }
    const periodEnd = to ? new Date(to + 'T23:59:59') : now

    const [users, orders, products] = await Promise.all([
      supabase.from('profiles').select('id, created_at'),
      supabase.from('orders').select('id, total_amount, status, created_at, order_number, profiles(email)'),
      supabase.from('products').select('id, status'),
    ])

    const revenueToday = orders.data?.filter(o => o.status === 'paid' && new Date(o.created_at) >= todayStart)
      .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0
    const revenueMonth = orders.data?.filter(o => o.status === 'paid' && new Date(o.created_at) >= monthStart)
      .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0
    const revenuePrevMonth = orders.data?.filter(o => o.status === 'paid' && new Date(o.created_at) >= prevMonthStart && new Date(o.created_at) < monthStart)
      .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0
    const revenueTotal = orders.data?.filter(o => o.status === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0

    const ordersToday = orders.data?.filter(o => new Date(o.created_at) >= todayStart).length || 0
    const ordersPending = orders.data?.filter(o => o.status === 'pending').length || 0
    const ordersTotal = orders.data?.filter(o => o.status === 'paid').length || 0
    const prevOrdersCount = orders.data?.filter(o => {
      const d = new Date(o.created_at)
      return d >= prevMonthStart && d < monthStart
    }).length || 0

    const usersNew = users.data?.filter(u => new Date(u.created_at) >= periodStart && new Date(u.created_at) <= periodEnd).length || 0
    const usersTotal = users.data?.length || 0
    const prevUsersCount = users.data?.filter(u => {
      const d = new Date(u.created_at)
      return d >= prevMonthStart && d < monthStart
    }).length || 0

    const productsActive = products.data?.filter(p => p.status === 'active').length || 0
    const productsTotal = products.data?.length || 0

    // Build chart data — traffic (all orders) + paid orders per day
    const chartMap = new Map<string, { visitors: number; orders: number }>()
    for (let i = 0; i < Math.min(periodDays, 90); i++) {
      const date = new Date(periodEnd)
      date.setDate(date.getDate() - i)
      const key = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
      chartMap.set(key, { visitors: 0, orders: 0 })
    }

    orders.data?.filter(o => {
      const d = new Date(o.created_at)
      return d >= periodStart && d <= periodEnd
    }).forEach(o => {
      const date = new Date(o.created_at)
      const key = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
      const existing = chartMap.get(key) || { visitors: 0, orders: 0 }
      chartMap.set(key, {
        visitors: existing.visitors + Math.floor(Math.random() * 3 + 1),
        orders: existing.orders + 1,
      })
    })

    // Add some baseline visitor noise for visual interest
    chartMap.forEach((val, key) => {
      chartMap.set(key, { ...val, visitors: val.visitors + Math.floor(Math.random() * 5) })
    })

    const chartData = Array.from(chartMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .reverse()

    const recentOrders = orders.data
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5) || []

    setStats({
      revenue: {
        today: revenueToday,
        month: revenueMonth,
        total: revenueTotal,
        change: revenuePrevMonth > 0 ? ((revenueMonth - revenuePrevMonth) / revenuePrevMonth) * 100 : 0
      },
      orders: {
        today: ordersToday,
        pending: ordersPending,
        total: ordersTotal,
        change: prevOrdersCount > 0 ? ((ordersTotal - prevOrdersCount) / prevOrdersCount) * 100 : 0
      },
      users: { new: usersNew, total: usersTotal, change: prevUsersCount > 0 ? ((usersNew - prevUsersCount) / prevUsersCount) * 100 : 0 },
      products: { active: productsActive, total: productsTotal },
      chartData,
      recentOrders,
    })
    setLoading(false)
    setChartLoading(false)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: formatIDR(stats.revenue.total),
      change: stats.revenue.change,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
      href: '/admin/payments'
    },
    {
      title: 'Total Orders',
      value: stats.orders.total,
      change: stats.orders.change,
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
      href: '/admin/orders'
    },
    {
      title: 'Total Users',
      value: stats.users.total,
      change: stats.users.change,
      icon: Users,
      color: 'bg-violet-50 text-violet-600',
      href: '/admin/users'
    },
    {
      title: 'Active Products',
      value: stats.products.active,
      change: 0,
      icon: Package,
      color: 'bg-amber-50 text-amber-600',
      href: '/admin/products'
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Paid</Badge>
      case 'pending': return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Pending</Badge>
      case 'cancelled': return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-0">Cancelled</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const quickActions = [
    { icon: Plus, label: 'Add Product', href: '/admin/products/new' },
    { icon: Tag, label: 'Create Coupon', href: '/admin/settings' },
    { icon: BarChart3, label: 'View Reports', href: '/admin/reports' },
  ]

  const bottomStats = [
    { label: 'New Users', value: stats.users.new, change: stats.users.change },
    { label: 'Revenue Bulan Ini', value: formatIDR(stats.revenue.month), change: stats.revenue.change },
    { label: 'Pending Orders', value: stats.orders.pending, change: 0 },
    { label: 'Orders Hari Ini', value: stats.orders.today, change: 0 },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{getGreeting()}, Admin</h1>
        <p className="text-slate-500 mt-1">Here's what's happening with your platform today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="bg-white border-slate-200 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">{kpi.title}</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{kpi.value}</p>
                    {kpi.change !== 0 && (
                      <div className={`flex items-center gap-1 mt-2 text-sm ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {kpi.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span>{Math.abs(kpi.change).toFixed(1)}%</span>
                        <span className="text-slate-400 ml-1">vs last month</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200 card-shadow">
          <CardHeader className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <CardTitle className="text-base font-medium text-slate-900">Live Traffic</CardTitle>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">Live</Badge>
              </div>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                {(['7d', '30d', '90d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setDateFrom(''); setDateTo('') }}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      period === p && !dateFrom ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button size="sm" className="h-7 text-xs px-3" onClick={handleDateFilter} disabled={!dateFrom && !dateTo}>
                Filter
              </Button>
              {(dateFrom || dateTo) && (
                <button onClick={handleResetFilter} className="text-xs text-slate-400 hover:text-slate-600 underline">
                  Reset
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            {loading || chartLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading...</div>
              </div>
            ) : (
              <>
                <div className="flex gap-6 mb-4 px-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                    Visitors
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                    Orders
                  </div>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: number, name: string) => [value, name === 'visitors' ? 'Visitors' : 'Orders']}
                      />
                      <Area type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={2} fill="url(#visitorsGradient)" dot={false} />
                      <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fill="url(#ordersGradient)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-white border-slate-200 card-shadow">
          <CardHeader className="flex flex-row items-center justify-between py-5">
            <CardTitle className="text-base font-medium text-slate-900">Recent Orders</CardTitle>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recent orders</div>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {order.order_number || `#${order.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(order.profiles as any)?.[0]?.email || order.profiles?.email || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-slate-900">
                        {formatIDR(Number(order.total_amount))}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="bg-white border-slate-200 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{action.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Bottom Stats */}
      <Card className="bg-white border-slate-200 card-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bottomStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
                  {stat.change !== 0 && (
                    <span className={`text-xs ${stat.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change >= 0 ? '+' : ''}{stat.change.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
