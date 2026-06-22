'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Key, Copy, CheckCircle, Clock, AlertCircle, XCircle, ExternalLink, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

interface LicenseItem {
  id: string
  license_key: string
  status: string
  activated_at: string | null
  expires_at: string | null
  created_at: string
  product_name: string
  order_number: string | null
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  active: { label: 'Active', badge: 'bg-emerald-50 text-emerald-700 border-0', icon: CheckCircle },
  suspended: { label: 'Suspended', badge: 'bg-amber-50 text-amber-700 border-0', icon: Clock },
  expired: { label: 'Expired', badge: 'bg-slate-100 text-slate-600 border-0', icon: AlertCircle },
  revoked: { label: 'Revoked', badge: 'bg-red-50 text-red-700 border-0', icon: XCircle },
}

export default function LicensesPage() {
  const [loading, setLoading] = useState(true)
  const [licenses, setLicenses] = useState<LicenseItem[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchLicenses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('licenses')
        .select('id, license_key, status, activated_at, expires_at, created_at, product:products(name), order:orders(order_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const formatted: LicenseItem[] = (data as any[])?.map(d => ({
        id: d.id,
        license_key: d.license_key || '',
        status: d.status || 'active',
        activated_at: d.activated_at,
        expires_at: d.expires_at,
        created_at: d.created_at,
        product_name: (Array.isArray(d.product) ? d.product[0] : d.product)?.name || 'Unknown Product',
        order_number: (Array.isArray(d.order) ? d.order[0] : d.order)?.order_number || null,
      })) || []

      setLicenses(formatted)
      setLoading(false)
    }
    fetchLicenses()
  }, [])

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(id)
    toast.success('License key disalin')
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">My Licenses</h1>
        <p className="text-slate-500 mt-1">{licenses.length} lisensi aktif</p>
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Key className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-semibold text-slate-700 mb-2">Belum ada lisensi</h3>
            <p className="text-slate-500 text-sm mb-6">Lisensi akan muncul di sini setelah pembayaran dikonfirmasi oleh admin.</p>
            <Link href="/products"><Button variant="outline"><ShoppingBag className="h-4 w-4 mr-2" />Jelajahi Produk</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {licenses.map(lic => {
            const cfg = STATUS_CONFIG[lic.status] || STATUS_CONFIG.active
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === lic.id
            const isExpiring = lic.expires_at && new Date(lic.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && lic.status === 'active'

            return (
              <Card key={lic.id} className={`border-slate-200 transition-shadow ${lic.status === 'active' ? 'hover:shadow-sm' : 'opacity-80'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-slate-900">{lic.product_name}</h3>
                        <Badge className={cfg.badge}>
                          <StatusIcon className="h-3 w-3 mr-1" />{cfg.label}
                        </Badge>
                        {isExpiring && <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">Hampir Kadaluarsa</Badge>}
                      </div>

                      {/* License Key */}
                      <div className="flex items-center gap-2 mt-2 mb-3">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 truncate">
                          {lic.license_key}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 shrink-0"
                          onClick={() => copyKey(lic.id, lic.license_key)}
                        >
                          {copied === lic.id ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          <span className="font-medium">Tanggal Beli:</span>{' '}
                          {new Date(lic.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {lic.activated_at && (
                          <span>
                            <span className="font-medium">Aktivasi:</span>{' '}
                            {new Date(lic.activated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span>
                          <span className="font-medium">Kadaluarsa:</span>{' '}
                          {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Lifetime'}
                        </span>
                        {lic.order_number && (
                          <span>
                            <span className="font-medium">Order:</span>{' '}
                            <span className="font-mono">{lic.order_number}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-slate-500 hover:text-slate-900 shrink-0"
                      onClick={() => setExpandedId(isExpanded ? null : lic.id)}
                    >
                      {isExpanded ? 'Tutup' : 'Detail'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-slate-500 block text-xs font-medium mb-0.5">License Key Lengkap</span>
                        <span className="font-mono text-slate-800 break-all">{lic.license_key}</span></div>
                      <div><span className="text-slate-500 block text-xs font-medium mb-0.5">Produk</span><span>{lic.product_name}</span></div>
                      <div><span className="text-slate-500 block text-xs font-medium mb-0.5">Status</span><Badge className={cfg.badge}>{cfg.label}</Badge></div>
                      <div><span className="text-slate-500 block text-xs font-medium mb-0.5">Tanggal Pembelian</span>
                        <span>{new Date(lic.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                      {lic.activated_at && <div><span className="text-slate-500 block text-xs font-medium mb-0.5">Tanggal Aktivasi</span>
                        <span>{new Date(lic.activated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>}
                      <div><span className="text-slate-500 block text-xs font-medium mb-0.5">Masa Aktif</span>
                        <span>{lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Lifetime'}</span></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
