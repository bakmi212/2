'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@/lib/supabase/client'
import { uploadProductImage, validateImageFile, uploadProductDownload, validateDownloadFile } from '@/lib/supabase/storage'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
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

function generateUniqueSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [downloadFile, setDownloadFile] = useState<File | null>(null)
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [downloadUploading, setDownloadUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const downloadInputRef = useRef<HTMLInputElement>(null)
  const [variantsEnabled, setVariantsEnabled] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])

  const [form, setForm] = useState({
    name: '',
    slug: '',
    manualSlug: false,
    description: '',
    short_description: '',
    price: '',
    compare_price: '',
    category_id: '',
    status: 'active' as 'active' | 'sold_out' | 'coming_soon',
    download_type: '' as 'file_upload' | 'external_url' | '',
    download_url: '',
    affiliate_enabled: false,
    commission_type: '' as 'percentage' | 'fixed' | '',
    commission_value: '',
    license_enabled: false,
    license_type: '' as 'manual' | 'auto_generated' | '',
    license_duration: '' as 'lifetime' | '30_days' | '90_days' | '180_days' | '1_year' | 'custom' | '',
    custom_license_days: '',
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.from('categories').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      setCategories(data || [])
    })
  }, [])

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

    // Validate slug
    const slugToUse = form.slug.trim() || generateUniqueSlug(form.name)
    if (!slugToUse) {
      toast.error('Could not generate a valid slug. Please enter a slug manually.')
      return false
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slugToUse)) {
      toast.error('Slug must be lowercase, contain only letters, numbers, and hyphens')
      return false
    }

    if (variantsEnabled) {
      if (variants.length === 0) {
        toast.error('At least one variant is required when variants are enabled')
        return false
      }
      const variantError = validateVariants(variants)
      if (variantError) { toast.error(variantError); return false }
    } else {
      if (!form.price || parseFloat(form.price) <= 0) {
        toast.error('Price must be greater than 0')
        return false
      }
    }

    if (!imageFile && !imagePreview) { toast.error('Image is required for new product'); return false }
    if (form.affiliate_enabled) {
      if (!form.commission_type) { toast.error('Commission type is required'); return false }
      if (!form.commission_value || parseFloat(form.commission_value) <= 0) { toast.error('Commission value is required'); return false }
      if (form.commission_type === 'percentage' && parseFloat(form.commission_value) > 100) {
        toast.error('Percentage commission cannot exceed 100%'); return false
      }
    }
    if (form.license_enabled && !variantsEnabled) {
      if (!form.license_type) { toast.error('License type is required'); return false }
      if (!form.license_duration) { toast.error('License duration is required'); return false }
      if (form.license_duration === 'custom' && !form.custom_license_days) {
        toast.error('Custom license days is required'); return false
      }
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)

    // Check for duplicate name
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name')
      .eq('name', form.name)

    if (existingProducts && existingProducts.length > 0) {
      toast.error('Product name already exists. Please choose a different name.')
      setLoading(false)
      return
    }

    // Use manual slug or generate from name
    let slug = form.slug.trim() || generateUniqueSlug(form.name)
    if (!slug) {
      toast.error('Could not generate a valid slug from product name')
      setLoading(false)
      return
    }

    // Ensure slug uniqueness
    const { data: existingSlugs } = await supabase
      .from('products')
      .select('slug')
      .eq('slug', slug)

    let uniqueSlug = slug
    if (existingSlugs && existingSlugs.length > 0) {
      const timestamp = Date.now().toString(36)
      uniqueSlug = `${slug}-${timestamp}`
    }

    // Create product with UUID first
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: uniqueSlug,
      description: form.description || null,
      short_description: form.short_description || null,
      price: variantsEnabled ? 0 : parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      category_id: form.category_id || null,
      image_url: null,
      status: form.status,
      download_type: form.download_type || null,
      download_file: null,
      download_url: form.download_type === 'external_url' ? form.download_url : null,
      affiliate_enabled: form.affiliate_enabled,
      license_enabled: form.license_enabled && !variantsEnabled,
      variants_enabled: variantsEnabled,
    }

    if (form.affiliate_enabled) {
      payload.commission_type = form.commission_type
      payload.commission_value = form.commission_value ? parseFloat(form.commission_value) : null
    }

    if (form.license_enabled && !variantsEnabled) {
      payload.license_type = form.license_type
      payload.license_duration = form.license_duration
      payload.custom_license_days = form.license_duration === 'custom' ? parseInt(form.custom_license_days) : null
    }

    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newProduct) {
      toast.error('Failed to create product: ' + (insertError?.message || 'Unknown error'))
      setLoading(false)
      return
    }

    const productId = newProduct.id
    console.log('Product UUID:', productId)

    // Upload files using the product UUID
    let imageUrl: string | null = null
    let downloadFilePath: string | null = null

    if (imageFile) {
      setImageUploading(true)
      imageUrl = await uploadProductImage(imageFile, productId)
      setImageUploading(false)
      if (!imageUrl) {
        toast.error('Image upload failed')
        await supabase.from('products').delete().eq('id', productId)
        setLoading(false)
        return
      }
    }

    if (form.download_type === 'file_upload' && downloadFile) {
      setDownloadUploading(true)
      downloadFilePath = await uploadProductDownload(downloadFile, productId)
      setDownloadUploading(false)
      if (!downloadFilePath) {
        toast.error('File upload failed')
        await supabase.from('products').delete().eq('id', productId)
        setLoading(false)
        return
      }
    }

    // Update product with file URLs
    if (imageUrl || downloadFilePath) {
      const updatePayload: Record<string, unknown> = {}
      if (imageUrl) updatePayload.image_url = imageUrl
      if (downloadFilePath) updatePayload.download_file = downloadFilePath

      await supabase.from('products').update(updatePayload).eq('id', productId)
    }

    // Save variants if enabled
    if (variantsEnabled && variants.length > 0) {
      const variantPayloads = variants.map((v, idx) => prepareVariantForSave(v, productId, idx))
      const { error: variantError } = await supabase.from('product_variants').insert(variantPayloads)
      if (variantError) {
        await supabase.from('products').delete().eq('id', productId)
        toast.error('Failed to save variants: ' + variantError.message)
        setLoading(false)
        return
      }
    }

    toast.success('Product saved!')
    // Redirect to product page using the slug
    router.push(`/products/${uniqueSlug}`)
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
          <CardDescription>Create a new product listing</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => {
                const name = e.target.value
                const newSlug = form.manualSlug ? form.slug : generateUniqueSlug(name)
                setForm({ ...form, name, slug: newSlug })
              }} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/products/</span>
                <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value, manualSlug: true })} placeholder="auto-generated-from-name" className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">URL-friendly identifier. Auto-generated from name, or customize manually. Only lowercase letters, numbers, and hyphens allowed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description">Short Description</Label>
              <Input id="short_description" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Price Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Pricing</h3>
              <VariantEditor
                variantsEnabled={variantsEnabled}
                onVariantsEnabledChange={setVariantsEnabled}
                variants={variants}
                onVariantsChange={setVariants}
              />

              {!variantsEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input id="price" type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare_price">Compare Price</Label>
                    <Input id="compare_price" type="number" step="0.01" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Product Image *</Label>
              <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageChange} className="hidden" />
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-md hover:bg-muted transition-colors"><Upload className="h-4 w-4" /><span className="text-sm">Upload Image</span></button>
              )}
              <p className="text-xs text-muted-foreground">JPG, JPEG, PNG, WEBP up to 5MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'sold_out' | 'coming_soon' })}>
                <option value="active">Active</option>
                <option value="sold_out">Sold Out</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Digital Delivery</h3>
              <div className="space-y-2">
                <Label htmlFor="download_type">Download Type</Label>
                <select id="download_type" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.download_type} onChange={(e) => setForm({ ...form, download_type: e.target.value as 'file_upload' | 'external_url' | '' })}>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{downloadFileName}</span>
                      <button type="button" onClick={handleRemoveDownload} className="text-destructive"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => downloadInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-md hover:bg-muted transition-colors"><Upload className="h-4 w-4" /><span className="text-sm">Upload File</span></button>
                  )}
                  <p className="text-xs text-muted-foreground">ZIP, RAR, PDF, APK, EXE, DMG, DOCX, PPTX, XLSX up to 100MB</p>
                </div>
              )}

              {form.download_type === 'external_url' && (
                <div className="space-y-2">
                  <Label htmlFor="download_url">Download URL</Label>
                  <Input id="download_url" value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="affiliate_enabled" checked={form.affiliate_enabled} onChange={(e) => setForm({ ...form, affiliate_enabled: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="affiliate_enabled">Affiliate Enabled</Label>
            </div>

            {form.affiliate_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="commission_type">Commission Type</Label>
                  <select id="commission_type" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value as 'percentage' | 'fixed' })}>
                    <option value="">Select</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_value">Commission Value</Label>
                  <Input id="commission_value" type="number" step="0.01" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} />
                </div>
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
                    <div className="space-y-2">
                      <Label htmlFor="license_type">License Type</Label>
                      <select id="license_type" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value as 'manual' | 'auto_generated' })}>
                        <option value="">Select</option>
                        <option value="manual">Manual License</option>
                        <option value="auto_generated">Auto Generated License</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_duration">License Duration</Label>
                      <select id="license_duration" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={form.license_duration} onChange={(e) => setForm({ ...form, license_duration: e.target.value as 'lifetime' | '30_days' | '90_days' | '180_days' | '1_year' | 'custom' | '' })}>
                        <option value="">Select</option>
                        <option value="lifetime">Lifetime</option>
                        <option value="30_days">30 Days</option>
                        <option value="90_days">90 Days</option>
                        <option value="180_days">180 Days</option>
                        <option value="1_year">1 Year</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    {form.license_duration === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom_license_days">Custom Duration (days)</Label>
                        <Input id="custom_license_days" type="number" value={form.custom_license_days} onChange={(e) => setForm({ ...form, custom_license_days: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || imageUploading || downloadUploading}>
                {(loading || imageUploading || downloadUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
