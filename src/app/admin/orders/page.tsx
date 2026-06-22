'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Check, X, Trash2, AlertTriangle, Eye, CheckCircle, XCircle, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { runOrderActions } from '@/lib/order-action-engine'

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  order_status: string
  payment_method: string
  payment_proof: string | null
  rejection_reason: string | null
  created_at: string
  user: { email: string } | null
  order_items: { product: { name: string } | null }[]
  payment_account: {
    payment_name: string
    type: string
    bank_name: string | null
    account_number: string | null
    account_holder: string | null
  } | null
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

const PAYMENT_STATUS_OPTIONS = ['all', 'pending_payment', 'pending_verification', 'paid', 'rejected']
const ORDER_STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'cancelled']

const paymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Paid</Badge>
    case 'pending_payment': return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Pending Payment</Badge>
    case 'pending_verification': return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0">Pending Verification</Badge>
    case 'rejected': return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-0">Rejected</Badge>
    default: return <Badge variant="secondary">{status || '-'}</Badge>
  }
}

const orderStatusBadge = (status: string) => {
  switch (status) {
    case 'processing': return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0">Processing</Badge>
    case 'completed': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Completed</Badge>
    case 'pending': return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Pending</Badge>
    case 'cancelled': return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0">Cancelled</Badge>
    default: return <Badge variant="secondary">{status || '-'}</Badge>
  }
}

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterOrder, setFilterOrder] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  const openDetail = async (order: Order) => {
    setDetailOrder(order)
    setDetailTab('info')
    setLogsLoading(true)
    const { data } = await supabase
      .from('action_executions')
      .select('id, execution_code, action_name, action_type, status, started_at, completed_at, duration_ms, retry_count, error_message, output_data')
      .eq('order_id', order.id)
      .order('started_at', { ascending: true })
    setExecutions(data || [])
    setLogsLoading(false)
  }

  const retryAction = async (exec: any) => {
    if (!detailOrder) return
    await supabase.from('action_executions').update({ status: 'pending', error_message: null }).eq('id', exec.id)
    toast.success('Action dijadwalkan ulang')
    openDetail(detailOrder)
  }
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [zoomProof, setZoomProof] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'logs'>('info')
  const [executions, setExecutions] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => { fetchOrders() }, [filterPayment, filterOrder])

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, payment_status, order_status,
        payment_method, payment_proof, rejection_reason, created_at,
        user:profiles(email),
        order_items(product:products(name)),
        payment_account:payment_accounts(payment_name, type, bank_name, account_number, account_holder)
      `)
      .order('created_at', { ascending: false })
    if (filterPayment !== 'all') query = query.eq('payment_status', filterPayment)
    if (filterOrder !== 'all') query = query.eq('order_status', filterOrder)
    const { data } = await query
    const formatted: Order[] = (data as any[])?.map(row => ({
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
      user: Array.isArray(row.user) ? row.user[0] : row.user,
      order_items: (row.order_items || []).map((item: any) => ({
        product: Array.isArray(item.product) ? item.product[0] : item.product
      })),
      payment_account: Array.isArray(row.payment_account) ? row.payment_account[0] : row.payment_account,
    })) || []
    setOrders(formatted)
    setLoading(false)
  }

  const approvePayment = async (orderId: string) => {
    setActionLoading(orderId + 'approve')

    const { error } = await supabase.from('orders').update({
      payment_status: 'paid',
      order_status: 'processing',
      status: 'processing',
      rejection_reason: null,
    }).eq('id', orderId)

    if (error) { toast.error('Gagal approve'); setActionLoading(null); return }

    // Run the full action engine (license, download, notification, custom actions, etc.)
    const { executions } = await runOrderActions(supabase, orderId)
    const failed = executions.filter(e => e.status === 'failed')
    if (failed.length > 0) {
      toast.warning(`Pembayaran dikonfirmasi. ${failed.length} action gagal: ${failed.map(e => e.name).join(', ')}`)
    } else {
      toast.success(`Pembayaran dikonfirmasi — ${executions.length} action berhasil dijalankan`)
    }

    fetchOrders()
    setDetailOrder(null)
    setActionLoading(null)
  }

  const rejectPayment = async (orderId: string) => {
    if (!rejectReason.trim()) { toast.error('Alasan penolakan wajib diisi'); return }
    setActionLoading(orderId + 'reject')
    const { error } = await supabase.from('orders').update({
      payment_status: 'rejected',
      order_status: 'pending',
      status: 'pending',
      rejection_reason: rejectReason.trim(),
    }).eq('id', orderId)
    if (error) toast.error('Gagal reject')
    else { toast.success('Pembayaran ditolak'); setShowRejectForm(false); setRejectReason(''); fetchOrders(); setDetailOrder(null) }
    setActionLoading(null)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId + newStatus)
    await supabase.from('orders').update({ order_status: newStatus, status: newStatus }).eq('id', orderId)
    toast.success('Status diperbarui')
    setActionLoading(null)
    fetchOrders()
  }

  const deleteOrder = async (orderId: string) => {
    setActionLoading(orderId + 'delete')
    await supabase.from('orders').delete().eq('id', orderId)
    toast.success('Order dihapus')
    setOrders(prev => prev.filter(o => o.id !== orderId))
    setActionLoading(null)
    setDeleteConfirm(null)
  }

  const filteredOrders = orders

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Orders Management</h1>
          <p className="text-slate-500 mt-0.5">{orders.length} orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-slate-500 self-center mr-1">Payment:</span>
          {PAYMENT_STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilterPayment(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${filterPayment === s ? 'bg-blue-600 text-white font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {s === 'all' ? 'Semua' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-slate-500 self-center mr-1">Order:</span>
          {ORDER_STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilterOrder(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${filterOrder === s ? 'bg-slate-800 text-white font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {s === 'all' ? 'Semua' : s}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Tidak ada order ditemukan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Order</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Payment</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Order</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Bukti</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(order => {
                    const isDeleting = deleteConfirm === order.id
                    return (
                      <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${isDeleting ? 'bg-red-50' : ''}`}>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-medium text-slate-900">{order.order_number || `#${order.id.slice(0, 8)}`}</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-700">{order.user?.email || '-'}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-600 line-clamp-2 max-w-[140px]">
                            {order.order_items.map(i => i.product?.name).filter(Boolean).join(', ') || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-sm text-slate-900">{formatIDR(Number(order.total_amount))}</td>
                        <td className="py-3.5 px-4">{paymentStatusBadge(order.payment_status)}</td>
                        <td className="py-3.5 px-4">{orderStatusBadge(order.order_status || order.status)}</td>
                        <td className="py-3.5 px-4">
                          {order.payment_proof ? (
                            <button onClick={() => setZoomProof(order.payment_proof)} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs">
                              <Eye className="h-3.5 w-3.5" /> Lihat
                            </button>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {isDeleting ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Hapus?</span>
                              <button onClick={() => deleteOrder(order.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Ya</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded">Batal</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {order.payment_status === 'pending_verification' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => approvePayment(order.id)} disabled={!!actionLoading} title="Approve">
                                    {actionLoading === order.id + 'approve' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />Approve</>}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => { setDetailOrder(order); setShowRejectForm(true) }} disabled={!!actionLoading} title="Reject">
                                    <><XCircle className="h-3 w-3 mr-1" />Reject</>
                                  </Button>
                                </>
                              )}
                              {order.payment_status !== 'pending_verification' && order.payment_status !== 'paid' && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => approvePayment(order.id)} disabled={!!actionLoading} title="Mark Paid">
                                  <><Check className="h-3 w-3 mr-1" />Paid</>
                                </Button>
                              )}
                              {order.order_status !== 'cancelled' && order.payment_status !== 'pending_verification' && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')} disabled={!!actionLoading}>
                                  <><X className="h-3 w-3 mr-1" />Cancel</>
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => setDeleteConfirm(order.id)} disabled={!!actionLoading} title="Hapus">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500"
                                onClick={() => openDetail(order)}>
                                <Activity className="h-3 w-3 mr-1" />Detail
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {detailOrder && !showRejectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Detail Order</h3>
                <p className="text-sm font-mono text-slate-500">{detailOrder.order_number}</p>
              </div>
              <button onClick={() => setDetailOrder(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b shrink-0">
              <button onClick={() => setDetailTab('info')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${detailTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                Informasi
              </button>
              <button onClick={() => setDetailTab('logs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${detailTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                <Activity className="h-3.5 w-3.5" />Action Logs
                {executions.length > 0 && <span className="ml-1 bg-slate-100 text-slate-600 text-xs rounded-full px-1.5 py-0.5">{executions.length}</span>}
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {detailTab === 'info' && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{detailOrder.user?.email || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{formatIDR(Number(detailOrder.total_amount))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Payment Status</span>{paymentStatusBadge(detailOrder.payment_status)}</div>
                  <div className="flex justify-between"><span className="text-slate-500">Order Status</span>{orderStatusBadge(detailOrder.order_status || detailOrder.status)}</div>
                  {detailOrder.payment_account && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Metode Bayar</span><span>{detailOrder.payment_account.payment_name}</span></div>
                      {detailOrder.payment_account.bank_name && <div className="flex justify-between"><span className="text-slate-500">Bank/E-Wallet</span><span>{detailOrder.payment_account.bank_name}</span></div>}
                      {detailOrder.payment_account.account_number && <div className="flex justify-between"><span className="text-slate-500">No Rekening</span><span className="font-mono">{detailOrder.payment_account.account_number}</span></div>}
                      {detailOrder.payment_account.account_holder && <div className="flex justify-between"><span className="text-slate-500">Atas Nama</span><span>{detailOrder.payment_account.account_holder}</span></div>}
                    </>
                  )}
                  {detailOrder.rejection_reason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="text-xs text-red-600 font-medium">Alasan Penolakan:</p>
                      <p className="text-sm text-red-700 mt-1">{detailOrder.rejection_reason}</p>
                    </div>
                  )}
                  {detailOrder.payment_proof && (
                    <div>
                      <p className="text-slate-500 mb-2">Bukti Pembayaran:</p>
                      <img src={detailOrder.payment_proof} alt="Bukti" className="rounded-lg border max-h-48 cursor-pointer" onClick={() => setZoomProof(detailOrder.payment_proof)} />
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 mb-1">Items:</p>
                    <ul className="space-y-1">{detailOrder.order_items.map((item, i) => <li key={i} className="text-slate-700">— {item.product?.name || '-'}</li>)}</ul>
                  </div>
                </div>
              )}

              {detailTab === 'logs' && (
                <div>
                  {logsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                  ) : executions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada action log untuk order ini.</p>
                      <p className="text-xs mt-1">Log akan muncul setelah pembayaran dikonfirmasi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {executions.map((exec, i) => (
                        <div key={exec.id} className={`border rounded-xl p-4 ${exec.status === 'success' ? 'border-emerald-100 bg-emerald-50/40' : exec.status === 'failed' ? 'border-red-100 bg-red-50/40' : exec.status === 'running' ? 'border-blue-100 bg-blue-50/40' : 'border-slate-100'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${exec.status === 'success' ? 'bg-emerald-100 text-emerald-700' : exec.status === 'failed' ? 'bg-red-100 text-red-700' : exec.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {exec.status === 'success' ? '✓' : exec.status === 'failed' ? '✕' : exec.status === 'running' ? '…' : String(i + 1)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{exec.action_name}</p>
                                <p className="text-xs text-slate-500 font-mono">{exec.action_type} · {exec.execution_code}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exec.status === 'success' ? 'bg-emerald-100 text-emerald-700' : exec.status === 'failed' ? 'bg-red-100 text-red-700' : exec.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {exec.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                            {exec.started_at && <div><span className="block text-slate-400 mb-0.5">Started</span>{new Date(exec.started_at).toLocaleTimeString('id-ID')}</div>}
                            {exec.completed_at && <div><span className="block text-slate-400 mb-0.5">Completed</span>{new Date(exec.completed_at).toLocaleTimeString('id-ID')}</div>}
                            {exec.duration_ms != null && <div><span className="block text-slate-400 mb-0.5">Duration</span>{exec.duration_ms < 1000 ? `${exec.duration_ms}ms` : `${(exec.duration_ms / 1000).toFixed(1)}s`}</div>}
                          </div>

                          {exec.retry_count > 0 && (
                            <p className="text-xs text-amber-600 mt-2">Retried {exec.retry_count}×</p>
                          )}

                          {exec.error_message && (
                            <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2.5">
                              <p className="text-xs font-medium text-red-600 mb-0.5">Error</p>
                              <p className="text-xs text-red-700 font-mono">{exec.error_message}</p>
                            </div>
                          )}

                          {exec.output_data && !exec.output_data.skipped && (
                            <details className="mt-2">
                              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Output data</summary>
                              <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-x-auto text-slate-600">{JSON.stringify(exec.output_data, null, 2)}</pre>
                            </details>
                          )}

                          {exec.status === 'failed' && (
                            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => retryAction(exec)}>
                              Retry
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-6 pt-4 border-t shrink-0">
              {detailOrder.payment_status === 'pending_verification' && (
                <>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approvePayment(detailOrder.id)} disabled={!!actionLoading}>
                    {actionLoading === detailOrder.id + 'approve' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowRejectForm(true)}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                </>
              )}
              {detailOrder.payment_status !== 'pending_verification' && detailOrder.payment_status !== 'paid' && (
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approvePayment(detailOrder.id)} disabled={!!actionLoading}>
                  <Check className="h-4 w-4 mr-2" />Konfirmasi Paid
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOrder(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Form Modal */}
      {showRejectForm && detailOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-700">Tolak Pembayaran</h3>
              <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600">Order: <span className="font-mono font-medium">{detailOrder.order_number}</span></p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alasan Penolakan <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-300"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan pembayaran..."
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => rejectPayment(detailOrder.id)} disabled={!!actionLoading || !rejectReason.trim()}>
                {actionLoading === detailOrder.id + 'reject' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Tolak Pembayaran
              </Button>
              <Button variant="outline" onClick={() => { setShowRejectForm(false); setRejectReason('') }}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Zoom Modal */}
      {zoomProof && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setZoomProof(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={zoomProof} alt="Bukti Pembayaran" className="max-h-[85vh] max-w-[85vw] rounded-xl" />
            <button onClick={() => setZoomProof(null)} className="absolute -top-3 -right-3 bg-white text-slate-800 rounded-full h-8 w-8 flex items-center justify-center shadow-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
