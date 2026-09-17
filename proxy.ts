import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasAccess } from '@/lib/access'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

// Anciennes routes (modèle 1 user = 1 business) → redirigées vers "Mes commerces".
const LEGACY_ROUTES = ['/dashboard', '/qrcode', '/settings', '/feedback-history']

// Espace vendeur (réseau d'apporteurs), servi sur le sous-domaine vendeurs.*
// par le même projet Next.js via un rewrite vers le segment /vendeurs. Aucun
// lien vers cet espace depuis le site public.
const VENDOR_HOST_PREFIX = 'vendeurs.'
// Pages servies sans être (encore) un vendeur connecté.
const VENDOR_PUBLIC_PATHS = ['/inscription', '/connexion']

/** Statut du vendeur lié à ce user, ou null s'il n'est pas (encore) vendeur. */
async function getVendeurStatut(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vendeurs')
    .select('statut')
    .eq('user_id', userId)
    .maybeSingle<{ statut: string | null }>()
  return data?.statut ?? null
}

// Aiguillage complet du sous-domaine vendeur. Chaque statut n'a qu'une seule
// page visible ; tout le reste y renvoie. Le rewrite mappe l'URL "propre" du
// sous-domaine (ex : /connexion) vers le segment interne /vendeurs/connexion.
async function handleVendorHost(
  request: NextRequest,
  response: NextResponse,
  user: { id: string } | null,
  pathname: string
): Promise<NextResponse> {
  // On reporte les cookies éventuellement rafraîchis (session) sur la réponse.
  const carry = (res: NextResponse) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }
  const rewriteTo = (target: string) => {
    const url = request.nextUrl.clone()
    url.pathname = target === '/' ? '/vendeurs' : `/vendeurs${target}`
    return carry(NextResponse.rewrite(url, { request: { headers: request.headers } }))
  }
  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone()
    url.pathname = target
    return carry(NextResponse.redirect(url))
  }

  const isPublic = VENDOR_PUBLIC_PATHS.includes(pathname)

  // Non connecté : seules l'inscription et la connexion sont accessibles.
  if (!user) return isPublic ? rewriteTo(pathname) : redirectTo('/connexion')

  const statut = await getVendeurStatut(user.id)

  // Connecté mais pas (encore) vendeur : on ne sert que les pages publiques.
  if (!statut) return isPublic ? rewriteTo(pathname) : redirectTo('/connexion')

  const home =
    statut === 'suspendu'
      ? '/suspendu'
      : statut === 'en_attente'
        ? '/en-attente'
        : '/' // formation | actif → page d'accueil "Bienvenue"

  return pathname === home ? rewriteTo(home) : redirectTo(home)
}

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

  // Sous-domaine vendeurs.* : espace vendeur, servi via rewrite → /vendeurs.
  const host = request.headers.get('host') ?? ''
  if (host.startsWith(VENDOR_HOST_PREFIX)) {
    return handleVendorHost(request, response, user, pathname)
  }

  // Défense en profondeur : le segment /vendeurs n'est jamais servi sur le
  // domaine principal (il n'existe que derrière le sous-domaine dédié).
  if (pathname === '/vendeurs' || pathname.startsWith('/vendeurs/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

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
    // Espace vendeur : tout chemin, MAIS uniquement sur le sous-domaine
    // vendeurs.* (scopé par l'en-tête Host) — le site public n'est pas impacté.
    {
      source: '/((?!api|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
      has: [{ type: 'header', key: 'host', value: 'vendeurs\\..*' }],
    },
    // Le segment /vendeurs ne doit jamais être servi sur le domaine principal.
    '/vendeurs/:path*',
    '/vendeurs',
  ],
}
