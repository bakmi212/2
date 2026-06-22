'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Download, Pencil, Trash2, X, Ban, CheckCircle, Search } from 'lucide-react'

interface DownloadEntry {
  id: string
  user_id: string
  product_id: string
  download_count: number
  last_downloaded_at: string | null
  created_at: string
  is_disabled: boolean
  user: { email: string } | null
  product: { name: string; download_type: string | null; download_url: string | null } | null
}

export default function AdminDownloadsPage() {
  const [loading, setLoading] = useState(true)
  const [downloads, setDownloads] = useState<DownloadEntry[]>([])
  const [search, setSearch] = useState('')
  const [editEntry, setEditEntry] = useState<DownloadEntry | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => { fetchDownloads() }, [])

  const fetchDownloads = async () => {
    const { data } = await supabase
      .from('user_downloads')
      .select('id, user_id, product_id, download_count, last_downloaded_at, created_at, is_disabled, user:profiles(email), product:products(name, download_type, download_url)')
      .order('created_at', { ascending: false })
    const formatted: DownloadEntry[] = (data as any[])?.map(row => ({
      id: row.id,
      user_id: row.user_id,
      product_id: row.product_id,
      download_count: row.download_count || 0,
      last_downloaded_at: row.last_downloaded_at,
      created_at: row.created_at,
      is_disabled: row.is_disabled || false,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
      product: Array.isArray(row.product) ? row.product[0] : row.product,
    })) || []
    setDownloads(formatted)
    setLoading(false)
  }

  const toggleDisable = async (entry: DownloadEntry) => {
    await supabase.from('user_downloads').update({ is_disabled: !entry.is_disabled }).eq('id', entry.id)
    toast.success(entry.is_disabled ? 'Download diaktifkan' : 'Download dinonaktifkan')
    fetchDownloads()
  }

  const openEdit = (entry: DownloadEntry) => { setEditEntry(entry); setEditUrl(entry.product?.download_url || '') }

  const saveEdit = async () => {
    if (!editEntry) return
    setSaving(true)
    await supabase.from('products').update({ download_url: editUrl, updated_at: new Date().toISOString() }).eq('id', editEntry.product_id)
    toast.success('Link download diperbarui')
    setSaving(false)
    setEditEntry(null)
    fetchDownloads()
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('user_downloads').delete().eq('id', id)
    toast.success('Entry dihapus')
    setDeleteConfirm(null)
    fetchDownloads()
  }

  const filtered = downloads.filter(d =>
    !search || d.user?.email?.toLowerCase().includes(search.toLowerCase()) || d.product?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Downloads Management</h1>
        <p className="text-slate-500 mt-1">{downloads.length} download records</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Cari produk atau user..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Tidak ada data download</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Produk</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Download Count</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Terakhir Download</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tipe</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-sm text-slate-900">{entry.product?.name || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{entry.user?.email || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-medium">{entry.download_count}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {entry.last_downloaded_at ? new Date(entry.last_downloaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs capitalize">{entry.product?.download_type?.replace('_', ' ') || '-'}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={entry.is_disabled ? 'bg-red-50 text-red-700 border-0' : 'bg-emerald-50 text-emerald-700 border-0'}>
                          {entry.is_disabled ? 'Nonaktif' : 'Aktif'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {deleteConfirm === entry.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => deleteEntry(entry.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Ya</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded">Batal</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(entry)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className={`h-7 px-2 text-xs ${entry.is_disabled ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}`}
                              onClick={() => toggleDisable(entry)}>
                              {entry.is_disabled ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(entry.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Link Download</h3>
              <button onClick={() => setEditEntry(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600"><span className="font-medium">{editEntry.product?.name}</span> — {editEntry.user?.email}</p>
            <div>
              <Label>Download URL</Label>
              <Input className="mt-1" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button>
              <Button variant="outline" onClick={() => setEditEntry(null)}>Batal</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
