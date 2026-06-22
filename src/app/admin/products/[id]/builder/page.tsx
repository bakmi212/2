'use client'

import React, { useState, useEffect, Suspense, useCallback, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2, Eye, Save, Globe, Plus, Trash2, Copy,
  ChevronUp, ChevronDown, Type, Image as ImageIcon, Video,
  Star, Clock, HelpCircle, ShoppingCart, Link2, GripVertical,
  FileText, Layout, MoveVertical, Code, Monitor, Smartphone, Tablet,
  ImagePlus, X, Package, DollarSign, ArrowRight, Sparkles, Check,
  Shield, Users, Send, Mail, AlertCircle, Bell, Maximize2, PanelLeft,
  Badge, Tag, CreditCard, Table, Heart, PanelTop, ChevronLeft, ArrowLeft,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiActionEditor } from '@/components/multi-action-editor'
import { Action, createEmptyAction, executeActions } from '@/lib/action-engine'
import { BLOCK_CATEGORIES, getDefaultBlockContent } from '@/lib/builder-blocks'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ==================== TYPES ==================== */
interface BuilderBlock {
  id: string
  type: string
  content: Record<string, any>
}

interface ProductData {
  id: string
  name: string
  slug: string
  price: number
  compare_price: number | null
  image_url: string | null
  short_description: string | null
  description: string | null
  status: string
  cta_type: string
  whatsapp_number: string | null
  external_url: string | null
  rating_average: number | null
  rating_count: number | null
  sales_count: number | null
}

/* ==================== ICON MAPPING ==================== */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Layout, Type, FileText, ArrowRight, Sparkles, MoveVertical, ImageIcon, Video, Star, DollarSign,
  HelpCircle, Clock, ShoppingCart, Package, Code, Check, Shield, Users, Send, Mail, AlertCircle,
  Bell, Maximize2, PanelLeft, Badge, Tag, CreditCard, Table, Heart, PanelTop
}

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || Layout
}


/* ==================== TEMPLATES ==================== */
const TEMPLATES: { name: string; blocks: BuilderBlock[] }[] = [
  {
    name: 'Product Sales Page',
    blocks: [
      { id: 't1', type: 'hero', content: { title: 'Your Amazing Product', subtitle: 'The complete solution that transforms how you work', buttonText: 'Get Started Now', bgImage: '', bgColor: '#0f172a', align: 'center', height: '600', overlayOpacity: '50' } },
      { id: 't2', type: 'features', content: { items: [{ title: 'Easy Setup', description: 'Get up and running in minutes' }, { title: 'Powerful Features', description: 'Unlock advanced capabilities' }, { title: '24/7 Support', description: 'Our team is always here to help' }], columns: '3', align: 'center' } },
      { id: 't3', type: 'pricing', content: { title: 'Simple Pricing', price: '$49', period: 'one-time', features: ['Full Access', 'Lifetime Updates', 'Priority Support', 'Commercial License'], buttonText: 'Buy Now', highlighted: false, align: 'center' } },
      { id: 't4', type: 'testimonials', content: { items: [{ name: 'Sarah Johnson', role: 'Designer', text: 'This product completely changed my workflow.', rating: '5' }, { name: 'Mike Chen', role: 'Developer', text: 'Best investment I made this year.', rating: '5' }], columns: '2', align: 'center' } },
      { id: 't5', type: 'faq', content: { items: [{ question: 'What is included?', answer: 'Everything you see in the feature list plus lifetime updates.' }, { question: 'Is there a refund policy?', answer: 'Yes, we offer a 30-day money-back guarantee.' }], align: 'center' } },
      { id: 't6', type: 'cta', content: { title: 'Ready to transform your business?', text: 'Join thousands of satisfied customers today.', buttonText: 'Buy Now', align: 'center', bgColor: '#f1f5f9' } },
    ]
  },
  {
    name: 'Course Landing Page',
    blocks: [
      { id: 'c1', type: 'hero', content: { title: 'Master Digital Marketing', subtitle: 'Learn from industry experts and grow your business', buttonText: 'Enroll Now', bgColor: '#1e40af', align: 'center', height: '600', overlayOpacity: '40' } },
      { id: 'c2', type: 'features', content: { items: [{ title: '50+ Video Lessons', description: 'Comprehensive curriculum covering all aspects' }, { title: 'Downloadable Resources', description: 'Templates, checklists, and guides included' }, { title: 'Certificate', description: 'Earn a verified certificate upon completion' }], columns: '3', align: 'center' } },
      { id: 'c3', type: 'pricing', content: { title: 'Enroll Today', price: '$199', period: 'one-time', features: ['Lifetime Access', 'All Modules', 'Community Access', 'Certificate'], buttonText: 'Enroll Now', highlighted: true, align: 'center' } },
      { id: 'c4', type: 'testimonials', content: { items: [{ name: 'Emily Davis', role: 'Student', text: 'This course paid for itself within the first week!', rating: '5' }], columns: '1', align: 'center' } },
      { id: 'c5', type: 'faq', content: { items: [{ question: 'How long do I have access?', answer: 'Lifetime access to all course materials and updates.' }, { question: 'Is there a community?', answer: 'Yes, you get access to our private community forum.' }], align: 'center' } },
    ]
  },
  {
    name: 'Software Landing Page',
    blocks: [
      { id: 's1', type: 'hero', content: { title: 'Scale Your Business', subtitle: 'Cloud-based platform for modern teams', buttonText: 'Start Free Trial', bgColor: '#0f172a', align: 'center', height: '600', overlayOpacity: '50' } },
      { id: 's2', type: 'features', content: { items: [{ title: 'Cloud Sync', description: 'Real-time synchronization across all devices' }, { title: 'Team Collaboration', description: 'Work together seamlessly with built-in tools' }, { title: 'Analytics Dashboard', description: 'Track performance with detailed insights' }], columns: '3', align: 'center' } },
      { id: 's3', type: 'pricing', content: { title: 'Pricing Plans', price: '$29', period: '/month', features: ['Unlimited Users', 'API Access', 'Custom Integrations', 'Dedicated Support'], buttonText: 'Start Trial', highlighted: true, align: 'center' } },
      { id: 's4', type: 'testimonials', content: { items: [{ name: 'Alex Rivera', role: 'CTO', text: 'Reduced our operational costs by 40% in the first month.', rating: '5' }], columns: '1', align: 'center' } },
      { id: 's5', type: 'cta', content: { title: 'Join 10,000+ teams', text: 'Start your free trial today. No credit card required.', buttonText: 'Get Started Free', align: 'center', bgColor: '#f1f5f9' } },
    ]
  },
  {
    name: 'Affiliate Landing Page',
    blocks: [
      { id: 'a1', type: 'hero', content: { title: 'Earn While You Share', subtitle: 'Promote products you love and earn commissions', buttonText: 'Join Now', bgColor: '#166534', align: 'center', height: '500', overlayOpacity: '40' } },
      { id: 'a2', type: 'features', content: { items: [{ title: 'High Commissions', description: 'Earn up to 50% on every sale you refer' }, { title: 'Real-time Tracking', description: 'Monitor your earnings with live analytics' }, { title: 'Instant Payouts', description: 'Get paid directly to your account' }], columns: '3', align: 'center' } },
      { id: 'a3', type: 'pricing', content: { title: 'Free to Join', price: 'Free', period: 'to join', features: ['No Setup Fee', 'Marketing Materials', 'Dedicated Manager', 'Monthly Bonuses'], buttonText: 'Join Affiliate Program', highlighted: false, align: 'center' } },
      { id: 'a4', type: 'testimonials', content: { items: [{ name: 'James Wilson', role: 'Affiliate Partner', text: 'Made my first $1000 in the first month.', rating: '5' }], columns: '1', align: 'center' } },
      { id: 'a5', type: 'cta', content: { title: 'Start earning passive income', text: 'Promote products you believe in and earn.', buttonText: 'Become an Affiliate', align: 'center', bgColor: '#f0fdf4' } },
    ]
  },
]

/* ==================== SORTABLE BLOCK ITEM ==================== */
function SortableBlockItem({ block, index, isSelected, onClick, onDuplicate, onDelete }: {
  block: BuilderBlock
  index: number
  isSelected: boolean
  onClick: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} onClick={onClick} className={`relative group rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'}`}>
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1 z-10">
        <button type="button" {...attributes} {...listeners} className="p-1 bg-background rounded shadow border cursor-grab active:cursor-grabbing"><GripVertical className="h-3 w-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate() }} className="p-1 bg-background rounded shadow border"><Copy className="h-3 w-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 bg-background rounded shadow border text-destructive"><Trash2 className="h-3 w-3" /></button>
      </div>
      <div className="pointer-events-none p-4">
        <BlockPreview block={block} />
      </div>
    </div>
  )
}

