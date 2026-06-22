'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CartItem {
  id: string
  quantity: number
  price: number
  product: { id: string; name: string; slug: string; image_url: string | null; price: number }
}
interface CartItemRow {
  id: string
  quantity: number
  price: number
  product: { id: string; name: string; slug: string; image_url: string | null; price: number }[]
}

export default function CartPage() {
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchCart = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirectTo=/dashboard/cart'); return }
      const { data } = await supabase.from('cart_items').select('id, quantity, price, product:products(id, name, slug, image_url, price)').eq('user_id', user.id)
      const formatted: CartItem[] = (data as CartItemRow[])?.map(row => ({
        id: row.id, quantity: row.quantity, price: row.price, product: row.product?.[0] || { id: '', name: '', slug: '', image_url: null, price: 0 }
      })) || []
      setCartItems(formatted)
      setLoading(false)
    }
    fetchCart()
  }, [router])

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setUpdating(itemId)
    const { error } = await supabase.from('cart_items').update({ quantity: newQuantity }).eq('id', itemId)
    if (error) toast.error('Failed to update quantity')
    else setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item))
    setUpdating(null)
  }

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
    if (error) toast.error('Failed to remove item')
    else setCartItems(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item removed from cart')
  }

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Shopping Cart</h1><p className="text-muted-foreground">{cartItems.length} items in your cart</p></div>

      {cartItems.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">Your cart is empty</h3><p className="text-muted-foreground mb-4">Add some products to get started</p><Link href="/products"><Button>Browse Products</Button></Link></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                    {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product.slug}`} className="font-semibold hover:text-primary">{item.product.name}</Link>
                    <div className="text-sm text-muted-foreground mt-1">${item.price} each</div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={updating === item.id || item.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                        <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-16 h-8 text-center" disabled={updating === item.id} />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={updating === item.id}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="text-right"><span className="text-lg font-bold">${(item.price * item.quantity).toFixed(2)}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card className="sticky top-20">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${total.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-4"><span className="font-semibold">Total</span><span className="text-lg font-bold">${total.toFixed(2)}</span></div>
                <Button className="w-full" size="lg" asChild><Link href="/checkout">Proceed to Checkout<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button variant="outline" className="w-full" asChild><Link href="/products">Continue Shopping</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
