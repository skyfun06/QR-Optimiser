import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { FORMULES } from '@/lib/vendeur-commerce'

// -----------------------------------------------------------------------------
// Parrainage commerçant (un commerce recommande ScanAvis à un autre commerce).
//
// Récompense = REMISE AUTOMATIQUE : à chaque facture payée par un filleul,
// REFERRAL_RATE de son montant HT est crédité sur le solde client Stripe du
// parrain (customer balance). Stripe déduit ce crédit tout seul de la prochaine
// facture du parrain ; un surplus reste en crédit pour les suivantes.
//
// Le registre des remises EST Stripe : chaque crédit porte
// metadata.type = 'referral_credit' + l'id de la facture du filleul, ce qui
// sert à la fois d'anti-doublon et de source des statistiques côté parrain.
// Les parrains « externes » (referrers.business_id NULL, saisis à la main) ne
// sont pas concernés : leur commission reste suivie manuellement en admin.
// -----------------------------------------------------------------------------

export const REFERRAL_RATE = 0.2
/** Un commerce ne peut se rattacher à un parrain que juste après sa création. */
export const REFERRAL_ATTACH_WINDOW_MS = 48 * 60 * 60 * 1000
export const REFERRAL_CREDIT_TYPE = 'referral_credit'

/** Remise mensuelle par défaut quand le prix réel d'un filleul est inconnu. */
export const DEFAULT_MONTHLY_CREDIT_CENTS = Math.round(FORMULES.qr.prixMensuel * 100 * REFERRAL_RATE)

/**
 * Client Stripe existant d'un utilisateur (abonnement en priorité, puis carte
 * enregistrée), sans en créer.
 */
export async function findStripeCustomerForUser(userId: string): Promise<string | null> {
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle<{ stripe_customer_id: string | null }>()
  if (biz?.stripe_customer_id) return biz.stripe_customer_id

  const { data: billing } = await supabaseAdmin
    .from('user_billing')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle<{ stripe_customer_id: string | null }>()
  return billing?.stripe_customer_id ?? null
}

/**
 * Client Stripe existant d'un utilisateur ET toujours valide chez Stripe (un
 * client supprimé côté Stripe ferait échouer checkout et crédits).
 */
export async function findLiveStripeCustomerForUser(stripe: Stripe, userId: string): Promise<string | null> {
  const id = await findStripeCustomerForUser(userId)
  if (!id) return null
  try {
    const customer = await stripe.customers.retrieve(id)
    return customer.deleted ? null : id
  } catch (e) {
    if ((e as { code?: string }).code === 'resource_missing') return null
    throw e
  }
}

/**
 * Client Stripe du parrain, créé si besoin (parrain encore en essai). Il est
 * enregistré sur ses commerces : le checkout le réutilisera, donc le crédit
 * accumulé s'appliquera bien à sa première facture.
 */
async function getOrCreateStripeCustomerForUser(stripe: Stripe, userId: string): Promise<string> {
  const existing = await findLiveStripeCustomerForUser(stripe, userId)
  if (existing) return existing

  const stale = await findStripeCustomerForUser(userId)
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  const customer = await stripe.customers.create(
    { email: data.user?.email ?? undefined, metadata: { user_id: userId } },
    { idempotencyKey: `referral-customer-${userId}-${stale ?? 'new'}` }
  )
  // Remplace l'éventuel client supprimé, et complète les commerces sans client.
  for (const filter of [stale, null]) {
    const q = supabaseAdmin.from('businesses').update({ stripe_customer_id: customer.id }).eq('user_id', userId)
    await (filter ? q.eq('stripe_customer_id', filter) : q.is('stripe_customer_id', null))
  }
  await supabaseAdmin.from('user_billing').update({ stripe_customer_id: customer.id }).eq('user_id', userId)
  return customer.id
}

