import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Attache le parrain au commerce du user connecté, à partir du code déposé en
 * cookie sur /activation (?ref=CODE).
 *
 * Appelée depuis l'onboarding, juste après la création de la ligne business.
 * Tout est fait côté serveur en service role : le commerçant ne peut jamais
 * s'auto-attribuer un parrain (le trigger anti-triche neutralise referrer_id
 * pour les écritures client). Best-effort : cette route ne bloque JAMAIS le
 * parcours d'inscription, et nettoie systématiquement le cookie.
 */

const REF_COOKIE = 'scanavis_ref'
// Codes attendus : alphanum + tiret/underscore, courts. Sinon on ignore.
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/

export async function POST(request: NextRequest) {
  // Réponse standard : succès silencieux + purge du cookie (consommé ou invalide).
  const done = () => {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(REF_COOKIE, '', { maxAge: 0, path: '/' })
    return res
  }

  try {
    const code = request.cookies.get(REF_COOKIE)?.value?.trim()
    if (!code || !CODE_RE.test(code)) return done()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Lecture seule ici (on ne rafraîchit pas la session).
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return done()

    // Résolution du code -> referrer_id (service role, RLS bypass).
    const { data: referrer } = await supabaseAdmin
      .from('referrers')
      .select('id')
      .eq('code', code)
      .maybeSingle<{ id: string }>()

    // Code inconnu : on ignore silencieusement (on ne bloque pas le signup).
    if (!referrer) return done()

    // On n'écrase jamais un parrain déjà attribué (referrer_id doit être null).
    await supabaseAdmin
      .from('businesses')
      .update({ referrer_id: referrer.id })
      .eq('user_id', user.id)
      .is('referrer_id', null)

    return done()
  } catch (error) {
    console.error('referral attach error:', error)
    return done()
  }
}
