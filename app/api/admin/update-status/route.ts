import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'
const ALLOWED_EXTEND_DAYS = new Set([7, 15, 30])

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

type BusinessBilling = {
  subscription_status: string | null
  trial_ends_at: string | null
}

/**
 * Actions d'administration sur l'accès d'un commerce. Réservées à l'admin,
 * exécutées via la service role (le trigger anti-triche laisse passer ce rôle).
 *
 *   - extend      : prolonge l'essai de +7 / +15 / +30 jours (repasse en 'trial')
 *   - suspend     : coupe l'accès immédiatement ('suspended')
 *   - reactivate  : rétablit l'accès ('trial' si l'essai court encore, sinon 'active')
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => null)
    const businessId = typeof body?.businessId === 'string' ? body.businessId : null
    const action = typeof body?.action === 'string' ? body.action : null

    if (!businessId || !action) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const { data: business, error: readError } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, trial_ends_at')
      .eq('id', businessId)
      .maybeSingle<BusinessBilling>()

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }
    if (!business) {
      return NextResponse.json({ error: 'Commerce introuvable.' }, { status: 404 })
    }

    const now = Date.now()
    let update: { subscription_status: string; trial_ends_at?: string }

    if (action === 'extend') {
      const days = typeof body?.days === 'number' ? body.days : null
      if (!days || !ALLOWED_EXTEND_DAYS.has(days)) {
        return NextResponse.json({ error: 'Durée de prolongation invalide.' }, { status: 400 })
      }
      // On prolonge à partir de la date de fin si elle est dans le futur,
      // sinon à partir de maintenant (essai déjà dépassé qu'on relance).
      const currentEnd = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : 0
      const base = currentEnd > now ? currentEnd : now
      const newEnd = new Date(base + days * 86_400_000).toISOString()
      update = { subscription_status: 'trial', trial_ends_at: newEnd }
    } else if (action === 'suspend') {
      update = { subscription_status: 'suspended' }
    } else if (action === 'reactivate') {
      const currentEnd = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : 0
      const stillInTrial = currentEnd > now
      update = { subscription_status: stillInTrial ? 'trial' : 'active' }
    } else {
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update(update)
      .eq('id', businessId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...update })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
