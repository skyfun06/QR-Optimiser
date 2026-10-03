import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { FORMULES, isFormule, type Formule } from '@/lib/vendeur-commerce'

export const dynamic = 'force-dynamic'

// Expose au patron la formule RÉELLE à payer (la table `ventes` est en RLS côté
// vendeur : le patron ne peut pas la lire lui-même). On renvoie de quoi afficher
// exactement ce que Stripe facturera, pour une page /subscription « d'actualité ».
//
//  - pending : un commerce inscrit par un vendeur attend le paiement → on renvoie
//    sa formule (QR 35 € / QR+NFC 40 €) et le nom du commerce.
//  - active  : le patron a déjà un abonnement actif (sans commerce en attente).
//  - generic : parcours commerçant standard (ex. essai expiré) → offre de base.

type PlanResponse =
  | { kind: 'pending'; businessName: string | null; formule: Formule; label: string; prixMensuel: number; includesNfc: boolean }
  | { kind: 'generic'; formule: Formule; label: string; prixMensuel: number; includesNfc: boolean }
  | { kind: 'active' }

function formulePayload(formule: Formule) {
  const f = FORMULES[formule]
  return { formule, label: f.label, prixMensuel: f.prixMensuel, includesNfc: formule === 'qr_nfc' }
}

export async function GET() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { data: bizList } = await supabaseAdmin
    .from('businesses')
    .select('id,name,subscription_status')
    .eq('user_id', user.id)
  const businesses = (bizList ?? []) as { id: string; name: string | null; subscription_status: string | null }[]

  const pending = businesses.find((b) => b.subscription_status === 'pending_payment')

  if (pending) {
    const { data: vente } = await supabaseAdmin
      .from('ventes')
      .select('formule')
      .eq('business_id', pending.id)
      .maybeSingle<{ formule: string }>()
    const formule: Formule = vente && isFormule(vente.formule) ? vente.formule : 'qr'
    const payload: PlanResponse = { kind: 'pending', businessName: pending.name, ...formulePayload(formule) }
    return NextResponse.json(payload)
  }

  if (businesses.some((b) => b.subscription_status === 'active')) {
    return NextResponse.json({ kind: 'active' } satisfies PlanResponse)
  }

  // Offre de base pour le parcours commerçant standard.
  return NextResponse.json({ kind: 'generic', ...formulePayload('qr') } satisfies PlanResponse)
}
