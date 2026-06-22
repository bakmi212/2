'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader as Loader2, Package, User, DollarSign, RefreshCw, CircleCheck as CheckCircle, Circle as XCircle, Clock, CircleAlert as AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/purchase-context'

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string | null
  order_status: string | null
  payment_method: string
  payment_proof: string | null
  rejection_reason: string | null
  created_at: string
  user: { email: string; full_name: string | null } | null
  order_items: { id: string; product_name: string | null; variant_name: string | null; product: { name: string } }[]
  affiliate_id: string | null
  referral_code: string | null
  commission_amount: number | null
  commission_status: string | null
  affiliate: {
    referral_code: string
    profiles: { full_name: string | null; email: string | null } | null
  } | null
}

interface OrderRow {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string | null
  order_status: string | null
  payment_method: string
  payment_proof: string | null
  rejection_reason: string | null
  created_at: string
  user: { email: string; full_name: string | null }[]
  order_items: { id: string; product_name: string | null; variant_name: string | null; product: { name: string }[] }[]
  affiliate_id: string | null
  referral_code: string | null
  commission_amount: number | null
  commission_status: string | null
  affiliate: {
    referral_code: string
    profiles: { full_name: string | null; email: string | null }
  }[] | null
}

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createBrowserClient()

  const fetchOrders = useCallback(async (showRefreshLoader = false) => {
    if (showRefreshLoader) setRefreshing(true)

    let query = supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, payment_status, order_status,
        payment_method, payment_proof, rejection_reason, created_at,
        affiliate_id, referral_code, commission_amount, commission_status,
        user:profiles(email, full_name),
        order_items(id, product_name, variant_name, product:products(name)),
        affiliate:affiliates(referral_code, profiles(full_name, email))
      `)
      .order('created_at', { ascending: false })

    // Note: No payment_status filter for 'all' - show ALL orders regardless of status

    if (filter !== 'all') query = query.eq('status', filter)
    if (paymentFilter !== 'all') query = query.eq('payment_status', paymentFilter)

    const { data } = await query
    const formatted: Order[] = (data as OrderRow[])?.map(row => ({
      id: row.id,
      order_number: row.order_number,
      total_amount: row.total_amount,
      status: row.status,
      payment_status: row.payment_status,
      order_status: row.order_status,
      payment_method: row.payment_method,
      payment_proof: row.payment_proof,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      affiliate_id: row.affiliate_id,
      referral_code: row.referral_code,
      commission_amount: row.commission_amount,
      commission_status: row.commission_status,
      user: row.user?.[0] || null,
      order_items: (row.order_items || []).map(item => ({
        id: item.id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        product: item.product?.[0] || { name: '-' }
      })),
      affiliate: row.affiliate?.[0] || null
    })) || []

    setOrders(formatted)
    setLoading(false)
    setRefreshing(false)
  }, [filter, paymentFilter, supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => fetchOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, supabase])

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    if (error) toast.error('Failed to update status')
    else {
      toast.success('Status updated')
      fetchOrders()
    }
  }

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    const updateData: Record<string, any> = { payment_status: newPaymentStatus }
    if (newPaymentStatus === 'paid') {
      updateData.status = 'paid'
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) {
      toast.error('Failed to update payment status')
    } else {
      toast.success('Payment status updated')
      fetchOrders()

      // If approved, trigger post-payment processing
      if (newPaymentStatus === 'paid') {
        // Process commission, license, download
        const { processOrderOnPaymentPaid } = await import('@/lib/purchase-context')
        await processOrderOnPaymentPaid(supabase, orderId)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700'
      case 'pending_payment':
        return 'bg-amber-100 text-amber-700'
      case 'pending_verification':
        return 'bg-blue-100 text-blue-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const statusOptions = ['pending', 'paid', 'processing', 'completed', 'cancelled']
  const paymentStatusOptions = ['all', 'pending_payment', 'pending_verification', 'paid', 'rejected']

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Orders Management</h1>
            <p className="text-muted-foreground">{orders.length} orders</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status:</p>
            <div className="flex gap-1 flex-wrap">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
              {statusOptions.map(s => (
                <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Payment:</p>
            <div className="flex gap-1 flex-wrap">
              {paymentStatusOptions.map(s => (
                <Button
                  key={s}
                  variant={paymentFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentFilter(s)}
                >
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Order</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Product</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Payment</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Affiliate</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>Tidak ada order ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-sm">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">{order.user?.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {order.order_items?.map(item => (
                            <div key={item.id}>
                              <span>{item.product_name || item.product?.name || 'Unknown'}</span>
                              {item.variant_name && (
                                <span className="text-xs text-blue-600 ml-1">({item.variant_name})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">{formatIDR(order.total_amount)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getPaymentStatusColor(order.payment_status || 'pending_payment')}>
                          {(order.payment_status || 'pending_payment').replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {order.affiliate ? (
                          <div>
                            <div className="text-sm font-medium">
                              {order.affiliate.profiles?.full_name || order.affiliate.referral_code}
                            </div>
                            {order.commission_amount && (
                              <div className="text-xs text-emerald-600">
                                {formatIDR(order.commission_amount)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order Detail</h3>
              <button onClick={() => setSelectedOrder(null)}>
                <span className="text-slate-400 text-xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-mono font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Customer */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium">{selectedOrder.user?.full_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span>{selectedOrder.user?.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Product */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Product
                </h4>
                {selectedOrder.order_items?.map(item => (
                  <div key={item.id} className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Product</span>
                      <span className="font-medium">{item.product_name || item.product?.name || '-'}</span>
                    </div>
                    {item.variant_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Variant</span>
                        <span className="text-blue-600">{item.variant_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Payment
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold text-lg">{formatIDR(selectedOrder.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Status</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getPaymentStatusColor(selectedOrder.payment_status || 'pending_payment')}>
                        {(selectedOrder.payment_status || 'pending_payment').replace(/_/g, ' ')}
                      </Badge>
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={selectedOrder.payment_status || 'pending_payment'}
                        onChange={e => updatePaymentStatus(selectedOrder.id, e.target.value)}
                      >
                        <option value="pending_payment">Pending Payment</option>
                        <option value="pending_verification">Pending Verification</option>
                        <option value="paid">Paid</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Order Status</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={selectedOrder.status}
                        onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Method</span>
                    <span>{selectedOrder.payment_method || '-'}</span>
                  </div>
                  {selectedOrder.payment_proof && (
                    <div className="mt-2">
                      <p className="text-slate-500 text-xs mb-1">Payment Proof:</p>
                      <img src={selectedOrder.payment_proof} alt="Proof" className="h-32 object-contain rounded border" />
                    </div>
                  )}
                </div>
              </div>

              {/* Affiliate */}
              {selectedOrder.affiliate_id && selectedOrder.affiliate && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Affiliate Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Affiliate</span>
                      <span>{selectedOrder.affiliate.profiles?.full_name || selectedOrder.affiliate.referral_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Code</span>
                      <span className="font-mono">{selectedOrder.affiliate.referral_code}</span>
                    </div>
                    {selectedOrder.commission_amount && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Commission</span>
                        <span className="font-bold text-emerald-600">{formatIDR(selectedOrder.commission_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
