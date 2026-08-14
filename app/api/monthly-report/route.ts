import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getStoredMonthlyReport } from '@/lib/monthly-report'

export const dynamic = 'force-dynamic'

// Service role : lecture du bilan stocké (bypass RLS).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Lecture SEULE du bilan mensuel d'un commerce du commerçant connecté.
 * La génération (appel IA) est déclenchée uniquement par l'admin via
 * /api/admin/monthly-report — le commerçant ne fait que consulter.
 */
export async function GET(req: NextRequest) {
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) return NextResponse.json({ error: userError.message }, { status: 401 })
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    // Le businessId est passé par le dashboard (support multi-commerce). On vérifie
    // qu'il appartient bien au user avant de lire son bilan.
    const businessId = req.nextUrl.searchParams.get('businessId')
    let targetBusinessId: string | null = null

    if (businessId) {
      const { data: owned } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('user_id', user.id)
        .maybeSingle<{ id: string }>()
      targetBusinessId = owned?.id ?? null
    } else {
      // Rétrocompat : à défaut, on prend le 1er commerce du user.
      const { data: first } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
      targetBusinessId = first?.[0]?.id ?? null
    }

    if (!targetBusinessId) return NextResponse.json({ content: null })

    const report = await getStoredMonthlyReport(supabaseAdmin, targetBusinessId)
    return NextResponse.json(report)
  } catch (err) {
    console.error('[monthly-report] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
