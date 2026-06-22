'use client'

import { useState, useEffect, Suspense, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'

function EditProductForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', description: '', short_description: '', price: '', compare_price: '', category_id: '', image_url: '', status: 'active' as 'active' | 'sold_out' | 'coming_soon', is_featured: false,
  })
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: product } = await supabase.from('products').select('*').eq('id', id).single()
      if (product) setForm({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price?.toString() || '',
        compare_price: product.compare_price?.toString() || '',
        category_id: product.category_id || '',
        image_url: product.image_url || '',
        status: product.status || 'active',
        is_featured: product.is_featured ?? false,
      })
      const { data: cats } = await supabase.from('categories').select('id, name').eq('is_active', true)
      setCategories(cats || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('products').update({
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      short_description: form.short_description || null,
      price: parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      status: form.status,
      is_featured: form.is_featured,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) toast.error(error.message)
    else { toast.success('Product updated!'); router.push('/dashboard/admin/products') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Product deleted!'); router.push('/dashboard/admin/products') }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Edit Product</CardTitle><Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button></CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Short Description</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Compare Price</Label><Input type="number" step="0.01" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Category</Label>
              <select className="w-full px-3 py-2 border rounded-md bg-background" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            {form.image_url && <img src={form.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />}
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full px-3 py-2 border rounded-md bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'sold_out' | 'coming_soon' })}>
                <option value="active">Active</option>
                <option value="sold_out">Sold Out</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4" /><span className="text-sm">Featured</span></label>
            </div>
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}><EditProductForm params={params} /></Suspense>
}
