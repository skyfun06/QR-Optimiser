import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getReferralStats } from '@/lib/referral'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Statistiques de parrainage d'un commerce pour la page Parrainage : filleuls
 * (nom + statut), remise mensuelle, crédits déjà déduits. Lecture service role
 * (le commerçant ne peut pas lire les commerces de ses filleuls via RLS), donc
 * on vérifie d'abord que le commerce appartient bien à l'utilisateur connecté.
 */
export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: 'Commerce invalide' }, { status: 400 })
  }

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
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()
  if (!biz) return NextResponse.json({ error: 'Commerce introuvable' }, { status: 404 })

  try {
    return NextResponse.json(await getReferralStats(stripe, businessId, user.id))
  } catch (error) {
    console.error('referral stats error:', error)
    return NextResponse.json({ error: 'Statistiques indisponibles' }, { status: 500 })
  }
}
