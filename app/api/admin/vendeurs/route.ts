import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { declencherCommissionSiVente } from '@/lib/vendeur-commissions'

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
  test_reussi_le: string | null
  test_meilleur_score: number | null
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
          .select('id,prenom,nom,email,telephone,ville,code_postal,date_naissance,statut,code,date_inscription,reponses,test_reussi_le,test_meilleur_score')
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
      testReussi: !!v.test_reussi_le,
      testScore: v.test_meilleur_score,
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

    // --- Réclamations en attente + rapprochement avec les commerces en base ---
    const { data: reclas } = await supabaseAdmin
      .from('reclamations')
      .select('id,vendeur_id,business_nom,ville,date_visite,explication,statut,created_at')
      .eq('statut', 'en_cours')
      .order('created_at', { ascending: true })
    const reclaRows = (reclas ?? []) as {
      id: string
      vendeur_id: string
      business_nom: string
      ville: string | null
      date_visite: string | null
      explication: string | null
      created_at: string
    }[]

    // Rapprochement : commerces dont le nom correspond (insensible à la casse).
    const matchesByRecla = new Map<string, { id: string; name: string | null; subscription_status: string | null }[]>()
    const matchedBizIds = new Set<string>()
    for (const r of reclaRows) {
      const { data: bizes } = await supabaseAdmin
        .from('businesses')
        .select('id,name,subscription_status')
        .ilike('name', r.business_nom)
      const list = (bizes ?? []) as { id: string; name: string | null; subscription_status: string | null }[]
      matchesByRecla.set(r.id, list)
      list.forEach((b) => matchedBizIds.add(b.id))
    }

    // Attribution actuelle des commerces rapprochés (déjà une vente ?).
    const venteVendeurByBiz = new Map<string, string>()
    if (matchedBizIds.size > 0) {
      const { data: vts } = await supabaseAdmin
        .from('ventes')
        .select('business_id,vendeur_id')
        .in('business_id', [...matchedBizIds])
      for (const vt of (vts ?? []) as { business_id: string; vendeur_id: string }[]) {
        venteVendeurByBiz.set(vt.business_id, vt.vendeur_id)
      }
    }

    const reclamationsOut = reclaRows.map((r) => {
      const vendeur = vendeurById.get(r.vendeur_id)
      const matches = (matchesByRecla.get(r.id) ?? []).map((b) => {
        const attributedVendeurId = venteVendeurByBiz.get(b.id) ?? null
        const attributedVendeur = attributedVendeurId ? vendeurById.get(attributedVendeurId) : undefined
        return {
          id: b.id,
          name: b.name ?? '—',
          subscriptionStatus: b.subscription_status,
          attributed: !!attributedVendeurId,
          attributedVendeurNom: attributedVendeur ? fullName(attributedVendeur) : null,
        }
      })
      return {
        id: r.id,
        vendeurId: r.vendeur_id,
        vendeurNom: vendeur ? fullName(vendeur) : 'Vendeur inconnu',
        businessNom: r.business_nom,
        ville: r.ville,
        dateVisite: r.date_visite,
        explication: r.explication,
        createdAt: r.created_at,
        matches,
      }
    })

    return NextResponse.json({
      candidatures,
      vendeurs: vendeursOut,
      commissions: { items: commissionsAPayerItems, total: totalAPayer },
      ventes: ventesOut,
      reclamations: reclamationsOut,
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

// Accepte une réclamation : rattache la vente au vendeur et crée ses commissions
// comme pour une vente normale (immédiatement si le commerce est déjà abonné,
// sinon au 1er paiement via le webhook).
async function accepterReclamation(reclamationId: string, businessId: string | null) {
  const { data: recla } = await supabaseAdmin
    .from('reclamations')
    .select('id,vendeur_id,statut')
    .eq('id', reclamationId)
    .maybeSingle<{ id: string; vendeur_id: string; statut: string }>()
  if (!recla) return NextResponse.json({ error: 'Réclamation introuvable.' }, { status: 404 })
  if (recla.statut !== 'en_cours') {
    return NextResponse.json({ error: 'Cette réclamation a déjà été traitée.' }, { status: 409 })
  }
  if (!businessId) {
    return NextResponse.json({ error: 'Sélectionne le commerce à rattacher.' }, { status: 400 })
  }

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id,name,subscription_status')
    .eq('id', businessId)
    .maybeSingle<{ id: string; name: string | null; subscription_status: string | null }>()
  if (!business) return NextResponse.json({ error: 'Commerce introuvable.' }, { status: 404 })

  // Une seule vente par commerce : on refuse si déjà rattaché.
  const { data: existingVente } = await supabaseAdmin
    .from('ventes')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle<{ id: string }>()
  if (existingVente) {
    return NextResponse.json(
      { error: 'Ce commerce est déjà rattaché à une vente.' },
      { status: 409 }
    )
  }

  const { data: vente, error: venteErr } = await supabaseAdmin
    .from('ventes')
    .insert({
      vendeur_id: recla.vendeur_id,
      business_id: businessId,
      business_nom: business.name,
      formule: 'qr',
      statut_commerce: 'essai',
    })
    .select('id')
    .single<{ id: string }>()
  if (venteErr || !vente) {
    return NextResponse.json({ error: venteErr?.message ?? 'Création de la vente impossible.' }, { status: 500 })
  }

  // Commerce déjà abonné → on déclenche tout de suite la commission (comme un
  // 1er paiement déjà survenu). Sinon, elle se déclenchera au paiement (webhook).
  if (business.subscription_status === 'active') {
    await declencherCommissionSiVente(supabaseAdmin, businessId)
  }

  const { error: updErr } = await supabaseAdmin
    .from('reclamations')
    .update({
      statut: 'acceptee',
      business_id: businessId,
      vente_id: vente.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', reclamationId)
    .eq('statut', 'en_cours')
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function refuserReclamation(reclamationId: string) {
  const { data, error } = await supabaseAdmin
    .from('reclamations')
    .update({ statut: 'refusee', decided_at: new Date().toISOString() })
    .eq('id', reclamationId)
    .eq('statut', 'en_cours')
    .select('id')
    .maybeSingle<{ id: string }>()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cette réclamation a déjà été traitée.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : null
    const vendeurId = typeof body?.vendeurId === 'string' ? body.vendeurId : null
    const commissionId = typeof body?.commissionId === 'string' ? body.commissionId : null
    const reclamationId = typeof body?.reclamationId === 'string' ? body.reclamationId : null
    const businessId = typeof body?.businessId === 'string' ? body.businessId : null

    switch (action) {
      case 'valider':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'en_attente', 'formation')

      case 'refuser':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'en_attente', 'suspendu')

      case 'activer':
        if (!vendeurId) return NextResponse.json({ error: 'vendeurId manquant' }, { status: 400 })
        return changeStatut(vendeurId, 'formation', 'actif')

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

      case 'accepter_reclamation':
        if (!reclamationId) return NextResponse.json({ error: 'reclamationId manquant' }, { status: 400 })
        return accepterReclamation(reclamationId, businessId)

      case 'refuser_reclamation':
        if (!reclamationId) return NextResponse.json({ error: 'reclamationId manquant' }, { status: 400 })
        return refuserReclamation(reclamationId)

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
