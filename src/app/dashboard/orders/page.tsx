'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader as Loader2, Package, Clock, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle } from 'lucide-react'
import { formatIDR } from '@/lib/purchase-context'

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  payment_method: string
  payment_proof: string | null
  created_at: string
  order_items: {
    id: string
    product_name: string | null
    variant_name: string | null
    product: { name: string }
  }[]
}

interface OrderRow {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  payment_method: string
  payment_proof: string | null
  created_at: string
  order_items: {
    id: string
    product_name: string | null
    variant_name: string | null
    product: { name: string }[]
  }[]
}

export default function MemberOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const supabase = createBrowserClient()

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, payment_status,
        payment_method, payment_proof, created_at,
        order_items(id, product_name, variant_name, product:products(name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('payment_status', filter)
    }

    const { data } = await query
    const formatted: Order[] = (data as OrderRow[])?.map(row => ({
      ...row,
      order_items: (row.order_items || []).map(item => ({
        id: item.id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        product: item.product?.[0] || { name: '-' }
      }))
    })) || []

    setOrders(formatted)
    setLoading(false)
  }, [filter, supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('member-orders-realtime')
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

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'pending_payment':
        return <Clock className="h-4 w-4" />
      case 'pending_verification':
        return <AlertCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'pending_verification', label: 'Pending Verification' },
    { value: 'paid', label: 'Paid' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">{orders.length} orders</p>
      </div>

      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-muted-foreground">Belum ada order</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-medium">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="mt-2">
                      {order.order_items.map(item => (
                        <div key={item.id} className="text-sm">
                          <span className="font-medium">{item.product_name || item.product?.name}</span>
                          {item.variant_name && (
                            <span className="text-blue-600 ml-1">({item.variant_name})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatIDR(order.total_amount)}</div>
                    <div className="mt-2">
                      <Badge className={getPaymentStatusColor(order.payment_status)}>
                        <span className="flex items-center gap-1">
                          {getPaymentStatusIcon(order.payment_status)}
                          {order.payment_status?.replace(/_/g, ' ')}
                        </span>
                      </Badge>
                    </div>
                    <div className="mt-1">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order Detail</h3>
              <button onClick={() => setSelectedOrder(null)}>
                <span className="text-slate-400 text-xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Order Number</span>
                <span className="font-mono font-medium">{selectedOrder.order_number}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Created</span>
                <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>

              <div className="py-2 border-b">
                <span className="text-slate-500">Product</span>
                <div className="mt-2">
                  {selectedOrder.order_items.map(item => (
                    <div key={item.id}>
                      <div className="font-medium">{item.product_name || item.product?.name}</div>
                      {item.variant_name && (
                        <div className="text-sm text-blue-600">Variant: {item.variant_name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-lg">{formatIDR(selectedOrder.total_amount)}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Payment Status</span>
                <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>
                  <span className="flex items-center gap-1">
                    {getPaymentStatusIcon(selectedOrder.payment_status)}
                    {selectedOrder.payment_status?.replace(/_/g, ' ')}
                  </span>
                </Badge>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Order Status</span>
                <Badge className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status}
                </Badge>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Payment Method</span>
                <span>{selectedOrder.payment_method || '-'}</span>
              </div>

              {selectedOrder.payment_proof && (
                <div className="py-2">
                  <span className="text-slate-500 text-sm">Payment Proof:</span>
                  <img
                    src={selectedOrder.payment_proof}
                    alt="Proof"
                    className="mt-2 h-32 object-contain rounded border"
                  />
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
