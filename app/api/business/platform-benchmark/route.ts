import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// =========================================================================
// GARDE-FOU — seuils d'affichage du comparatif (AJUSTABLES ICI)
// -------------------------------------------------------------------------
// Le comparatif "satisfaction vs moyenne ScanAvis" n'est renvoyé (available:
// true) que si assez d'AUTRES commerces ont assez de notes pour que la moyenne
// soit statistiquement crédible ET anonyme (pas de dé-anonymisation possible
// quand il n'y a qu'un ou deux autres commerces).
//
//   • MIN_OTHER_BUSINESSES     : nb minimum d'AUTRES commerces distincts…
//   • MIN_REVIEWS_PER_BUSINESS : …ayant CHACUN au moins ce nombre de notes.
//
// Seuls les commerces atteignant MIN_REVIEWS_PER_BUSINESS entrent dans le
// calcul de la moyenne (les commerces trop peu notés sont ignorés pour ne pas
// bruiter le résultat). Pour changer la sensibilité de la feature, il suffit
// de modifier ces deux constantes — rien d'autre à toucher.
// =========================================================================
const MIN_OTHER_BUSINESSES = 3
const MIN_REVIEWS_PER_BUSINESS = 10

type ReviewRow = { business_id: string | null; rating: number | null }

export async function GET(request: NextRequest) {
  try {
    // --- Auth utilisateur (même pattern que /api/referral/self) ------------
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
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'Paramètre businessId manquant.' }, { status: 400 })
    }

    // --- Commerces du user (service role) : sert à (1) vérifier que le
    //     businessId lui appartient, (2) exclure TOUS ses commerces du calcul
    //     (un patron multi-établissement ne se compare pas à lui-même). -------
    const { data: ownBusinesses, error: ownError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
    if (ownError) {
      return NextResponse.json({ error: ownError.message }, { status: 500 })
    }

    const ownIds = new Set((ownBusinesses ?? []).map((b) => (b as { id: string }).id))
    if (!ownIds.has(businessId)) {
      // Le commerce demandé n'appartient pas à l'utilisateur : accès refusé.
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // --- Notes des AUTRES commerces (service role, RLS bypass) --------------
    // On exclut d'emblée les lignes orphelines (business_id null, données de
    // test historiques). L'exclusion des commerces du user se fait ensuite en
    // mémoire (volume faible ; à pousser côté SQL si la table grossit beaucoup).
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('business_id,rating')
      .not('business_id', 'is', null)
    if (reviewsError) {
      return NextResponse.json({ error: reviewsError.message }, { status: 500 })
    }

    // Agrège par commerce : total de notes + notes satisfaites (≥ 4).
    const perBusiness = new Map<string, { total: number; satisfied: number }>()
    for (const r of (reviews ?? []) as ReviewRow[]) {
      const id = r.business_id
      if (!id || ownIds.has(id)) continue // exclut ses propres commerces
      if (typeof r.rating !== 'number' || !Number.isFinite(r.rating)) continue
      const acc = perBusiness.get(id) ?? { total: 0, satisfied: 0 }
      acc.total += 1
      if (r.rating >= 4) acc.satisfied += 1 // même seuil que ratingStats
      perBusiness.set(id, acc)
    }

    // Ne gardent le droit de compter que les commerces suffisamment notés.
    const qualifying = [...perBusiness.values()].filter((b) => b.total >= MIN_REVIEWS_PER_BUSINESS)

    if (qualifying.length < MIN_OTHER_BUSINESSES) {
      // Pas assez de matière : on ne renvoie PAS de chiffre calculé sur trop
      // peu de données (et on ne dé-anonymise personne).
      return NextResponse.json({ available: false })
    }

    // Moyenne "pooled" (micro-moyenne), identique à la formule ratingStats
    // appliquée à l'ensemble des notes des commerces qualifiés.
    const totals = qualifying.reduce(
      (acc, b) => ({ total: acc.total + b.total, satisfied: acc.satisfied + b.satisfied }),
      { total: 0, satisfied: 0 }
    )
    const platformSatisfaction = Math.round((totals.satisfied / totals.total) * 100)

    // On ne renvoie QUE l'agrégat : jamais les données individuelles.
    return NextResponse.json({ available: true, platformSatisfaction })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
