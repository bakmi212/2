'use client'

import { createBrowserClient } from '@/lib/supabase/client'

export type ActionType =
  // Navigation
  | 'direct_url'
  | 'internal_page'
  | 'scroll_to_section'
  | 'product_purchase'
  // Communication
  | 'whatsapp_chat'
  | 'whatsapp_inquiry'
  | 'telegram'
  | 'email'
  | 'phone_call'
  // Tracking
  | 'facebook_pixel'
  | 'google_analytics'
  | 'google_ads'
  | 'tiktok_pixel'
  | 'custom_tracking'
  | 'page_view'

export interface Action {
  id: string
  type: ActionType
  config: Record<string, any>
  enabled: boolean
}

export interface ActionConfig {
  actions: Action[]
}

export const ACTION_TYPES: { value: ActionType; label: string; category: string }[] = [
  // Navigation
  { value: 'direct_url', label: 'Direct URL', category: 'Navigation' },
  { value: 'internal_page', label: 'Internal Page', category: 'Navigation' },
  { value: 'scroll_to_section', label: 'Scroll to Section', category: 'Navigation' },
  { value: 'product_purchase', label: 'Product Purchase', category: 'Navigation' },
  // Communication
  { value: 'whatsapp_chat', label: 'WhatsApp Chat', category: 'Communication' },
  { value: 'whatsapp_inquiry', label: 'WhatsApp Product Inquiry', category: 'Communication' },
  { value: 'telegram', label: 'Telegram', category: 'Communication' },
  { value: 'email', label: 'Email', category: 'Communication' },
  { value: 'phone_call', label: 'Phone Call', category: 'Communication' },
  // Tracking
  { value: 'facebook_pixel', label: 'Facebook Pixel Event', category: 'Tracking' },
  { value: 'google_analytics', label: 'Google Analytics Event', category: 'Tracking' },
  { value: 'google_ads', label: 'Google Ads Conversion', category: 'Tracking' },
  { value: 'tiktok_pixel', label: 'TikTok Pixel Event', category: 'Tracking' },
  { value: 'custom_tracking', label: 'Custom Tracking Event', category: 'Tracking' },
  { value: 'page_view', label: 'Page View Event', category: 'Tracking' },
]

export function createEmptyAction(type: ActionType): Action {
  return {
    id: `action-${Math.random().toString(36).substring(2, 9)}`,
    type,
    config: getDefaultActionConfig(type),
    enabled: true,
  }
}

export function getDefaultActionConfig(type: ActionType): Record<string, any> {
  switch (type) {
    case 'direct_url':
      return { url: '', openInNewTab: false }
    case 'internal_page':
      return { pageId: '', pageTitle: '' }
    case 'scroll_to_section':
      return { sectionId: '', offset: 0 }
    case 'product_purchase':
      // IMPORTANT: Only store IDs, NOT names or prices
      // Names and prices are loaded fresh from Supabase at checkout
      return {
        productId: null,
        variantId: null,
        productSlug: null
      }
    case 'whatsapp_chat':
      return { phone: '', message: '' }
    case 'whatsapp_inquiry':
      return { phone: '', productId: null, variantId: null }
    case 'telegram':
      return { username: '', message: '' }
    case 'email':
      return { email: '', subject: '', body: '' }
    case 'phone_call':
      return { phone: '' }
    case 'facebook_pixel':
      return { eventName: 'Lead', params: {} }
    case 'google_analytics':
      return { eventName: '', category: '', label: '', value: 0 }
    case 'google_ads':
      return { conversionId: '', conversionLabel: '' }
    case 'tiktok_pixel':
      return { eventName: 'ViewContent', params: {} }
    case 'custom_tracking':
      return { eventName: '', payload: {} }
    case 'page_view':
      return { providers: ['facebook', 'google'] }
    default:
      return {}
  }
}

