'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, X, RefreshCw, Ban, CheckCircle, Search, Copy, Layers } from 'lucide-react'

interface License {
  id: string
  license_key: string
  status: string
  activated_at: string | null
  expires_at: string | null
  created_at: string
  order_id: string | null
  user: { email: string } | null
  product: { name: string } | null
}

interface Template {
  id: string
  name: string
  pattern: string
  validity_days: number | null
  is_active: boolean
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-0',
  suspended: 'bg-amber-50 text-amber-700 border-0',
  expired: 'bg-slate-100 text-slate-600 border-0',
  revoked: 'bg-red-50 text-red-700 border-0',
}

function generateLicenseKey(pattern: string, orderId?: string, userId?: string): string {
  const random = () => Math.random().toString(36).substr(2, 8).toUpperCase()
  const now = new Date()
  return pattern
    .replace(/{RANDOM}/g, random())
    .replace(/{YYYY}/g, String(now.getFullYear()))
    .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
    .replace(/{DD}/g, String(now.getDate()).padStart(2, '0'))
    .replace(/{ORDER_ID}/g, (orderId || '').slice(0, 8).toUpperCase())
    .replace(/{USER_ID}/g, (userId || '').slice(0, 8).toUpperCase())
}

const FILTER_TABS = ['all', 'active', 'suspended', 'expired', 'revoked']

