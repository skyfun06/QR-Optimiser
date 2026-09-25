import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Attache, à partir du code déposé en cookie sur /activation (?ref=CODE), soit un
 * parrain commerçant (table `referrers`) soit un vendeur (table `vendeurs`) au
 * commerce du user connecté. Les codes sont uniques ENTRE les deux tables, donc
 * un code ne correspond qu'à l'une des deux.
 *
 * - Code parrain  → renseigne businesses.referrer_id.
 * - Code vendeur (actif) → crée une `vente` (le lien vendeur ↔ commerce qui
 *   déclenchera la commission au 1er paiement, via le webhook Stripe existant).
 *
 * Appelée depuis l'onboarding, juste après la création de la ligne business.
 * Tout est fait en service role. Best-effort : ne bloque JAMAIS le parcours
 * d'inscription (un code invalide → commerce inscrit sans rattachement) et
 * nettoie systématiquement le cookie.
 */

const REF_COOKIE = 'scanavis_ref'
// Codes attendus : alphanum + tiret/underscore, courts. Sinon on ignore.
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/

/**
 * Crée la vente liant un vendeur au commerce du user (best-effort). On cible le
 * commerce fourni (vérifié appartenir au user) ou, à défaut, le plus récent.
 * Aucun doublon : une seule vente par commerce (unique business_id).
 */
async function attacherVente(userId: string, vendeurId: string, businessIdHint: string | null) {
  let businessId: string | null = null
  let businessNom: string | null = null

  if (businessIdHint) {
    const { data } = await supabaseAdmin
      .from('businesses')
      .select('id,name,user_id')
      .eq('id', businessIdHint)
      .maybeSingle<{ id: string; name: string | null; user_id: string }>()
    // On n'accepte le hint que s'il appartient bien au user (anti-usurpation).
    if (data && data.user_id === userId) {
      businessId = data.id
      businessNom = data.name
    }
  }

  if (!businessId) {
    const { data } = await supabaseAdmin
      .from('businesses')
      .select('id,name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; name: string | null }>()
    if (!data) return
    businessId = data.id
    businessNom = data.name
  }

  // Pas de doublon (une vente peut déjà exister via l'inscription par un vendeur).
  const { data: existing } = await supabaseAdmin
    .from('ventes')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle<{ id: string }>()
  if (existing) return

  const { error } = await supabaseAdmin.from('ventes').insert({
    vendeur_id: vendeurId,
    business_id: businessId,
    business_nom: businessNom,
    formule: 'qr',
    statut_commerce: 'essai',
  })
  if (error) {
    console.error(`referral attach: vente insert failed for business ${businessId}:`, error)
  }
}

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

    // businessId ciblé (transmis par l'onboarding) — optionnel.
    const body = await request.json().catch(() => null)
    const businessIdHint = typeof body?.businessId === 'string' ? body.businessId : null

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

    // --- Cas 1 : code parrain commerçant → renseigne referrer_id. ---
    const { data: referrer, error: lookupError } = await supabaseAdmin
      .from('referrers')
      .select('id')
      .eq('code', code)
      .maybeSingle<{ id: string }>()

    if (lookupError) {
      console.error(`referral attach: referrer lookup failed for code ${code}:`, lookupError)
    }

    if (referrer) {
      // On n'écrase jamais un parrain déjà attribué (referrer_id doit être null).
      const { error: updateError } = await supabaseAdmin
        .from('businesses')
        .update({ referrer_id: referrer.id })
        .eq('user_id', user.id)
        .is('referrer_id', null)
      if (updateError) {
        console.error(`referral attach: update failed for user ${user.id}:`, updateError)
      }
      return done()
    }

    // --- Cas 2 : code vendeur (actif) → crée la vente (attribution). ---
    const { data: vendeur, error: vendeurErr } = await supabaseAdmin
      .from('vendeurs')
      .select('id,statut')
      .eq('code', code)
      .maybeSingle<{ id: string; statut: string | null }>()

    if (vendeurErr) {
      console.error(`referral attach: vendeur lookup failed for code ${code}:`, vendeurErr)
    }

    if (vendeur && vendeur.statut === 'actif') {
      await attacherVente(user.id, vendeur.id, businessIdHint)
    }

    // Code inconnu (ni parrain ni vendeur) : on ignore, l'inscription continue.
    return done()
  } catch (error) {
    console.error('referral attach error:', error)
    return done()
  }
}
