import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Routes nécessitant auth + subscription active
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/qrcode') ||
    pathname.startsWith('/feedback-history') ||
    pathname.startsWith('/settings')

  // Routes nécessitant uniquement d'être connecté (pas de vérification subscription)
  const isAuthOnlyRoute =
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/onboarding')

  // Non connecté → /login
  if ((isProtectedRoute || isAuthOnlyRoute) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté sur une route protégée → vérifier subscription
  if (user && isProtectedRoute) {
    const { data: business } = await supabase
      .from('businesses')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle<{ subscription_status: string | null }>()

    if (business?.subscription_status !== 'active') {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  }

  // Connecté sur /login ou /signup → rediriger selon subscription
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const { data: business } = await supabase
      .from('businesses')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle<{ subscription_status: string | null }>()

    if (business?.subscription_status === 'active') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/qrcode/:path*',
    '/feedback-history/:path*',
    '/settings/:path*',
    '/settings',
    '/subscription/:path*',
    '/subscription',
    '/onboarding/:path*',
    '/onboarding',
    '/login',
    '/signup',
  ],
}
