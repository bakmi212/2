'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  createPurchaseContext,
  createOrderFromContext,
  formatIDR,
  PurchaseContext
} from '@/lib/purchase-context'
import { toast } from 'sonner'
import { Loader as Loader2, CreditCard, Package, CircleAlert as AlertCircle } from 'lucide-react'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('product')
  const variantId = searchParams.get('variant')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [context, setContext] = useState<PurchaseContext | null>(null)
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Checkout] ========== START ==========')
      console.log('[Checkout] URL Product ID:', productId)
      console.log('[Checkout] URL Variant ID:', variantId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirectTo=/checkout?product=' + (productId || ''))
        return
      }

      if (user.email) setForm(f => ({ ...f, email: user.email! }))

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setForm(f => ({ ...f, name: profile.full_name || '', phone: profile.phone || '' }))
      }

      // Fetch payment accounts from Supabase
      const { data: accounts } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('is_active', true)
      setPaymentAccounts(accounts || [])
      if (accounts?.length > 0) setSelectedAccount(accounts[0])

      // ========== SINGLE SOURCE OF TRUTH: Create context from Supabase ==========
      if (productId) {
        console.log('[Checkout] Loading data from Supabase...')

        const purchaseContext = await createPurchaseContext(supabase, {
          productId,
          variantId: variantId || undefined
        })

        // Attach user_id
        purchaseContext.user_id = user.id

        // Debug
        console.log('[Checkout] ========== CONTEXT RESULT ==========')
        console.log('[Checkout] Validated:', purchaseContext.validated)
        console.log('[Checkout] Error:', purchaseContext.error)
        console.log('[Checkout] Product ID:', purchaseContext.product_id)
        console.log('[Checkout] Variant ID:', purchaseContext.variant_id)
        console.log('[Checkout] Product:', purchaseContext.product?.name)
        console.log('[Checkout] Variant:', purchaseContext.variant?.name)
        console.log('[Checkout] Price:', purchaseContext.price)

        setContext(purchaseContext)

        if (!purchaseContext.validated) {
          console.error('[Checkout] Context validation failed:', purchaseContext.error)
        }
      } else {
        console.warn('[Checkout] No productId in URL')
      }

      setLoading(false)
      console.log('[Checkout] ========== END ==========')
    }

    fetchData()
  }, [router, productId, variantId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('[Checkout] ========== SUBMIT ORDER ==========')
    console.log('[Checkout] Context validated:', context?.validated)

    if (!context?.validated) {
      toast.error('Produk atau variant tidak ditemukan')
      return
    }

    if (!selectedAccount) {
      toast.error('Pilih metode pembayaran')
      return
    }

    if (context.price <= 0) {
      toast.error('Harga tidak valid')
      return
    }

    setSubmitting(true)

    console.log('[Checkout] Creating order...')

    const result = await createOrderFromContext(
      supabase,
      context,
      form,
      {
        payment_method: selectedAccount.type,
        payment_account_id: selectedAccount.id
      }
    )

    console.log('[Checkout] Order result:', result)

    if (result.success && result.order) {
      toast.success('Order berhasil dibuat!')
      setCreatedOrder(result.order)
    } else {
      toast.error(result.error || 'Gagal membuat order')
    }

    setSubmitting(false)
  }

  const handleUploadProof = async () => {
    if (!proofFile || !createdOrder) return

    setUploadingProof(true)

    const fileName = `proofs/${createdOrder.order_id}/${Date.now()}_${proofFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('payments')
      .upload(fileName, proofFile)

    if (uploadError) {
      toast.error('Gagal mengunggah bukti pembayaran')
      setUploadingProof(false)
      return
    }

    const proofUrl = supabase.storage.from('payments').getPublicUrl(fileName).data.publicUrl

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_proof: proofUrl,
        payment_status: 'pending_verification'
      })
      .eq('id', createdOrder.order_id)

    if (updateError) {
      toast.error('Gagal menyimpan bukti')
    } else {
      toast.success('Bukti pembayaran berhasil diunggah')
      setCreatedOrder({ ...createdOrder, payment_status: 'pending_verification' })

      await supabase.from('order_timelines').insert({
        order_id: createdOrder.order_id,
        status: 'payment_uploaded',
        description: 'Payment proof uploaded',
        created_by: context?.user_id
      })
    }

    setUploadingProof(false)
  }

  const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setProofFile(file)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Order created - show payment instructions
  if (createdOrder) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Order Berhasil Dibuat</h2>
          <p className="text-muted-foreground mt-1">
            Order: <span className="font-mono font-medium">{createdOrder.order_number}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instruksi Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-700">Total Transfer</span>
              <span className="text-xl font-bold text-blue-900">{formatIDR(context?.total || 0)}</span>
            </div>

            {selectedAccount && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{selectedAccount.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Rekening</span>
                  <span className="font-mono font-medium">{selectedAccount.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atas Nama</span>
                  <span className="font-medium">{selectedAccount.account_holder}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Bukti Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="file" accept="image/*" onChange={handleProofFile} className="w-full" />
            <Button onClick={handleUploadProof} disabled={!proofFile || uploadingProof} className="w-full">
              {uploadingProof ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload Bukti
            </Button>

            {createdOrder.payment_status === 'pending_verification' && (
              <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a href="/dashboard/orders">Lihat Order Saya</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {!context?.validated && productId && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Produk atau Variant Tidak Ditemukan</p>
              <p className="text-sm text-red-600 mt-1">
                {context?.error || 'Produk atau variant tidak tersedia. Silakan periksa kembali.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <Label>No. Telepon</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Catatan</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Catatan opsional..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metode Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentAccounts.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Belum ada metode pembayaran tersedia</p>
                ) : (
                  <div className="space-y-2">
                    {paymentAccounts.map(account => (
                      <label
                        key={account.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 ${
                          selectedAccount?.id === account.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:border-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_account"
                          checked={selectedAccount?.id === account.id}
                          onChange={() => setSelectedAccount(account)}
                        />
                        <div>
                          <p className="font-medium">{account.payment_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.bank_name} - {account.account_number}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Ringkasan Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {context?.validated && context.product ? (
                  <div className="space-y-4">
                    {/* DEBUG IDs */}
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono">
                      <p>Product ID: {context.product_id}</p>
                      {context.variant_id && <p>Variant ID: {context.variant_id}</p>}
                    </div>

                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        {context.product.image_url ? (
                          <img
                            src={context.product.image_url}
                            alt={context.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{context.product.name}</h3>
                        {context.variant && (
                          <Badge className="mt-1">{context.variant.name}</Badge>
                        )}
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-lg font-bold">{formatIDR(context.price)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Variant details from Supabase */}
                    {context.variant && (
                      <div className="text-sm space-y-1 border-t pt-4">
                        {context.variant.duration_days && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Durasi</span>
                            <span className="font-medium">{context.variant.duration_days} hari</span>
                          </div>
                        )}
                        {context.variant.device_limit && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Device Limit</span>
                            <span className="font-medium">{context.variant.device_limit} device</span>
                          </div>
                        )}
                        {context.variant.variant_type && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipe</span>
                            <Badge variant="outline">{context.variant.variant_type}</Badge>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold">{formatIDR(context.total)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                    <p>Tidak ada produk yang dipilih</p>
                    {productId && <p className="text-xs mt-1">Product ID: {productId}</p>}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={
                    submitting ||
                    paymentAccounts.length === 0 ||
                    !context?.validated ||
                    (context?.price || 0) <= 0
                  }
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Bayar Sekarang
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CheckoutContent />
    </Suspense>
  )
}
