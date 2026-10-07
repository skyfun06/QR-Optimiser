import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasAccess } from '@/lib/access'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

// Cookie d'identifiant d'appareil pour la carte de fidélité. Posé PAR LE
// SERVEUR (pas document.cookie) afin de résister à l'ITP de Safari iOS, qui
// plafonne à 7 jours les cookies écrits en JavaScript côté client.
const DEVICE_COOKIE = 'sa_device'
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 jours (seconds)

// Garantit un cookie d'identifiant d'appareil sur la page publique de scan.
// On NE crée AUCUNE carte ici : la création + le tampon se font via une Server
// Action appelée depuis le navigateur une fois la page affichée (sinon les
// aperçus de lien WhatsApp/iMessage et les robots fausseraient les stats).
function ensureDeviceCookie(request: NextRequest): NextResponse {
  // Cookie déjà présent → on laisse passer sans rien toucher.
  if (request.cookies.has(DEVICE_COOKIE)) {
    return NextResponse.next()
  }

  const deviceId = crypto.randomUUID()

  // On injecte le cookie dans les headers transmis à la page pour qu'elle le
  // lise dès ce premier rendu (sinon il ne serait disponible qu'au 2e chargement).
  const requestHeaders = new Headers(request.headers)
  const existing = requestHeaders.get('cookie')
  requestHeaders.set(
    'cookie',
    existing ? `${existing}; ${DEVICE_COOKIE}=${deviceId}` : `${DEVICE_COOKIE}=${deviceId}`
  )

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}

// Anciennes routes (modèle 1 user = 1 business) → redirigées vers "Mes commerces".
const LEGACY_ROUTES = ['/dashboard', '/qrcode', '/settings', '/feedback-history']

// Espace "Rejoindre le réseau" (vendeurs), servi sur le DOMAINE PRINCIPAL.
// Pages publiques (recrutement / inscription / connexion) et pages privées
// (dashboard + statuts), gérées par chemin — plus aucun routing par host.
const REJOINDRE_PUBLIC_PATHS = ['/rejoindre/inscription', '/rejoindre/connexion']

/** Statut du vendeur lié à ce user, ou null s'il n'est pas (encore) vendeur. */
async function getVendeurStatut(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vendeurs')
    .select('statut')
    .eq('user_id', userId)
    .maybeSingle<{ statut: string | null }>()
  return data?.statut ?? null
}

/** Page unique visible selon le statut du vendeur ; tout le reste y renvoie. */
function rejoindreHome(statut: string): string {
  if (statut === 'suspendu') return '/rejoindre/suspendu'
  if (statut === 'en_attente') return '/rejoindre/en-attente'
  return '/rejoindre/dashboard' // formation | actif
}

// Aiguillage des pages /rejoindre/* (hors page publique /rejoindre, non matchée).
async function handleRejoindre(
  request: NextRequest,
  response: NextResponse,
  user: { id: string } | null,
  pathname: string
): Promise<NextResponse> {
  const carry = (res: NextResponse) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }
  const redirectTo = (target: string) =>
    carry(NextResponse.redirect(new URL(target, request.url)))

  // Pages publiques : inscription / connexion (accessibles déconnecté).
  if (REJOINDRE_PUBLIC_PATHS.includes(pathname)) {
    // Un vendeur déjà connecté est renvoyé vers son espace.
    if (user) {
      const statut = await getVendeurStatut(user.id)
      if (statut) return redirectTo(rejoindreHome(statut))
    }
    return response
  }

  // Pages privées : dashboard + statuts. Auth + profil vendeur obligatoires.
  if (!user) return redirectTo('/rejoindre/connexion')
  const statut = await getVendeurStatut(user.id)
  if (!statut) return redirectTo('/rejoindre/connexion')

  const home = rejoindreHome(statut)
  return pathname === home ? response : redirectTo(home)
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
  const pathname = request.nextUrl.pathname

  // Page publique de scan (/review/*) : on garantit uniquement le cookie
  // d'appareil, puis on court-circuite — pas d'appel auth sur ce hot path public.
  if (pathname.startsWith('/review')) {
    return ensureDeviceCookie(request)
  }

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
  const isAdminEmail = user?.email === ADMIN_EMAIL

  // Espace "Rejoindre le réseau" (vendeurs) — pages privées + redirection des
  // vendeurs connectés hors inscription/connexion. La page publique /rejoindre
  // n'est pas matchée (reste statique et indexable).
  if (pathname.startsWith('/rejoindre/')) {
    return handleRejoindre(request, response, user, pathname)
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
    // Page publique de scan : pose du cookie d'identifiant d'appareil (fidélité).
    '/review/:path*',
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
    // Espace vendeur "Rejoindre le réseau". On matche uniquement les pages
    // privées + inscription/connexion : la page publique /rejoindre reste hors
    // proxy (statique, indexable, pas d'appel auth).
    '/rejoindre/inscription',
    '/rejoindre/connexion',
    '/rejoindre/dashboard',
    '/rejoindre/en-attente',
    '/rejoindre/suspendu',
  ],
}
