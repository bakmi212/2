'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const names: Record<string, string> = {
    products: 'Products',
    categories: 'Categories',
    auth: 'Auth',
    login: 'Login',
    register: 'Register',
    'forgot-password': 'Forgot Password',
    'reset-password': 'Reset Password',
    'auth-error': 'Auth Error',
    contact: 'Contact',
    features: 'Features',
    pricing: 'Pricing',
    dashboard: 'Dashboard',
    admin: 'Admin',
    cart: 'Cart',
    orders: 'Orders',
    settings: 'Settings',
    notifications: 'Notifications',
    licenses: 'Licenses',
    subscriptions: 'Subscriptions',
    referrals: 'Referrals',
    users: 'Users',
    payments: 'Payments',
    affiliates: 'Affiliates',
    checkout: 'Checkout',
    success: 'Success',
    callback: 'Callback',
  }

  let currentPath = ''
  const items = segments.map((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    const name = names[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    return (
      <li key={currentPath} className="flex items-center">
        <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
        {isLast ? (
          <span className="text-sm font-medium truncate max-w-[200px]">{name}</span>
        ) : (
          <Link href={currentPath} className="text-sm text-muted-foreground hover:text-primary truncate max-w-[200px]">
            {name}
          </Link>
        )}
      </li>
    )
  })

  return (
    <nav className="container mx-auto px-4 py-3">
      <ol className="flex items-center flex-wrap">
        <li>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center">
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items}
      </ol>
    </nav>
  )
}
