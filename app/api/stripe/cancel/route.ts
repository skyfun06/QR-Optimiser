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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle<{ stripe_subscription_id: string | null }>()

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 })
    }

    const subscriptionId = business?.stripe_subscription_id
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe trouvé.' }, { status: 400 })
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({ subscription_status: 'canceling' })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stripe cancel error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