/* ==================== BLOCK PREVIEW (CANVAS) ==================== */
function BlockPreview({ block }: { block: BuilderBlock }) {
  const { type, content } = block
  const getAlign = (a: string) => a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left'
  const getLevel = (l: string) => {
    if (l === 'h1') return 'h1'
    if (l === 'h3') return 'h3'
    if (l === 'h4') return 'h4'
    return 'h2'
  }

  switch (type) {
    case 'section': return (
      <div className="py-2 text-xs text-muted-foreground border border-dashed border-muted rounded px-3 bg-muted/20">
        Section: {content.padding}px padding, {content.bgColor}
      </div>
    )
    case 'container': return (
      <div className="py-2 text-xs text-muted-foreground border border-dashed border-muted rounded px-3 bg-muted/20">
        Container: {content.padding}px padding, {content.bgColor}
      </div>
    )
    case 'hero': return (
      <div className="text-center py-8 rounded-lg text-white text-xs" style={{ background: content.bgColor || '#0f172a' }}>
        <div className="font-bold text-lg">{content.title}</div>
        <div>{content.subtitle}</div>
        <div className="mt-2 px-3 py-1 bg-white text-black rounded inline-block">{content.buttonText}</div>
      </div>
    )
    case 'heading': return (
      <div className={`py-3 ${getAlign(content.align)} text-xs`}>
        {getLevel(content.level) === 'h1' ? <h1 className="font-bold text-lg">{content.text}</h1> : getLevel(content.level) === 'h3' ? <h3 className="font-bold">{content.text}</h3> : <h2 className="font-bold text-base">{content.text}</h2>}
      </div>
    )
    case 'text': return <div className={`py-3 ${getAlign(content.align)} text-xs text-muted-foreground`}><p>{content.text}</p></div>
    case 'button': return (
      <div className={`py-3 ${getAlign(content.align)}`}>
        <span className="px-3 py-1 bg-primary text-white rounded text-xs">{content.text}</span>
      </div>
    )
    case 'image': return <div className={`py-3 ${getAlign(content.align)}`}>{content.src ? <img src={content.src} alt={content.alt} className="max-h-24 mx-auto rounded" /> : <div className="h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Image</div>}{content.caption && <p className="text-xs mt-1">{content.caption}</p>}</div>
    case 'gallery': return <div className="grid grid-cols-3 gap-2 py-3">{content.images?.length ? content.images.map((img: string, i: number) => <img key={i} src={img} className="h-12 w-full object-cover rounded" />) : <div className="col-span-3 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Gallery</div>}</div>
    case 'video': return <div className="py-3 bg-muted rounded h-20 flex items-center justify-center text-xs text-muted-foreground">Video: {content.url || 'No URL'}</div>
    case 'features': return <div className="grid grid-cols-3 gap-2 py-3">{content.items?.map((f: any, i: number) => <div key={i} className="p-2 bg-muted rounded text-xs"><strong>{f.title}</strong><p className="text-muted-foreground">{f.description}</p></div>)}</div>
    case 'pricing': return <div className="py-3 bg-muted rounded text-center text-xs"><div className="text-lg font-bold">{content.price}</div><div className="text-muted-foreground">{content.period}</div></div>
    case 'testimonials': return <div className="py-3 bg-muted rounded text-xs italic">&ldquo;{content.items?.[0]?.text || 'Testimonial'}&rdquo;</div>
    case 'faq': return <div className="space-y-1 py-3">{content.items?.map((q: any, i: number) => <div key={i} className="p-2 bg-muted rounded text-xs"><strong>Q: {q.question}</strong></div>)}</div>
    case 'countdown': return <div className="py-3 bg-muted rounded text-center text-xs">Countdown: {content.label}</div>
    case 'cta': return <div className={`py-4 text-center bg-muted rounded text-xs`}><p className="font-bold">{content.title}</p><p>{content.text}</p><span className="mt-1 px-3 py-1 bg-primary text-white rounded inline-block">{content.buttonText}</span></div>
    case 'divider': return <div className="py-2"><hr style={{ borderStyle: content.style, borderColor: content.color, height: content.height + 'px' }} /></div>
    case 'spacer': return <div style={{ height: content.height }} className="border border-dashed border-muted" />
    case 'product_image': return <div className="py-3 bg-muted rounded text-center text-xs text-muted-foreground">Product Image (auto)</div>
    case 'product_name': return <div className="py-3 text-center text-xs font-bold">Product Name (auto)</div>
    case 'product_price': return <div className="py-3 text-center text-xs font-bold">$Price (auto)</div>
    case 'product_description': return <div className="py-3 text-center text-xs text-muted-foreground">Product Description (auto)</div>
    case 'buy_button': return <div className="py-3 text-center"><span className="px-3 py-1 bg-primary text-white rounded text-xs">{content.text}</span></div>
    // CTA Components
    case 'cta_button': return (
      <div className={`py-3 ${getAlign(content.align || 'center')}`}>
        <span className={`px-4 py-2 bg-primary text-white rounded text-xs ${content.fullWidth ? 'block w-full text-center' : 'inline-block'}`}>
          {content.text || 'CTA Button'}
        </span>
      </div>
    )
    case 'checkout_button': return (
      <div className={`py-3 ${getAlign(content.align || 'center')}`}>
        <span className={`px-4 py-2 bg-green-600 text-white rounded text-xs ${content.fullWidth ? 'block w-full text-center' : 'inline-block'}`}>
          {content.text || 'Checkout'}
        </span>
        {content.actions?.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">→ Product Purchase configured</p>
        )}
      </div>
    )
    case 'order_summary': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium mb-2">Order Summary</div>
        <div className="space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>IDR 0</span></div>
          {content.showDiscount && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-IDR 0</span></div>}
          {content.showTax && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>IDR 0</span></div>}
          {content.showTotal && <div className="flex justify-between font-medium border-t pt-1"><span>Total</span><span>IDR 0</span></div>}
        </div>
      </div>
    )
    case 'custom_order_form': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium mb-2">Order Form</div>
        <div className="space-y-2">
          {(content.fields || []).map((f: any, i: number) => (
            <div key={i}>
              <Label className="text-muted-foreground">{f.label}{f.required && '*'}</Label>
              <Input className="h-6 text-xs mt-1" disabled placeholder={f.type} />
            </div>
          ))}
          <span className="mt-2 px-3 py-1 bg-primary text-white rounded inline-block">{content.submitText || 'Submit'}</span>
        </div>
      </div>
    )
    // Additional CTA types
    case 'cta_banner': return (
      <div className="py-3 px-3 rounded text-xs text-center" style={{ background: content.bgColor || '#0f172a', color: content.textColor || '#fff' }}>
        <div className="font-bold">{content.title}</div>
        <div className="opacity-80">{content.text}</div>
        <span className="mt-1 px-2 py-0.5 bg-white/20 rounded inline-block">{content.buttonText}</span>
      </div>
    )
    case 'cta_card': return (
      <div className="py-3 px-3 rounded text-xs" style={{ background: content.bgColor || '#f1f5f9' }}>
        <div className="font-bold">{content.title}</div>
        <div className="text-muted-foreground">{content.text}</div>
        <span className="mt-1 px-2 py-0.5 bg-primary text-white rounded inline-block">{content.buttonText}</span>
      </div>
    )
    case 'cta_section': return (
      <div className={`py-6 px-3 rounded text-xs ${getAlign(content.align || 'center')}`} style={{ background: content.bgColor || '#0f172a', color: content.textColor || '#fff' }}>
        <div className="font-bold text-lg">{content.title}</div>
        <div className="opacity-80">{content.text}</div>
        <span className="mt-2 px-4 py-1 bg-white text-black rounded inline-block">{content.buttonText}</span>
      </div>
    )
    case 'floating_cta': return (
      <div className="py-2 px-3 rounded text-xs inline-block" style={{ background: content.bgColor || '#0f172a' }}>
        <span className="text-white">{content.text || 'Buy Now'}</span>
      </div>
    )
    case 'sticky_cta': return (
      <div className="py-2 px-3 rounded text-xs flex justify-between items-center" style={{ background: content.bgColor || '#dc2626', color: '#fff' }}>
        <span>{content.text}</span>
        <span className="px-2 py-0.5 bg-white/20 rounded">{content.buttonText}</span>
      </div>
    )
    // Additional order blocks
    case 'order_form': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium mb-2">Order Form</div>
        <div className="space-y-2">
          {(content.fields || ['name', 'email', 'phone']).map((f: string, i: number) => (
            <Input key={i} className="h-6 text-xs" disabled placeholder={f} />
          ))}
          <span className="px-3 py-1 bg-primary text-white rounded inline-block">{content.submitText || 'Complete Order'}</span>
        </div>
      </div>
    )
    case 'product_selector': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium">Product Selector</div>
        <p className="text-muted-foreground">Select product in settings</p>
      </div>
    )
    case 'variant_selector': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium">Variant Selector</div>
        <p className="text-muted-foreground">Select variant in settings</p>
      </div>
    )
    case 'coupon_input': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="flex gap-2">
          <Input className="h-6 text-xs flex-1" disabled placeholder={content.placeholder || 'Enter coupon code'} />
          <span className="px-2 py-0.5 bg-muted rounded">{content.applyText || 'Apply'}</span>
        </div>
      </div>
    )
    case 'order_bump': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={content.checked} readOnly />
          <div>
            <div className="font-medium">{content.title}</div>
            <div className="text-muted-foreground">{content.description} (+IDR {content.price})</div>
          </div>
        </label>
      </div>
    )
    case 'upsell': return (
      <div className="py-3 bg-muted/50 rounded px-3 text-xs">
        <div className="font-medium">{content.title}</div>
        <div className="text-muted-foreground">{content.description}</div>
        <div className="text-primary font-bold">+IDR {content.price}</div>
      </div>
    )
    case 'html': return <div className="text-xs text-muted-foreground py-3 bg-muted rounded px-2">Custom HTML</div>
    default: return (
      <div className="py-3 px-3 bg-amber-50 border border-amber-200 rounded text-xs">
        <p className="font-medium text-amber-700">Block Type: {type}</p>
        <p className="text-muted-foreground mt-1">Add specific renderer in BlockPreview</p>
      </div>
    )
  }
}

