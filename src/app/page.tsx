import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Zap, Shield, Clock, Users, Star, Search, ShoppingBag, TrendingUp, Sparkles, Award, CheckCircle, Globe, HeadphonesIcon, CreditCard, Rocket, MessageCircle, ChevronDown, ChevronUp, Play, ExternalLink, Heart } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const params = await searchParams
  const supabase = await createServerClient()
  const searchQuery = params.q || ''
  const categorySlug = params.category || ''
  const page = parseInt(params.page || '1', 10)
  const perPage = 12

  // Fetch statistics
  const { count: totalProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['active'])
  const { count: totalCategories } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true)
  const { data: salesData } = await supabase.from('orders').select('total_amount').eq('status', 'paid')
  const totalSales = salesData?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0
  const { count: totalOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid')
  const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true })

  // Fetch categories with product counts
  const { data: categories } = await supabase.from('categories').select('id, name, slug, image_url, description').eq('is_active', true).order('sort_order').order('name')
  const { data: allProducts } = await supabase.from('products').select('category_id').eq('status', 'active')
  const countMap = new Map<string, number>()
  ;(allProducts || []).forEach((p: any) => {
    const cid = p.category_id
    countMap.set(cid, (countMap.get(cid) || 0) + 1)
  })

  // Fetch products with filters
  let productQuery = supabase.from('products').select('*', { count: 'exact' }).in('status', ['active', 'sold_out', 'coming_soon']).order('created_at', { ascending: false })
  if (searchQuery) productQuery = productQuery.ilike('name', `%${searchQuery}%`)
  if (categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single()
    if (cat) productQuery = productQuery.eq('category_id', cat.id)
  }
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data: products, count } = await productQuery.range(from, to)
  const totalPages = Math.ceil((count || 0) / perPage)

  // Fetch featured, best seller, new
  const { data: featuredProducts } = await supabase.from('products').select('*').eq('is_featured', true).in('status', ['active']).order('sort_order').limit(8)
  const { data: bestSellers } = await supabase.from('products').select('*').eq('best_seller', true).in('status', ['active']).order('sales_count', { ascending: false }).limit(4)
  const { data: newProducts } = await supabase.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(4)

  // Testimonials (static for now, can be moved to DB later)
  const testimonials = [
    { name: 'Ahmad Rizky', role: 'Software Developer', company: 'TechStart Indonesia', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Platform ini menghemat waktu development saya hingga 70%. Kualitas template sangat profesional dan dukungan teknologi sangat responsif.' },
    { name: 'Sarah Dewi', role: 'Digital Marketer', company: 'Creative Agency', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Saya sudah mencoba banyak marketplace, tapi ini adalah yang terbaik. Proses pembelian mudah, instant delivery, dan produk berkualitas tinggi.' },
    { name: 'Budi Santoso', role: 'Entrepreneur', company: 'Startup Hub', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Investasi terbaik untuk bisnis saya. License system bekerja sempurna dan tim support sangat membantu.' },
  ]

  // FAQ items
  const faqs = [
    { q: 'Bagaimana cara pembelian produk?', a: 'Pilih produk yang diinginkan, tambahkan ke keranjang, lalu lakukan pembayaran melalui berbagai metode yang tersedia. Setelah pembayaran berhasil, Anda akan mendapat akses instant ke produk.' },
    { q: 'Apakah ada jaminan uang kembali?', a: 'Ya, kami memberikan garansi 30 hari uang kembali untuk semua produk digital. Jika produk tidak sesuai deskripsi, Anda bisa mengajukan refund.' },
    { q: 'Bagaimana sistem lisensi bekerja?', a: 'Setiap produk dilengkapi dengan license key unik. Anda bisa mengaktivasi di perangkat yang sesuai dengan batasan yang ditentukan di setiap produk.' },
    { q: 'Apakah ada dukungan teknis?', a: 'Ya, semua produk dilengkapi dengan dukungan teknis selama periode aktif. Tim kami siap membantu 24/7 melalui chat dan email.' },
  ]

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
    return null
  }

  const ProductCard = ({ product }: { product: any }) => (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="h-full hover:shadow-xl transition-all duration-300 border-muted/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-[4/3] relative bg-muted overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <ShoppingBag className="h-12 w-12 text-slate-300" />
              </div>
            )}
            {getStatusBadge(product.status)}
            {getProductBadge(product)}
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{categories?.find((c: any) => c.id === product.category_id)?.name || 'Digital'}</Badge>
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.short_description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary">${product.price}</span>
                {product.compare_price && <span className="text-sm text-muted-foreground line-through">${product.compare_price}</span>}
              </div>
              {product.rating_count > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating_average?.toFixed(1)}</span>
                  <span className="text-muted-foreground">({product.rating_count})</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="min-h-screen">
      {/* Hero Section - Split Layout */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur">
                <Award className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">Trusted by 1,100+ Customers Worldwide</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Marketplace Digital
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mt-2">
                    Premium Indonesia
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-300 mt-6 max-w-xl leading-relaxed">
                  Temukan template, software, dan tools digital berkualitas tinggi untuk mengembangkan bisnis dan project Anda.
                </p>
              </div>

              {/* Live Search */}
              <div className="max-w-lg">
                <form className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input name="q" defaultValue={searchQuery} placeholder="Cari produk, template, software..." className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-lg" />
                  </div>
                  <Button type="submit" size="lg" className="h-14 px-8 bg-blue-500 hover:bg-blue-600">
                    Search
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-sm text-slate-400">Popular:</span>
                  {['Template Website', 'Landing Page', 'Dashboard', 'App Source Code'].map((term) => (
                    <Link key={term} href={`/?q=${encodeURIComponent(term)}`} className="text-sm text-blue-400 hover:text-blue-300">
                      {term}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white h-12 px-8" asChild>
                  <Link href="/products">Jelajahi Produk <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8" asChild>
                  <Link href="/categories">Lihat Kategori</Link>
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-slate-800 flex items-center justify-center text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-400">4.9/5 dari 500+ review</p>
                </div>
              </div>
            </div>

            {/* Right Side - Dashboard Mockup */}
            <div className="hidden lg:block relative">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl" />
                <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 bg-slate-700/50 rounded-lg w-3/4" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 bg-blue-500/20 rounded-lg border border-blue-500/30" />
                      <div className="h-20 bg-emerald-500/20 rounded-lg border border-emerald-500/30" />
                      <div className="h-20 bg-orange-500/20 rounded-lg border border-orange-500/30" />
                    </div>
                    <div className="h-32 bg-slate-700/50 rounded-lg" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-16 bg-slate-700/50 rounded-lg" />
                      <div className="h-16 bg-slate-700/50 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{(totalProducts || 120) + '+'}</div>
              <div className="text-muted-foreground mt-1">Digital Products</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{(totalUsers || 1100) + '+'}</div>
              <div className="text-muted-foreground mt-1">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{(totalOrders || 5000) + '+'}</div>
              <div className="text-muted-foreground mt-1">Orders Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{(totalCategories || 15) + '+'}</div>
              <div className="text-muted-foreground mt-1">Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Popular Categories</Badge>
            <h2 className="text-3xl font-bold mb-3">Browse by Category</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Temukan produk sesuai kebutuhan Anda dari berbagai kategori</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(categories || []).slice(0, 6).map((cat: any) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="group">
                <Card className="h-full hover:shadow-lg transition-all border-muted/60 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-square relative bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-semibold text-white text-sm">{cat.name}</h3>
                        <p className="text-xs text-white/70">{countMap.get(cat.id) || 0} produk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/categories">View All Categories <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {(featuredProducts || []).length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-2 border-emerald-500 text-emerald-600">Editor's Pick</Badge>
                <h2 className="text-3xl font-bold">Featured Products</h2>
                <p className="text-muted-foreground mt-1">Produk pilihan terbaik dari tim kami</p>
              </div>
              <Button variant="outline" asChild><Link href="/products?featured=true">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts!.slice(0, 4).map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {(bestSellers || []).length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-2 border-orange-500 text-orange-600"><TrendingUp className="h-3 w-3 mr-1" />Top Selling</Badge>
                <h2 className="text-3xl font-bold">Best Sellers</h2>
                <p className="text-muted-foreground mt-1">Produk terlaris yang paling diminati</p>
              </div>
              <Button variant="outline" asChild><Link href="/products?bestseller=true">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers!.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {(newProducts || []).length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-2 border-blue-500 text-blue-600"><Sparkles className="h-3 w-3 mr-1" />New</Badge>
                <h2 className="text-3xl font-bold">New Arrivals</h2>
                <p className="text-muted-foreground mt-1">Produk terbaru yang baru ditambahkan</p>
              </div>
              <Button variant="outline" asChild><Link href="/products?sort=newest">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts!.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us - Features */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Why Choose Us</Badge>
            <h2 className="text-3xl font-bold mb-3">Mengapa Memilih Kami?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Kami berkomitmen memberikan pengalaman terbaik untuk setiap pelanggan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Zap, title: 'Instant Delivery', desc: 'Akses langsung ke produk digital setelah pembayaran berhasil. Tidak perlu menunggu.', color: 'blue' },
              { icon: Shield, title: 'Secure Payments', desc: 'Enkripsi tingkat enterprise untuk setiap transaksi. Data Anda aman bersama kami.', color: 'emerald' },
              { icon: Clock, title: 'Lifetime Updates', desc: 'Update gratis selamanya untuk semua produk dengan dukungan teknis aktif.', color: 'orange' },
              { icon: HeadphonesIcon, title: '24/7 Support', desc: 'Tim support kami siap membantu kapan saja melalui chat dan email.', color: 'cyan' },
              { icon: CreditCard, title: 'Multiple Payment', desc: 'Berbagai metode pembayaran: QRIS, bank transfer, e-wallet, dan kartu kredit.', color: 'rose' },
              { icon: Rocket, title: 'Easy Integration', desc: 'Dokumentasi lengkap dan panduan setup untuk memudahkan integrasi.', color: 'amber' },
            ].map((f) => (
              <Card key={f.title} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className={`h-12 w-12 rounded-xl bg-${f.color}-50 flex items-center justify-center mb-4`}>
                    <f.icon className={`h-6 w-6 text-${f.color}-500`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold mb-3">Apa Kata Mereka?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Dengarkan pengalaman pelanggan kami</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-muted/60">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                      <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.role} at {t.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold mb-3">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Temukan jawaban untuk pertanyaan umum</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white rounded-lg border">
                <summary className="flex items-center justify-between cursor-pointer p-5 font-medium list-none">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap Untuk Memulai?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">Bergabung dengan ribuan bisnis dan creator yang menggunakan platform kami untuk berkembang.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 h-12 px-8" asChild>
              <Link href="/auth/register">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8" asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* All Products Grid with Filter */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-1">All Products</h2>
              <p className="text-muted-foreground">{count || 0} products available</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/" className={`px-4 py-2 rounded-full text-sm transition-colors ${!categorySlug ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>All</Link>
              {(categories || []).map((cat: any) => (
                <Link key={cat.id} href={`/?category=${cat.slug}${searchQuery ? `&q=${searchQuery}` : ''}`} className={`px-4 py-2 rounded-full text-sm transition-colors ${categorySlug === cat.slug ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(products || []).map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {page > 1 && (
                <Link href={`/?page=${page - 1}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                  <Button variant="outline">Previous</Button>
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <Link key={p} href={`/?page=${p}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                    <Button variant={page === p ? 'default' : 'outline'}>{p}</Button>
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link href={`/?page=${page + 1}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                  <Button variant="outline">Next</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
