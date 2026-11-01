import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { invoiceSubscription } from '@/lib/referral'
import { PALIERS_COMMISSION, isFormule, montantCommission } from '@/lib/vendeur-commerce'

// Déclenchement des commissions d'une vente au 1er paiement du commerce.
// Partagé entre le webhook Stripe (paiement réel) et l'acceptation d'une
// réclamation par l'admin quand le commerce est déjà abonné.
//
// La vente passe en "abonné" (date du 1er paiement) et les trois parts sont
// créées : part 1 (1er mois) devient "à verser", parts 2 (3e mois) et 3 (6e mois)
// restent "en attente". Idempotent : ne rejoue rien si la vente est déjà
// déclenchée. Les commissions sont écrites AVANT de marquer la vente : en cas
// d'échec, l'erreur remonte et le réessai de Stripe peut tout refaire.
export async function declencherCommissionSiVente(admin: SupabaseClient, businessId: string) {
  const { data: vente } = await admin
    .from('ventes')
    .select('id,formule,date_premier_paiement')
    .eq('business_id', businessId)
    .maybeSingle<{ id: string; formule: string; date_premier_paiement: string | null }>()

  if (!vente || vente.date_premier_paiement) return // pas de vente, ou déjà déclenchée
  const { formule } = vente
  if (!isFormule(formule)) return

  const now = new Date().toISOString()

  // upsert idempotent (unique (vente_id, part)).
  const { error: commissionsErr } = await admin.from('commissions').upsert(
    PALIERS_COMMISSION.map(({ part }) => ({
      vente_id: vente.id,
      part,
      montant: montantCommission(formule, part),
      statut: part === 1 ? 'a_payer' : 'en_attente',
      date_passage_a_payer: part === 1 ? now : null,
    })),
    { onConflict: 'vente_id,part', ignoreDuplicates: true }
  )
  if (commissionsErr) throw commissionsErr

  const { error: venteErr } = await admin
    .from('ventes')
    .update({ date_premier_paiement: now, statut_commerce: 'abonne' })
    .eq('id', vente.id)
  if (venteErr) throw venteErr
}

/**
 * Mois d'abonnement réellement payés : factures de création et de renouvellement
 * (pas les proratas d'un changement de formule). `total` et non `amount_paid` :
 * un mois réglé par un crédit de parrainage compte aussi.
 */
export async function compterMoisPayes(stripe: Stripe, subscriptionId: string): Promise<number> {
  let mois = 0
  for await (const facture of stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 100 })) {
    const abonnement = facture.billing_reason === 'subscription_create' || facture.billing_reason === 'subscription_cycle'
    if (abonnement && (facture.total ?? 0) > 0) mois++
  }
  return mois
}

/**
 * Webhook `invoice.paid` : fait passer "à verser" les paliers atteints (recompte
 * les mois chez Stripe, donc idempotent et sans risque en cas d'événement rejoué).
 * Ne lève que sur erreur Stripe ou base, pour que Stripe réessaie.
 */
export async function debloquerCommissionsPourFacture(
  admin: SupabaseClient,
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<string> {
  const reason = invoice.billing_reason
  if (reason !== 'subscription_create' && reason !== 'subscription_cycle') return 'skip: facture hors renouvellement'
  const subscriptionId = invoiceSubscription(invoice).id
  if (!subscriptionId) return 'skip: facture hors abonnement'

  const { data: bizes, error: bizErr } = await admin
    .from('businesses')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
  if (bizErr) throw bizErr
  const businessIds = ((bizes ?? []) as { id: string }[]).map((b) => b.id)
  if (businessIds.length === 0) return 'skip: commerce inconnu'

  // Seules les ventes déjà déclenchées avancent : la toute première facture est
  // traitée par checkout.session.completed, qui aligne d'abord la formule.
  const { data: ventes, error: venteErr } = await admin
    .from('ventes')
    .select('id')
    .in('business_id', businessIds)
    .not('date_premier_paiement', 'is', null)
  if (venteErr) throw venteErr
  const venteIds = ((ventes ?? []) as { id: string }[]).map((v) => v.id)
  if (venteIds.length === 0) return 'skip: pas de vente'

  const mois = await compterMoisPayes(stripe, subscriptionId)
  const parts = PALIERS_COMMISSION.filter((p) => mois >= p.mois).map((p) => p.part)
  if (parts.length === 0) return `skip: ${mois} mois payé(s)`

  const { error: partsErr } = await admin
    .from('commissions')
    .update({ statut: 'a_payer', date_passage_a_payer: new Date().toISOString() })
    .in('vente_id', venteIds)
    .in('part', parts)
    .eq('statut', 'en_attente')
  if (partsErr) throw partsErr

  // Un commerce qui paie est abonné, y compris s'il revient après une résiliation.
  const { error: statutErr } = await admin.from('ventes').update({ statut_commerce: 'abonne' }).in('id', venteIds)
  if (statutErr) throw statutErr

  return `${mois} mois payé(s), parts ${parts.join(',')} acquises`
}

/** Fin d'abonnement : la vente passe "résiliée", les paliers non atteints sont perdus. */
export async function marquerVentesResiliees(admin: SupabaseClient, subscriptionId: string) {
  const { data: bizes, error: bizErr } = await admin
    .from('businesses')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
  if (bizErr) throw bizErr
  const businessIds = ((bizes ?? []) as { id: string }[]).map((b) => b.id)
  if (businessIds.length === 0) return
  const { error } = await admin.from('ventes').update({ statut_commerce: 'resilie' }).in('business_id', businessIds)
  if (error) throw error
}
