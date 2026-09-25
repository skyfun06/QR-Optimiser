import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientIp, INPUT_LIMITS, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

const RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 }

type VendeurRow = { id: string; statut: string | null }

async function getVendeur(): Promise<VendeurRow | null> {
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
          // Lecture seule.
        },
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('vendeurs')
    .select('id,statut')
    .eq('user_id', user.id)
    .maybeSingle<VendeurRow>()
  return data ?? null
}

export async function POST(request: NextRequest) {
  try {
    const vendeur = await getVendeur()
    if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (vendeur.statut !== 'actif') {
      return NextResponse.json({ error: "Ton compte n'est pas encore actif." }, { status: 403 })
    }

    const ip = getClientIp(request)
    const rl = rateLimit(`reclamer:${vendeur.id}:${ip}`, RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessaie dans un moment.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      )
    }

    const body = await request.json().catch(() => null)
    const businessNom = typeof body?.businessNom === 'string' ? body.businessNom.trim() : ''
    const ville = typeof body?.ville === 'string' ? body.ville.trim() : ''
    const dateVisiteRaw = typeof body?.dateVisite === 'string' ? body.dateVisite.trim() : ''
    const explication = typeof body?.explication === 'string' ? body.explication.trim() : ''

    if (businessNom.length < 2 || businessNom.length > INPUT_LIMITS.shortName) {
      return NextResponse.json({ error: 'Nom du commerce invalide.' }, { status: 400 })
    }
    if (ville.length > INPUT_LIMITS.shortName) {
      return NextResponse.json({ error: 'Ville invalide.' }, { status: 400 })
    }
    if (explication.length > INPUT_LIMITS.message) {
      return NextResponse.json({ error: 'Explication trop longue.' }, { status: 400 })
    }
    // Date approximative : facultative, mais si fournie elle doit être valide.
    let dateVisite: string | null = null
    if (dateVisiteRaw) {
      const d = new Date(dateVisiteRaw)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Date de visite invalide.' }, { status: 400 })
      }
      dateVisite = dateVisiteRaw
    }

    // --- Commerce déjà rattaché ? (exact, insensible à la casse, sur le nom figé) ---
    const { data: ventesMatch } = await supabaseAdmin
      .from('ventes')
      .select('vendeur_id')
      .ilike('business_nom', businessNom)
    const rows = (ventesMatch ?? []) as { vendeur_id: string }[]
    if (rows.some((r) => r.vendeur_id === vendeur.id)) {
      return NextResponse.json(
        { error: 'Ce commerce t’est déjà rattaché : tu le retrouves dans tes commerces.' },
        { status: 409 }
      )
    }
    if (rows.length > 0) {
      // Rattaché à quelqu'un d'autre : on ne révèle jamais son identité.
      return NextResponse.json(
        { error: 'Ce commerce est déjà rattaché à un autre vendeur. Impossible de le réclamer.' },
        { status: 409 }
      )
    }

    // --- Doublon de réclamation en cours pour le même commerce ? ---
    const { data: dejaEnCours } = await supabaseAdmin
      .from('reclamations')
      .select('id')
      .eq('vendeur_id', vendeur.id)
      .eq('statut', 'en_cours')
      .ilike('business_nom', businessNom)
      .limit(1)
      .maybeSingle<{ id: string }>()
    if (dejaEnCours) {
      return NextResponse.json(
        { error: 'Tu as déjà une réclamation en cours pour ce commerce.' },
        { status: 409 }
      )
    }

    const { error: insertErr } = await supabaseAdmin.from('reclamations').insert({
      vendeur_id: vendeur.id,
      business_nom: businessNom,
      ville: ville || null,
      date_visite: dateVisite,
      explication: explication || null,
      statut: 'en_cours',
    })
    if (insertErr) {
      console.error('[reclamer] insert failed:', insertErr)
      return NextResponse.json({ error: "Impossible d'enregistrer ta réclamation." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[reclamer] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
