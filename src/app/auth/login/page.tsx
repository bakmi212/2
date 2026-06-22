'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createBrowserClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) { toast.error(error.message); setLoading(false); return }

    // Get user role and redirect accordingly
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const userEmail = user.email?.toLowerCase() || ''
      const isAdminEmail = userEmail === 'admin@gmail.com'

      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      const role = profile?.role || 'member'

      toast.success('Logged in successfully!')

      if (redirectTo) {
        router.push(redirectTo)
      } else if (role === 'admin' || isAdminEmail) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4"><div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center"><span className="font-bold text-xl text-primary-foreground">S</span></div></div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Enter your email and password to sign in</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} /></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link></div><Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="remember" className="text-sm text-muted-foreground">Remember me</Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In</Button>
          <p className="text-sm text-muted-foreground text-center">Do not have an account? <Link href="/auth/register" className="text-primary hover:underline font-medium">Create an account</Link></p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-muted/30">
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
