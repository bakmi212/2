import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname.startsWith('/auth/')
  const isAdminDashboard = pathname.startsWith('/dashboard/admin')

  // Helper to get user role
  const getUserRole = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userId).single()
    return profile?.role || 'member'
  }

  // Protect admin routes - members cannot access
  if (isAdminRoute && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAdminRoute && session && user) {
    const userEmail = user.email?.toLowerCase() || ''
    const isAdminEmail = userEmail === 'admin@gmail.com'
    const role = await getUserRole(user.id)

    if (role !== 'admin' && !isAdminEmail) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect dashboard routes - guests cannot access
  if (isDashboardRoute && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect admins away from member dashboard (except admin subdirectory)
  if (isDashboardRoute && !isAdminDashboard && session && user) {
    const userEmail = user.email?.toLowerCase() || ''
    const isAdminEmail = userEmail === 'admin@gmail.com'
    const role = await getUserRole(user.id)

    if (role === 'admin' || isAdminEmail) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && session && user && !pathname.includes('callback') && !pathname.includes('auth-error')) {
    const userEmail = user.email?.toLowerCase() || ''
    const isAdminEmail = userEmail === 'admin@gmail.com'
    const role = await getUserRole(user.id)

    if (role === 'admin' || isAdminEmail) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
