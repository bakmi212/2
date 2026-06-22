'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Package, Loader2 } from 'lucide-react'

interface UserProduct { id: string; product: { id: string; name: string; slug: string; image_url: string | null }; created_at: string }
interface UserProductRow { id: string; product: { id: string; name: string; slug: string; image_url: string | null }[]; created_at: string }

export default function UserProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<UserProduct[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_products').select('id, created_at, product:products(id, name, slug, image_url)').eq('user_id', user.id).order('created_at', { ascending: false })
      const formatted: UserProduct[] = (data as UserProductRow[])?.map(row => ({
        id: row.id, created_at: row.created_at, product: row.product?.[0] || { id: '', name: '', slug: '', image_url: null }
      })) || []
      setProducts(formatted)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">My Products</h1><p className="text-muted-foreground">Products you have purchased</p></div>
      {products.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">No products yet</h3><p className="text-muted-foreground mb-4">Browse our catalog to purchase products</p><Link href="/products" className="text-primary hover:underline">Browse Products</Link></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((up) => (
            <Link key={up.id} href={`/products/${up.product.slug}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">{up.product.image_url && <img src={up.product.image_url} alt={up.product.name} className="object-cover w-full h-full" />}</div>
                  <div className="p-4"><h3 className="font-semibold">{up.product.name}</h3><p className="text-sm text-muted-foreground">Purchased {new Date(up.created_at).toLocaleDateString()}</p></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
