import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json()

    if (!session_id) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
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
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 400 })
    }

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 403 })
    }

    const subscriptionFields = {
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      subscription_plan: 'paid',
    }

    const { data: updated } = await supabaseAdmin
      .from('businesses')
      .update(subscriptionFields)
      .eq('user_id', user.id)
      .select('id')

    if (!updated || updated.length === 0) {
      await supabaseAdmin
        .from('businesses')
        .insert({ user_id: user.id, ...subscriptionFields })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Activate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
