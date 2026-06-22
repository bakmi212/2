'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Plus, Edit, Trash2, ImageIcon, ExternalLink, Hammer } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  status: string
  affiliate_enabled: boolean
  commission_type: string | null
  commission_value: number | null
  image_url: string | null
  category: { name: string } | null
}
interface ProductRow {
  id: string
  name: string
  slug: string
  price: number
  status: string
  affiliate_enabled: boolean
  commission_type: string | null
  commission_value: number | null
  image_url: string | null
  category: { name: string }[]
}

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, status, affiliate_enabled, commission_type, commission_value, image_url, category:categories(name)')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Failed to load products')
    } else {
      const formatted: Product[] = (data as ProductRow[])?.map(row => ({
        ...row, category: row.category?.[0] || null
      })) || []
      setProducts(formatted)
    }
    setLoading(false)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setDeleting(true)
    const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
    if (error) {
      toast.error('Failed to delete product')
    } else {
      toast.success('Product deleted')
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
    setProductToDelete(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>
      case 'sold_out': return <Badge variant="destructive">Sold Out</Badge>
      case 'coming_soon': return <Badge variant="secondary">Coming Soon</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAffiliateDisplay = (product: Product) => {
    if (!product.affiliate_enabled) return <span className="text-muted-foreground text-sm">OFF</span>
    if (product.commission_type === 'percentage') return <span className="text-sm">{product.commission_value}%</span>
    if (product.commission_type === 'fixed') return <span className="text-sm">Rp{product.commission_value?.toLocaleString()}</span>
    return <span className="text-muted-foreground text-sm">ON</span>
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">{products.length} products</p>
        </div>
        <Link href="/admin/products/new">
          <Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Thumbnail</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Price</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Affiliate</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/products/${product.slug}`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{product.category?.name || '-'}</td>
                    <td className="py-3 px-4 font-semibold">${product.price}</td>
                    <td className="py-3 px-4">{getStatusBadge(product.status)}</td>
                    <td className="py-3 px-4">{getAffiliateDisplay(product)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button size="sm" variant="outline"><Edit className="h-3 w-3 mr-1" />Edit</Button>
                        </Link>
                        <Link href={`/admin/products/${product.id}/builder`}>
                          <Button size="sm" variant="outline"><Hammer className="h-3 w-3 mr-1" />Builder</Button>
                        </Link>
                        <Link href={`/products/${product.slug}`} target="_blank">
                          <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3 mr-1" />Preview</Button>
                        </Link>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteClick(product)}>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
