import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasAccess } from '@/lib/access'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

// Anciennes routes (modèle 1 user = 1 business) → redirigées vers "Mes commerces".
const LEGACY_ROUTES = ['/dashboard', '/qrcode', '/settings', '/feedback-history']

// Accès à UN commerce précis : on lit son statut + sa date de fin d'essai et on
// calcule le statut effectif (un essai dépassé = expiré, sans cron).
async function businessHasAccess(businessId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('subscription_status, trial_ends_at')
    .eq('id', businessId)
    .maybeSingle<{ subscription_status: string | null; trial_ends_at: string | null }>()

  // Commerce introuvable : on laisse passer, la page affichera son propre état
  // (« configurez votre commerce » / notFound). Le gating ne sert qu'à couper
  // un commerce expiré/suspendu, pas à faire de l'autorisation de données.
  if (!data) return true
  return hasAccess(data)
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
  const isAdminEmail = user?.email === ADMIN_EMAIL

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

  // Un commerce précis : /business/{id}/...  (mais pas /businesses).
  const businessMatch = pathname.match(/^\/business\/([^/]+)/)
  const businessId = businessMatch?.[1] ?? null

  // Liste des commerces : /businesses
  const isBusinessList = pathname === '/businesses' || pathname.startsWith('/businesses/')

  // Routes protégées (auth + accès)
  const isProtectedRoute = isBusinessList || !!businessId

  // Routes nécessitant uniquement d'être connecté
  const isAuthOnlyRoute =
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/onboarding')

  // Non connecté → /login
  if ((isProtectedRoute || isAuthOnlyRoute) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté sur un commerce précis → vérifier l'accès à CE commerce.
  // Si l'essai est terminé ou le compte suspendu → page sobre /essai-termine.
  if (user && businessId) {
    const ok = await businessHasAccess(businessId)
    if (!ok) {
      return NextResponse.redirect(new URL('/essai-termine', request.url))
    }
  }

  // Connecté sur /login ou /signup → on renvoie vers "Mes commerces"
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/businesses', request.url))
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
