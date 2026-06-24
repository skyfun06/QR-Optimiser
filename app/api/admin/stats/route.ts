import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

// Verrou admin : strictement réservé au compte fondateur (même règle que les
// autres routes /api/admin/*).
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
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  if (user.email !== ADMIN_EMAIL) return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { user }
}

type BizRow = { user_id: string | null; created_at: string | null }

export async function GET() {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const [
      { data: businesses, error: bizError },
      { count: avis, error: avisError },
      { count: scans, error: scansError },
      { count: feedbacks, error: feedbacksError },
    ] = await Promise.all([
      supabaseAdmin.from('businesses').select('user_id,created_at'),
      // Totaux plateforme : on ne compte que les enregistrements rattachés à un
      // commerce (business_id non nul) → exclut d'éventuelles lignes orphelines.
      supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }).not('business_id', 'is', null),
      supabaseAdmin.from('scans').select('id', { count: 'exact', head: true }).not('business_id', 'is', null),
      supabaseAdmin.from('feedback').select('id', { count: 'exact', head: true }).not('business_id', 'is', null),
    ])

    const firstError = bizError || avisError || scansError || feedbacksError
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 })
    }

    const bizRows = (businesses ?? []) as BizRow[]

    // Multi-commerce : "commerces" = nombre de lignes ; "comptes/patrons" =
    // nombre d'utilisateurs distincts possédant au moins un commerce.
    const commerces = bizRows.length
    const comptes = new Set(bizRows.map((b) => b.user_id).filter(Boolean)).size

    // Commerces créés par mois — 6 derniers mois.
    const now = new Date()
    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        count: 0,
      }
    })
    const idxByKey = new Map(buckets.map((b, i) => [b.key, i]))
    for (const b of bizRows) {
      if (!b.created_at) continue
      const d = new Date(b.created_at)
      if (Number.isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const i = idxByKey.get(key)
      if (i !== undefined) buckets[i].count++
    }

    return NextResponse.json({
      kpis: {
        comptes,
        commerces,
        avis: avis ?? 0,
        scans: scans ?? 0,
        feedbacks: feedbacks ?? 0,
      },
      signups: buckets,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
