'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Download, Package, ExternalLink, FileArchive, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadItem {
  id: string
  product_id: string
  product_name: string
  product_version: string | null
  download_count: number
  last_downloaded_at: string | null
  purchase_date: string
  download_type: string | null
  download_file: string | null
  download_url: string | null
  is_disabled: boolean
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

export default function DownloadsPage() {
  const [loading, setLoading] = useState(true)
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchDownloads = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get paid orders (payment_status = paid OR order_status in processing/completed)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('user_id', user.id)
        .or('payment_status.eq.paid,order_status.eq.processing,order_status.eq.completed')

      if (!orders || orders.length === 0) { setLoading(false); return }

      const orderIds = orders.map(o => o.id)
      const orderDateMap = new Map(orders.map(o => [o.id, o.created_at]))

      // Get user_downloads records for these orders
      const { data: udRows } = await supabase
        .from('user_downloads')
        .select('id, product_id, order_id, download_count, last_downloaded_at, is_disabled, product:products(id, name, version, download_type, download_file, download_url)')
        .eq('user_id', user.id)
        .in('order_id', orderIds)

      if (!udRows || udRows.length === 0) {
        // Fallback: check by order items for products with download_type
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, order_id')
          .in('order_id', orderIds)

        if (items && items.length > 0) {
          const productIds = [...new Set(items.map(i => i.product_id))]
          const { data: products } = await supabase
            .from('products')
            .select('id, name, version, download_type, download_file, download_url')
            .in('id', productIds)
            .not('download_type', 'is', null)

          if (products && products.length > 0) {
            const itemOrderMap = new Map<string, string>()
            items.forEach(i => itemOrderMap.set(i.product_id, i.order_id))
            const result: DownloadItem[] = products.map(p => ({
              id: p.id,
              product_id: p.id,
              product_name: p.name,
              product_version: p.version,
              download_count: 0,
              last_downloaded_at: null,
              purchase_date: orderDateMap.get(itemOrderMap.get(p.id) || '') || new Date().toISOString(),
              download_type: p.download_type,
              download_file: p.download_file,
              download_url: p.download_url,
              is_disabled: false,
            }))
            setDownloads(result)
          }
        }
        setLoading(false)
        return
      }

      const result: DownloadItem[] = (udRows as any[]).map(row => {
        const p = Array.isArray(row.product) ? row.product[0] : row.product
        return {
          id: row.id,
          product_id: row.product_id,
          product_name: p?.name || 'Unknown Product',
          product_version: p?.version || null,
          download_count: row.download_count || 0,
          last_downloaded_at: row.last_downloaded_at,
          purchase_date: orderDateMap.get(row.order_id) || row.created_at,
          download_type: p?.download_type,
          download_file: p?.download_file,
          download_url: p?.download_url,
          is_disabled: row.is_disabled || false,
        }
      })

      setDownloads(result)
      setLoading(false)
    }
    fetchDownloads()
  }, [])

  const handleDownload = async (item: DownloadItem) => {
    if (item.is_disabled) { toast.error('Download telah dinonaktifkan oleh admin'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Silakan login terlebih dahulu'); return }

    let url = ''
    if (item.download_type === 'file_upload' && item.download_file) {
      const { data } = supabase.storage.from('product-downloads').getPublicUrl(item.download_file)
      url = data.publicUrl
    } else if (item.download_type === 'external_url' && item.download_url) {
      url = item.download_url
    }

    if (!url) { toast.error('Link download tidak tersedia'); return }

    setDownloading(item.product_id)
    window.open(url, '_blank')

    // Track download
    if (item.id !== item.product_id) {
      await supabase.from('user_downloads').update({
        download_count: item.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      }).eq('id', item.id)
    } else {
      await supabase.from('user_downloads').upsert({
        user_id: user.id,
        product_id: item.product_id,
        download_count: item.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' })
    }

    setDownloads(prev => prev.map(d => d.product_id === item.product_id
      ? { ...d, download_count: d.download_count + 1, last_downloaded_at: new Date().toISOString() }
      : d
    ))
    setDownloading(null)
    toast.success('Download dimulai')
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">My Downloads</h1>
        <p className="text-slate-500 mt-1">{downloads.length} produk tersedia untuk diunduh</p>
      </div>

      {downloads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-semibold text-slate-700 mb-2">Belum ada produk untuk diunduh</h3>
            <p className="text-slate-500 text-sm mb-6">Produk yang sudah dibayar akan muncul di sini setelah admin mengkonfirmasi pembayaran.</p>
            <Link href="/products"><Button variant="outline"><ShoppingBag className="h-4 w-4 mr-2" />Jelajahi Produk</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {downloads.map(item => (
            <Card key={item.product_id} className={`border-slate-200 ${item.is_disabled ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      {item.download_type === 'external_url' ? <ExternalLink className="h-5 w-5" /> : <FileArchive className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-slate-900">{item.product_name}</h3>
                        {item.product_version && (
                          <Badge variant="outline" className="text-xs">v{item.product_version}</Badge>
                        )}
                        {item.is_disabled && (
                          <Badge className="bg-red-50 text-red-700 border-0 text-xs">Nonaktif</Badge>
                        )}
                        {item.download_type && (
                          <Badge variant="outline" className="text-xs capitalize">{item.download_type.replace('_', ' ')}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          <span className="font-medium">Tanggal Beli:</span>{' '}
                          {new Date(item.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span>
                          <span className="font-medium">Total Download:</span>{' '}
                          <span className="font-semibold text-slate-700">{item.download_count}</span>
                        </span>
                        {item.last_downloaded_at && (
                          <span>
                            <span className="font-medium">Terakhir:</span>{' '}
                            {new Date(item.last_downloaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDownload(item)}
                    disabled={item.is_disabled || downloading === item.product_id || (!item.download_file && !item.download_url)}
                    className="shrink-0"
                  >
                    {downloading === item.product_id
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memuat...</>
                      : <><Download className="h-4 w-4 mr-2" />Download</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
