'use client'

import { useState, useEffect, useRef, FormEvent, Suspense, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@/lib/supabase/client'
import { uploadProductImage, validateImageFile, deleteProductImage, uploadProductDownload, validateDownloadFile, deleteProductDownload } from '@/lib/supabase/storage'
import { toast } from 'sonner'
import { Loader2, Upload, X, Trash2 } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  VariantEditor,
  validateVariants,
  prepareVariantForSave,
  type Variant,
} from '@/components/product-variant-editor'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  price: number
  compare_price: number | null
  category_id: string | null
  image_url: string | null
  status: 'active' | 'sold_out' | 'coming_soon'
  download_type: 'file_upload' | 'external_url' | null
  download_file: string | null
  download_url: string | null
  affiliate_enabled: boolean
  commission_type: string | null
  commission_value: number | null
  license_enabled: boolean
  license_type: string | null
  license_duration: string | null
  custom_license_days: number | null
  variants_enabled: boolean
}

interface ProductVariant {
  id: string
  variant_type: string
  name: string
  price: number
  description: string | null
  duration_days: number | null
  device_limit: number | null
  min_quantity: number | null
  max_quantity: number | null
  billing_period: string | null
  subscription_duration: number | null
  feature_list: string[] | null
  access_duration_days: number | null
  benefits: string[] | null
  sort_order: number
}

function EditProductForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [downloadFile, setDownloadFile] = useState<File | null>(null)
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [downloadUploading, setDownloadUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const downloadInputRef = useRef<HTMLInputElement>(null)
  const [variantsEnabled, setVariantsEnabled] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])

  const [form, setForm] = useState<Record<string, any>>({
    name: '', slug: '', description: '', short_description: '', price: '', compare_price: '', category_id: '',
    image_url: '', status: 'active', download_type: '', download_url: '',
    affiliate_enabled: false, commission_type: '', commission_value: '',
    license_enabled: false, license_type: '', license_duration: '', custom_license_days: '',
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: product }, { data: cats }, { data: productVariants }] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
      ])
      if (product) {
        setForm({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          short_description: product.short_description || '',
          price: product.price?.toString() || '',
          compare_price: product.compare_price?.toString() || '',
          category_id: product.category_id || '',
          image_url: product.image_url || '',
          status: product.status || 'active',
          download_type: product.download_type || '',
          download_url: product.download_url || '',
          affiliate_enabled: product.affiliate_enabled || false,
          commission_type: product.commission_type || '',
          commission_value: product.commission_value?.toString() || '',
          license_enabled: product.license_enabled || false,
          license_type: product.license_type || '',
          license_duration: product.license_duration || '',
          custom_license_days: product.custom_license_days?.toString() || '',
        })
        if (product.image_url) setImagePreview(product.image_url)
        if (product.download_file) setDownloadFileName(product.download_file.split('/').pop() || null)
        setVariantsEnabled(product.variants_enabled || false)
      }
      if (productVariants && productVariants.length > 0) {
        setVariants(productVariants.map((v: ProductVariant) => ({
          id: v.id,
          variant_type: v.variant_type as Variant['variant_type'],
          name: v.name,
          price: v.price?.toString() || '',
          description: v.description || '',
          duration_days: v.duration_days?.toString() || '',
          device_limit: v.device_limit?.toString() || '',
          min_quantity: v.min_quantity?.toString() || '',
          max_quantity: v.max_quantity?.toString() || '',
          billing_period: (v.billing_period || '') as Variant['billing_period'],
          subscription_duration: v.subscription_duration?.toString() || '',
          feature_list: v.feature_list || [],
          access_duration_days: v.access_duration_days?.toString() || '',
          benefits: v.benefits || [],
          sort_order: v.sort_order,
          is_expanded: false,
        })))
      }
      setCategories(cats || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) { toast.error(validation.error); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null); setImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleDownloadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateDownloadFile(file)
    if (!validation.valid) { toast.error(validation.error); return }
    setDownloadFile(file)
    setDownloadFileName(file.name)
  }

  const handleRemoveDownload = () => {
    setDownloadFile(null); setDownloadFileName(null)
    if (downloadInputRef.current) downloadInputRef.current.value = ''
  }

  const validateForm = (): boolean => {
    if (!form.name.trim()) { toast.error('Name is required'); return false }

    if (variantsEnabled) {
      if (variants.length === 0) {
        toast.error('At least one variant is required when variants are enabled')
        return false
      }
      const variantError = validateVariants(variants)
      if (variantError) { toast.error(variantError); return false }
    } else {
      if (!form.price || parseFloat(form.price) <= 0) { toast.error('Price must be greater than 0'); return false }
    }

    if (form.affiliate_enabled) {
      if (!form.commission_type) { toast.error('Commission type required'); return false }
      if (!form.commission_value || parseFloat(form.commission_value) <= 0) { toast.error('Commission value required'); return false }
      if (form.commission_type === 'percentage' && parseFloat(form.commission_value) > 100) { toast.error('Cannot exceed 100%'); return false }
    }
    if (form.license_enabled && !variantsEnabled) {
      if (!form.license_type) { toast.error('License type required'); return false }
      if (!form.license_duration) { toast.error('License duration required'); return false }
      if (form.license_duration === 'custom' && !form.custom_license_days) { toast.error('Custom days required'); return false }
    }
    return true
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)

    let imageUrl = form.image_url
    let downloadFilePath = form.download_file

    if (imageFile) {
      setImageUploading(true)
      const newUrl = await uploadProductImage(imageFile, form.slug || form.name)
      setImageUploading(false)
      if (newUrl) {
        if (form.image_url) await deleteProductImage(form.image_url)
        imageUrl = newUrl
      } else { toast.error('Image upload failed'); setSaving(false); return }
    }

    if (imagePreview === null && form.image_url) {
      await deleteProductImage(form.image_url)
      imageUrl = ''
    }

    if (form.download_type === 'file_upload' && downloadFile) {
      setDownloadUploading(true)
      const newPath = await uploadProductDownload(downloadFile, form.slug || form.name)
      setDownloadUploading(false)
      if (newPath) {
        if (form.download_file) await deleteProductDownload(form.download_file)
        downloadFilePath = newPath
      } else { toast.error('File upload failed'); setSaving(false); return }
    }

    if (form.download_type !== 'file_upload' && form.download_file) {
      await deleteProductDownload(form.download_file)
      downloadFilePath = null
    }

    const payload: Record<string, any> = {
      name: form.name, slug: form.slug, description: form.description || null,
      short_description: form.short_description || null,
      price: variantsEnabled ? 0 : parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      category_id: form.category_id || null, image_url: imageUrl || null,
      status: form.status,
      download_type: form.download_type || null,
      download_file: form.download_type === 'file_upload' ? downloadFilePath : null,
      download_url: form.download_type === 'external_url' ? form.download_url : null,
      affiliate_enabled: form.affiliate_enabled,
      license_enabled: form.license_enabled && !variantsEnabled,
      variants_enabled: variantsEnabled,
      updated_at: new Date().toISOString(),
    }

    if (form.affiliate_enabled) {
      payload.commission_type = form.commission_type
      payload.commission_value = form.commission_value ? parseFloat(form.commission_value) : null
    } else {
      payload.commission_type = null
      payload.commission_value = null
    }

    if (form.license_enabled && !variantsEnabled) {
      payload.license_type = form.license_type
      payload.license_duration = form.license_duration
      payload.custom_license_days = form.license_duration === 'custom' ? parseInt(form.custom_license_days) : null
    } else {
      payload.license_type = null
      payload.license_duration = null
      payload.custom_license_days = null
    }

    const { error } = await supabase.from('products').update(payload).eq('id', id)
    if (error) { toast.error(error.message); setSaving(false); return }

    // Handle variants
    // First, get existing variants to determine which to delete
    const { data: existingVariants } = await supabase.from('product_variants').select('id').eq('product_id', id)
    const existingIds = new Set(existingVariants?.map((v: { id: string }) => v.id) || [])
    const newIds = new Set(variants.filter((v) => !v.id.startsWith('new-')).map((v) => v.id))
    const idsToDelete = [...existingIds].filter((id) => !newIds.has(id))

    // Delete removed variants
    if (idsToDelete.length > 0) {
      await supabase.from('product_variants').delete().in('id', idsToDelete)
    }

    // Upsert variants
    if (variantsEnabled && variants.length > 0) {
      for (let idx = 0; idx < variants.length; idx++) {
        const v = variants[idx]
        const variantPayload = prepareVariantForSave(v, id, idx)
        if (v.id.startsWith('new-')) {
          const { id: _, ...insertPayload } = variantPayload
          await supabase.from('product_variants').insert(insertPayload)
        } else {
          await supabase.from('product_variants').update(variantPayload).eq('id', v.id)
        }
      }
    }

    toast.success('Product updated!')
    router.push('/admin/products')
  }

  const handleDelete = async () => {
    setDeleting(true)
    if (form.image_url) await deleteProductImage(form.image_url)
    if (form.download_file) await deleteProductDownload(form.download_file)
    await supabase.from('product_variants').delete().eq('product_id', id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); setDeleting(false); return }
    toast.success('Product deleted!')
    router.push('/admin/products')
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Product</CardTitle>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Short Description</Label><Input value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Pricing</h3>
              <VariantEditor
                productId={id}
                variantsEnabled={variantsEnabled}
                onVariantsEnabledChange={setVariantsEnabled}
                variants={variants}
                onVariantsChange={setVariants}
              />

              {!variantsEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Compare Price</Label><Input type="number" step="0.01" value={form.compare_price || ''} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} /></div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Product Image</Label>
              <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageChange} className="hidden" />
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-md hover:bg-muted transition-colors"><Upload className="h-4 w-4" /><span className="text-sm">Upload Image</span></button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="sold_out">Sold Out</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Digital Delivery</h3>
              <div className="space-y-2">
                <Label>Download Type</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.download_type || ''} onChange={(e) => setForm({ ...form, download_type: e.target.value })}>
                  <option value="">None</option>
                  <option value="file_upload">File Upload</option>
                  <option value="external_url">External URL</option>
                </select>
              </div>
              {form.download_type === 'file_upload' && (
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <input ref={downloadInputRef} type="file" accept=".zip,.rar,.pdf,.apk,.exe,.dmg,.docx,.pptx,.xlsx" onChange={handleDownloadChange} className="hidden" />
                  {downloadFileName ? (
                    <div className="flex items-center gap-2"><span className="text-sm">{downloadFileName}</span><button type="button" onClick={handleRemoveDownload} className="text-destructive"><X className="h-4 w-4" /></button></div>
                  ) : (
                    <button type="button" onClick={() => downloadInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-md hover:bg-muted transition-colors"><Upload className="h-4 w-4" /><span className="text-sm">Upload File</span></button>
                  )}
                </div>
              )}
              {form.download_type === 'external_url' && <div className="space-y-2"><Label>Download URL</Label><Input value={form.download_url || ''} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." /></div>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="affiliate_enabled" checked={form.affiliate_enabled} onChange={(e) => setForm({ ...form, affiliate_enabled: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="affiliate_enabled">Affiliate Enabled</Label>
            </div>
            {form.affiliate_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2"><Label>Commission Type</Label><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.commission_type || ''} onChange={(e) => setForm({ ...form, commission_type: e.target.value })}><option value="">Select</option><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
                <div className="space-y-2"><Label>Commission Value</Label><Input type="number" step="0.01" value={form.commission_value || ''} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} /></div>
              </div>
            )}

            {!variantsEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="license_enabled" checked={form.license_enabled} onChange={(e) => setForm({ ...form, license_enabled: e.target.checked })} className="h-4 w-4" />
                  <Label htmlFor="license_enabled">License Enabled</Label>
                </div>
                {form.license_enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2"><Label>License Type</Label><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.license_type || ''} onChange={(e) => setForm({ ...form, license_type: e.target.value })}><option value="">Select</option><option value="manual">Manual License</option><option value="auto_generated">Auto Generated License</option></select></div>
                    <div className="space-y-2"><Label>License Duration</Label><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.license_duration || ''} onChange={(e) => setForm({ ...form, license_duration: e.target.value })}><option value="">Select</option><option value="lifetime">Lifetime</option><option value="30_days">30 Days</option><option value="90_days">90 Days</option><option value="180_days">180 Days</option><option value="1_year">1 Year</option><option value="custom">Custom</option></select></div>
                    {form.license_duration === 'custom' && <div className="space-y-2"><Label>Custom Duration (days)</Label><Input type="number" value={form.custom_license_days || ''} onChange={(e) => setForm({ ...form, custom_license_days: e.target.value })} /></div>}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving || imageUploading || downloadUploading}>
                {(saving || imageUploading || downloadUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </form>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogHeader><DialogTitle>Delete Product</DialogTitle><DialogDescription>Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <EditProductForm params={params} />
    </Suspense>
  )
}
