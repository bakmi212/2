'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  variants_enabled: boolean
}

interface Variant {
  id: string
  name: string
  variant_type: string
  price: number
}

interface ActionConfigProps {
  actionType: 'direct_url' | 'product_purchase' | ''
  url: string
  openInNewTab: boolean
  productId: string | null
  variantId: string | null
  productSlug?: string | null
  productName?: string | null
  variantName?: string | null
  variantPrice?: number | null
  productPrice?: number | null
  onActionTypeChange: (type: 'direct_url' | 'product_purchase') => void
  onUrlChange: (url: string) => void
  onOpenInNewTabChange: (open: boolean) => void
  onProductIdChange: (id: string | null) => void
  onVariantIdChange: (id: string | null) => void
}

export function ActionConfigEditor({
  actionType,
  url,
  openInNewTab,
  productId,
  variantId,
  productSlug,
  productName,
  variantName,
  variantPrice,
  productPrice,
  onActionTypeChange,
  onUrlChange,
  onOpenInNewTabChange,
  onProductIdChange,
  onVariantIdChange,
}: ActionConfigProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const supabase = createBrowserClient()

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(price)
  }

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, variants_enabled')
        .eq('status', 'active')
        .order('name')
      setProducts(data || [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!productId) {
      setVariants([])
      return
    }
    const fetchVariants = async () => {
      const product = products.find((p) => p.id === productId)
      if (!product?.variants_enabled) {
        setVariants([])
        return
      }
      const { data } = await supabase
        .from('product_variants')
        .select('id, name, variant_type, price')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('sort_order')
      setVariants(data || [])
    }
    fetchVariants()
  }, [productId, products])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Action Type</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={actionType}
          onChange={(e) => onActionTypeChange(e.target.value as 'direct_url' | 'product_purchase')}
        >
          <option value="">Select Action</option>
          <option value="direct_url">Direct URL</option>
          <option value="product_purchase">Product Purchase</option>
        </select>
      </div>

      {actionType === 'direct_url' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input
              className="text-xs"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="open_in_new_tab"
              checked={openInNewTab}
              onChange={(e) => onOpenInNewTabChange(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="open_in_new_tab" className="text-xs">
              Open in New Tab
            </Label>
          </div>
        </>
      )}

      {actionType === 'product_purchase' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Product</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={productId || ''}
              onChange={(e) => {
                onProductIdChange(e.target.value || null)
                onVariantIdChange(null)
              }}
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {productId && variants.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Variant</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={variantId || ''}
                onChange={(e) => onVariantIdChange(e.target.value || null)}
              >
                <option value="">Select Variant</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} - {formatPrice(v.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {productId && variants.length === 0 && (
            <p className="text-xs text-muted-foreground">
              This product has no variants. Default checkout will be used.
            </p>
          )}

          {/* Real-time Product Purchase Context Preview */}
          {productId && productName && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">Product Purchase Context:</p>
              <div className="space-y-0.5 text-xs text-blue-600">
                <p>Product: <span className="font-medium">{productName}</span></p>
                {variantId && variantName && (
                  <p>Variant: <span className="font-medium">{variantName}</span></p>
                )}
                <p>Price: <span className="font-bold text-blue-800">
                  {variantId && variantPrice
                    ? formatPrice(variantPrice)
                    : productPrice
                    ? formatPrice(productPrice)
                    : 'Not set'}
                </span></p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function getActionUrl(
  actionType: 'direct_url' | 'product_purchase' | '',
  url: string,
  productId: string | null,
  variantId: string | null,
  productSlug?: string,
  products?: Product[]
): string {
  if (actionType === 'direct_url') {
    return url || '#'
  }

  if (actionType === 'product_purchase' && (productId || productSlug)) {
    // Use slug if available, otherwise use productId
    const productRef = productSlug || productId
    if (!productRef) return '#'

    let checkoutUrl = `/checkout?product=${productRef}&action=product_purchase`
    if (variantId) {
      checkoutUrl += `&variant=${variantId}`
    }
    return checkoutUrl
  }

  return '#'
}

// Helper to get full action config for product purchase
export function getProductPurchaseContext(
  productId: string | null,
  variantId: string | null,
  productName?: string | null,
  variantName?: string | null,
  productPrice?: number | null,
  variantPrice?: number | null
): {
  product_id: string | null
  product_name: string | null
  variant_id: string | null
  variant_name: string | null
  price: number
  quantity: number
} {
  return {
    product_id: productId,
    product_name: productName || null,
    variant_id: variantId,
    variant_name: variantName || null,
    price: variantId && variantPrice ? variantPrice : productPrice || 0,
    quantity: 1
  }
}
