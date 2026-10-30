import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const ADMIN_EMAIL = 'lborrelli248@gmail.com'

/**
 * Utilisateur connecté s'il est l'admin, sinon null. Utilisable dans un Server
 * Component (où l'écriture de cookies est interdite → ignorée) comme dans une
 * Server Action / Route Handler.
 */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Rendu d'un Server Component : impossible d'écrire des cookies.
          }
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return { id: user.id, email: user.email }
}
