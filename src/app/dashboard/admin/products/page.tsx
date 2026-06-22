'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Plus } from 'lucide-react'

interface Product { id: string; name: string; slug: string; price: number; status: string; is_featured: boolean; category: { name: string } | null }
interface ProductRow { id: string; name: string; slug: string; price: number; status: string; is_featured: boolean; category: { name: string }[] }

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('products').select('id, name, slug, price, status, is_featured, category:categories(name)').order('created_at', { ascending: false })
      const formatted: Product[] = (data as ProductRow[])?.map(row => ({
        id: row.id, name: row.name, slug: row.slug, price: row.price, status: row.status, is_featured: row.is_featured,
        category: row.category?.[0] || null
      })) || []
      setProducts(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>
      case 'sold_out': return <Badge variant="destructive">Sold Out</Badge>
      case 'coming_soon': return <Badge variant="secondary">Coming Soon</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between"><div><h1 className="text-3xl font-bold">Products</h1><p className="text-muted-foreground">Manage product catalog</p></div><Link href="/dashboard/admin/products/new"><Button><Plus className="h-4 w-4 mr-2" />Add Product</Button></Link></div>
      <Card>
        <CardHeader><CardTitle>All Products ({products.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">Name</th><th className="text-left py-3 px-2">Category</th><th className="text-left py-3 px-2">Price</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Actions</th></tr></thead><tbody>
            {products.map((product) => (<tr key={product.id} className="border-b"><td className="py-3 px-2"><Link href={`/products/${product.slug}`} className="hover:underline">{product.name}</Link></td><td className="py-3 px-2">{product.category?.name || '-'}</td><td className="py-3 px-2">${product.price}</td><td className="py-3 px-2"><div className="flex gap-2">{getStatusBadge(product.status)}{product.is_featured && <Badge>Featured</Badge>}</div></td><td className="py-3 px-2"><Link href={`/dashboard/admin/products/${product.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link></td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
