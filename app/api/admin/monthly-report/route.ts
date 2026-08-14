import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateMonthlyReport } from '@/lib/monthly-report'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

/**
 * Génère manuellement (via IA) le bilan mensuel d'un commerce. Réservé à l'admin.
 * Body : { businessId, monthOffset?, force? } — force réécrit un bilan existant.
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => null)
    const businessId = typeof body?.businessId === 'string' ? body.businessId : null
    const monthOffset = typeof body?.monthOffset === 'number' ? body.monthOffset : 1
    const force = body?.force !== false // par défaut on (re)génère

    if (!businessId || !UUID_RE.test(businessId)) {
      return NextResponse.json({ error: 'businessId invalide.' }, { status: 400 })
    }

    // Le commerce doit exister.
    const { data: business, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id,name')
      .eq('id', businessId)
      .maybeSingle<{ id: string; name: string | null }>()
    if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 })
    if (!business) return NextResponse.json({ error: 'Commerce introuvable.' }, { status: 404 })

    const result = await generateMonthlyReport(supabaseAdmin, business.id, { monthOffset, force })

    return NextResponse.json({
      businessName: business.name?.trim() || 'Commerce sans nom',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    // Cas fréquent : clé IA absente → message explicite pour l'admin.
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: "Clé IA manquante : ajoutez ANTHROPIC_API_KEY dans les variables d'environnement pour générer les bilans." },
        { status: 503 }
      )
    }
    console.error('[admin/monthly-report] error', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
