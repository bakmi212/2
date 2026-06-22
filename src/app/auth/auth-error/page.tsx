'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'An authentication error occurred'

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4"><div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center"><AlertCircle className="h-6 w-6 text-destructive-foreground" /></div></div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex flex-col gap-4">
          <Button asChild className="w-full"><Link href="/auth/login">Try Again</Link></Button>
          <Link href="/" className="text-sm text-primary hover:underline">Go to Home</Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}><AuthErrorContent /></Suspense>
}
