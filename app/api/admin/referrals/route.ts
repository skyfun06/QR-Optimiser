import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

// -------------------------------------------------------------------------
// Hypothèses de calcul de commission.
//
// L'abonnement est un prix Stripe unique (STRIPE_PRICE_ID) facturé par
// commerce. Ce prix n'est pas stocké côté base : on reprend donc ici le même
// montant mensuel que le reste du backoffice (cf. api/admin/clients), à
// ajuster si le tarif Stripe change.
//
// La commission du parrain = COMMISSION_RATE du montant mensuel, pour chaque
// commerce qu'il a apporté et qui est actuellement payant (subscription_status
// = 'active'). C'est une estimation du dû MENSUEL récurrent.
// -------------------------------------------------------------------------
const MONTHLY_PRICE_EUR = 19.99
const COMMISSION_RATE = 0.2 // 20 %

type ReferrerRow = {
  id: string
  name: string | null
  code: string | null
  contact: string | null
  commission_paid_until: string | null
  created_at: string | null
  business_id: string | null
}

type BusinessRow = {
  referrer_id: string | null
  subscription_status: 'trial' | 'active' | 'expired' | 'suspended' | null
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
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }

  if (user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user }
}

/** Renvoie true si des commissions ont couru depuis le dernier paiement. */
function commissionDue(activeCount: number, paidUntil: string | null): boolean {
  if (activeCount === 0) return false
  if (!paidUntil) return true
  // Comparaison en date pure (YYYY-MM-DD) : dû si la dernière date de paiement
  // est antérieure à aujourd'hui.
  const today = new Date().toISOString().slice(0, 10)
  return paidUntil < today
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const [{ data: referrers, error: referrersError }, { data: businesses, error: businessesError }] =
      await Promise.all([
        supabaseAdmin
          .from('referrers')
          .select('id,name,code,contact,commission_paid_until,created_at,business_id')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('businesses')
          .select('referrer_id,subscription_status')
          .not('referrer_id', 'is', null),
      ])

    if (referrersError) {
      return NextResponse.json({ error: referrersError.message }, { status: 500 })
    }
    if (businessesError) {
      return NextResponse.json({ error: businessesError.message }, { status: 500 })
    }

    const referrerRows = (referrers ?? []) as ReferrerRow[]
    const businessRows = (businesses ?? []) as BusinessRow[]

    // Agrège les commerces apportés par parrain.
    const statsByReferrer = new Map<string, { total: number; active: number }>()
    for (const b of businessRows) {
      if (!b.referrer_id) continue
      const current = statsByReferrer.get(b.referrer_id) ?? { total: 0, active: 0 }
      current.total += 1
      if (b.subscription_status === 'active') current.active += 1
      statsByReferrer.set(b.referrer_id, current)
    }

    // Nom du commerce dont chaque parrain "Commerce client" est issu (business_id).
    // Les parrains "externes" (business_id null) ne sont pas concernés.
    const ownBusinessIds = [...new Set(referrerRows.map((r) => r.business_id).filter((id): id is string => !!id))]
    const businessNameById = new Map<string, string>()
    if (ownBusinessIds.length > 0) {
      const { data: ownBusinesses, error: ownError } = await supabaseAdmin
        .from('businesses')
        .select('id,name')
        .in('id', ownBusinessIds)
      if (ownError) {
        return NextResponse.json({ error: ownError.message }, { status: 500 })
      }
      for (const b of (ownBusinesses ?? []) as { id: string; name: string | null }[]) {
        businessNameById.set(b.id, b.name?.trim() || 'Commerce sans nom')
      }
    }

    const referrersOut = referrerRows.map((r) => {
      const stats = statsByReferrer.get(r.id) ?? { total: 0, active: 0 }
      // Calcul identique quel que soit le type de parrain : la commission ne
      // dépend que des commerces actifs apportés, jamais de business_id.
      const monthlyCommission = stats.active * MONTHLY_PRICE_EUR * COMMISSION_RATE
      return {
        id: r.id,
        name: r.name?.trim() || 'Parrain sans nom',
        code: r.code ?? '—',
        contact: r.contact ?? null,
        commissionPaidUntil: r.commission_paid_until ?? null,
        createdAt: r.created_at,
        totalBusinesses: stats.total,
        activeBusinesses: stats.active,
        monthlyCommission,
        commissionDue: commissionDue(stats.active, r.commission_paid_until ?? null),
        businessId: r.business_id ?? null,
        businessName: r.business_id ? businessNameById.get(r.business_id) ?? null : null,
      }
    })

    return NextResponse.json({
      referrers: referrersOut,
      config: { monthlyPriceEur: MONTHLY_PRICE_EUR, commissionRate: COMMISSION_RATE },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Marque la commission d'un parrain comme réglée « jusqu'à aujourd'hui ».
 * Simple bouton de suivi manuel — aucune interaction Stripe.
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => null)
    const referrerId = typeof body?.referrerId === 'string' ? body.referrerId : null

    if (!referrerId) {
      return NextResponse.json({ error: 'Paramètre referrerId manquant.' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('referrers')
      .update({ commission_paid_until: today })
      .eq('id', referrerId)
      .select('id')
      .maybeSingle<{ id: string }>()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Parrain introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, commissionPaidUntil: today })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
