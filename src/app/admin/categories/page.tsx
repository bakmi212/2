'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@/lib/supabase/client'
import { uploadCategoryImage, deleteCategoryImage, validateCategoryImage } from '@/lib/supabase/storage'
import { Loader2, Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_active: boolean
  products_count?: number
}

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: '', slug: '', description: '', image_url: '', is_active: true })

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data } = await supabase.from('categories').select('id, name, slug, description, image_url, is_active').order('name')
    const cats = (data as Category[]) || []
    const catsWithCounts = await Promise.all(cats.map(async (cat) => {
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', cat.id)
      return { ...cat, products_count: count || 0 }
    }))
    setCategories(catsWithCounts)
    setLoading(false)
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', image_url: '', is_active: true })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateCategoryImage(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setUploading(true)
    const slug = form.slug || generateSlug(form.name) || 'category'
    const imageUrl = await uploadCategoryImage(file, slug)
    if (imageUrl) {
      setForm(prev => ({ ...prev, image_url: imageUrl }))
      toast.success('Image uploaded!')
    } else {
      toast.error('Failed to upload image')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = () => {
    if (form.image_url) {
      deleteCategoryImage(form.image_url).catch(console.error)
    }
    setForm(prev => ({ ...prev, image_url: '' }))
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const slug = form.slug || generateSlug(form.name)
    const { error } = await supabase.from('categories').insert({
      name: form.name,
      slug,
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Category created!')
      setAddDialogOpen(false)
      resetForm()
      fetchCategories()
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!categoryToEdit) return
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const slug = form.slug || generateSlug(form.name)
    const { error } = await supabase.from('categories').update({
      name: form.name,
      slug,
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', categoryToEdit.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Category updated!')
      setEditDialogOpen(false)
      setCategoryToEdit(null)
      resetForm()
      fetchCategories()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    if ((categoryToDelete.products_count || 0) > 0) {
      toast.error('Cannot delete category with existing products. Move or delete products first.')
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      return
    }
    setDeleting(true)
    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id)
    if (error) {
      toast.error('Failed to delete category')
    } else {
      toast.success('Category deleted!')
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id))
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
    setCategoryToDelete(null)
  }

  const openEdit = (cat: Category) => {
    setCategoryToEdit(cat)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active,
    })
    setEditDialogOpen(true)
  }

  const openDelete = (cat: Category) => {
    setCategoryToDelete(cat)
    setDeleteDialogOpen(true)
  }

  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat_name">Name *</Label>
        <Input
          id="cat_name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat_slug">Slug</Label>
        <Input
          id="cat_slug"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="auto-generated"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat_description">Description</Label>
        <Input
          id="cat_description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Category Image</Label>
        <div className="flex flex-col gap-3">
          {form.image_url ? (
            <div className="relative inline-block w-32 h-32 rounded-lg overflow-hidden border">
              <img src={form.image_url} alt="Category" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="mt-2 text-xs text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click to upload'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF. Max 2MB.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="cat_is_active"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="h-4 w-4"
        />
        <Label htmlFor="cat_is_active">Active</Label>
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">{categories.length} categories</p>
        </div>
        <Button onClick={() => { resetForm(); setAddDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Category
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Categories</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Image</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Slug</th>
                  <th className="text-left py-3 px-4">Products</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{cat.slug}</td>
                    <td className="py-3 px-4">{cat.products_count || 0}</td>
                    <td className="py-3 px-4">
                      <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                          <Edit className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => openDelete(cat)}>
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Create a new product category</DialogDescription>
        </DialogHeader>
        {renderForm()}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>Update category details</DialogDescription>
        </DialogHeader>
        {renderForm()}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleEdit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
            {(categoryToDelete?.products_count || 0) > 0 && (
              <span className="text-destructive block mt-2">
                This category has {categoryToDelete?.products_count} product(s). Move or delete them first.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || (categoryToDelete?.products_count || 0) > 0}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
