import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet: { name: string; value: string; options?: any }[]) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } },
    })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Create profile if not exists
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
        if (!profile) {
          await supabase.from('profiles').insert({ user_id: user.id, email: user.email!, full_name: user.user_metadata?.full_name || null, role: 'member' })
          // Assign member role
          const { data: memberRole } = await supabase.from('roles').select('id').eq('name', 'member').single()
          if (memberRole) {
            await supabase.from('user_roles').insert({ user_id: user.id, role_id: memberRole.id })
          }
        }

        // Determine redirect based on role
        const userEmail = user.email?.toLowerCase() || ''
        const isAdminEmail = userEmail === 'admin@gmail.com'

        if (next) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        // Get role from profiles table
        const { data: userProfile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
        const role = userProfile?.role || 'member'

        if (role === 'admin' || isAdminEmail) {
          return NextResponse.redirect(`${origin}/admin`)
        }
        return NextResponse.redirect(`${origin}/dashboard`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/auth-error?error=Unable to verify email`)
}
