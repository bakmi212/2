'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Action,
  ActionType,
  createEmptyAction,
  ACTION_TYPES,
} from '@/lib/action-engine'
import {
  Trash2, ChevronDown, ChevronUp, GripVertical, ExternalLink,
  MessageCircle, Phone, Mail, Send, Facebook, BarChart3, Target, Code,
  Plus, ArrowRight, Scroll, Package
} from 'lucide-react'

interface MultiActionEditorProps {
  actions: Action[]
  onChange: (actions: Action[]) => void
}

const ACTION_ICONS: Record<string, any> = {
  direct_url: ExternalLink,
  internal_page: ArrowRight,
  scroll_to_section: Scroll,
  product_purchase: Package,
  whatsapp_chat: MessageCircle,
  whatsapp_inquiry: MessageCircle,
  phone_call: Phone,
  email: Mail,
  telegram: Send,
  facebook_pixel: Facebook,
  google_analytics: BarChart3,
  google_ads: Target,
  tiktok_pixel: Target,
  custom_tracking: Code,
}

export function MultiActionEditor({ actions, onChange }: MultiActionEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const addAction = (type: ActionType) => {
    const newAction = createEmptyAction(type)
    onChange([...actions, newAction])
    setExpandedId(newAction.id)
    setShowAddMenu(false)
  }

  const updateAction = (id: string, updates: Partial<Action>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }

  const removeAction = (id: string) => {
    onChange(actions.filter((a) => a.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const moveAction = (id: string, direction: 'up' | 'down') => {
    const index = actions.findIndex((a) => a.id === id)
    if (direction === 'up' && index > 0) {
      const newActions = [...actions]
      ;[newActions[index], newActions[index - 1]] = [newActions[index - 1], newActions[index]]
      onChange(newActions)
    } else if (direction === 'down' && index < actions.length - 1) {
      const newActions = [...actions]
      ;[newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]]
      onChange(newActions)
    }
  }

  const groupedActionTypes = ACTION_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = []
    acc[type.category].push(type)
    return acc
  }, {} as Record<string, typeof ACTION_TYPES>)

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Actions</Label>

      {actions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-3 border rounded-lg text-center">
          No actions configured
        </div>
      ) : (
        <div className="space-y-1">
          {actions.map((action, index) => {
            const isExpanded = expandedId === action.id
            const typeInfo = ACTION_TYPES.find((t) => t.value === action.type)
            const Icon = ACTION_ICONS[action.type] || ExternalLink

            return (
              <div
                key={action.id}
                className="border rounded-md overflow-hidden"
              >
                <div
                  className="flex items-center gap-2 p-2 bg-muted/30 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedId(isExpanded ? null : action.id)}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-0.5 hover:bg-muted rounded cursor-grab"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <span className="text-xs text-muted-foreground w-4">
                      {index + 1}
                    </span>
                  </div>
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-xs font-medium truncate">
                    {typeInfo?.label || action.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={action.enabled}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAction(action.id, { enabled: e.target.checked })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5"
                      title="Enable/Disable"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAction(action.id)
                      }}
                      className="p-0.5 hover:bg-muted rounded text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-2 bg-background border-t">
                    <ActionConfigFields
                      action={action}
                      onChange={(config) => updateAction(action.id, { config })}
                      showValidation={action.type === 'product_purchase'}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Action Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-muted-foreground/30 hover:border-primary text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Action
        </button>

        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
            <div className="absolute left-0 right-0 bottom-full mb-1 bg-background border rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
              {Object.entries(groupedActionTypes).map(([category, types]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {category}
                  </div>
                  {types.map((type) => {
                    const Icon = ACTION_ICONS[type.value] || ExternalLink
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => addAction(type.value)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted text-xs text-left"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActionConfigFields({
  action,
  onChange,
  showValidation = false,
}: {
  action: Action
  onChange: (config: Record<string, any>) => void
  showValidation?: boolean
}) {
  const update = (key: string, value: any) => {
    onChange({ ...action.config, [key]: value })
  }

  switch (action.type) {
    case 'direct_url':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input
              className="text-xs h-8"
              value={action.config.url || ''}
              onChange={(e) => update('url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`newTab-${action.id}`}
              checked={action.config.openInNewTab || false}
              onChange={(e) => update('openInNewTab', e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor={`newTab-${action.id}`} className="text-xs">
              Open in New Tab
            </Label>
          </div>
        </>
      )

    case 'internal_page':
      return <InternalPageConfig action={action} onChange={onChange} />

    case 'scroll_to_section':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Section ID</Label>
            <Input
              className="text-xs h-8"
              value={action.config.sectionId || ''}
              onChange={(e) => update('sectionId', e.target.value)}
              placeholder="pricing-section"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Offset (px)</Label>
            <Input
              className="text-xs h-8"
              type="number"
              value={action.config.offset || 0}
              onChange={(e) => update('offset', parseInt(e.target.value) || 0)}
            />
          </div>
        </>
      )

    case 'product_purchase':
      return <ProductPurchaseConfig action={action} onChange={onChange} />

    case 'whatsapp_chat':
    case 'whatsapp_inquiry':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Phone Number</Label>
            <Input
              className="text-xs"
              value={action.config.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+62812345678"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message</Label>
            <Input
              className="text-xs"
              value={action.config.message || ''}
              onChange={(e) => update('message', e.target.value)}
              placeholder="Hi, I'm interested in..."
            />
          </div>
          {action.type === 'whatsapp_inquiry' && (
            <ProductPurchaseConfig action={action} onChange={onChange} />
          )}
        </>
      )

    case 'phone_call':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Phone Number</Label>
          <Input
            className="text-xs"
            value={action.config.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+62812345678"
          />
        </div>
      )

    case 'email':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              className="text-xs"
              type="email"
              value={action.config.email || ''}
              onChange={(e) => update('email', e.target.value)}
              placeholder="hello@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input
              className="text-xs"
              value={action.config.subject || ''}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Body</Label>
            <Input
              className="text-xs"
              value={action.config.body || ''}
              onChange={(e) => update('body', e.target.value)}
              placeholder="Email body..."
            />
          </div>
        </>
      )

    case 'telegram':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Username</Label>
            <Input
              className="text-xs"
              value={action.config.username || ''}
              onChange={(e) => update('username', e.target.value)}
              placeholder="@username"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message</Label>
            <Input
              className="text-xs"
              value={action.config.message || ''}
              onChange={(e) => update('message', e.target.value)}
              placeholder="Message..."
            />
          </div>
        </>
      )

    case 'facebook_pixel':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Event Name</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={action.config.eventName || 'Lead'}
            onChange={(e) => update('eventName', e.target.value)}
          >
            <option value="PageView">PageView</option>
            <option value="ViewContent">ViewContent</option>
            <option value="AddToCart">AddToCart</option>
            <option value="InitiateCheckout">InitiateCheckout</option>
            <option value="Purchase">Purchase</option>
            <option value="Lead">Lead</option>
            <option value="CompleteRegistration">CompleteRegistration</option>
            <option value="CustomEvent">Custom Event</option>
          </select>
        </div>
      )

    case 'google_analytics':
      return (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Event Name</Label>
            <Input
              className="text-xs"
              value={action.config.eventName || ''}
              onChange={(e) => update('eventName', e.target.value)}
              placeholder="purchase"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input
                className="text-xs"
                value={action.config.category || ''}
                onChange={(e) => update('category', e.target.value)}
                placeholder="ecommerce"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                className="text-xs"
                value={action.config.label || ''}
                onChange={(e) => update('label', e.target.value)}
                placeholder="button"
              />
            </div>
          </div>
        </>
      )

    case 'google_ads':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Conversion ID</Label>
            <Input
              className="text-xs"
              value={action.config.conversionId || ''}
              onChange={(e) => update('conversionId', e.target.value)}
              placeholder="AW-XXXXXX"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Conversion Label</Label>
            <Input
              className="text-xs"
              value={action.config.conversionLabel || ''}
              onChange={(e) => update('conversionLabel', e.target.value)}
              placeholder="XXXXXX"
            />
          </div>
        </div>
      )

    case 'tiktok_pixel':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Event Name</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={action.config.eventName || 'ViewContent'}
            onChange={(e) => update('eventName', e.target.value)}
          >
            <option value="ViewContent">ViewContent</option>
            <option value="AddToCart">AddToCart</option>
            <option value="InitiateCheckout">InitiateCheckout</option>
            <option value="Purchase">Purchase</option>
            <option value="Lead">Lead</option>
          </select>
        </div>
      )

    default:
      return (
        <p className="text-xs text-muted-foreground">
          No configuration needed for this action type.
        </p>
      )
  }
}

function ProductPurchaseConfig({
  action,
  onChange,
}: {
  action: Action
  onChange: (config: Record<string, any>) => void
}) {
  const [products, setProducts] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, slug, variants_enabled, price')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setProducts(data || []))
  }, [])

  useEffect(() => {
    const productId = action.config.productId
    if (!productId) {
      setVariants([])
      return
    }
    const product = products.find((p) => p.id === productId)
    if (!product?.variants_enabled) {
      setVariants([])
      return
    }
    supabase
      .from('product_variants')
      .select('id, name, variant_type, price')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setVariants(data || []))
  }, [action.config.productId, products])

  const updateProduct = (productId: string | null) => {
    const product = products.find((p) => p.id === productId)
    console.log('[ProductPurchaseConfig] Updating product:', productId)
    console.log('[ProductPurchaseConfig] Product found:', product?.name)
    console.log('[ProductPurchaseConfig] Product slug:', product?.slug)
    onChange({
      ...action.config,
      productId,
      variantId: null,
      productSlug: product?.slug || null,
      productName: product?.name || null,
      variantName: null,
      variantPrice: null
    })
  }

  const updateVariant = (variantId: string | null) => {
    const variant = variants.find((v) => v.id === variantId)
    console.log('[ProductPurchaseConfig] Updating variant:', variantId)
    console.log('[ProductPurchaseConfig] Variant found:', variant?.name)
    // Get the current product to ensure productId and productSlug are set
    const currentProduct = products.find((p) => p.id === action.config.productId)
    onChange({
      ...action.config,
      productId: action.config.productId || currentProduct?.id || null,
      productSlug: action.config.productSlug || currentProduct?.slug || null,
      productName: action.config.productName || currentProduct?.name || null,
      variantId,
      variantName: variant?.name || null,
      variantPrice: variant?.price || null
    })
  }

  const product = products.find((p) => p.id === action.config.productId)
  const needsVariant = product?.variants_enabled && variants.length > 0
  const variantMissing = needsVariant && !action.config.variantId

  // Get selected variant info
  const selectedVariant = variants.find((v) => v.id === action.config.variantId)

  // Format price for display
  const formatIDR = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price)

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Product *</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8"
          value={action.config.productId || ''}
          onChange={(e) => updateProduct(e.target.value || null)}
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {action.config.productId && variants.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Variant *</Label>
          <select
            className={`w-full rounded-md border bg-background px-2 py-1.5 text-xs h-8 ${variantMissing ? 'border-destructive' : 'border-input'}`}
            value={action.config.variantId || ''}
            onChange={(e) => updateVariant(e.target.value || null)}
          >
            <option value="">Select Variant</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} - {formatIDR(v.price)}
              </option>
            ))}
          </select>
          {variantMissing && (
            <p className="text-xs text-destructive">Please select a product variant.</p>
          )}
        </div>
      )}

      {action.config.productId && variants.length === 0 && product && !product.variants_enabled && (
        <p className="text-xs text-muted-foreground">
          Product has no variants. Default checkout will be used.
        </p>
      )}

      {/* Debug/Context Preview */}
      {action.config.productId && action.config.productName && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-1">Purchase Context:</p>
          <div className="space-y-0.5 text-xs text-blue-600">
            <p>Product: <span className="font-medium text-blue-800">{action.config.productName}</span></p>
            {action.config.variantId && action.config.variantName && (
              <p>Variant: <span className="font-medium text-blue-800">{action.config.variantName}</span></p>
            )}
            <p>Price: <span className="font-bold text-blue-800">
              {action.config.variantId && action.config.variantPrice
                ? formatIDR(action.config.variantPrice)
                : product?.price
                ? formatIDR(product.price)
                : 'Not set'}
            </span></p>
          </div>
        </div>
      )}
    </>
  )
}

function InternalPageConfig({
  action,
  onChange,
}: {
  action: Action
  onChange: (config: Record<string, any>) => void
}) {
  const [pages, setPages] = useState<any[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    // Fetch all products that have published builder content
    supabase
      .from('products')
      .select('id, name, slug')
      .eq('status', 'active')
      .eq('builder_published', true)
      .order('name')
      .then(({ data }) => setPages(data || []))
  }, [])

  const update = (key: string, value: any) => {
    onChange({ ...action.config, [key]: value })
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">Page</Label>
      <select
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8"
        value={action.config.pageId || ''}
        onChange={(e) => {
          const page = pages.find(p => p.id === e.target.value)
          update('pageId', e.target.value || null)
          update('pageTitle', page?.name || '')
        }}
      >
        <option value="">Select Page</option>
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
