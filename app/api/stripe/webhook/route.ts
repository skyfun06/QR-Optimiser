import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/security'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role pour bypass RLS
)

// Destinataire des alertes (même compte que le reste du backoffice admin).
const ADMIN_EMAIL = 'lborrelli248@gmail.com'
// Expéditeur isolé (cf. autres routes email) — domaine à vérifier sur Resend.
const EMAIL_FROM_ADDRESS = 'ScanAvis <contact@qrscanavis.fr>'

// Statuts Stripe considérés comme problématiques → alerte admin.
const STRIPE_ALERT_STATUSES = new Set(['past_due', 'unpaid', 'canceled'])

// Resend instancié paresseusement (ne casse pas le build si la clé manque).
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

type BizRef = { id: string; name: string | null }

/** Retrouve le commerce concerné via l'abonnement puis, à défaut, le customer. */
async function findBusiness(subscriptionId?: string | null, customerId?: string | null): Promise<BizRef | null> {
  if (subscriptionId) {
    const { data } = await supabase
      .from('businesses')
      .select('id,name')
      .eq('stripe_subscription_id', subscriptionId)
      .limit(1)
    if (data && data.length > 0) return data[0] as BizRef
  }
  if (customerId) {
    const { data } = await supabase
      .from('businesses')
      .select('id,name')
      .eq('stripe_customer_id', customerId)
      .limit(1)
    if (data && data.length > 0) return data[0] as BizRef
  }
  return null
}

/** Alerte email à l'admin. Best-effort : n'interrompt jamais le webhook. */
async function sendAdminAlert(subject: string, business: BizRef | null, reason: string) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const safeName = escapeHtml(business?.name?.trim() || 'Commerce inconnu')
    const safeReason = escapeHtml(reason)
    const resend = getResend()
    await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0d0d0d; color: white; border-radius: 12px;">
          <h1 style="color: #C9973A; font-size: 24px; margin-bottom: 8px;">ScanAvis</h1>
          <p style="color: #8c8c8c; margin-bottom: 32px;">Alerte facturation</p>

          <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Commerce</p>
            <p style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 0;">${safeName}</p>
          </div>

          <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Détail</p>
            <p style="color: white; font-size: 16px; line-height: 1.6; margin-bottom: 0;">${safeReason}</p>
          </div>

          <a href="${appUrl}/admin/clients"
             style="display: inline-block; background: #C9973A; color: #12100e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Ouvrir le backoffice →
          </a>

          <p style="color: #5c5c5c; font-size: 12px; margin-top: 32px;">
            Aucune action automatique n'a été prise (pas de suspension). À traiter manuellement.
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[webhook] admin alert email failed:', e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text() // ⚠️ text() pas json() — Stripe vérifie la signature sur le raw body
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // --- Idempotence : on enregistre event.id AVANT tout traitement. Si Stripe
  //     rejoue le même événement (fréquent), l'insert échoue en doublon (23505)
  //     et on renvoie 200 sans retraiter.
  const { error: dedupError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, type: event.type })
  if (dedupError) {
    if (dedupError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Erreur non-doublon : on log mais on continue (mieux vaut traiter que
    // perdre l'événement ; le dédup reste best-effort).
    console.error('[webhook] event store insert failed:', dedupError)
  }

  // Le traitement est encadré : si une exception survient APRÈS l'insert du
  // marqueur d'idempotence, on retire ce marqueur pour que la re-livraison
  // Stripe (déclenchée par le 500) puisse retraiter l'événement — sinon il
  // serait perdu (dédupliqué alors qu'il n'a jamais été traité).
  try {
    // --- checkout.session.completed : UNIQUEMENT les sessions d'abonnement.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Une session mode 'setup' (capture de carte, sans facturation) émet aussi
      // cet événement : on ne la traite PAS comme une activation d'abonnement.
      if (session.mode !== 'subscription') {
        console.log(`[webhook] checkout.session.completed ignoré (mode=${session.mode})`)
        return NextResponse.json({ received: true, skipped: 'non-subscription' })
      }

      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const userId = session.metadata?.user_id

      if (userId) {
        await supabase
          .from('businesses')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            subscription_plan: 'paid', // aligné sur /api/stripe/activate (était 'pro')
          })
          .eq('user_id', userId)
      }
    }

    // --- Fin d'abonnement (résiliation arrivée à échéance) → accès coupé.
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('businesses')
        .update({ subscription_status: 'expired', stripe_subscription_status: sub.status })
        .eq('stripe_subscription_id', sub.id)
    }

    // --- Échec de paiement : on note la date + alerte admin. On NE touche JAMAIS
    //     à subscription_status (pas de coupure auto).
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
      // Le champ subscription de l'invoice varie selon la version d'API Stripe :
      // on le lit de façon défensive, sans dépendre du typage (peut être absent).
      const invoiceAny = invoice as unknown as { subscription?: string | { id?: string } | null }
      const subscriptionId =
        typeof invoiceAny.subscription === 'string'
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id ?? null

      const business = await findBusiness(subscriptionId, customerId)
      if (business) {
        await supabase
          .from('businesses')
          .update({ last_payment_failed_at: new Date().toISOString() })
          .eq('id', business.id)
      }
      await sendAdminAlert(
        `⚠️ Échec de paiement — ${business?.name?.trim() || 'Commerce'}`,
        business,
        "Un paiement Stripe a échoué (invoice.payment_failed). L'accès n'a pas été modifié automatiquement."
      )
    }

    // --- Mise à jour d'abonnement : on reflète le statut Stripe BRUT (informatif)
    //     et on alerte si le statut est problématique. subscription_status intact.
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : null

      const business = await findBusiness(sub.id, customerId)
      if (business) {
        await supabase
          .from('businesses')
          .update({ stripe_subscription_status: sub.status })
          .eq('id', business.id)
      }

      if (STRIPE_ALERT_STATUSES.has(sub.status)) {
        await sendAdminAlert(
          `⚠️ Abonnement ${sub.status} — ${business?.name?.trim() || 'Commerce'}`,
          business,
          `Statut Stripe passé à « ${sub.status} ». L'accès n'a pas été modifié automatiquement.`
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] traitement échoué, retrait du marqueur d\'idempotence:', err)
    // Best-effort : on retire le marqueur pour permettre le retraitement.
    await supabase.from('stripe_webhook_events').delete().eq('event_id', event.id)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
