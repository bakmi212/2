'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AddToCartButtonProps { productId: string; price: number; name: string }

export function AddToCartButton({ productId, price, name }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleAddToCart = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Please login to purchase'); router.push('/auth/login'); setLoading(false); return }

    const { error } = await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1, price })

    if (error) {
      if (error.code === '23505') { toast.info('Product already in cart') }
      else { toast.error('Failed to add to cart') }
    } else {
      toast.success(`${name} added to cart`)
      router.push('/dashboard/products')
    }
    setLoading(false)
  }

  return (
    <Button size="lg" className="w-full md:w-auto" onClick={handleAddToCart} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
      Purchase Now
    </Button>
  )
}