/** Id d'abonnement d'une facture, quelle que soit la version d'API Stripe. */
export function invoiceSubscription(invoice: Stripe.Invoice): { id: string | null; userId: string | null } {
  const inv = invoice as unknown as {
    subscription?: string | { id?: string } | null
    parent?: { subscription_details?: { subscription?: string | { id?: string } | null; metadata?: Record<string, string> | null } | null } | null
  }
  const raw = inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null
  const id = typeof raw === 'string' ? raw : raw?.id ?? null
  return { id, userId: inv.parent?.subscription_details?.metadata?.user_id ?? null }
}

type FilleulBiz = { id: string; name: string | null; user_id: string; referrer_id: string | null }

/**
 * Webhook `invoice.paid` : crédite le parrain du filleul qui vient de payer.
 * Idempotent (une facture = au plus un crédit). Ne lève que sur erreur Stripe
 * ou base, pour que le webhook renvoie 500 et que Stripe réessaie.
 */
export async function creditReferrerForInvoice(stripe: Stripe, invoice: Stripe.Invoice): Promise<string> {
  const base = invoice.total_excluding_tax ?? invoice.total ?? 0
  if (!invoice.id || base <= 0) return 'skip: facture nulle'

  // 1. Commerce(s) du filleul : métadonnées de l'abonnement (posées au
  //    checkout, fiables même si ce webhook arrive avant checkout.session.completed),
  //    puis abonnement / client Stripe déjà enregistrés.
  const sub = invoiceSubscription(invoice)
  // Seules les factures d'ABONNEMENT ouvrent droit à la remise (pas une
  // facture ponctuelle, ex. matériel vendu à part).
  if (!sub.id) return 'skip: facture hors abonnement'
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
  let filleuls: FilleulBiz[] = []
  const lookups: [string, string | null][] = [
    ['user_id', sub.userId],
    ['stripe_subscription_id', sub.id],
    ['stripe_customer_id', customerId],
  ]
  for (const [col, value] of lookups) {
    if (!value) continue
    const { data, error } = await supabaseAdmin.from('businesses').select('id,name,user_id,referrer_id').eq(col, value)
    if (error) throw error
    if (data?.length) {
      filleuls = data as FilleulBiz[]
      break
    }
  }
  const filleul = filleuls.find((b) => b.referrer_id)
  if (!filleul) return 'skip: pas de parrain'

  // 2. Parrain commerçant (les parrains externes restent en suivi manuel).
  const { data: referrer, error: refErr } = await supabaseAdmin
    .from('referrers')
    .select('id,business_id')
    .eq('id', filleul.referrer_id!)
    .maybeSingle<{ id: string; business_id: string | null }>()
  if (refErr) throw refErr
  if (!referrer?.business_id) return 'skip: parrain externe (suivi manuel)'

  const { data: parrainBiz, error: pErr } = await supabaseAdmin
    .from('businesses')
    .select('user_id')
    .eq('id', referrer.business_id)
    .maybeSingle<{ user_id: string }>()
  if (pErr) throw pErr
  if (!parrainBiz) return 'skip: commerce parrain supprimé'
  if (parrainBiz.user_id === filleul.user_id) return 'skip: auto-parrainage'

  // 3. Crédit sur le solde Stripe du parrain (anti-doublon par facture).
  const parrainCustomer = await getOrCreateStripeCustomerForUser(stripe, parrainBiz.user_id)
  const history = await stripe.customers.listBalanceTransactions(parrainCustomer, { limit: 100 })
  if (history.data.some((t) => t.metadata?.filleul_invoice_id === invoice.id)) return 'skip: déjà crédité'

  const amount = Math.round(base * REFERRAL_RATE)
  await stripe.customers.createBalanceTransaction(
    parrainCustomer,
    {
      amount: -amount, // négatif = crédit en faveur du client
      currency: invoice.currency,
      description: `Parrainage : ${Math.round(REFERRAL_RATE * 100)} % de l'abonnement de ${filleul.name?.trim() || 'votre filleul'}`,
      metadata: {
        type: REFERRAL_CREDIT_TYPE,
        referrer_id: referrer.id,
        filleul_business_id: filleul.id,
        filleul_invoice_id: invoice.id,
      },
    },
    { idempotencyKey: `referral-credit-${invoice.id}` }
  )
  return `crédit ${amount} ${invoice.currency} → ${parrainCustomer}`
}