export default function AdminLicensesPage() {
  const [loading, setLoading] = useState(true)
  const [licenses, setLicenses] = useState<License[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'licenses' | 'templates'>('licenses')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [tForm, setTForm] = useState({ name: '', pattern: 'LICENSE-{RANDOM}', validity_days: '', is_active: true })
  const [tPreview, setTPreview] = useState('')

  // Manual license form
  const [showLicenseForm, setShowLicenseForm] = useState(false)
  const [users, setUsers] = useState<{ id: string; user_id: string; email: string }[]>([])
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [lForm, setLForm] = useState({ user_id: '', product_id: '', template_id: '', license_key: '', expires_at: '' })

  const supabase = createBrowserClient()

  useEffect(() => { fetchAll() }, [filter])

  const fetchAll = async () => {
    const [{ data: lic }, { data: tmpl }] = await Promise.all([
      supabase.from('licenses')
        .select('id, license_key, status, activated_at, expires_at, created_at, order_id, user:profiles(email), product:products(name)')
        .order('created_at', { ascending: false }),
      supabase.from('license_templates').select('*').order('created_at'),
    ])
    const formattedLic: License[] = (lic as any[])?.map(row => ({
      id: row.id,
      license_key: row.license_key,
      status: row.status || 'active',
      activated_at: row.activated_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      order_id: row.order_id,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
      product: Array.isArray(row.product) ? row.product[0] : row.product,
    })) || []
    setLicenses(formattedLic)
    setTemplates(tmpl || [])
    setLoading(false)
  }

  const fetchUsersProducts = async () => {
    const [{ data: u }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id, user_id, email').order('email'),
      supabase.from('products').select('id, name').in('status', ['active']).order('name'),
    ])
    setUsers(u || [])
    setProducts(p || [])
  }

  // --- Template actions ---
  const openTemplateForm = (t?: Template) => {
    if (t) { setEditingTemplate(t); setTForm({ name: t.name, pattern: t.pattern, validity_days: t.validity_days ? String(t.validity_days) : '', is_active: t.is_active }) }
    else { setEditingTemplate(null); setTForm({ name: '', pattern: 'LICENSE-{RANDOM}', validity_days: '', is_active: true }) }
    setTPreview(generateLicenseKey(t?.pattern || 'LICENSE-{RANDOM}'))
    setShowTemplateForm(true)
  }

  const saveTemplate = async () => {
    if (!tForm.name.trim() || !tForm.pattern.trim()) { toast.error('Nama dan pattern wajib diisi'); return }
    const payload = { name: tForm.name, pattern: tForm.pattern, validity_days: tForm.validity_days ? parseInt(tForm.validity_days) : null, is_active: tForm.is_active }
    if (editingTemplate) {
      await supabase.from('license_templates').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingTemplate.id)
      toast.success('Template diperbarui')
    } else {
      await supabase.from('license_templates').insert(payload)
      toast.success('Template ditambahkan')
    }
    setShowTemplateForm(false)
    fetchAll()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini?')) return
    await supabase.from('license_templates').delete().eq('id', id)
    toast.success('Template dihapus')
    fetchAll()
  }

  // --- License actions ---
  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id + status)
    await supabase.from('licenses').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    toast.success('Status lisensi diperbarui')
    setActionLoading(null)
    fetchAll()
  }

  const regenerateLicense = async (license: License) => {
    const tmpl = templates.find(t => t.is_active) || templates[0]
    const pattern = tmpl?.pattern || 'LICENSE-{RANDOM}'
    const newKey = generateLicenseKey(pattern, license.order_id || '', '')
    setActionLoading(license.id + 'regen')
    await supabase.from('licenses').update({ license_key: newKey, updated_at: new Date().toISOString() }).eq('id', license.id)
    toast.success('Lisensi di-generate ulang')
    setActionLoading(null)
    fetchAll()
  }

  const deleteLicense = async (id: string) => {
    await supabase.from('licenses').delete().eq('id', id)
    toast.success('Lisensi dihapus')
    setDeleteConfirm(null)
    fetchAll()
  }

  const copyKey = (key: string) => { navigator.clipboard.writeText(key); toast.success('Disalin') }

  // --- Manual license ---
  const openLicenseForm = async () => {
    await fetchUsersProducts()
    const tmpl = templates.find(t => t.is_active)
    setLForm({ user_id: '', product_id: '', template_id: tmpl?.id || '', license_key: tmpl ? generateLicenseKey(tmpl.pattern) : 'LICENSE-' + Math.random().toString(36).substr(2, 8).toUpperCase(), expires_at: '' })
    setShowLicenseForm(true)
  }

  const handleTemplateChange = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId)
    const key = tmpl ? generateLicenseKey(tmpl.pattern) : ''
    setLForm(f => ({ ...f, template_id: templateId, license_key: key }))
  }

  const saveLicense = async () => {
    if (!lForm.user_id || !lForm.product_id || !lForm.license_key) { toast.error('User, produk, dan license key wajib diisi'); return }
    const { data: profile } = await supabase.from('profiles').select('user_id').eq('id', lForm.user_id).single()
    if (!profile) { toast.error('User tidak ditemukan'); return }
    const tmpl = templates.find(t => t.id === lForm.template_id)
    let expiresAt = lForm.expires_at || null
    if (!expiresAt && tmpl?.validity_days) {
      const d = new Date()
      d.setDate(d.getDate() + tmpl.validity_days)
      expiresAt = d.toISOString()
    }
    const { error } = await supabase.from('licenses').insert({
      user_id: profile.user_id,
      product_id: lForm.product_id,
      template_id: lForm.template_id || null,
      license_key: lForm.license_key,
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: expiresAt,
      purchase_date: new Date().toISOString(),
    })
    if (error) { toast.error('Gagal menyimpan lisensi'); return }
    toast.success('Lisensi ditambahkan')
    setShowLicenseForm(false)
    fetchAll()
  }

  const filtered = licenses.filter(l => {
    const matchStatus = filter === 'all' || l.status === filter
    const matchSearch = !search || l.license_key?.toLowerCase().includes(search.toLowerCase()) || l.user?.email?.toLowerCase().includes(search.toLowerCase()) || l.product?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">License Management</h1>
          <p className="text-slate-500 mt-1">{licenses.length} lisensi terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openTemplateForm()}>
            <Layers className="h-4 w-4 mr-2" />Template
          </Button>
          <Button onClick={openLicenseForm}>
            <Plus className="h-4 w-4 mr-2" />Tambah Lisensi
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => setActiveTab('licenses')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'licenses' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'}`}>Lisensi</button>
        <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'templates' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'}`}>Templates</button>
      </div>

      {activeTab === 'licenses' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Cari license key, produk, customer..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {FILTER_TABS.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${filter === s ? 'bg-blue-600 text-white font-medium' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                  {s === 'all' ? 'Semua' : s}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">Tidak ada lisensi ditemukan</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">License Key</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Produk</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Customer</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Dibuat</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Kadaluarsa</th>
                        <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(lic => (
                        <tr key={lic.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-800 max-w-[160px] truncate">{lic.license_key}</span>
                              <button onClick={() => copyKey(lic.license_key)} className="text-slate-400 hover:text-blue-600"><Copy className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{lic.product?.name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{lic.user?.email || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge className={STATUS_COLORS[lic.status] || 'bg-slate-100 text-slate-600 border-0'}>{lic.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{new Date(lic.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-4 text-xs text-slate-500">{lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('id-ID') : 'Lifetime'}</td>
                          <td className="py-3 px-4">
                            {deleteConfirm === lic.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => deleteLicense(lic.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Ya</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded">Batal</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap">
                                {lic.status !== 'active' && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => updateStatus(lic.id, 'active')} disabled={!!actionLoading}>
                                    <CheckCircle className="h-3 w-3 mr-1" />Aktifkan
                                  </Button>
                                )}
                                {lic.status === 'active' && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                    onClick={() => updateStatus(lic.id, 'suspended')} disabled={!!actionLoading}>
                                    <Ban className="h-3 w-3 mr-1" />Suspend
                                  </Button>
                                )}
                                {lic.status !== 'revoked' && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => updateStatus(lic.id, 'revoked')} disabled={!!actionLoading}>
                                    Revoke
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                  onClick={() => regenerateLicense(lic)} disabled={!!actionLoading} title="Generate ulang">
                                  {actionLoading === lic.id + 'regen' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 hover:bg-red-50"
                                  onClick={() => setDeleteConfirm(lic.id)}>
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
        </>
      )}

      {activeTab === 'templates' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-5">
            <CardTitle className="text-base font-medium">License Templates</CardTitle>
            <Button size="sm" onClick={() => openTemplateForm()}><Plus className="h-4 w-4 mr-1" />Tambah Template</Button>
          </CardHeader>
          <CardContent className="p-0">
            {templates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada template</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Pattern</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Preview</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Masa Aktif</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th><th className="py-3 px-4"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-sm">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{t.pattern}</td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-600">{generateLicenseKey(t.pattern)}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{t.validity_days ? `${t.validity_days} hari` : 'Lifetime'}</td>
                      <td className="py-3 px-4"><Badge className={t.is_active ? 'bg-emerald-50 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}>{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openTemplateForm(t)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-4 pb-4 pt-3 border-t">
              <p className="text-xs text-slate-500 font-medium mb-1">Variabel yang didukung:</p>
              <div className="flex flex-wrap gap-2">
                {['{RANDOM}', '{YYYY}', '{MM}', '{DD}', '{ORDER_ID}', '{USER_ID}'].map(v => (
                  <code key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingTemplate ? 'Edit Template' : 'Tambah Template'}</h3>
              <button onClick={() => setShowTemplateForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Nama Template</Label><Input className="mt-1" value={tForm.name} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))} placeholder="cth: Default License" /></div>
              <div>
                <Label>Pattern</Label>
                <Input className="mt-1 font-mono" value={tForm.pattern} onChange={e => { setTForm(f => ({ ...f, pattern: e.target.value })); setTPreview(generateLicenseKey(e.target.value)) }} placeholder="LICENSE-{RANDOM}" />
                {tPreview && <p className="text-xs text-slate-500 mt-1">Preview: <span className="font-mono text-blue-600">{tPreview}</span></p>}
              </div>
              <div><Label>Masa Aktif (hari, kosongkan = Lifetime)</Label><Input className="mt-1" type="number" min="1" value={tForm.validity_days} onChange={e => setTForm(f => ({ ...f, validity_days: e.target.value }))} placeholder="365" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="t-active" checked={tForm.is_active} onChange={e => setTForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4" /><Label htmlFor="t-active">Aktif</Label></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveTemplate} className="flex-1">Simpan</Button>
              <Button variant="outline" onClick={() => setShowTemplateForm(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual License Form Modal */}
      {showLicenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tambah Lisensi Manual</h3>
              <button onClick={() => setShowLicenseForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Customer</Label>
                <select className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" value={lForm.user_id} onChange={e => setLForm(f => ({ ...f, user_id: e.target.value }))}>
                  <option value="">-- Pilih User --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
              </div>
              <div>
                <Label>Produk</Label>
                <select className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" value={lForm.product_id} onChange={e => setLForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Template</Label>
                <select className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" value={lForm.template_id} onChange={e => handleTemplateChange(e.target.value)}>
                  <option value="">-- Pilih Template --</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.pattern})</option>)}
                </select>
              </div>
              <div>
                <Label>License Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input className="font-mono" value={lForm.license_key} onChange={e => setLForm(f => ({ ...f, license_key: e.target.value }))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const tmpl = templates.find(t => t.id === lForm.template_id)
                    setLForm(f => ({ ...f, license_key: generateLicenseKey(tmpl?.pattern || 'LICENSE-{RANDOM}') }))
                  }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div><Label>Tanggal Kadaluarsa (opsional)</Label><Input className="mt-1" type="date" value={lForm.expires_at} onChange={e => setLForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveLicense} className="flex-1">Simpan</Button>
              <Button variant="outline" onClick={() => setShowLicenseForm(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
