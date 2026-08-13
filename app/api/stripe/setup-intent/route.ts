import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Crée une session Stripe Checkout en mode `setup` : capture d'un moyen de
 * paiement SANS aucune facturation (contrairement à /api/stripe/checkout qui,
 * lui, crée un vrai abonnement `subscription`). Sert de garde à l'entrée : une
 * carte doit être enregistrée avant de pouvoir créer un premier commerce.
 *
 * Si l'utilisateur a déjà une carte vérifiée (ligne user_billing), on ne
 * recrée pas de session : { alreadyVerified: true }.
 */
export async function POST() {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    // Déjà vérifié ? On évite de recréer une session inutile.
    const { data: existing } = await supabaseAdmin
      .from('user_billing')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle<{ user_id: string }>()

    if (existing) {
      return NextResponse.json({ alreadyVerified: true })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer_email: user.email,
      success_url: `${appUrl}/payment-setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment-setup?cancelled=true`,
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe setup-intent error:', error)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
