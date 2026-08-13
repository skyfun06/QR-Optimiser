import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Confirme une capture de carte (Checkout mode `setup`) et enregistre l'état
 * "carte vérifiée" pour l'utilisateur. Idempotent : upsert sur user_billing.
 * Aucun prélèvement — c'est juste l'enregistrement d'un moyen de paiement.
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json().catch(() => ({}))
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id manquant' }, { status: 400 })
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.status !== 'complete') {
      return NextResponse.json({ error: 'Vérification de la carte non confirmée' }, { status: 400 })
    }
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 403 })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : null
    const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : null

    const { error: upsertError } = await supabaseAdmin
      .from('user_billing')
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_setup_intent_id: setupIntentId,
          card_verified_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Stripe setup-activate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
