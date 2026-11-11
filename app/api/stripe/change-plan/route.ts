import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { FORMULES, isFormule, stripePriceForFormule, type Formule } from '@/lib/vendeur-commerce'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Changement de formule d'un abonnement DÉJÀ actif (Essentiel ↔ Premium).
// GET  → formule actuelle (pour l'écran /subscription).
// POST { formule } → met à jour le prix de l'abonnement Stripe existant, avec
// prorata (Stripe facture/crédite la différence sur la prochaine facture), puis
// enregistre la formule sur les commerces de cet abonnement. Le webhook
// customer.subscription.updated resynchronise aussi `formule` (filet de sécurité).
// Premium → la carte de fidélité revient ; Essentiel → elle est mise en pause.

async function currentUser() {
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
          // Lecture seule.
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

type ActiveBiz = { id: string; stripe_subscription_id: string | null; formule: string | null }

async function activeBusinesses(userId: string): Promise<ActiveBiz[]> {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('id, stripe_subscription_id, formule')
    .eq('user_id', userId)
    .eq('subscription_status', 'active')
  return ((data ?? []) as ActiveBiz[]).filter((b) => b.stripe_subscription_id)
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const bizes = await activeBusinesses(user.id)
  if (bizes.length === 0) return NextResponse.json({ formule: null })
  const formule: Formule = isFormule(bizes[0].formule) ? bizes[0].formule : 'qr'
  return NextResponse.json({ formule, label: FORMULES[formule].label, prixMensuel: FORMULES[formule].prixMensuel })
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    let formule: Formule | null = null
    try {
      const body = await request.json()
      if (body && isFormule(body.formule)) formule = body.formule
    } catch {
      // corps invalide → 400 ci-dessous
    }
    if (!formule) return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 })

    const bizes = await activeBusinesses(user.id)
    if (bizes.length === 0) {
      return NextResponse.json({ error: 'Aucun abonnement actif à modifier.' }, { status: 400 })
    }

    const price = stripePriceForFormule(formule)
    if (!price) return NextResponse.json({ error: 'Prix indisponible.' }, { status: 500 })

    // Un utilisateur = un abonnement (partagé par ses commerces). On met à jour
    // chaque abonnement distinct, par sécurité.
    const subIds = [...new Set(bizes.map((b) => b.stripe_subscription_id as string))]
    for (const subId of subIds) {
      const sub = await stripe.subscriptions.retrieve(subId)
      const item = sub.items.data[0]
      if (!item) continue
      if (item.price.id !== price) {
        await stripe.subscriptions.update(subId, {
          items: [{ id: item.id, price }],
          proration_behavior: 'create_prorations',
          metadata: { ...sub.metadata, formule },
        })
      }
      await supabaseAdmin.from('businesses').update({ formule }).eq('stripe_subscription_id', subId)
    }

    return NextResponse.json({ ok: true, formule })
  } catch (error) {
    console.error('Stripe change-plan error:', error)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
