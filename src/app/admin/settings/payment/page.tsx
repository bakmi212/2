'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { uploadQrisImage } from '@/lib/supabase/storage'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, Toggle, ImageIcon, X, Eye } from 'lucide-react'

interface PaymentMethod {
  id: string
  name: string
  type: 'auto' | 'manual'
  is_active: boolean
}

interface PaymentAccount {
  id: string
  payment_method_id: string
  type: 'bank_transfer' | 'ewallet' | 'qris'
  payment_name: string
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  merchant_name: string | null
  qris_image: string | null
  is_active: boolean
}

const ACCOUNT_TYPES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'qris', label: 'QRIS' },
]

const emptyAccount = (): Omit<PaymentAccount, 'id'> => ({
  payment_method_id: '',
  type: 'bank_transfer',
  payment_name: '',
  bank_name: '',
  account_number: '',
  account_holder: '',
  merchant_name: '',
  qris_image: null,
  is_active: true,
})

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [showMethodForm, setShowMethodForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null)
  const [methodForm, setMethodForm] = useState({ name: '', type: 'manual' as 'auto' | 'manual' })
  const [accountForm, setAccountForm] = useState(emptyAccount())
  const [qrisPreview, setQrisPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const qrisFileRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from('payment_methods').select('*').order('created_at'),
      supabase.from('payment_accounts').select('*').order('created_at'),
    ])
    setMethods(m || [])
    setAccounts(a || [])
    setLoading(false)
  }

  // --- Methods ---
  const openMethodForm = (method?: PaymentMethod) => {
    if (method) { setEditingMethod(method); setMethodForm({ name: method.name, type: method.type }) }
    else { setEditingMethod(null); setMethodForm({ name: '', type: 'manual' }) }
    setShowMethodForm(true)
  }

  const saveMethod = async () => {
    if (!methodForm.name.trim()) { toast.error('Nama method wajib diisi'); return }
    setSaving(true)
    if (editingMethod) {
      const { error } = await supabase.from('payment_methods').update({ name: methodForm.name, type: methodForm.type, updated_at: new Date().toISOString() }).eq('id', editingMethod.id)
      if (error) toast.error('Gagal menyimpan')
      else toast.success('Method diperbarui')
    } else {
      const { error } = await supabase.from('payment_methods').insert({ name: methodForm.name, type: methodForm.type })
      if (error) toast.error('Gagal menyimpan')
      else toast.success('Method ditambahkan')
    }
    setSaving(false)
    setShowMethodForm(false)
    fetchAll()
  }

  const toggleMethod = async (method: PaymentMethod) => {
    await supabase.from('payment_methods').update({ is_active: !method.is_active }).eq('id', method.id)
    fetchAll()
  }

  const deleteMethod = async (id: string) => {
    if (!confirm('Hapus payment method ini?')) return
    await supabase.from('payment_methods').delete().eq('id', id)
    toast.success('Method dihapus')
    fetchAll()
  }

  // --- Accounts ---
  const openAccountForm = (account?: PaymentAccount) => {
    if (account) {
      setEditingAccount(account)
      setAccountForm({ ...account })
      setQrisPreview(account.qris_image)
    } else {
      setEditingAccount(null)
      const defaultMethod = methods.find(m => m.type === 'manual')
      setAccountForm({ ...emptyAccount(), payment_method_id: defaultMethod?.id || '' })
      setQrisPreview(null)
    }
    setShowAccountForm(true)
  }

  const handleQrisFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Format file tidak didukung. Gunakan JPG, PNG, atau WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimal 5 MB'); return }
    const preview = URL.createObjectURL(file)
    setQrisPreview(preview)
    setUploading(true)
    const url = await uploadQrisImage(file)
    setUploading(false)
    if (url) { setAccountForm(f => ({ ...f, qris_image: url })); toast.success('Gambar QRIS berhasil diunggah') }
    else toast.error('Gagal mengunggah gambar QRIS')
  }

  const saveAccount = async () => {
    if (!accountForm.payment_name.trim()) { toast.error('Nama pembayaran wajib diisi'); return }
    if (accountForm.type === 'qris' && !accountForm.qris_image) { toast.error('QRIS Image wajib diunggah untuk metode pembayaran QRIS.'); return }
    setSaving(true)
    const payload = {
      payment_method_id: accountForm.payment_method_id || null,
      type: accountForm.type,
      payment_name: accountForm.payment_name,
      bank_name: accountForm.bank_name || null,
      account_number: accountForm.account_number || null,
      account_holder: accountForm.account_holder || null,
      merchant_name: accountForm.merchant_name || null,
      qris_image: accountForm.qris_image || null,
      is_active: accountForm.is_active,
    }
    if (editingAccount) {
      const { error } = await supabase.from('payment_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingAccount.id)
      if (error) toast.error('Gagal menyimpan')
      else toast.success('Akun diperbarui')
    } else {
      const { error } = await supabase.from('payment_accounts').insert(payload)
      if (error) toast.error('Gagal menyimpan')
      else toast.success('Akun ditambahkan')
    }
    setSaving(false)
    setShowAccountForm(false)
    fetchAll()
  }

  const toggleAccount = async (account: PaymentAccount) => {
    await supabase.from('payment_accounts').update({ is_active: !account.is_active }).eq('id', account.id)
    fetchAll()
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('Hapus akun pembayaran ini?')) return
    await supabase.from('payment_accounts').delete().eq('id', id)
    toast.success('Akun dihapus')
    fetchAll()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment Settings</h1>
        <p className="text-slate-500 mt-1">Kelola metode dan akun pembayaran platform</p>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle className="text-base font-medium">Payment Methods</CardTitle>
          <Button size="sm" onClick={() => openMethodForm()}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Method
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {methods.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada payment method</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tipe</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th><th className="py-3 px-4"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {methods.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-sm text-slate-900">{m.name}</td>
                    <td className="py-3 px-4"><Badge variant="outline" className="capitalize">{m.type}</Badge></td>
                    <td className="py-3 px-4">
                      <Badge className={m.is_active ? 'bg-emerald-50 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                        {m.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => toggleMethod(m)}>{m.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openMethodForm(m)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => deleteMethod(m.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payment Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle className="text-base font-medium">Payment Accounts</CardTitle>
          <Button size="sm" onClick={() => openAccountForm()}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Akun
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada akun pembayaran. Tambahkan rekening bank, e-wallet, atau QRIS.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tipe</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Detail</th><th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th><th className="py-3 px-4"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-sm text-slate-900">{a.payment_name}</td>
                    <td className="py-3 px-4"><Badge variant="outline" className="capitalize text-xs">{a.type.replace('_', ' ')}</Badge></td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {a.type === 'qris' ? (
                        a.qris_image ? (
                          <button onClick={() => setZoomImage(a.qris_image)} className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <Eye className="h-3 w-3" /> Lihat QRIS
                          </button>
                        ) : <span className="text-red-500 text-xs">Belum ada gambar</span>
                      ) : (
                        <span>{a.bank_name || a.account_number ? `${a.bank_name || ''} ${a.account_number || ''}`.trim() : '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={a.is_active ? 'bg-emerald-50 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => toggleAccount(a)}>{a.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openAccountForm(a)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => deleteAccount(a.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Method Form Modal */}
      {showMethodForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingMethod ? 'Edit Method' : 'Tambah Payment Method'}</h3>
              <button onClick={() => setShowMethodForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Nama Method</Label><Input className="mt-1" value={methodForm.name} onChange={e => setMethodForm(f => ({ ...f, name: e.target.value }))} placeholder="cth: Manual Payment, Midtrans" /></div>
              <div><Label>Tipe</Label>
                <select className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" value={methodForm.type} onChange={e => setMethodForm(f => ({ ...f, type: e.target.value as 'auto' | 'manual' }))}>
                  <option value="manual">Manual</option>
                  <option value="auto">Auto (Gateway)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveMethod} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button>
              <Button variant="outline" onClick={() => setShowMethodForm(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingAccount ? 'Edit Akun' : 'Tambah Akun Pembayaran'}</h3>
              <button onClick={() => setShowAccountForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <select className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" value={accountForm.payment_method_id} onChange={e => setAccountForm(f => ({ ...f, payment_method_id: e.target.value }))}>
                  <option value="">-- Pilih Method --</option>
                  {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <Label>Tipe Akun</Label>
                <div className="flex gap-2 mt-1">
                  {ACCOUNT_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => { setAccountForm(f => ({ ...f, type: t.value as any })); setQrisPreview(null) }}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${accountForm.type === t.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div><Label>Nama Pembayaran</Label><Input className="mt-1" value={accountForm.payment_name} onChange={e => setAccountForm(f => ({ ...f, payment_name: e.target.value }))} placeholder="cth: BCA, GoPay, QRIS Toko" /></div>

              {accountForm.type === 'bank_transfer' && (
                <>
                  <div><Label>Nama Bank</Label><Input className="mt-1" value={accountForm.bank_name || ''} onChange={e => setAccountForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="cth: Bank BCA, Mandiri" /></div>
                  <div><Label>Nomor Rekening</Label><Input className="mt-1" value={accountForm.account_number || ''} onChange={e => setAccountForm(f => ({ ...f, account_number: e.target.value }))} placeholder="0123456789" /></div>
                  <div><Label>Nama Pemilik Rekening</Label><Input className="mt-1" value={accountForm.account_holder || ''} onChange={e => setAccountForm(f => ({ ...f, account_holder: e.target.value }))} placeholder="Nama sesuai buku tabungan" /></div>
                </>
              )}

              {accountForm.type === 'ewallet' && (
                <>
                  <div><Label>Nama E-Wallet</Label><Input className="mt-1" value={accountForm.bank_name || ''} onChange={e => setAccountForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="cth: GoPay, OVO, Dana" /></div>
                  <div><Label>Nomor Akun</Label><Input className="mt-1" value={accountForm.account_number || ''} onChange={e => setAccountForm(f => ({ ...f, account_number: e.target.value }))} placeholder="08xxxxxxxxxx" /></div>
                  <div><Label>Nama Pemilik</Label><Input className="mt-1" value={accountForm.account_holder || ''} onChange={e => setAccountForm(f => ({ ...f, account_holder: e.target.value }))} placeholder="Nama pemilik akun" /></div>
                </>
              )}

              {accountForm.type === 'qris' && (
                <>
                  <div><Label>Nama Merchant <span className="text-slate-400 font-normal">(opsional)</span></Label><Input className="mt-1" value={accountForm.merchant_name || ''} onChange={e => setAccountForm(f => ({ ...f, merchant_name: e.target.value }))} placeholder="Nama merchant QRIS" /></div>
                  <div>
                    <Label>Gambar QRIS <span className="text-red-500">*</span></Label>
                    <div className="mt-1">
                      {qrisPreview ? (
                        <div className="space-y-2">
                          <div className="relative inline-block">
                            <img src={qrisPreview} alt="QRIS Preview" className="h-48 w-48 object-contain border rounded-lg" />
                            <button onClick={() => { setQrisPreview(null); setAccountForm(f => ({ ...f, qris_image: null })); if (qrisFileRef.current) qrisFileRef.current.value = '' }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {uploading && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Menggunggah...</p>}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => qrisFileRef.current?.click()}>
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-500">Klik untuk upload gambar QRIS</p>
                          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 5 MB</p>
                        </div>
                      )}
                      <input ref={qrisFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleQrisFile} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="acc-active" checked={accountForm.is_active} onChange={e => setAccountForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4" />
                <Label htmlFor="acc-active">Aktif</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveAccount} disabled={saving || uploading} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan
              </Button>
              <Button variant="outline" onClick={() => setShowAccountForm(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setZoomImage(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={zoomImage} alt="QRIS" className="max-h-[80vh] max-w-[80vw] rounded-xl" />
            <button onClick={() => setZoomImage(null)} className="absolute -top-3 -right-3 bg-white text-slate-800 rounded-full h-8 w-8 flex items-center justify-center shadow-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
