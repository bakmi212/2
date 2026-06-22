'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@/lib/supabase/client'
import { Star, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  short_description: string | null
  price: number
  compare_price: number | null
  image_url: string | null
  is_featured: boolean
  status: string
  rating_average: number | null
  rating_count: number | null
}

function ProductsList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 12
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let query = supabase.from('products').select('*', { count: 'exact' }).in('status', ['active', 'sold_out', 'coming_soon'])

      if (search) query = query.ilike('name', `%${search}%`)
      if (category) {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).single()
        if (cat) query = query.eq('category_id', cat.id)
      }

      const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
      setProducts((data as Product[]) || [])
      setTotal(count || 0)
      setLoading(false)
    }

    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name, slug').eq('is_active', true)
      setCategories(data || [])
    }

    fetchData()
    fetchCategories()
  }, [page, search, category])

  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    params.set('page', '1')
    router.push(`/products?${params.toString()}`)
  }

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/products?${params.toString()}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold_out': return <Badge variant="destructive" className="absolute top-2 left-2">SOLD OUT</Badge>
      case 'coming_soon': return <Badge variant="secondary" className="absolute top-2 left-2">COMING SOON</Badge>
      default: return null
    }
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Products</h1>
          <p className="text-muted-foreground">{total} products available</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit">Search</Button>
            {search && <Button type="button" variant="outline" onClick={() => { setSearch(''); router.push('/products') }}>Clear</Button>}
          </form>
          <select value={category} onChange={(e) => { setCategory(e.target.value); const params = new URLSearchParams(searchParams.toString()); if (e.target.value) params.set('category', e.target.value); else params.delete('category'); params.set('page', '1'); router.push(`/products?${params.toString()}`); }} className="px-4 py-2 border rounded-md bg-background">
            <option value="">All Categories</option>
            {categories.map((cat) => (<option key={cat.id} value={cat.slug}>{cat.name}</option>))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : products.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No products found</p></CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-0">
                      <div className="aspect-[4/3] relative bg-muted rounded-t-lg overflow-hidden">
                        {product.image_url && <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />}
                        {product.is_featured && <Badge className="absolute top-2 right-2">Featured</Badge>}
                        {getStatusBadge(product.status)}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.short_description}</p>
                        <div className="flex items-center justify-between">
                          <div><span className="text-lg font-bold">${product.price}</span>{product.compare_price && <span className="text-sm text-muted-foreground line-through ml-2">${product.compare_price}</span>}</div>
                          {product.rating_count && product.rating_count > 0 && <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span>{product.rating_average?.toFixed(1)}</span></div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button variant="outline" size="icon" onClick={() => goToPage(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}><ProductsList /></Suspense>
}
