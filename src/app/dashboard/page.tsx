'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  Key, Package, Download, HelpCircle, ArrowRight,
  CheckCircle, Clock, AlertCircle, ExternalLink, Calendar
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface License {
  id: string
  license_key: string
  status: string
  expires_at: string | null
  products: { name: string } | null
  product_id: string
}

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  created_at: string
}

interface Product {
  id: string
  product_id: string
  products: { name: string; image_url: string | null } | null
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<{ created_at: string; email: string } | null>(null)
  const [stats, setStats] = useState({
    licenses: 0,
    orders: 0,
    downloads: 0,
    tickets: 0,
  })
  const [licenses, setLicenses] = useState<License[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('created_at, email').eq('user_id', user.id).single()
      setProfile(profileData)

      // Fetch counts
      const [licensesData, ordersData, productsData] = await Promise.all([
        supabase.from('licenses').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('user_products').select('id', { count: 'exact' }).eq('user_id', user.id),
      ])

      setStats({
        licenses: licensesData.count || 0,
        orders: ordersData.count || 0,
        downloads: productsData.count || 0,
        tickets: 0,
      })

      // Fetch licenses
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('id, license_key, status, expires_at, product_id, products(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setLicenses((licenseData as License[]) || [])

      // Fetch recent orders
      const { data: ordersData2 } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentOrders((ordersData2 as Order[]) || [])

      // Fetch products
      const { data: productData } = await supabase
        .from('user_products')
        .select('id, product_id, products(name, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)
      setProducts((productData as Product[]) || [])

      setLoading(false)
    }
    fetchData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': case 'paid': return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />
      case 'expired': case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': case 'paid':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Active</Badge>
      case 'pending':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Pending</Badge>
      case 'expired':
        return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-0">Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const summaryCards = [
    { icon: Key, label: 'Active Licenses', value: stats.licenses, color: 'bg-blue-50 text-blue-600' },
    { icon: Package, label: 'Orders', value: stats.orders, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Download, label: 'Downloads', value: stats.downloads, color: 'bg-violet-50 text-violet-600' },
    { icon: HelpCircle, label: 'Support Tickets', value: stats.tickets, color: 'bg-amber-50 text-amber-600' },
  ]

  const quickLinks = [
    { icon: Download, label: 'Download Products', href: '/dashboard/downloads', desc: 'Access your purchased files' },
    { icon: Key, label: 'Manage Licenses', href: '/dashboard/licenses', desc: 'View and activate licenses' },
    { icon: Package, label: 'Billing & Invoices', href: '/dashboard/invoices', desc: 'Payment history and receipts' },
    { icon: HelpCircle, label: 'Support Center', href: '/contact', desc: 'Get help from our team' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {getGreeting()}, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-slate-500 mt-1">Welcome back to your dashboard.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-white border-slate-200 card-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Licenses */}
        <Card className="bg-white border-slate-200 card-shadow">
          <CardHeader className="flex flex-row items-center justify-between py-5">
            <CardTitle className="text-base font-medium text-slate-900">Active Licenses</CardTitle>
            <Link href="/dashboard/licenses" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {licenses.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                <Key className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No licenses found
              </div>
            ) : (
              <div className="space-y-3">
                {licenses.slice(0, 4).map((license) => {
                  const isExpiring = license.expires_at &&
                    new Date(license.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  return (
                    <div key={license.id} className="flex items-start justify-between p-3 rounded-xl bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {license.products?.name || 'Unknown Product'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          {license.license_key?.slice(0, 20)}...
                        </p>
                        {license.expires_at && (
                          <p className={`text-xs mt-1 ${isExpiring ? 'text-amber-600' : 'text-slate-400'}`}>
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(license.expires_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(license.status)}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-white border-slate-200 card-shadow">
          <CardHeader className="flex flex-row items-center justify-between py-5">
            <CardTitle className="text-base font-medium text-slate-900">Recent Orders</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No orders yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-slate-900">
                        ${Number(order.total_amount).toFixed(2)}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="bg-white border-slate-200 card-shadow">
          <CardHeader className="py-5">
            <CardTitle className="text-base font-medium text-slate-900">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <link.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-slate-500">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Account Overview */}
      <Card className="bg-white border-slate-200 card-shadow">
        <CardHeader className="py-5">
          <CardTitle className="text-base font-medium text-slate-900">Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500">Member Since</p>
              <p className="text-base font-medium text-slate-900 mt-1">
                {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Membership Plan</p>
              <p className="text-base font-medium text-slate-900 mt-1">Free</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="text-base font-medium text-slate-900 mt-1 truncate">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Account Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                <span className="text-base font-medium text-slate-900">Active</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