export type ReferralStats = {
  code: string | null
  filleuls: { name: string; status: string; since: string | null }[]
  activeCount: number
  /** Remise mensuelle estimée (centimes) d'après les filleuls payants. */
  monthlyCreditCents: number
  /** Total déjà crédité par parrainage (centimes). */
  totalCreditedCents: number
  /** Crédit crédité ce mois-ci (centimes). */
  creditedThisMonthCents: number
  /** Crédit encore disponible sur le compte, tous motifs confondus (centimes). */
  availableCreditCents: number
}

/** Statistiques de parrainage d'un commerce (appelant déjà vérifié propriétaire). */
export async function getReferralStats(stripe: Stripe, businessId: string, ownerUserId: string): Promise<ReferralStats> {
  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('id,code')
    .eq('business_id', businessId)
    .maybeSingle<{ id: string; code: string | null }>()

  const empty: ReferralStats = {
    code: referrer?.code ?? null,
    filleuls: [],
    activeCount: 0,
    monthlyCreditCents: 0,
    totalCreditedCents: 0,
    creditedThisMonthCents: 0,
    availableCreditCents: 0,
  }
  if (!referrer) return empty

  const { data: rows } = await supabaseAdmin
    .from('businesses')
    .select('id,name,subscription_status,created_at,stripe_subscription_id')
    .eq('referrer_id', referrer.id)
    .order('created_at', { ascending: false })
  const filleulRows = (rows ?? []) as {
    id: string
    name: string | null
    subscription_status: string | null
    created_at: string | null
    stripe_subscription_id: string | null
  }[]

  // Remise mensuelle : prix réel de l'abonnement de chaque filleul payant.
  const active = filleulRows.filter((f) => f.subscription_status === 'active')
  const perFilleul = await Promise.all(
    active.map(async (f) => {
      if (!f.stripe_subscription_id) return DEFAULT_MONTHLY_CREDIT_CENTS
      try {
        const s = await stripe.subscriptions.retrieve(f.stripe_subscription_id)
        const unit = s.items.data[0]?.price?.unit_amount
        return unit ? Math.round(unit * REFERRAL_RATE) : DEFAULT_MONTHLY_CREDIT_CENTS
      } catch {
        return DEFAULT_MONTHLY_CREDIT_CENTS
      }
    })
  )

  // Crédits déjà versés : historique du solde client Stripe du parrain.
  let totalCreditedCents = 0
  let creditedThisMonthCents = 0
  let availableCreditCents = 0
  const customerId = await findStripeCustomerForUser(ownerUserId)
  if (customerId) {
    try {
      const monthStart = new Date()
      monthStart.setUTCDate(1)
      monthStart.setUTCHours(0, 0, 0, 0)
      for await (const t of stripe.customers.listBalanceTransactions(customerId, { limit: 100 })) {
        if (t.metadata?.type !== REFERRAL_CREDIT_TYPE) continue
        totalCreditedCents += -t.amount
        if (t.created * 1000 >= monthStart.getTime()) creditedThisMonthCents += -t.amount
      }
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted) availableCreditCents = Math.max(0, -(customer.balance ?? 0))
    } catch (e) {
      console.error('referral stats: lecture Stripe impossible:', e)
    }
  }

  return {
    code: referrer.code,
    filleuls: filleulRows.map((f) => ({
      name: f.name?.trim() || 'Commerce',
      status: f.subscription_status ?? 'trial',
      since: f.created_at,
    })),
    activeCount: active.length,
    monthlyCreditCents: perFilleul.reduce((a, b) => a + b, 0),
    totalCreditedCents,
    creditedThisMonthCents,
    availableCreditCents,
  }
}
