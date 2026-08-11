import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Crée, si besoin, la ligne `referrers` "auto" de chaque commerce du user
 * connecté : chaque commerce devient son propre parrain, avec un code court
 * unique et son business_id renseigné.
 *
 * Appelée en fire-and-forget juste après la création d'un commerce (onboarding
 * ou ajout d'un commerce). Tout est fait en service role (RLS bypass) : le
 * commerçant n'écrit jamais lui-même dans `referrers`. La création est
 * idempotente côté SQL (contrainte UNIQUE sur business_id + ON CONFLICT DO
 * NOTHING dans create_business_referrer), donc rejouable sans risque.
 *
 * Best-effort : cette route ne bloque JAMAIS le parcours — toute erreur est
 * avalée et renvoyée en { ok: true }.
 */
export async function POST() {
  const done = () => NextResponse.json({ ok: true })

  try {
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
            // Lecture seule (on ne rafraîchit pas la session).
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return done()

    // Commerces du user : on garantit une ligne referrers pour chacun.
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)

    for (const b of (businesses ?? []) as { id: string }[]) {
      // Idempotent : si la ligne existe déjà, la fonction ne fait rien.
      const { error: rpcError } = await supabaseAdmin.rpc('create_business_referrer', {
        p_business_id: b.id,
      })
      // Best-effort : on ne bloque pas le parcours, mais on ne masque plus
      // l'échec — un grant manquant ou une erreur SQL doit être diagnosticable.
      if (rpcError) {
        console.error(`referral self: create_business_referrer failed for business ${b.id}:`, rpcError)
      }
    }

    return done()
  } catch (error) {
    console.error('referral self error:', error)
    return done()
  }
}
