import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUser } from '@/lib/admin-auth'
import { PROSPECT_MANUEL_PREFIX, distanceMetres, parseCoordonnees } from '@/lib/vendeur-prospection'

export const dynamic = 'force-dynamic'

// Commerces à démarcher d'un vendeur, gérés à la main par l'admin (en
// attendant la clé Google, puis en complément de la recherche automatique).

type Params = { params: Promise<{ id: string }> }

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function loadProspects(vendeurId: string) {
  return supabaseAdmin
    .from('vendeur_prospects')
    .select('id,place_id,nom,adresse,note,nb_avis,telephone,lat,lng,statut,created_at')
    .eq('vendeur_id', vendeurId)
    .order('created_at', { ascending: false })
}

export async function GET(_request: NextRequest, { params }: Params) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params

  const { data: vendeur } = await supabaseAdmin
    .from('vendeurs')
    .select('id,prenom,nom,statut')
    .eq('id', id)
    .maybeSingle<{ id: string; prenom: string | null; nom: string | null; statut: string }>()
  if (!vendeur) return NextResponse.json({ error: 'Vendeur introuvable.' }, { status: 404 })

  const { data: prospects, error } = await loadProspects(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    vendeur: {
      id: vendeur.id,
      nomComplet: [vendeur.prenom?.trim(), vendeur.nom?.trim()].filter(Boolean).join(' ') || 'Vendeur sans nom',
      statut: vendeur.statut,
    },
    prospects: (prospects ?? []).map((p) => ({ ...p, manuel: p.place_id.startsWith(PROSPECT_MANUEL_PREFIX) })),
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const body = await request.json().catch(() => null)

  const nom = texte(body?.nom, 200)
  if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })

  const coords = parseCoordonnees(texte(body?.coordonnees, 100))
  if (!coords) {
    return NextResponse.json(
      { error: 'Coordonnées invalides. Colle-les telles que copiées dans Google Maps, par exemple « 43.58123, 7.12456 ».' },
      { status: 400 }
    )
  }

  let note: number | null = null
  if (body?.note !== undefined && body?.note !== null && body?.note !== '') {
    note = Number(String(body.note).replace(',', '.'))
    if (!Number.isFinite(note) || note < 0 || note > 5) {
      return NextResponse.json({ error: 'La note doit être comprise entre 0 et 5.' }, { status: 400 })
    }
    note = Math.round(note * 10) / 10
  }

  let nbAvis = 0
  if (body?.nb_avis !== undefined && body?.nb_avis !== null && body?.nb_avis !== '') {
    nbAvis = Number(body.nb_avis)
    if (!Number.isInteger(nbAvis) || nbAvis < 0) {
      return NextResponse.json({ error: "Le nombre d'avis doit être un nombre entier positif." }, { status: 400 })
    }
  }

  const { data: vendeur } = await supabaseAdmin.from('vendeurs').select('id').eq('id', id).maybeSingle()
  if (!vendeur) return NextResponse.json({ error: 'Vendeur introuvable.' }, { status: 404 })

  // Distance au point de départ du vendeur, s'il en a déjà enregistré un.
  const { data: settings } = await supabaseAdmin
    .from('vendeur_prospection')
    .select('lat,lng')
    .eq('vendeur_id', id)
    .maybeSingle<{ lat: number | null; lng: number | null }>()
  const distance =
    settings?.lat != null && settings?.lng != null
      ? distanceMetres({ lat: settings.lat, lng: settings.lng }, coords)
      : 0

  const { error } = await supabaseAdmin.from('vendeur_prospects').insert({
    vendeur_id: id,
    place_id: `${PROSPECT_MANUEL_PREFIX}${randomUUID()}`,
    nom,
    adresse: texte(body?.adresse, 300) || null,
    note,
    nb_avis: nbAvis,
    telephone: texte(body?.telephone, 40) || null,
    lat: coords.lat,
    lng: coords.lng,
    distance_m: distance,
    statut: 'a_faire',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const prospectId = request.nextUrl.searchParams.get('prospectId')
  if (!prospectId) return NextResponse.json({ error: 'prospectId manquant' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vendeur_prospects')
    .delete()
    .eq('id', prospectId)
    .eq('vendeur_id', id)
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Commerce introuvable.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
