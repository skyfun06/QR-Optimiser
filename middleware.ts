import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // On crée un client Supabase côté serveur
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase a besoin de lire/écrire les cookies pour gérer la session
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

  // On récupère l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser()

  // Si l'utilisateur essaie d'accéder au dashboard sans être connecté on le redirige vers la page login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si l'utilisateur est connecté et essaie d'aller sur login/signup on le redirige directement vers le dashboard
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// On dit à Next.js sur quelles routes appliquer ce middleware
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}