export function executeAction(action: Action, context?: Record<string, any>): void {
  switch (action.type) {
    case 'direct_url': {
      const { url, openInNewTab } = action.config
      if (url) {
        if (openInNewTab) window.open(url, '_blank')
        else window.location.href = url
      }
      break
    }
    case 'product_purchase': {
      const { productId, variantId, productSlug } = action.config
      console.log('[executeAction] Product Purchase Action')
      console.log('[executeAction] Product ID:', productId)
      console.log('[executeAction] Variant ID:', variantId)
      console.log('[executeAction] Product Slug:', productSlug)

      if (productId || productSlug) {
        // Use productSlug if available, otherwise use productId
        const productRef = productSlug || productId
        // Navigate to checkout with variant
        let checkoutUrl = `/checkout?product=${productRef}&action=product_purchase`
        if (variantId) checkoutUrl += `&variant=${variantId}`
        console.log('[executeAction] Generated checkout URL:', checkoutUrl)
        console.log('[executeAction] Generated Product ID:', productId)
        console.log('[executeAction] Generated Variant ID:', variantId)
        window.location.href = checkoutUrl
      } else {
        console.error('[executeAction] Product Purchase action has no productId or productSlug')
      }
      break
    }
    case 'whatsapp_chat': {
      const { phone, message } = action.config
      if (phone) {
        let url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`
        if (message) url += `?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
      }
      break
    }
    case 'phone_call': {
      const { phone } = action.config
      if (phone) window.location.href = `tel:${phone}`
      break
    }
    case 'email': {
      const { email, subject, body } = action.config
      if (email) {
        let mailto = `mailto:${email}`
        const params = []
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
        if (body) params.push(`body=${encodeURIComponent(body)}`)
        if (params.length) mailto += `?${params.join('&')}`
        window.location.href = mailto
      }
      break
    }
    case 'facebook_pixel': {
      const { eventName, params } = action.config
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', eventName, params)
      }
      break
    }
    case 'google_analytics': {
      const { eventName, category, label, value } = action.config
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventName, {
          event_category: category,
          event_label: label,
          value: value,
        })
      }
      break
    }
    case 'google_ads': {
      const { conversionId, conversionLabel } = action.config
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: `${conversionId}/${conversionLabel}`,
        })
      }
      break
    }
    case 'tiktok_pixel': {
      const { eventName, params } = action.config
      if (typeof window !== 'undefined' && (window as any).ttq) {
        (window as any).ttq.track(eventName, params)
      }
      break
    }
    case 'scroll_to_section': {
      const { sectionId, offset } = action.config
      if (sectionId) {
        const element = document.getElementById(sectionId)
        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY - (offset || 0)
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }
      break
    }
  }
}

export function executeActions(actions: Action[], context?: Record<string, any>): void {
  // Execute tracking actions first, then navigation actions
  const trackingActions = actions.filter(a => a.enabled && isTrackingAction(a.type))
  const navigationActions = actions.filter(a => a.enabled && !isTrackingAction(a.type))

  // Execute all tracking actions
  trackingActions.forEach(a => executeAction(a, context))

  // Execute first navigation action (only one should navigate)
  if (navigationActions.length > 0) {
    executeAction(navigationActions[0], context)
  }
}

function isTrackingAction(type: ActionType): boolean {
  return ['facebook_pixel', 'google_analytics', 'google_ads', 'tiktok_pixel', 'custom_tracking', 'page_view'].includes(type)
}

export function getActionUrl(actions: Action[], context?: Record<string, any>): string | null {
  const navAction = actions.find(a => a.enabled && !isTrackingAction(a.type))
  if (!navAction) return null

  switch (navAction.type) {
    case 'direct_url':
      return navAction.config.url || null
    case 'product_purchase': {
      const { productId, variantId, productSlug } = navAction.config
      if (productId || productSlug) {
        const productRef = productSlug || productId
        let url = `/checkout?product=${productRef}&action=product_purchase`
        if (variantId) url += `&variant=${variantId}`
        console.log('[getActionUrl] Generated Product Purchase URL:', url)
        return url
      }
      return null
    }
    case 'whatsapp_chat': {
      const { phone, message } = navAction.config
      if (phone) {
        let url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`
        if (message) url += `?text=${encodeURIComponent(message)}`
        return url
      }
      return null
    }
    default:
      return null
  }
}