/* ==================== LIVE PREVIEW RENDERER ==================== */
function LivePreviewRenderer({ blocks, product, device }: { blocks: BuilderBlock[]; product: ProductData; device: string }) {
  const isAvailable = product.status === 'active'

  const getBlockActionUrl = (content: Record<string, any>): string => {
    // New multi-action system
    if (content.actions && Array.isArray(content.actions) && content.actions.length > 0) {
      const navAction = content.actions.find((a: Action) =>
        a.enabled && !['facebook_pixel', 'google_analytics', 'google_ads', 'tiktok_pixel', 'custom_tracking', 'page_view'].includes(a.type)
      )
      if (navAction) {
        switch (navAction.type) {
          case 'direct_url': return navAction.config.url || '#'
          case 'product_purchase': {
            const { productId, variantId, productSlug } = navAction.config
            // Use productSlug from action config, then productId, never use current product.slug
            const productRef = productSlug || productId
            if (productRef) {
              let url = `/checkout?product=${productRef}&action=product_purchase`
              if (variantId) url += `&variant=${variantId}`
              console.log('[Builder Preview] Generated Product Purchase URL:', url)
              console.log('[Builder Preview] Product ID:', productId)
              console.log('[Builder Preview] Variant ID:', variantId)
              return url
            }
            break
          }
          case 'whatsapp_chat': case 'whatsapp_inquiry': {
            const { phone, message } = navAction.config
            if (phone) {
              let url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`
              if (message) url += `?text=${encodeURIComponent(message)}`
              return url
            }
            break
          }
          case 'phone_call': {
            const { phone } = navAction.config
            if (phone) return `tel:${phone}`
            break
          }
          case 'email': {
            const { email, subject, body } = navAction.config
            if (email) {
              let mailto = `mailto:${email}`
              const params = []
              if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
              if (body) params.push(`body=${encodeURIComponent(body)}`)
              if (params.length) mailto += `?${params.join('&')}`
              return mailto
            }
            break
          }
          case 'telegram': {
            const { username } = navAction.config
            if (username) return `https://t.me/${username.replace('@', '')}`
            break
          }
        }
      }
    }
    // Legacy single-action system (backward compatibility)
    if (content.actionType === 'direct_url') return content.url || '#'
    if (content.actionType === 'product_purchase') {
      const { productId, variantId, productSlug } = content
      const productRef = productSlug || productId
      if (productRef) {
        let checkoutUrl = `/checkout?product=${productRef}&action=product_purchase`
        if (variantId) checkoutUrl += `&variant=${variantId}`
        console.log('[Builder Preview] Legacy Product Purchase URL:', checkoutUrl)
        return checkoutUrl
      }
    }
    // Default product checkout (use action's product, not current product being edited)
    return `/checkout?product=${product.slug}`
  }

  const handleBlockClick = (content: Record<string, any>) => {
    if (content.actions && Array.isArray(content.actions) && content.actions.length > 0) {
      executeActions(content.actions as Action[])
    }
  }

  const getCtaUrl = () => {
    switch (product.cta_type) {
      case 'whatsapp': return product.whatsapp_number ? `https://wa.me/${product.whatsapp_number}` : '#'
      case 'external_link': return product.external_url || '#'
      case 'order_form': return '#'
      default: return `/checkout?product=${product.slug}`
    }
  }
  const getCtaLabel = () => {
    switch (product.cta_type) {
      case 'whatsapp': return 'Chat on WhatsApp'
      case 'external_link': return 'Visit Link'
      case 'order_form': return 'Order Now'
      default: return 'Buy Now'
    }
  }

  const widthClass = device === 'mobile' ? 'max-w-[375px]' : device === 'tablet' ? 'max-w-[768px]' : 'w-full'

  return (
    <div className="flex-1 overflow-auto bg-white flex justify-center">
      <div className={`${widthClass} transition-all`}>
        <div className="space-y-0">
          {blocks.map((block) => {
            const { type, content } = block
            const align = content.align || 'left'
            const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

            const renderBlock = () => {
              switch (type) {
                case 'section': return (
                  <div className="py-4" style={{ background: content.bgColor, padding: `${content.padding}px 0` }}>
                    <div className="mx-auto px-4" style={{ maxWidth: content.maxWidth ? `${content.maxWidth}px` : '1200px' }}>
                      {/* Children are rendered inline as siblings */}
                    </div>
                  </div>
                )
                case 'container': return (
                  <div className="mx-auto px-4 rounded-xl" style={{ maxWidth: content.maxWidth ? `${content.maxWidth}px` : '1200px', padding: `${content.padding}px`, background: content.bgColor, borderRadius: `${content.borderRadius}px` }}>
                    {/* Container children */}
                  </div>
                )
                case 'hero': return (
                  <section className="relative overflow-hidden text-white flex items-center justify-center" style={{ background: content.bgImage ? undefined : (content.bgColor || '#0f172a'), minHeight: `${content.height}px` }}>
                    {content.bgImage && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.bgImage})` }} />}
                    <div className="absolute inset-0 bg-black" style={{ opacity: (content.overlayOpacity || 50) / 100 }} />
                    <div className={`relative z-10 px-4 py-20 max-w-3xl mx-auto ${alignClass}`}>
                      <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontSize: content.fontSize ? `${content.fontSize}px` : undefined }}>{content.title}</h1>
                      <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">{content.subtitle}</p>
                      {isAvailable && <a href={getCtaUrl()} className="inline-block px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-white/90 transition-colors">{content.buttonText || getCtaLabel()}</a>}
                    </div>
                  </section>
                )
                case 'heading': {
                  const level = content.level || 'h2'
                  const style = { fontSize: content.fontSize ? `${content.fontSize}px` : undefined, fontWeight: content.fontWeight, color: content.color }
                  if (level === 'h1') return <h1 className={`font-bold py-6 px-4 ${alignClass}`} style={style}>{content.text}</h1>
                  if (level === 'h3') return <h3 className={`font-bold py-4 px-4 ${alignClass}`} style={style}>{content.text}</h3>
                  return <h2 className={`font-bold py-6 px-4 ${alignClass}`} style={style}>{content.text}</h2>
                }
                case 'text': return (
                  <div className={`py-4 px-4 ${alignClass}`} style={{ color: content.color, fontSize: content.fontSize ? `${content.fontSize}px` : undefined, lineHeight: content.lineHeight }}>
                    <p>{content.text}</p>
                  </div>
                )
                case 'button': {
                  const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
                  const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
                  const btnRounded = content.rounded === 'none' ? 'rounded-none' : content.rounded === 'full' ? 'rounded-full' : 'rounded-lg'
                  const btnUrl = content.actions?.length ? getBlockActionUrl(content) : (content.url || getCtaUrl())
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className={`py-4 px-4 ${alignClass}`}>
                      {hasActions ? (
                        <button onClick={() => handleBlockClick(content)} className={`inline-block font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                          {content.text}
                        </button>
                      ) : (
                        <a href={btnUrl} className={`inline-block font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                          {content.text}
                        </a>
                      )}
                    </div>
                  )
                }
                case 'image': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className={`py-4 px-4 ${alignClass}`}>
                      {content.src ? (
                        hasActions ? (
                          <button onClick={() => handleBlockClick(content)} className="block mx-auto cursor-pointer hover:opacity-90 transition-opacity">
                            <img src={content.src} alt={content.alt} className="mx-auto" style={{ width: content.width, height: content.height, borderRadius: content.borderRadius ? `${content.borderRadius}px` : undefined }} />
                          </button>
                        ) : (
                          <img src={content.src} alt={content.alt} className="mx-auto" style={{ width: content.width, height: content.height, borderRadius: content.borderRadius ? `${content.borderRadius}px` : undefined }} />
                        )
                      ) : null}
                      {content.caption && <p className="text-sm text-muted-foreground mt-2">{content.caption}</p>}
                    </div>
                  )
                }
                case 'gallery': return (
                  <div className="py-4 px-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${content.columns || '3'}, 1fr)`, gap: `${content.gap || 16}px` }}>
                    {content.images?.map((img: string, i: number) => (
                      <img key={i} src={img} className="w-full object-cover" style={{ borderRadius: `${content.borderRadius || 12}px` }} />
                    ))}
                  </div>
                )
                case 'video': return (
                  <div className="py-4 px-4">
                    {content.url && (
                      <div className="w-full" style={{ borderRadius: `${content.borderRadius || 12}px`, overflow: 'hidden' }}>
                        <iframe src={content.url} className="w-full aspect-video" allowFullScreen />
                      </div>
                    )}
                    {content.caption && <p className="text-sm text-muted-foreground mt-2">{content.caption}</p>}
                  </div>
                )
                case 'features': return (
                  <div className="py-8 px-4">
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
                  <div className="py-8 px-4">
                    <div className={`max-w-sm mx-auto p-8 rounded-2xl text-center border-2 ${content.highlighted ? 'border-primary bg-primary/5' : 'border-muted bg-muted/50'}`}>
                      <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
                      <div className="text-4xl font-bold mb-1">{content.price}</div>
                      <div className="text-sm text-muted-foreground mb-6">{content.period}</div>
                      <ul className="space-y-2 mb-6 text-sm text-left">
                        {content.features?.map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
                        ))}
                      </ul>
                      {isAvailable && <a href={getCtaUrl()} className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">{content.buttonText || getCtaLabel()}</a>}
                      {!isAvailable && <button disabled className="w-full py-3 bg-muted text-muted-foreground rounded-lg font-semibold cursor-not-allowed">{product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}</button>}
                    </div>
                  </div>
                )
                case 'testimonials': return (
                  <div className="py-8 px-4">
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
                  <div className="py-8 px-4 max-w-2xl mx-auto">
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
                  <div className={`py-8 px-4 ${alignClass}`}>
                    <p className="text-muted-foreground mb-2">{content.label}</p>
                    <div className="text-3xl font-bold">{content.targetDate || 'No date set'}</div>
                  </div>
                )
                case 'cta': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className={`py-12 px-4 ${alignClass}`} style={{ background: content.bgColor || '#f1f5f9' }}>
                      <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                      <p className="mb-4">{content.text}</p>
                      {isAvailable && (
                        hasActions ? (
                          <button onClick={() => handleBlockClick(content)} className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || getCtaLabel()}
                          </button>
                        ) : (
                          <a href={getCtaUrl()} className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || getCtaLabel()}
                          </a>
                        )
                      )}
                      {!isAvailable && <button disabled className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-semibold cursor-not-allowed">{product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}</button>}
                    </div>
                  )
                }
                case 'divider': return (
                  <div className="py-4 px-4">
                    <hr style={{ borderStyle: content.style || 'solid', borderColor: content.color || '#e2e8f0', borderWidth: `${content.height || 1}px 0 0 0` }} />
                  </div>
                )
                case 'spacer': return <div style={{ height: content.height || 40 }} />
                case 'product_image': return (
                  <div className={`py-4 px-4 ${alignClass}`}>
                    {product.image_url && <img src={product.image_url} alt={product.name} className="mx-auto" style={{ width: content.width || '100%', maxWidth: content.maxWidth ? `${content.maxWidth}px` : '600px', borderRadius: `${content.borderRadius || 12}px` }} />}
                  </div>
                )
                case 'product_name': {
                  const level = content.level || 'h1'
                  const style = { fontSize: content.fontSize ? `${content.fontSize}px` : undefined, fontWeight: content.fontWeight, color: content.color }
                  if (level === 'h1') return <h1 className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h1>
                  if (level === 'h3') return <h3 className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h3>
                  return <h2 className={`py-4 px-4 font-bold ${alignClass}`} style={style}>{product.name}</h2>
                }
                case 'product_price': return (
                  <div className={`py-4 px-4 ${alignClass}`}>
                    <div className="flex items-baseline gap-3 justify-center" style={{ fontSize: content.fontSize ? `${content.fontSize}px` : '36px', fontWeight: content.fontWeight || '700' }}>
                      <span style={{ color: content.color || '#0f172a' }}>${product.price}</span>
                      {content.showCompare && product.compare_price && <span className="line-through" style={{ color: content.compareColor || '#94a3b8', fontSize: '0.6em' }}>${product.compare_price}</span>}
                    </div>
                  </div>
                )
                case 'product_description': return (
                  <div className={`py-4 px-4 ${alignClass}`} style={{ color: content.color || '#475569', fontSize: content.fontSize ? `${content.fontSize}px` : '18px' }}>
                    <p>{product.short_description || product.description || ''}</p>
                  </div>
                )
                case 'buy_button': {
                  const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
                  const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
                  const btnRounded = content.rounded === 'none' ? 'rounded-none' : content.rounded === 'full' ? 'rounded-full' : 'rounded-lg'
                  const btnWidth = content.fullWidth ? 'w-full' : 'inline-block'
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className={`py-4 px-4 ${alignClass}`}>
                      {isAvailable ? (
                        hasActions ? (
                          <button onClick={() => handleBlockClick(content)} className={`${btnWidth} font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                            {content.text || getCtaLabel()}
                          </button>
                        ) : (
                          <a href={getCtaUrl()} className={`${btnWidth} font-semibold ${btnStyle} ${btnSize} ${btnRounded} hover:opacity-90 transition-opacity`}>
                            {content.text || getCtaLabel()}
                          </a>
                        )
                      ) : (
                        <button disabled className={`${btnWidth} font-semibold bg-muted text-muted-foreground ${btnSize} ${btnRounded} cursor-not-allowed`}>
                          {product.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}
                        </button>
                      )}
                    </div>
                  )
                }
                // CTA Components Live Preview
                case 'cta_button': {
                  const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
                  const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
                  const hasActions = content.actions?.length > 0
                  const ctaUrl = hasActions ? getBlockActionUrl(content) : getCtaUrl()
                  return (
                    <div className={`py-4 px-4 ${alignClass}`}>
                      {hasActions ? (
                        <button onClick={() => handleBlockClick(content)} className={`${content.fullWidth ? 'w-full' : 'inline-block'} font-semibold ${btnStyle} ${btnSize} rounded-lg hover:opacity-90 transition-opacity`}>
                          {content.text || 'Get Started'}
                        </button>
                      ) : (
                        <a href={ctaUrl} className={`${content.fullWidth ? 'block text-center w-full' : 'inline-block'} font-semibold ${btnStyle} ${btnSize} rounded-lg hover:opacity-90 transition-opacity`}>
                          {content.text || 'Get Started'}
                        </a>
                      )}
                    </div>
                  )
                }
                case 'checkout_button': {
                  const btnStyle = content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' : content.style === 'outline' ? 'bg-transparent border-2 border-primary text-primary' : 'bg-primary text-primary-foreground'
                  const btnSize = content.size === 'sm' ? 'px-4 py-2 text-sm' : content.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
                  const hasActions = content.actions?.length > 0
                  const checkoutUrl = hasActions ? getBlockActionUrl(content) : getCtaUrl()
                  return (
                    <div className={`py-4 px-4 ${alignClass}`}>
                      {hasActions ? (
                        <button onClick={() => handleBlockClick(content)} className={`${content.fullWidth ? 'w-full' : 'inline-block'} font-semibold ${btnStyle} ${btnSize} rounded-lg hover:opacity-90 transition-opacity`}>
                          {content.text || 'Checkout'}
                        </button>
                      ) : (
                        <a href={checkoutUrl} className={`${content.fullWidth ? 'block text-center w-full' : 'inline-block'} font-semibold ${btnStyle} ${btnSize} rounded-lg hover:opacity-90 transition-opacity`}>
                          {content.text || 'Checkout'}
                        </a>
                      )}
                    </div>
                  )
                }
                case 'cta_banner': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className="py-6 px-4 text-center" style={{ background: content.bgColor || '#0f172a', color: content.textColor || '#ffffff' }}>
                      <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                      <p className="mb-4 opacity-90">{content.text}</p>
                      {isAvailable && (
                        hasActions ? (
                          <button onClick={() => handleBlockClick(content)} className="px-6 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || 'Claim Now'}
                          </button>
                        ) : (
                          <a href={getCtaUrl()} className="inline-block px-6 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || 'Claim Now'}
                          </a>
                        )
                      )}
                    </div>
                  )
                }
                case 'cta_card': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className="py-8 px-4">
                      <div className="max-w-md mx-auto p-6 rounded-xl" style={{ background: content.bgColor || '#f1f5f9' }}>
                        <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                        <p className="mb-4 text-muted-foreground">{content.text}</p>
                        {isAvailable && (
                          hasActions ? (
                            <button onClick={() => handleBlockClick(content)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
                              {content.buttonText || 'Get Started'}
                            </button>
                          ) : (
                            <a href={getCtaUrl()} className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
                              {content.buttonText || 'Get Started'}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )
                }
                case 'cta_section': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className={`py-12 px-4 ${alignClass}`} style={{ background: content.bgColor || '#0f172a', color: content.textColor || '#ffffff' }}>
                      <h3 className="text-2xl font-bold mb-2">{content.title}</h3>
                      <p className="mb-4 opacity-90">{content.text}</p>
                      {isAvailable && (
                        hasActions ? (
                          <button onClick={() => handleBlockClick(content)} className="px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || 'Start Now'}
                          </button>
                        ) : (
                          <a href={getCtaUrl()} className="inline-block px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90">
                            {content.buttonText || 'Start Now'}
                          </a>
                        )
                      )}
                    </div>
                  )
                }
                case 'floating_cta': {
                  const hasActions = content.actions?.length > 0
                  const positionClass = content.position?.includes('left') ? 'left-4' : 'right-4'
                  return (
                    <div className="relative py-8 px-4">
                      <div className={`fixed bottom-4 ${positionClass} p-3 rounded-full shadow-lg font-semibold text-white`} style={{ background: content.bgColor || '#0f172a' }}>
                        {hasActions ? (
                          <button onClick={() => handleBlockClick(content)}>{content.text || 'Buy Now'}</button>
                        ) : (
                          <a href={getCtaUrl()}>{content.text || 'Buy Now'}</a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">[Demo: Floating button appears at {content.position || 'bottom-right'}]</p>
                    </div>
                  )
                }
                case 'sticky_cta': {
                  const hasActions = content.actions?.length > 0
                  return (
                    <div className="py-4 px-4">
                      <div className="flex items-center justify-between gap-4 p-3 rounded-lg" style={{ background: content.bgColor || '#dc2626', color: '#ffffff' }}>
                        <span>{content.text}</span>
                        <button onClick={() => hasActions ? handleBlockClick(content) : null} className="px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-semibold hover:bg-white/30">
                          {content.buttonText || 'Get It Now'}
                        </button>
                      </div>
                    </div>
                  )
                }
                // Order Components
                case 'order_summary': return (
                  <div className="py-8 px-4">
                    <div className="max-w-md mx-auto p-4 border rounded-xl bg-muted/50">
                      <h3 className="font-semibold mb-4">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>IDR 0</span></div>
                        {content.showDiscount !== false && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-IDR 0</span></div>}
                        {content.showTax !== false && <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>IDR 0</span></div>}
                        {content.showTotal !== false && <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>IDR 0</span></div>}
                      </div>
                    </div>
                  </div>
                )
                case 'custom_order_form': {
                  const hasActions = (content.fields || []).some((f: any) => f.actions?.length > 0)
                  return (
                    <div className="py-8 px-4">
                      <div className="max-w-md mx-auto p-4 border rounded-xl bg-muted/50 space-y-3">
                        {(content.fields || []).map((f: any, i: number) => (
                          <div key={i}>
                            <label className="text-xs font-medium">{f.label}{f.required && '*'}</label>
                            {f.type === 'textarea' ? (
                              <textarea className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder={`Enter ${f.label}`} />
                            ) : (
                              <input type={f.type || 'text'} className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder={`Enter ${f.label}`} />
                            )}
                          </div>
                        ))}
                        <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-semibold">
                          {content.submitText || 'Submit'}
                        </button>
                      </div>
                    </div>
                  )
                }
                case 'order_form': return (
                  <div className="py-8 px-4">
                    <div className="max-w-md mx-auto p-4 border rounded-xl bg-muted/50 space-y-3">
                      {(content.fields || ['name', 'email', 'phone']).map((f: string, i: number) => (
                        <div key={i}>
                          <label className="text-xs font-medium capitalize">{f}</label>
                          <input type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'} className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder={f} />
                        </div>
                      ))}
                      {content.showCoupon && (
                        <div>
                          <label className="text-xs font-medium">Coupon Code</label>
                          <div className="flex gap-2 mt-1">
                            <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter code" />
                            <button className="px-4 py-2 bg-muted rounded-lg text-sm">Apply</button>
                          </div>
                        </div>
                      )}
                      <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-semibold">
                        {content.submitText || 'Complete Order'}
                      </button>
                    </div>
                  </div>
                )
                case 'coupon_input': return (
                  <div className="py-4 px-4">
                    <div className="max-w-md mx-auto flex gap-2">
                      <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder={content.placeholder || 'Enter coupon code'} />
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">{content.applyText || 'Apply'}</button>
                    </div>
                  </div>
                )
                case 'order_bump': return (
                  <div className="py-4 px-4">
                    <div className="max-w-md mx-auto p-3 border rounded-lg bg-muted/50">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked={content.checked} className="mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{content.title}</p>
                          <p className="text-xs text-muted-foreground">{content.description}</p>
                        </div>
                        <span className="text-sm font-semibold">+IDR {content.price}</span>
                      </label>
                    </div>
                  </div>
                )
                case 'upsell': return (
                  <div className="py-4 px-4">
                    <div className="max-w-md mx-auto p-4 border-2 border-primary/20 rounded-xl bg-primary/5">
                      <h4 className="font-semibold">{content.title}</h4>
                      <p className="text-xs text-muted-foreground">{content.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-bold">+IDR {content.price}</span>
                        <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Add</button>
                      </div>
                    </div>
                  </div>
                )
                case 'html': return <div className="py-4 px-4" dangerouslySetInnerHTML={{ __html: content.code }} />
                default: return (
                  <div className="py-4 px-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded">
                      <p className="text-sm font-medium text-destructive">Unsupported Component</p>
                      <p className="text-xs text-muted-foreground">Type: {type}</p>
                    </div>
                  </div>
                )
              }
            }
            return <div key={block.id}>{renderBlock()}</div>
          })}
        </div>
        {!isAvailable && (
          <div className="fixed bottom-0 left-0 right-0 bg-destructive text-white text-center py-3 font-semibold z-50">
            {product.status === 'sold_out' ? 'SOLD OUT' : 'COMING SOON'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== BLOCK SETTINGS ==================== */
function BlockSettings({ block, onChange, onImageSelect }: { block: BuilderBlock; onChange: (content: Record<string, any>) => void; onImageSelect: (callback: (url: string) => void) => void }) {
  const { type, content } = block
  const update = (key: string, value: any) => onChange({ ...content, [key]: value })
  const updateArray = (key: string, index: number, field: string, value: any) => {
    const arr = [...(content[key] || [])]
    arr[index] = { ...arr[index], [field]: value }
    onChange({ ...content, [key]: arr })
  }
  const addArrayItem = (key: string, defaultItem: any) => {
    onChange({ ...content, [key]: [...(content[key] || []), defaultItem] })
  }
  const removeArrayItem = (key: string, index: number) => {
    const arr = [...(content[key] || [])]
    arr.splice(index, 1)
    onChange({ ...content, [key]: arr })
  }

  const ImageField = ({ keyName, label }: { keyName: string; label: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex gap-2">
        <input className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs" value={content[keyName] || ''} onChange={(e) => update(keyName, e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => onImageSelect((url: string) => update(keyName, url))}><ImagePlus className="h-3 w-3" /></Button>
      </div>
      {content[keyName] && <img src={content[keyName]} className="h-16 w-full object-cover rounded mt-1" />}
    </div>
  )

  const renderField = (key: string, label: string, inputType: string = 'text', placeholder?: string) => {
    if (inputType === 'textarea') return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium">{label}</label>
        <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-2 py-1 text-xs" value={content[key] || ''} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} />
      </div>
    )
    if (inputType === 'select') {
      const options = placeholder?.split(',') || []
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium">{label}</label>
          <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" value={content[key] || ''} onChange={(e) => update(key, e.target.value)}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    }
    if (inputType === 'number') return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium">{label}</label>
        <input className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" type="number" value={content[key] || ''} onChange={(e) => update(key, e.target.value)} />
      </div>
    )
    if (inputType === 'color') return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium">{label}</label>
        <div className="flex gap-2">
          <input className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" value={content[key] || ''} onChange={(e) => update(key, e.target.value)} />
          <input type="color" value={content[key] || '#000000'} onChange={(e) => update(key, e.target.value)} className="w-8 h-8 rounded border" />
        </div>
      </div>
    )
    return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium">{label}</label>
        <input className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" type="text" value={content[key] || ''} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} />
      </div>
    )
  }

  const commonFields = () => (
    <>
      {renderField('align', 'Alignment', 'select', 'left,center,right')}
      {renderField('fontSize', 'Font Size (px)', 'number')}
      {renderField('color', 'Text Color', 'color')}
      {renderField('fontWeight', 'Font Weight', 'select', '400,500,600,700,800')}
    </>
  )

  switch (type) {
    case 'section': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Section Settings</h3>
        {renderField('padding', 'Padding (px)', 'number')}
        {renderField('bgColor', 'Background Color', 'color')}
        {renderField('maxWidth', 'Max Width (px)', 'number')}
      </div>
    )
    case 'container': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Container Settings</h3>
        {renderField('padding', 'Padding (px)', 'number')}
        {renderField('bgColor', 'Background Color', 'color')}
        {renderField('borderRadius', 'Border Radius (px)', 'number')}
        {renderField('maxWidth', 'Max Width (px)', 'number')}
      </div>
    )
    case 'hero': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Hero Settings</h3>
        {renderField('title', 'Title')}
        {renderField('subtitle', 'Subtitle', 'textarea')}
        {renderField('buttonText', 'Button Text')}
        <ImageField keyName="bgImage" label="Background Image" />
        {renderField('bgColor', 'Background Color', 'color')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('height', 'Height (px)', 'number')}
        {renderField('overlayOpacity', 'Overlay Opacity (%)', 'number')}
      </div>
    )
    case 'heading': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Heading Settings</h3>
        {renderField('text', 'Text')}
        {renderField('level', 'Level', 'select', 'h1,h2,h3,h4')}
        {commonFields()}
      </div>
    )
    case 'text': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Text Settings</h3>
        {renderField('text', 'Content', 'textarea')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('fontSize', 'Font Size (px)', 'number')}
        {renderField('color', 'Text Color', 'color')}
        {renderField('lineHeight', 'Line Height', 'text', '1.5')}
      </div>
    )
    case 'button': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Button Settings</h3>
        {renderField('text', 'Button Text')}
        {renderField('style', 'Style', 'select', 'primary,secondary,outline')}
        {renderField('size', 'Size', 'select', 'sm,md,lg')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('rounded', 'Rounded', 'select', 'none,md,lg,full')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'image': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Image Settings</h3>
        <ImageField keyName="src" label="Image URL" />
        {renderField('alt', 'Alt Text')}
        {renderField('width', 'Width', 'text', '100%')}
        {renderField('height', 'Height', 'text', 'auto')}
        {renderField('borderRadius', 'Border Radius (px)', 'number')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('caption', 'Caption')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'gallery': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Gallery Settings</h3>
        {renderField('columns', 'Columns', 'select', '1,2,3,4,5')}
        {renderField('gap', 'Gap (px)', 'number')}
        {renderField('borderRadius', 'Border Radius (px)', 'number')}
        <div className="space-y-2">
          {content.images?.map((img: string, i: number) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 rounded border px-2 py-1 text-xs" value={img} onChange={(e) => {
                const imgs = [...content.images]
                imgs[i] = e.target.value
                update('images', imgs)
              }} />
              <Button size="sm" variant="outline" onClick={() => {
                const imgs = [...content.images]
                imgs.splice(i, 1)
                update('images', imgs)
              }}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => {
            const imgs = [...(content.images || [])]
            imgs.push('')
            update('images', imgs)
          }}><Plus className="h-3 w-3 mr-1" />Add Image</Button>
        </div>
      </div>
    )
    case 'video': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Video Settings</h3>
        {renderField('url', 'Video URL')}
        {renderField('caption', 'Caption')}
        {renderField('width', 'Width', 'text', '100%')}
        {renderField('borderRadius', 'Border Radius (px)', 'number')}
      </div>
    )
    case 'features': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Features Settings</h3>
        {renderField('columns', 'Columns', 'select', '1,2,3,4')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {content.items?.map((item: any, i: number) => (
          <div key={i} className="space-y-1 p-2 bg-background rounded border">
            <input className="w-full rounded border px-2 py-1 text-xs" value={item.title} onChange={(e) => updateArray('items', i, 'title', e.target.value)} placeholder="Title" />
            <input className="w-full rounded border px-2 py-1 text-xs" value={item.description} onChange={(e) => updateArray('items', i, 'description', e.target.value)} placeholder="Description" />
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeArrayItem('items', i)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => addArrayItem('items', { title: 'New Feature', description: '' })}><Plus className="h-3 w-3 mr-1" />Add Feature</Button>
      </div>
    )
    case 'pricing': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Pricing Settings</h3>
        {renderField('title', 'Title')}
        {renderField('price', 'Price')}
        {renderField('period', 'Period')}
        {renderField('buttonText', 'Button Text')}
        {renderField('highlighted', 'Highlighted', 'select', 'true,false')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {content.features?.map((f: string, i: number) => (
          <div key={i} className="flex gap-2">
            <input className="flex-1 rounded border px-2 py-1 text-xs" value={f} onChange={(e) => {
              const fs = [...content.features]
              fs[i] = e.target.value
              update('features', fs)
            }} />
            <Button size="sm" variant="outline" onClick={() => {
              const fs = [...content.features]
              fs.splice(i, 1)
              update('features', fs)
            }}><X className="h-3 w-3" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => {
          const fs = [...(content.features || [])]
          fs.push('New Feature')
          update('features', fs)
        }}><Plus className="h-3 w-3 mr-1" />Add Feature</Button>
      </div>
    )
    case 'testimonials': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Testimonials Settings</h3>
        {renderField('columns', 'Columns', 'select', '1,2,3,4')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {content.items?.map((item: any, i: number) => (
          <div key={i} className="space-y-1 p-2 bg-background rounded border">
            <input className="w-full rounded border px-2 py-1 text-xs" value={item.name} onChange={(e) => updateArray('items', i, 'name', e.target.value)} placeholder="Name" />
            <input className="w-full rounded border px-2 py-1 text-xs" value={item.role} onChange={(e) => updateArray('items', i, 'role', e.target.value)} placeholder="Role" />
            <textarea className="w-full rounded border px-2 py-1 text-xs" value={item.text} onChange={(e) => updateArray('items', i, 'text', e.target.value)} placeholder="Text" />
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeArrayItem('items', i)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => addArrayItem('items', { name: '', role: '', text: '', rating: '5' })}><Plus className="h-3 w-3 mr-1" />Add Testimonial</Button>
      </div>
    )
    case 'faq': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">FAQ Settings</h3>
        {renderField('align', 'Alignment', 'select', 'left,center')}
        {content.items?.map((item: any, i: number) => (
          <div key={i} className="space-y-1 p-2 bg-background rounded border">
            <input className="w-full rounded border px-2 py-1 text-xs" value={item.question} onChange={(e) => updateArray('items', i, 'question', e.target.value)} placeholder="Question" />
            <textarea className="w-full rounded border px-2 py-1 text-xs" value={item.answer} onChange={(e) => updateArray('items', i, 'answer', e.target.value)} placeholder="Answer" />
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeArrayItem('items', i)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => addArrayItem('items', { question: '', answer: '' })}><Plus className="h-3 w-3 mr-1" />Add FAQ</Button>
      </div>
    )
    case 'countdown': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Countdown Settings</h3>
        {renderField('targetDate', 'Target Date (YYYY-MM-DD HH:MM)')}
        {renderField('label', 'Label')}
        {renderField('style', 'Style', 'select', 'modern,classic,minimal')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
      </div>
    )
    case 'cta': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">CTA Settings</h3>
        {renderField('title', 'Title')}
        {renderField('text', 'Text', 'textarea')}
        {renderField('buttonText', 'Button Text')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('bgColor', 'Background Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'divider': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Divider Settings</h3>
        {renderField('style', 'Style', 'select', 'solid,dashed,dotted')}
        {renderField('color', 'Color', 'color')}
        {renderField('height', 'Height (px)', 'number')}
        {renderField('width', 'Width (%)', 'number')}
      </div>
    )
    case 'spacer': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Spacer Settings</h3>
        <div className="space-y-1"><label className="text-xs font-medium">Height (px)</label><input className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" type="number" value={content.height || 40} onChange={(e) => update('height', parseInt(e.target.value))} /></div>
      </div>
    )
    case 'product_image': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Product Image Settings</h3>
        {renderField('width', 'Width', 'text', '100%')}
        {renderField('maxWidth', 'Max Width (px)', 'number')}
        {renderField('borderRadius', 'Border Radius (px)', 'number')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
      </div>
    )
    case 'product_name': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Product Name Settings</h3>
        {renderField('level', 'Heading Level', 'select', 'h1,h2,h3')}
        {commonFields()}
      </div>
    )
    case 'product_price': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Product Price Settings</h3>
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('showCompare', 'Show Compare Price', 'select', 'true,false')}
        {renderField('color', 'Price Color', 'color')}
        {renderField('compareColor', 'Compare Color', 'color')}
        {renderField('fontSize', 'Font Size (px)', 'number')}
        {renderField('fontWeight', 'Font Weight', 'select', '400,500,600,700,800')}
      </div>
    )
    case 'product_description': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Product Description Settings</h3>
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('color', 'Color', 'color')}
        {renderField('fontSize', 'Font Size (px)', 'number')}
        {renderField('maxLines', 'Max Lines (0 = unlimited)', 'number')}
      </div>
    )
    case 'buy_button': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Buy Button Settings</h3>
        {renderField('text', 'Button Text')}
        {renderField('style', 'Style', 'select', 'primary,secondary,outline')}
        {renderField('size', 'Size', 'select', 'sm,md,lg')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('rounded', 'Rounded', 'select', 'none,md,lg,full')}
        {renderField('fullWidth', 'Full Width', 'select', 'true,false')}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-xs font-semibold mb-2">Override Actions (Optional)</h4>
          <p className="text-xs text-muted-foreground mb-2">Leave empty to use default product checkout</p>
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'html': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">HTML Settings</h3>
        {renderField('code', 'HTML Code', 'textarea')}
      </div>
    )
    // CTA Components Settings
    case 'cta_button': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">CTA Button Settings</h3>
        {renderField('text', 'Button Text')}
        {renderField('style', 'Style', 'select', 'primary,secondary,outline')}
        {renderField('size', 'Size', 'select', 'sm,md,lg')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('fullWidth', 'Full Width', 'select', 'true,false')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'checkout_button': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Checkout Button Settings</h3>
        {renderField('text', 'Button Text')}
        {renderField('style', 'Style', 'select', 'primary,secondary,outline')}
        {renderField('size', 'Size', 'select', 'sm,md,lg')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('fullWidth', 'Full Width', 'select', 'true,false')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'cta_banner': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">CTA Banner Settings</h3>
        {renderField('title', 'Title')}
        {renderField('text', 'Text')}
        {renderField('buttonText', 'Button Text')}
        {renderField('bgColor', 'Background Color', 'color')}
        {renderField('textColor', 'Text Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'cta_card': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">CTA Card Settings</h3>
        {renderField('title', 'Title')}
        {renderField('text', 'Text')}
        {renderField('buttonText', 'Button Text')}
        {renderField('bgColor', 'Background Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'cta_section': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">CTA Section Settings</h3>
        {renderField('title', 'Title')}
        {renderField('text', 'Text', 'textarea')}
        {renderField('buttonText', 'Button Text')}
        {renderField('align', 'Alignment', 'select', 'left,center,right')}
        {renderField('bgColor', 'Background Color', 'color')}
        {renderField('textColor', 'Text Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'floating_cta': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Floating CTA Settings</h3>
        {renderField('text', 'Button Text')}
        {renderField('position', 'Position', 'select', 'bottom-left,bottom-right,top-left,top-right')}
        {renderField('bgColor', 'Background Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'sticky_cta': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Sticky CTA Bar Settings</h3>
        {renderField('text', 'Announcement Text')}
        {renderField('buttonText', 'Button Text')}
        {renderField('bgColor', 'Background Color', 'color')}
        <div className="border-t pt-3 mt-3">
          <MultiActionEditor
            actions={content.actions || []}
            onChange={(actions) => update('actions', actions)}
          />
        </div>
      </div>
    )
    case 'order_summary': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Order Summary Settings</h3>
        {renderField('showDiscount', 'Show Discount', 'select', 'true,false')}
        {renderField('showTax', 'Show Tax', 'select', 'true,false')}
        {renderField('showTotal', 'Show Total', 'select', 'true,false')}
      </div>
    )
    case 'custom_order_form': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Custom Order Form Settings</h3>
        {renderField('submitText', 'Submit Button Text')}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Fields</Label>
          {(content.fields || []).map((f: any, i: number) => (
            <div key={i} className="flex gap-2 items-center p-2 bg-background rounded border">
              <select
                className="text-xs rounded border px-1 py-0.5"
                value={f.type}
                onChange={(e) => {
                  const fields = [...(content.fields || [])]
                  fields[i] = { ...fields[i], type: e.target.value }
                  update('fields', fields)
                }}
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="number">Number</option>
                <option value="textarea">Textarea</option>
              </select>
              <Input
                className="flex-1 h-7 text-xs"
                value={f.label}
                onChange={(e) => {
                  const fields = [...(content.fields || [])]
                  fields[i] = { ...fields[i], label: e.target.value }
                  update('fields', fields)
                }}
                placeholder="Label"
              />
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => {
                  const fields = [...(content.fields || [])]
                  fields[i] = { ...fields[i], required: e.target.checked }
                  update('fields', fields)
                }}
                title="Required"
              />
              <Button size="sm" variant="ghost" onClick={() => {
                const fields = [...(content.fields || [])]
                fields.splice(i, 1)
                update('fields', fields)
              }}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => {
            const fields = [...(content.fields || []), { type: 'text', label: 'New Field', required: false }]
            update('fields', fields)
          }}><Plus className="h-3 w-3 mr-1" />Add Field</Button>
        </div>
      </div>
    )
    case 'order_form': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Order Form Settings</h3>
        {renderField('submitText', 'Submit Button Text')}
        {renderField('successMessage', 'Success Message')}
        {renderField('showCoupon', 'Show Coupon Field', 'select', 'true,false')}
      </div>
    )
    case 'product_selector': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Product Selector Settings</h3>
        <p className="text-xs text-muted-foreground">Connect to Product Purchase action in button settings</p>
      </div>
    )
    case 'variant_selector': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Variant Selector Settings</h3>
        <p className="text-xs text-muted-foreground">Connect to Product Purchase action in button settings</p>
      </div>
    )
    case 'coupon_input': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Coupon Input Settings</h3>
        {renderField('placeholder', 'Placeholder')}
        {renderField('applyText', 'Apply Button Text')}
      </div>
    )
    case 'order_bump': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Order Bump Settings</h3>
        {renderField('title', 'Title')}
        {renderField('description', 'Description')}
        {renderField('price', 'Price', 'number')}
        {renderField('checked', 'Default Checked', 'select', 'true,false')}
      </div>
    )
    case 'upsell': return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Upsell Settings</h3>
        {renderField('title', 'Title')}
        {renderField('description', 'Description')}
        {renderField('price', 'Price', 'number')}
        {renderField('productId', 'Product ID')}
      </div>
    )
    default: return <div className="text-sm text-muted-foreground">No settings for this block type.</div>
  }
}

/* ==================== MAIN BUILDER PAGE ==================== */
function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [blocks, setBlocks] = useState<BuilderBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaImages, setMediaImages] = useState<string[]>([])
  const [onImageSelect, setOnImageSelect] = useState<((url: string) => void) | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [blockSearch, setBlockSearch] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const supabase = createBrowserClient()

  const filteredCategories = useMemo(() => {
    if (!blockSearch.trim()) return BLOCK_CATEGORIES
    const search = blockSearch.toLowerCase()
    return BLOCK_CATEGORIES.map(cat => ({
      ...cat,
      blocks: cat.blocks.filter(b =>
        b.label.toLowerCase().includes(search) ||
        b.type.toLowerCase().includes(search)
      )
    })).filter(cat => cat.blocks.length > 0)
  }, [blockSearch])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const fetchData = async () => {
      const { data: productData } = await supabase.from('products').select('*').eq('id', id).single()
      if (productData) {
        setProduct(productData)
        setPublished(productData.builder_published || false)
        const content = productData.builder_content
        if (content && Array.isArray(content) && content.length > 0) {
          setBlocks(content)
        } else {
          // Try product_pages table
          const { data: page } = await supabase.from('product_pages').select('content').eq('product_id', id).single()
          if (page?.content && Array.isArray(page.content)) {
            setBlocks(page.content)
          }
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  // Auto-save every 5 seconds
  useEffect(() => {
    if (blocks.length === 0) return
    const timer = setTimeout(() => {
      handleSave(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [blocks])

  const fetchMedia = useCallback(async () => {
    const { data } = await supabase.storage.from('product-images').list()
    if (data) {
      const urls = data.filter((f: any) => !f.id?.endsWith('/')).map((f: any) => {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(f.name)
        return urlData.publicUrl
      })
      setMediaImages(urls)
    }
  }, [supabase])

  const openMediaPicker = (callback: (url: string) => void) => {
    setOnImageSelect(() => callback)
    setMediaDialogOpen(true)
    fetchMedia()
  }

  const addBlock = (type: string) => {
    const newBlock: BuilderBlock = { id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), type, content: getDefaultBlockContent(type) }
    setBlocks(prev => [...prev, newBlock])
    setSelectedBlockId(newBlock.id)
  }

  const updateBlock = (blockId: string, content: Record<string, any>) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content } : b))
  }

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId))
    if (selectedBlockId === blockId) setSelectedBlockId(null)
  }

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const newBlock: BuilderBlock = { id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), type: block.type, content: JSON.parse(JSON.stringify(block.content)) }
    const idx = blocks.findIndex(b => b.id === blockId)
    setBlocks(prev => [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)])
    setSelectedBlockId(newBlock.id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true)
    const { error } = await supabase.from('products').update({
      builder_content: blocks,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error && !silent) toast.error('Save failed: ' + error.message)
    else if (!silent) toast.success('Draft saved')
    if (!silent) setSaving(false)
  }

  const handlePublish = async () => {
    setSaving(true)
    const { error } = await supabase.from('products').update({
      builder_content: blocks,
      builder_published: true,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      toast.error('Publish failed: ' + error.message)
      setSaving(false)
    } else {
      toast.success('Product published successfully!')
      router.push('/admin/products')
    }
  }

  const handleUnpublish = async () => {
    const { error } = await supabase.from('products').update({
      builder_published: false,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) toast.error('Unpublish failed')
    else { toast.success('Unpublished'); setPublished(false) }
  }

  const loadTemplate = (templateBlocks: BuilderBlock[]) => {
    const blocksWithNewIds = templateBlocks.map(b => ({ ...b, id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) }))
    setBlocks(blocksWithNewIds)
    setTemplateDialogOpen(false)
    toast.success('Template loaded')
  }

  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/admin/products/${id}/edit`)}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-semibold text-sm">Builder: {product?.name}</h1>
          {published ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span> : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Draft</span>}
        </div>
        <div className="flex items-center gap-2">
          {previewMode && (
            <div className="flex items-center gap-1 border rounded-md px-1">
              <Button size="sm" variant={previewDevice === 'mobile' ? 'default' : 'ghost'} onClick={() => setPreviewDevice('mobile')} className="h-7 px-2"><Smartphone className="h-4 w-4" /></Button>
              <Button size="sm" variant={previewDevice === 'tablet' ? 'default' : 'ghost'} onClick={() => setPreviewDevice('tablet')} className="h-7 px-2"><Tablet className="h-4 w-4" /></Button>
              <Button size="sm" variant={previewDevice === 'desktop' ? 'default' : 'ghost'} onClick={() => setPreviewDevice('desktop')} className="h-7 px-2"><Monitor className="h-4 w-4" /></Button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setTemplateDialogOpen(true)}><Layout className="h-4 w-4 mr-1" />Templates</Button>
          <Button size="sm" variant={previewMode ? 'default' : 'outline'} onClick={() => setPreviewMode(!previewMode)}><Eye className="h-4 w-4 mr-1" />{previewMode ? 'Edit' : 'Preview'}</Button>
          <Button size="sm" variant="outline" onClick={() => handleSave()} disabled={saving}>
            {saving && !published && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            <Save className="h-4 w-4 mr-1" />Save Draft
          </Button>
          {published ? (
            <Button size="sm" variant="outline" onClick={handleUnpublish}><Globe className="h-4 w-4 mr-1" />Unpublish</Button>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <Globe className="h-4 w-4 mr-1" />Publish
            </Button>
          )}
        </div>
      </div>

      {previewMode ? (
        <LivePreviewRenderer blocks={blocks} product={product!} device={previewDevice} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Elements */}
          <div className={`${sidebarCollapsed ? 'w-12' : 'w-64'} border-r bg-muted/30 transition-all duration-200 flex flex-col`}>
            {/* Collapse/Expand Toggle */}
            <div className="p-2 border-b bg-background/50 flex items-center justify-between">
              {!sidebarCollapsed && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-0"
                />
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-muted rounded-md flex-shrink-0"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
            {/* Block List */}
            <div className="flex-1 overflow-y-auto p-2">
              {sidebarCollapsed ? (
                /* Icons-only mode */
                <div className="flex flex-col gap-1">
                  {BLOCK_CATEGORIES.flatMap(cat => cat.blocks).slice(0, 12).map((bt) => {
                    const IconComp = getIconComponent(bt.icon)
                    return (
                      <button
                        key={bt.type}
                        onClick={() => addBlock(bt.type)}
                        className="p-2 rounded-md bg-background border hover:border-primary transition-colors"
                        title={bt.label}
                      >
                        <IconComp className="h-4 w-4 mx-auto" />
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* Full sidebar */
                filteredCategories.map((cat) => (
                  <div key={cat.name} className="mb-4">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">{cat.name}</h3>
                    <div className="grid grid-cols-2 gap-1">
                      {cat.blocks.map((bt) => {
                        const IconComp = getIconComponent(bt.icon)
                        return (
                          <button
                            key={bt.type}
                            onClick={() => addBlock(bt.type)}
                            className="flex flex-col items-center gap-1 p-2 rounded-md bg-background border hover:border-primary transition-colors text-xs"
                          >
                            <IconComp className="h-4 w-4" />
                            <span className="truncate w-full text-center">{bt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              {!sidebarCollapsed && filteredCategories.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No blocks found
                </div>
              )}
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 overflow-y-auto bg-muted/20 flex justify-center p-6">
            <div className="w-full max-w-4xl">
              {blocks.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <p>Click an element from the sidebar to add it here.</p>
                  <p className="text-sm mt-2">Or <button onClick={() => setTemplateDialogOpen(true)} className="text-primary underline">load a template</button> to get started quickly.</p>
                </div>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((block, idx) => (
                      <SortableBlockItem
                        key={block.id}
                        block={block}
                        index={idx}
                        isSelected={selectedBlockId === block.id}
                        onClick={() => setSelectedBlockId(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onDelete={() => removeBlock(block.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeDragId ? (
                    <div className="p-4 bg-white border border-primary rounded-lg shadow-lg opacity-90">
                      <BlockPreview block={blocks.find(b => b.id === activeDragId)!} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>

          {/* Right Sidebar - Settings */}
          <div className="w-72 border-l bg-muted/30 overflow-y-auto p-3">
            {selectedBlock ? (
              <BlockSettings block={selectedBlock} onChange={(content) => updateBlock(selectedBlock.id, content)} onImageSelect={openMediaPicker} />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">Select a block to edit its settings.</div>
            )}
          </div>
        </div>
      )}

      {/* Templates Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setTemplateDialogOpen(false)} />
          <div className="relative bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 z-50">
            <DialogHeader><DialogTitle>Choose a Template</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => loadTemplate(t.blocks)} className="p-4 rounded-lg border hover:border-primary transition-colors text-left">
                  <h3 className="font-semibold mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.blocks.length} blocks</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Media Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMediaDialogOpen(false)} />
          <div className="relative bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 z-50">
            <DialogHeader><DialogTitle>Media Library</DialogTitle></DialogHeader>
            <div className="grid grid-cols-4 gap-2 py-4 max-h-80 overflow-y-auto">
              {mediaImages.map((url, i) => (
                <button key={i} onClick={() => { onImageSelect?.(url); setMediaDialogOpen(false) }} className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary">
                  <img src={url} className="object-cover w-full h-full" />
                </button>
              ))}
              {mediaImages.length === 0 && <p className="col-span-4 text-center text-muted-foreground text-sm">No images in media library.</p>}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default function ProductBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <BuilderPage params={params} />
    </Suspense>
  )
}
