import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createServerClient } from '@/lib/supabase/server'
import { Star, ShoppingBag, ArrowLeft, TrendingUp, Sparkles, Grid, List } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ sort?: string; view?: string }>
}) {
  const { slug } = await params
  const { sort, view } = await searchParams
  const supabase = await createServerClient()

  const { data: category } = await supabase.from('categories').select('*').eq('slug', slug).single()
  if (!category) notFound()

  // Fetch products with sorting
  let productQuery = supabase.from('products').select('*').eq('category_id', category.id).in('status', ['active', 'sold_out', 'coming_soon'])

  switch (sort) {
    case 'price-low': productQuery = productQuery.order('price', { ascending: true }); break
    case 'price-high': productQuery = productQuery.order('price', { ascending: false }); break
    case 'popular': productQuery = productQuery.order('sales_count', { ascending: false }); break
    case 'rating': productQuery = productQuery.order('rating_average', { ascending: false }); break
    default: productQuery = productQuery.order('created_at', { ascending: false })
  }

  const { data: products } = await productQuery
  const { count: totalProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', category.id).eq('status', 'active')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold_out': return <Badge variant="destructive" className="absolute top-2 left-2 z-10">SOLD OUT</Badge>
      case 'coming_soon': return <Badge variant="secondary" className="absolute top-2 left-2 z-10">COMING SOON</Badge>
      default: return null
    }
  }

  const getProductBadge = (product: any) => {
    const isNew = new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (product.best_seller) return <Badge className="absolute top-2 right-2 z-10 bg-orange-500 hover:bg-orange-600"><TrendingUp className="h-3 w-3 mr-1" />Best Seller</Badge>
    if (product.is_featured) return <Badge className="absolute top-2 right-2 z-10 bg-emerald-500 hover:bg-emerald-600"><Sparkles className="h-3 w-3 mr-1" />Featured</Badge>
    if (isNew) return <Badge className="absolute top-2 right-2 z-10 bg-blue-500 hover:bg-blue-600">NEW</Badge>
    if (product.badge) return <Badge className="absolute top-2 right-2 z-10">{product.badge}</Badge>
    return null
  }

  const isGridView = view !== 'list'

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {category.image_url && (
          <div className="absolute inset-0">
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent" />
          </div>
        )}
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <Link href="/categories" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/30">
              {totalProducts || 0} Products
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{category.name}</h1>
            {category.description && (
              <p className="text-lg text-slate-300 leading-relaxed">{category.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* Filters & Products */}
      <section className="py-8 bg-white border-b sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'newest', label: 'Newest' },
                  { value: 'popular', label: 'Popular' },
                  { value: 'price-low', label: 'Price: Low' },
                  { value: 'price-high', label: 'Price: High' },
                  { value: 'rating', label: 'Top Rated' },
                ].map((s) => (
                  <Link
                    key={s.value}
                    href={`/categories/${slug}?sort=${s.value}${view === 'list' ? '&view=list' : ''}`}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${sort === s.value || (!sort && s.value === 'newest') ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <Link
                href={`/categories/${slug}?sort=${sort || 'newest'}&view=grid`}
                className={`p-2 rounded transition-colors ${isGridView ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                <Grid className="h-4 w-4" />
              </Link>
              <Link
                href={`/categories/${slug}?sort=${sort || 'newest'}&view=list`}
                className={`p-2 rounded transition-colors ${!isGridView ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                <List className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid/List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {(!products || products.length === 0) ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-6">Check back soon for new products in this category.</p>
              <Button asChild>
                <Link href="/products">Browse All Products</Link>
              </Button>
            </div>
          ) : isGridView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p: any) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group block">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-muted/60 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            <ShoppingBag className="h-12 w-12 text-slate-300" />
                          </div>
                        )}
                        {getStatusBadge(p.status)}
                        {getProductBadge(p)}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">{p.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.short_description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-primary">${p.price}</span>
                            {p.compare_price && <span className="text-sm text-muted-foreground line-through">${p.compare_price}</span>}
                          </div>
                          {p.rating_count > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{p.rating_average?.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((p: any) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group block">
                  <Card className="hover:shadow-md transition-all border-muted/60">
                    <CardContent className="p-0">
                      <div className="flex gap-4">
                        <div className="w-48 h-36 shrink-0 relative bg-muted overflow-hidden rounded-l-lg">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                              <ShoppingBag className="h-10 w-10 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 py-4 pr-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{p.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.short_description}</p>
                              <div className="flex items-center gap-4 mt-3">
                                {p.rating_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{p.rating_average?.toFixed(1)}</span>
                                    <span className="text-muted-foreground">({p.rating_count})</span>
                                  </div>
                                )}
                                {p.sales_count > 0 && (
                                  <span className="text-sm text-muted-foreground">{p.sales_count} sold</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">${p.price}</div>
                              {p.compare_price && <span className="text-sm text-muted-foreground line-through">${p.compare_price}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
