import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createServerClient } from '@/lib/supabase/server'
import { Star, Shield, Zap, Headphones, Check } from 'lucide-react'
import { AddToCartButton } from './add-to-cart-button'

interface BuilderBlock {
  id: string
  type: string
  content: Record<string, any>
}

interface Action {
  id: string
  type: string
  config: Record<string, any>
  enabled: boolean
}

// Generate checkout URL using product UUID
function getProductPurchaseUrl(actions: Action[], productId: string): string {
  console.log('Product UUID:', productId)
  const purchaseAction = actions?.find((a: Action) => a.enabled && a.type === 'product_purchase')
  if (purchaseAction?.config?.productId) {
    const { productId: actionProductId, variantId } = purchaseAction.config
    let url = `/checkout?product_id=${actionProductId}`
    if (variantId) url += `&variant_id=${variantId}`
    return url
  }
  return `/checkout?product_id=${productId}`
}

// Validate UUID format
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  // UUID primary, slug fallback (Checkout Rule)
  let query = supabase.from('products').select('*, category:categories(*)')
  const productQuery = isValidUUID(id) ? query.eq('id', id) : query.eq('slug', id)
  const { data: product } = await productQuery.maybeSingle()
  if (!product) notFound()

  console.log('Product UUID:', product.id)

  const isAvailable = product.status === 'active'
  const builderContent: BuilderBlock[] = product.builder_content || []
  const hasPublishedBuilder = product.builder_published && builderContent.length > 0

  const getStatusBadge = () => {
    switch (product.status) {
      case 'sold_out': return <Badge variant="destructive" className="text-base px-3 py-1">SOLD OUT</Badge>
      case 'coming_soon': return <Badge variant="secondary" className="text-base px-3 py-1">COMING SOON</Badge>
      default: return null
    }
  }

  const getCtaUrl = (actions?: Action[]) => {
    if (actions?.length) {
      const url = getProductPurchaseUrl(actions, product.id)
      if (url !== `/checkout?product_id=${product.id}`) return url
    }
    switch (product.cta_type) {
      case 'whatsapp': return product.whatsapp_number ? `https://wa.me/${product.whatsapp_number}` : '#'
      case 'external_link': return product.external_url || '#'
      case 'order_form': return '#'
      default: return `/checkout?product_id=${product.id}`
    }
  }

  const getCtaLabel = () => {
    switch (product.cta_type) {
      case 'whatsapp': return 'Chat on WhatsApp'
      case 'external_link': return 'Visit Link'
      case 'order_form': return 'Order Now'
      default: return 'Purchase Now'
    }
  }

  const isExternal = product.cta_type === 'whatsapp' || product.cta_type === 'external_link'

  if (hasPublishedBuilder) {
    return <BuilderProductPage product={product} blocks={builderContent} getCtaUrl={getCtaUrl} getCtaLabel={getCtaLabel} />
  }

  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
              {product.image_url && <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />}
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {getStatusBadge()}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="mb-4">{product.category && <Link href={`/categories/${product.category.id}`} className="text-sm text-primary hover:underline">{product.category.name}</Link>}</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
            {product.rating_count > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-5 w-5 ${i < Math.round(product.rating_average || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />))}</div>
                <span className="text-muted-foreground">({product.rating_count} reviews)</span>
              </div>
            )}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-bold">${product.price}</span>
              {product.compare_price && <span className="text-xl text-muted-foreground line-through">${product.compare_price}</span>}
            </div>
            <p className="text-muted-foreground mb-6">{product.short_description}</p>
            <Separator className="mb-6" />
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><span className="text-sm">Secure payment & instant delivery</span></div>
              <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-primary" /><span className="text-sm">Lifetime updates included</span></div>
              <div className="flex items-center gap-3"><Headphones className="h-5 w-5 text-primary" /><span className="text-sm">Premium support available</span></div>
            </div>
            {isAvailable ? (
              isExternal ? (
                <a href={getCtaUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-8 bg-primary text-primary-foreground hover:opacity-90">
                  {getCtaLabel()}
                </a>
              ) : (
                <AddToCartButton productId={product.id} price={product.price} name={product.name} />
              )
            ) : (
              <button disabled className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-8 bg-muted text-muted-foreground cursor-not-allowed">
                {product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}
              </button>
            )}
            <Separator className="my-6" />
            <div className="prose prose-sm text-muted-foreground">
              <h3>Description</h3>
              <p>{product.description || product.short_description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BuilderProductPage({ product, blocks, getCtaUrl, getCtaLabel }: { product: any; blocks: BuilderBlock[]; getCtaUrl: (actions?: Action[]) => string; getCtaLabel: () => string }) {
  const isAvailable = product.status === 'active'

  const resolveCtaUrl = (blockContent: Record<string, any>) => {
    const actions = blockContent.actions as Action[] | undefined
    if (actions?.length) {
      const url = getProductPurchaseUrl(actions, product.id)
      if (url !== `/checkout?product_id=${product.id}`) return url
    }
    return getCtaUrl(actions)
  }

  return (
    <div className="space-y-0">
      {blocks.map((block) => {
        const { type, content } = block
        const align = content.align || 'left'
        const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

        switch (type) {
          case 'section': return (
            <div key={block.id} className="py-4" style={{ background: content.bgColor, padding: `${content.padding}px 0` }}>
              <div className="mx-auto px-4" style={{ maxWidth: content.maxWidth ? `${content.maxWidth}px` : '1200px' }}>
              </div>
            </div>
          )
          case 'container': return (
            <div key={block.id} className="mx-auto px-4 rounded-xl" style={{ maxWidth: content.maxWidth ? `${content.maxWidth}px` : '1200px', padding: `${content.padding}px`, background: content.bgColor, borderRadius: `${content.borderRadius}px` }}>
            </div>
          )
          case 'hero': return (
            <section key={block.id} className="relative overflow-hidden text-white flex items-center justify-center" style={{ background: content.bgImage ? undefined : (content.bgColor || '#0f172a'), minHeight: `${content.height || 500}px` }}>
              {content.bgImage && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.bgImage})` }} />}
              <div className="absolute inset-0 bg-black" style={{ opacity: (content.overlayOpacity || 50) / 100 }} />
              <div className={`relative z-10 px-4 py-20 max-w-3xl mx-auto ${alignClass}`}>
                <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontSize: content.fontSize ? `${content.fontSize}px` : undefined }}>{content.title}</h1>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">{content.subtitle}</p>
                {isAvailable && <a href={resolveCtaUrl(content)} className="inline-block px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-white/90 transition-colors">{content.buttonText || getCtaLabel()}</a>}
                {!isAvailable && <button disabled className="inline-block px-6 py-3 bg-white/50 text-white rounded-lg font-semibold cursor-not-allowed">{product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}</button>}
              </div>
            </section>
          )
          case 'heading': {
            const level = content.level || 'h2'
            const style = { fontSize: content.fontSize ? `${content.fontSize}px` : undefined, fontWeight: content.fontWeight, color: content.color }
            if (level === 'h1') return <h1 key={block.id} className={`font-bold py-6 px-4 ${alignClass}`} style={style}>{content.text}</h1>
            if (level === 'h3') return <h3 key={block.id} className={`font-bold py-4 px-4 ${alignClass}`} style={style}>{content.text}</h3>
            return <h2 key={block.id} className={`font-bold py-6 px-4 ${alignClass}`} style={style}>{content.text}</h2>
          }
          case 'text': return (
            <div key={block.id} className={`py-4 px-4 ${alignClass}`} style={{ color: content.color, fontSize: content.fontSize ? `${content.fontSize}px` : undefined, lineHeight: content.lineHeight }}>
              <p>{content.text}</p>
            </div>
          )
          case 'button': {
            const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
            const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
            const btnRounded = content.rounded === 'none' ? 'rounded-none' : content.rounded === 'full' ? 'rounded-full' : 'rounded-lg'
            return (
              <div key={block.id} className={`py-4 px-4 ${alignClass}`}>
                <a href={content.url || resolveCtaUrl(content)} className={`inline-block font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                  {content.text}
                </a>
              </div>
            )
          }
          case 'image': return (
            <div key={block.id} className={`py-4 px-4 ${alignClass}`}>
              {content.src && <img src={content.src} alt={content.alt} className="mx-auto" style={{ width: content.width || '100%', height: content.height || 'auto', borderRadius: `${content.borderRadius || 12}px` }} />}
              {content.caption && <p className="text-sm text-muted-foreground mt-2">{content.caption}</p>}
            </div>
          )
          case 'gallery': return (
            <div key={block.id} className="py-4 px-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${content.columns || '3'}, 1fr)`, gap: `${content.gap || 16}px` }}>
              {content.images?.map((img: string, i: number) => (
                <img key={i} src={img} className="w-full object-cover" style={{ borderRadius: `${content.borderRadius || 12}px` }} />
              ))}
            </div>
          )
          case 'video': return (
            <div key={block.id} className="py-4 px-4">
              {content.url && (
                <div className="w-full" style={{ borderRadius: `${content.borderRadius || 12}px`, overflow: 'hidden' }}>
                  <iframe src={content.url} className="w-full aspect-video" allowFullScreen />
                </div>
              )}
              {content.caption && <p className="text-sm text-muted-foreground mt-2">{content.caption}</p>}
            </div>
          )
          case 'features': return (
            <div key={block.id} className="py-8 px-4">
              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${content.columns || '3'}, 1fr)` }}>
                {content.items?.map((f: any, i: number) => (
                  <div key={i} className="p-6 bg-muted/50 rounded-xl">
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )
          case 'pricing': return (
            <div key={block.id} className="py-8 px-4">
              <div className={`max-w-sm mx-auto p-8 rounded-2xl text-center border-2 ${content.highlighted ? 'border-primary bg-primary/5' : 'border-muted bg-muted/50'}`}>
                <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
                <div className="text-4xl font-bold mb-1">{content.price}</div>
                <div className="text-sm text-muted-foreground mb-6">{content.period}</div>
                <ul className="space-y-2 mb-6 text-sm text-left">
                  {content.features?.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
                  ))}
                </ul>
                {isAvailable && <a href={resolveCtaUrl(content)} className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">{content.buttonText || getCtaLabel()}</a>}
                {!isAvailable && <button disabled className="w-full py-3 bg-muted text-muted-foreground rounded-lg font-semibold cursor-not-allowed">{product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}</button>}
              </div>
            </div>
          )
          case 'testimonials': return (
            <div key={block.id} className="py-8 px-4">
              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${content.columns || '2'}, 1fr)` }}>
                {content.items?.map((t: any, i: number) => (
                  <div key={i} className="p-6 bg-muted/50 rounded-xl">
                    <p className="italic text-muted-foreground mb-4">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-sm">{t.name?.[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
          case 'faq': return (
            <div key={block.id} className="py-8 px-4 max-w-2xl mx-auto">
              <div className="space-y-4">
                {content.items?.map((q: any, i: number) => (
                  <div key={i} className="p-4 bg-muted/50 rounded-xl">
                    <h4 className="font-semibold mb-2">{q.question}</h4>
                    <p className="text-sm text-muted-foreground">{q.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )
          case 'countdown': return (
            <div key={block.id} className={`py-8 px-4 ${alignClass}`}>
              <p className="text-muted-foreground mb-2">{content.label}</p>
              <div className="text-3xl font-bold">{content.targetDate || 'No date set'}</div>
            </div>
          )
          case 'cta': return (
            <div key={block.id} className={`py-12 px-4 ${alignClass}`} style={{ background: content.bgColor || '#f1f5f9' }}>
              <h3 className="text-xl font-bold mb-2">{content.title}</h3>
              <p className="mb-4">{content.text}</p>
              {isAvailable && <a href={resolveCtaUrl(content)} className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">{content.buttonText || getCtaLabel()}</a>}
              {!isAvailable && <button disabled className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-semibold cursor-not-allowed">{product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}</button>}
            </div>
          )
          case 'divider': return (
            <div key={block.id} className="py-4 px-4">
              <hr style={{ borderStyle: content.style || 'solid', borderColor: content.color || '#e2e8f0', borderWidth: `${content.height || 1}px 0 0 0` }} />
            </div>
          )
          case 'spacer': return <div key={block.id} style={{ height: content.height || 40 }} />
          case 'product_image': return (
            <div key={block.id} className={`py-4 px-4 ${alignClass}`}>
              {product.image_url && <img src={product.image_url} alt={product.name} className="mx-auto" style={{ width: content.width || '100%', maxWidth: content.maxWidth ? `${content.maxWidth}px` : '600px', borderRadius: `${content.borderRadius || 12}px` }} />}
            </div>
          )
          case 'product_name': {
            const level = content.level || 'h1'
            const style = { fontSize: content.fontSize ? `${content.fontSize}px` : undefined, fontWeight: content.fontWeight, color: content.color }
            if (level === 'h1') return <h1 key={block.id} className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h1>
            if (level === 'h3') return <h3 key={block.id} className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h3>
            return <h2 key={block.id} className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h2>
          }
          case 'product_price': return (
            <div key={block.id} className={`py-4 px-4 ${alignClass}`}>
              <div className="flex items-baseline gap-3 justify-center" style={{ fontSize: content.fontSize ? `${content.fontSize}px` : '36px', fontWeight: content.fontWeight || '700' }}>
                <span style={{ color: content.color || '#0f172a' }}>${product.price}</span>
                {content.showCompare && product.compare_price && <span className="line-through" style={{ color: content.compareColor || '#94a3b8', fontSize: '0.6em' }}>${product.compare_price}</span>}
              </div>
            </div>
          )
          case 'product_description': return (
            <div key={block.id} className={`py-4 px-4 ${alignClass}`} style={{ color: content.color || '#475569', fontSize: content.fontSize ? `${content.fontSize}px` : '18px' }}>
              <p>{product.short_description || product.description || ''}</p>
            </div>
          )
          case 'buy_button': {
            const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
            const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
            const btnRounded = content.rounded === 'none' ? 'rounded-none' : content.rounded === 'full' ? 'rounded-full' : 'rounded-lg'
            const btnWidth = content.fullWidth ? 'w-full' : 'inline-block'
            return (
              <div key={block.id} className={`py-4 px-4 ${alignClass}`}>
                {isAvailable ? (
                  <a href={resolveCtaUrl(content)} className={`${btnWidth} font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                    {content.text || getCtaLabel()}
                  </a>
                ) : (
                  <button disabled className={`${btnWidth} font-semibold bg-muted text-muted-foreground ${btnSize} ${btnRounded} cursor-not-allowed`}>
                    {product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}
                  </button>
                )}
              </div>
            )
          }
          case 'html': return <div key={block.id} className="py-4 px-4" dangerouslySetInnerHTML={{ __html: content.code }} />
          default: return null
        }
      })}
      {!isAvailable && (
        <div className="fixed bottom-0 left-0 right-0 bg-destructive text-white text-center py-3 font-semibold z-50">
          {product.status === 'sold_out' ? 'SOLD OUT' : 'COMING SOON'}
        </div>
      )}
    </div>
  )
}
