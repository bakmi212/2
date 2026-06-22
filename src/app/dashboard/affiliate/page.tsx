'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2, Copy, MousePointer, ShoppingCart, DollarSign, Users,
  TrendingUp, Clock, CheckCircle, XCircle, ExternalLink
} from 'lucide-react'

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [affiliate, setAffiliate] = useState<any>(null)
  const [commissions, setCommissions] = useState<any[]>([])
  const [clicks, setClicks] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalOrders: 0,
    totalSales: 0,
    pendingCommission: 0,
    approvedCommission: 0,
    paidCommission: 0,
    conversionRate: 0
  })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: aff } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('user_id', user.id)
        .single()

      setAffiliate(aff)

      if (aff) {
        // Fetch commissions
        const { data: comms } = await supabase
          .from('affiliate_commissions')
          .select(`
            *,
            order:orders(order_number, total_amount, created_at)
          `)
          .eq('affiliate_id', aff.id)
          .order('created_at', { ascending: false })

        setCommissions(comms || [])

        // Fetch clicks
        const { data: clicksData } = await supabase
          .from('affiliate_clicks')
          .select('*')
          .eq('affiliate_id', aff.id)
          .order('created_at', { ascending: false })
          .limit(50)

        setClicks(clicksData || [])

        // Calculate stats
        const pending = (comms || []).filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0)
        const approved = (comms || []).filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0)
        const paid = (comms || []).filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0)
        const totalSales = (comms || []).reduce((sum, c) => sum + (c.amount || 0), 0)

        setStats({
          totalClicks: clicksData?.length || 0,
          totalOrders: (comms || []).length,
          totalSales,
          pendingCommission: pending,
          approvedCommission: approved,
          paidCommission: paid,
          conversionRate: (clicksData?.length || 0) > 0
            ? Math.round(((comms || []).length / clicksData.length) * 100 * 100) / 100
            : 0
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const joinAffiliate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user profile for username
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    const code = `AFF-${user.id.slice(0, 8).toUpperCase()}`

    const { data, error } = await supabase.from('affiliates').insert({
      user_id: user.id,
      referral_code: code,
      username: profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || user.id.slice(0, 8),
      status: 'active',
      commission_type: 'percentage',
      commission_rate: 0.10
    }).select().single()

    if (error) toast.error('Failed to join affiliate program')
    else { toast.success('Welcome to the affiliate program!'); setAffiliate(data) }
  }

  const copyLink = () => {
    if (!affiliate) return
    const url = `${window.location.origin}?ref=${affiliate.referral_code}`
    navigator.clipboard.writeText(url)
    toast.success('Referral link copied!')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: DollarSign },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      converted: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle }
    }
    const style = styles[status] || styles.pending
    const Icon = style.icon
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  if (!affiliate) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Affiliate Program</h2>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Earn commissions by promoting products. Get your unique referral link and start earning today.
        </p>
        <Button onClick={joinAffiliate}>Join Affiliate Program</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
        <p className="text-slate-500">Track your referrals and earnings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MousePointer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Clicks</p>
                <p className="text-xl font-bold">{stats.totalClicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="text-xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Sales</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.pendingCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.approvedCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.paidCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Conv. Rate</p>
                <p className="text-xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Referral Link</span>
            <Badge variant="outline">{affiliate.commission_rate * 100}% Commission</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-100 rounded-lg px-4 py-3 font-mono text-sm truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliate.referral_code}` : ''}
            </div>
            <Button onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" />Copy
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Share this link to earn {affiliate.commission_rate * 100}% commission on every sale
          </p>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No commissions yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((comm) => (
                <div key={comm.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg border">
                      <ShoppingCart className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Order #{comm.order?.order_number || comm.order_id?.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {comm.commission_type === 'percentage' ? `${comm.commission_rate * 100}%` : 'Fixed'} Commission
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(comm.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      +{formatCurrency(comm.amount)}
                    </p>
                    {statusBadge(comm.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          {clicks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MousePointer className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No clicks recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clicks.slice(0, 10).map((click) => (
                <div key={click.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-white border">
                      <ExternalLink className="h-3 w-3 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{click.source || 'Direct'}</p>
                      <p className="text-xs text-slate-400">
                        {click.country || 'Unknown'} - {click.device_type || 'Unknown device'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(click.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {click.converted && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Converted</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
