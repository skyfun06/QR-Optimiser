import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

type VendeurRow = {
  id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  ville: string | null
  code_postal: string | null
  date_naissance: string | null
  statut: 'en_attente' | 'formation' | 'actif' | 'suspendu'
  code: string | null
  date_inscription: string | null
  reponses: Record<string, string> | null
}
type VenteRow = {
  id: string
  vendeur_id: string
  business_nom: string | null
  formule: string
  date_signature: string
  statut_commerce: 'essai' | 'abonne' | 'resilie'
}
type CommissionRow = {
  id: string
  vente_id: string
  montant: number | string
  part: number
  statut: 'en_attente' | 'a_payer' | 'payee'
}

async function requireAdmin() {
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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }
  if (user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }
  return { user }
}

const fullName = (v: { prenom: string | null; nom: string | null }) =>
  [v.prenom?.trim(), v.nom?.trim()].filter(Boolean).join(' ') || 'Vendeur sans nom'

export async function GET() {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const [{ data: vendeurs, error: vErr }, { data: ventes, error: vtErr }, { data: commissions, error: cErr }] =
      await Promise.all([
        supabaseAdmin
          .from('vendeurs')
          .select('id,prenom,nom,email,telephone,ville,code_postal,date_naissance,statut,code,date_inscription,reponses')
          .order('date_inscription', { ascending: false }),
        supabaseAdmin
          .from('ventes')
          .select('id,vendeur_id,business_nom,formule,date_signature,statut_commerce')
          .order('date_signature', { ascending: false }),
        supabaseAdmin.from('commissions').select('id,vente_id,montant,part,statut'),
      ])

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })
    if (vtErr) return NextResponse.json({ error: vtErr.message }, { status: 500 })
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    const vendeurRows = (vendeurs ?? []) as VendeurRow[]
    const venteRows = (ventes ?? []) as VenteRow[]
    const commissionRows = (commissions ?? []) as CommissionRow[]

    const venteById = new Map(venteRows.map((v) => [v.id, v]))
    const vendeurById = new Map(vendeurRows.map((v) => [v.id, v]))

    // Agrégats par vendeur : nombre de ventes + total gagné (acquis = à verser +
    // déjà payé, comme le dashboard vendeur — les commissions en_attente ne
    // comptent pas, elles peuvent être annulées).
    const ventesCountByVendeur = new Map<string, number>()
    for (const vt of venteRows) {
      ventesCountByVendeur.set(vt.vendeur_id, (ventesCountByVendeur.get(vt.vendeur_id) ?? 0) + 1)
    }
    const gagneByVendeur = new Map<string, number>()
    for (const c of commissionRows) {
      if (c.statut !== 'a_payer' && c.statut !== 'payee') continue
      const vente = venteById.get(c.vente_id)
      if (!vente) continue
      gagneByVendeur.set(vente.vendeur_id, (gagneByVendeur.get(vente.vendeur_id) ?? 0) + Number(c.montant))
    }

    const vendeursOut = vendeurRows.map((v) => ({
      id: v.id,
      nomComplet: fullName(v),
      email: v.email,
      statut: v.statut,
      code: v.code,
      ventesCount: ventesCountByVendeur.get(v.id) ?? 0,
      totalGagne: gagneByVendeur.get(v.id) ?? 0,
    }))

    const candidatures = vendeurRows
      .filter((v) => v.statut === 'en_attente')
      .sort((a, b) => (a.date_inscription ?? '').localeCompare(b.date_inscription ?? ''))
      .map((v) => ({
        id: v.id,
        prenom: v.prenom,
        nom: v.nom,
        email: v.email,
        telephone: v.telephone,
        ville: v.ville,
        codePostal: v.code_postal,
        dateNaissance: v.date_naissance,
        dateInscription: v.date_inscription,
        reponses: v.reponses ?? null,
      }))

    const commissionsAPayerItems = commissionRows
      .filter((c) => c.statut === 'a_payer')
      .map((c) => {
        const vente = venteById.get(c.vente_id)
        const vendeur = vente ? vendeurById.get(vente.vendeur_id) : undefined
        return {
          id: c.id,
          montant: Number(c.montant),
          part: c.part,
          vendeurNom: vendeur ? fullName(vendeur) : 'Vendeur inconnu',
          businessNom: vente?.business_nom ?? 'Commerce',
        }
      })
    const totalAPayer = commissionsAPayerItems.reduce((sum, c) => sum + c.montant, 0)

    const ventesOut = venteRows.map((vt) => {
      const vendeur = vendeurById.get(vt.vendeur_id)
      return {
        id: vt.id,
        vendeurId: vt.vendeur_id,
        vendeurNom: vendeur ? fullName(vendeur) : 'Vendeur inconnu',
        businessNom: vt.business_nom ?? 'Commerce',
        formule: vt.formule,
        dateSignature: vt.date_signature,
        statutCommerce: vt.statut_commerce,
      }
    })

    return NextResponse.json({
      candidatures,
      vendeurs: vendeursOut,
      commissions: { items: commissionsAPayerItems, total: totalAPayer },
      ventes: ventesOut,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Change de statut vendeur en validant la transition attendue (évite les
// courses / clics obsolètes). Renvoie 409 si le statut courant ne correspond pas.
async function changeStatut(vendeurId: string, from: string, to: string) {
  const { data, error } = await supabaseAdmin
    .from('vendeurs')
    .update({ statut: to })
    .eq('id', vendeurId)
    .eq('statut', from)
    .select('id')
    .maybeSingle<{ id: string }>()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Action impossible : le statut a changé entre-temps.' }, { status: 409 })
  return NextResponse.json({ ok: true, statut: to })
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : null
    const vendeurId = typeof body?.vendeurId === 'string' ? body.vendeurId : null
    const commissionId = typeof body?.commissionId === 'string' ? body.commissionId : null

    switch (action) {
      case 'valider':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'en_attente', 'formation')

      case 'refuser':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'en_attente', 'suspendu')

      case 'reactiver':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'suspendu', 'actif')

      case 'suspendre': {
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        // Depuis n'importe quel statut sauf déjà suspendu.
        const { data, error } = await supabaseAdmin
          .from('vendeurs')
          .update({ statut: 'suspendu' })
          .eq('id', vendeurId)
          .neq('statut', 'suspendu')
          .select('id')
          .maybeSingle<{ id: string }>()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) return NextResponse.json({ error: 'Vendeur déjà suspendu ou introuvable.' }, { status: 409 })
        return NextResponse.json({ ok: true, statut: 'suspendu' })
      }

      case 'payer': {
        if (!commissionId) return NextResponse.json({ error: 'commissionId manquant' }, { status: 400 })
        const { data, error } = await supabaseAdmin
          .from('commissions')
          .update({ statut: 'payee', date_paiement: new Date().toISOString() })
          .eq('id', commissionId)
          .eq('statut', 'a_payer')
          .select('id')
          .maybeSingle<{ id: string }>()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) return NextResponse.json({ error: 'Commission déjà payée ou non éligible.' }, { status: 409 })
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
