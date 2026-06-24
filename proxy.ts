import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Statuts d'abonnement qui donnent accès aux routes protégées.
// 'free' = plan gratuit permanent, 'active' = abonnement Pro payant.
const PLANS_WITH_ACCESS = ['active', 'free']

// Anciennes routes (modèle 1 user = 1 business) → redirigées vers "Mes commerces".
const LEGACY_ROUTES = ['/dashboard', '/qrcode', '/settings', '/feedback-history']

// Gating niveau COMPTE (pas de logique Stripe ici) : l'utilisateur a accès s'il
// ne possède encore aucun commerce (il pourra en créer un) OU si au moins un de
// ses commerces a un plan autorisé.
async function accountHasAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('subscription_status')
    .eq('user_id', userId)

  const rows = (data ?? []) as { subscription_status: string | null }[]
  if (rows.length === 0) return true
  return rows.some((b) => PLANS_WITH_ACCESS.includes(b.subscription_status ?? ''))
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
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
  const isAdminEmail = user?.email === 'lborrelli248@gmail.com'

  // Backoffice UI : on redirige les non-admins vers "Mes commerces"
  if (pathname.startsWith('/admin') && !isAdminEmail) {
    return NextResponse.redirect(new URL('/businesses', request.url))
  }

  // API admin : on coupe l'accès en 403
  if (pathname.startsWith('/api/admin') && !isAdminEmail) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Anciennes URLs → "Mes commerces" (le bon commerce n'est plus implicite).
  if (LEGACY_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.redirect(new URL('/businesses', request.url))
  }

  // Routes protégées (auth + accès) : "/business" couvre aussi "/businesses".
  const isProtectedRoute = pathname.startsWith('/business')

  // Routes nécessitant uniquement d'être connecté
  const isAuthOnlyRoute =
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/onboarding')

  // Non connecté → /login
  if ((isProtectedRoute || isAuthOnlyRoute) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté sur une route protégée → vérifier l'accès (niveau compte)
  if (user && isProtectedRoute) {
    const ok = await accountHasAccess(user.id)
    if (!ok) {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  }

  // Connecté sur /login ou /signup → rediriger selon l'accès
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const ok = await accountHasAccess(user.id)
    return NextResponse.redirect(new URL(ok ? '/businesses' : '/subscription', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/api/admin/:path*',
    '/business/:path*',
    '/businesses/:path*',
    '/businesses',
    // anciennes routes (redirections)
    '/dashboard/:path*',
    '/dashboard',
    '/qrcode/:path*',
    '/qrcode',
    '/feedback-history/:path*',
    '/feedback-history',
    '/settings/:path*',
    '/settings',
    // auth-only
    '/subscription/:path*',
    '/subscription',
    '/onboarding/:path*',
    '/onboarding',
    '/login',
    '/signup',
  ],
}
