import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isFormule, stripePriceForFormule } from '@/lib/vendeur-commerce'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(_request: NextRequest) {
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

    // Commerces du user (un user peut en avoir plusieurs). On priorise un
    // commerce "en attente de paiement" (inscrit par un vendeur) ; sinon on
    // suit le parcours commerçant standard.
    const { data: bizList } = await supabaseAdmin
      .from('businesses')
      .select('id,subscription_status')
      .eq('user_id', user.id)
    const businesses = (bizList ?? []) as { id: string; subscription_status: string | null }[]

    const pending = businesses.find((b) => b.subscription_status === 'pending_payment')

    // Pas de commerce à finaliser + un abonnement déjà actif → on évite un 2e abonnement.
    if (!pending && businesses.some((b) => b.subscription_status === 'active')) {
      return NextResponse.json(
        { error: 'Vous avez déjà un abonnement actif.' },
        { status: 409 }
      )
    }

    // Prix + métadonnées selon le cas.
    let price = process.env.STRIPE_PRICE_ID!
    const metadata: Record<string, string> = { user_id: user.id }
    let successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`

    if (pending) {
      metadata.business_id = pending.id
      // Le webhook activera CE commerce précis + déclenchera la commission.
      successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`
      const { data: vente } = await supabaseAdmin
        .from('ventes')
        .select('formule')
        .eq('business_id', pending.id)
        .maybeSingle<{ formule: string }>()
      if (vente && isFormule(vente.formule)) {
        price = stripePriceForFormule(vente.formule) ?? price
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?cancelled=true`,
      metadata,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
