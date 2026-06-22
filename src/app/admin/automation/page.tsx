'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Search, RefreshCw, X, ChevronDown, ChevronUp, Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

interface Execution {
  id: string
  execution_code: string
  order_id: string | null
  action_name: string | null
  action_type: string | null
  status: string
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  retry_count: number
  error_message: string | null
  output_data: any
  order_number: string | null
  user_email: string | null
  product_name: string | null
}

const STATUS_TABS = ['all', 'success', 'failed', 'running', 'pending']

const statusBadge = (status: string) => {
  switch (status) {
    case 'success': return <Badge className="bg-emerald-50 text-emerald-700 border-0"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>
    case 'failed': return <Badge className="bg-red-50 text-red-700 border-0"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
    case 'running': return <Badge className="bg-blue-50 text-blue-700 border-0"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
    case 'pending': return <Badge className="bg-amber-50 text-amber-700 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    case 'cancelled': return <Badge className="bg-slate-100 text-slate-600 border-0">Cancelled</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

export default function AutomationLogsPage() {
  const [loading, setLoading] = useState(true)
  const [executions, setExecutions] = useState<Execution[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchExecutions = useCallback(async () => {
    let query = supabase
      .from('action_executions')
      .select(`
        id, execution_code, order_id, action_name, action_type, status,
        started_at, completed_at, duration_ms, retry_count, error_message, output_data,
        order:orders(order_number),
        user:profiles(email),
        product:products(name)
      `)
      .order('started_at', { ascending: false })
      .limit(200)

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    const formatted: Execution[] = (data as any[])?.map(row => ({
      id: row.id,
      execution_code: row.execution_code,
      order_id: row.order_id,
      action_name: row.action_name,
      action_type: row.action_type,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_ms,
      retry_count: row.retry_count || 0,
      error_message: row.error_message,
      output_data: row.output_data,
      order_number: (Array.isArray(row.order) ? row.order[0] : row.order)?.order_number || null,
      user_email: (Array.isArray(row.user) ? row.user[0] : row.user)?.email || null,
      product_name: (Array.isArray(row.product) ? row.product[0] : row.product)?.name || null,
    })) || []
    setExecutions(formatted)
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchExecutions() }, [fetchExecutions])

  const retryExecution = async (exec: Execution) => {
    await supabase.from('action_executions').update({ status: 'pending', error_message: null }).eq('id', exec.id)
    toast.success('Action dijadwalkan ulang')
    fetchExecutions()
  }

  const filtered = executions.filter(e =>
    !search ||
    e.execution_code?.toLowerCase().includes(search.toLowerCase()) ||
    e.action_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    e.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.order_number?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const stats = {
    total: executions.length,
    success: executions.filter(e => e.status === 'success').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running').length,
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Automation Logs</h1>
          <p className="text-slate-500 mt-1">Action execution history & component logs</p>
        </div>
        <Button variant="outline" onClick={() => fetchExecutions()}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Executions', value: stats.total, color: 'text-slate-900' },
          { label: 'Success', value: stats.success, color: 'text-emerald-700' },
          { label: 'Failed', value: stats.failed, color: 'text-red-700' },
          { label: 'Running', value: stats.running, color: 'text-blue-700' },
        ].map(stat => (
          <Card key={stat.label} className="bg-white border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Cari execution code, action, user, produk..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${filter === s ? 'bg-blue-600 text-white font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {s === 'all' ? 'Semua' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Tidak ada execution log ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Execution</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Order</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Produk</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Start</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Duration</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(exec => (
                    <>
                      <tr key={exec.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${expanded === exec.id ? 'bg-slate-50' : ''}`} onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-slate-700">{exec.execution_code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-slate-900">{exec.action_name || '-'}</p>
                          <p className="text-xs text-slate-400 font-mono">{exec.action_type}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{exec.order_number || exec.order_id?.slice(0, 8) || '-'}</td>
                        <td className="py-3 px-4 text-xs text-slate-600 max-w-[140px] truncate">{exec.user_email || '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 max-w-[120px] truncate">{exec.product_name || '-'}</td>
                        <td className="py-3 px-4">{statusBadge(exec.status)}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {exec.started_at ? new Date(exec.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                          <p className="text-slate-400">{exec.started_at ? new Date(exec.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {exec.duration_ms != null ? (exec.duration_ms < 1000 ? `${exec.duration_ms}ms` : `${(exec.duration_ms / 1000).toFixed(1)}s`) : '-'}
                          {exec.retry_count > 0 && <p className="text-amber-600">{exec.retry_count} retry</p>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {exec.status === 'failed' && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={e => { e.stopPropagation(); retryExecution(exec) }}>
                                <RefreshCw className="h-3 w-3 mr-1" />Retry
                              </Button>
                            )}
                            {expanded === exec.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expanded === exec.id && (
                        <tr key={exec.id + '-expanded'} className="bg-slate-50/80">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {exec.error_message && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                  <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />Error</p>
                                  <p className="text-xs font-mono text-red-700 break-all">{exec.error_message}</p>
                                </div>
                              )}
                              {exec.output_data && (
                                <div className="bg-white border border-slate-100 rounded-lg p-3">
                                  <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Zap className="h-3.5 w-3.5" />Output</p>
                                  <pre className="text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(exec.output_data, null, 2)}</pre>
                                </div>
                              )}
                              <div className="text-xs text-slate-500 space-y-1.5">
                                <p><span className="font-medium text-slate-700">Execution ID:</span> {exec.id}</p>
                                {exec.started_at && <p><span className="font-medium text-slate-700">Started:</span> {new Date(exec.started_at).toLocaleString('id-ID')}</p>}
                                {exec.completed_at && <p><span className="font-medium text-slate-700">Completed:</span> {new Date(exec.completed_at).toLocaleString('id-ID')}</p>}
                                {exec.order_id && <p><span className="font-medium text-slate-700">Order ID:</span> <span className="font-mono">{exec.order_id}</span></p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
