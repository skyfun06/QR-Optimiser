/**
 * TEST DE BOUT EN BOUT — parrainage commerçant (filleuls).
 *
 * Passe par le VRAI serveur Next (routes /api/referral/*) et la vraie base
 * Supabase, avec des comptes jetables supprimés à la fin (même en cas d'échec).
 *
 * Prérequis : serveur de dev lancé (npm run dev) sur BASE_URL.
 *   node --import ./scripts/loy-test/preload.mjs scripts/referral-test/e2e.ts
 */
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RUN = Date.now().toString(36)
const PASSWORD = `E2e-${RUN}-pw!`

type Session = { userId: string; email: string; client: SupabaseClient; cookie: string }

const createdUsers: string[] = []
const createdCustomers: string[] = []
const webhookEventIds: string[] = []
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Crée un compte confirmé + « carte vérifiée », puis ouvre une session SSR (cookies réels). */
async function newMerchant(tag: string): Promise<Session> {
  const email = `e2e-ref-${tag}-${RUN}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`)
  createdUsers.push(data.user.id)
  // Le trigger d'insertion de commerce exige une carte vérifiée (migration 0007).
  const { error: billErr } = await admin.from('user_billing').upsert({ user_id: data.user.id })
  if (billErr) throw new Error(`user_billing ${tag}: ${billErr.message}`)

  const jar = new Map<string, string>()
  const client = createServerClient(SUPA_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  }) as unknown as SupabaseClient
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signErr) throw new Error(`signIn ${tag}: ${signErr.message}`)
  const cookie = [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ')
  return { userId: data.user.id, email, client, cookie }
}

/** Insère un commerce comme le fait le navigateur (RLS + trigger anti-triche). */
async function newBusiness(s: Session, name: string) {
  const { data, error } = await s.client.from('businesses').insert({ name, user_id: s.userId }).select('id').single()
  if (error) throw new Error(`insert business ${name}: ${error.message}`)
  return data.id as string
}

async function post(path: string, s: Session, extraCookie = '', body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: [s.cookie, extraCookie].filter(Boolean).join('; ') },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, setCookie: res.headers.get('set-cookie') ?? '', json: await res.json().catch(() => null) }
}

async function referrerIdOf(businessId: string) {
  const { data } = await admin.from('businesses').select('referrer_id').eq('id', businessId).single()
  return (data?.referrer_id ?? null) as string | null
}

async function main() {
  console.log(`E2E parrainage — serveur ${BASE_URL} — run ${RUN}\n`)

  // ── 1. Le parrain s'inscrit : son commerce reçoit un code ───────────────
  console.log('1. Parrain : création du commerce + génération du code')
  const parrain = await newMerchant('parrain')
  const parrainBiz = await newBusiness(parrain, `E2E Parrain ${RUN}`)
  await post('/api/referral/self', parrain)
  // Même requête que la page Parrainage (session du parrain, RLS referrers_select_own).
  const { data: own } = await parrain.client.from('referrers').select('id,code').eq('business_id', parrainBiz).maybeSingle()
  check('le parrain lit son code depuis son espace (RLS)', !!own?.code, own?.code ?? 'aucun code')
  const code = own!.code as string
  const parrainReferrerId = own!.id as string

  // ── 2. Le lien de parrainage s'ouvre ────────────────────────────────────
  console.log('2. Lien de parrainage')
  const page = await fetch(`${BASE_URL}/activation?ref=${code}`)
  check('/activation?ref=CODE répond', page.ok, `HTTP ${page.status}`)

  // ── 3. Le filleul s'inscrit avec le cookie déposé par /activation ───────
  console.log('3. Filleul : onboarding avec le code en cookie')
  const filleul = await newMerchant('filleul')
  const filleulBiz = await newBusiness(filleul, `E2E Filleul ${RUN}`)
  const attach = await post('/api/referral/attach', filleul, `scanavis_ref=${code}`, { businessId: filleulBiz })
  check('/api/referral/attach répond 200', attach.status === 200, `HTTP ${attach.status}`)
  check('le cookie scanavis_ref est purgé', /scanavis_ref=;/.test(attach.setCookie))
  check('le filleul est rattaché au parrain', (await referrerIdOf(filleulBiz)) === parrainReferrerId)
  await post('/api/referral/self', filleul)

  // ── 4. Garde-fous ───────────────────────────────────────────────────────
  console.log('4. Garde-fous')
  const { error: tamper } = await filleul.client.from('businesses').update({ referrer_id: null }).eq('id', filleulBiz)
  check('le filleul ne peut pas modifier son parrain lui-même', !!tamper, tamper?.message ?? 'modification acceptée !')

  const autre = await newMerchant('autre')
  const autreBiz = await newBusiness(autre, `E2E Autre ${RUN}`)
  await post('/api/referral/self', autre)
  const { data: autreRef } = await admin.from('referrers').select('code').eq('business_id', autreBiz).single()
  await post('/api/referral/attach', filleul, `scanavis_ref=${autreRef!.code}`, { businessId: filleulBiz })
  check('un 2e code n\'écrase pas le parrain existant', (await referrerIdOf(filleulBiz)) === parrainReferrerId)

  await post('/api/referral/attach', autre, 'scanavis_ref=ZZZZZZ', { businessId: autreBiz })
  check('un code inconnu ne rattache rien', (await referrerIdOf(autreBiz)) === null)

  // Auto-parrainage : le parrain rejoue l'attach avec SON propre code.
  await post('/api/referral/attach', parrain, `scanavis_ref=${code}`, { businessId: parrainBiz })
  check('auto-parrainage refusé (propre code)', (await referrerIdOf(parrainBiz)) === null)

  // Rattachement tardif : un commerce ancien ne doit plus pouvoir se rattacher.
  await admin.from('businesses').update({ created_at: new Date(Date.now() - 3 * 864e5).toISOString() }).eq('id', autreBiz)
  await post('/api/referral/attach', autre, `scanavis_ref=${code}`, { businessId: autreBiz })
  check('rattachement refusé pour un commerce créé il y a plusieurs jours', (await referrerIdOf(autreBiz)) === null)

  // ── 5. Statistiques parrain (page Parrainage) ───────────────────────────
  console.log('5. Statistiques visibles par le parrain')
  const statsRes = await fetch(`${BASE_URL}/api/referral/stats?businessId=${parrainBiz}`, { headers: { Cookie: parrain.cookie } })
  const stats = await statsRes.json().catch(() => null)
  check('/api/referral/stats répond 200', statsRes.status === 200, `HTTP ${statsRes.status}`)
  check('le filleul apparaît (en essai)', stats?.filleuls?.length === 1 && stats.filleuls[0].status === 'trial', JSON.stringify(stats?.filleuls))
  const foreign = await fetch(`${BASE_URL}/api/referral/stats?businessId=${parrainBiz}`, { headers: { Cookie: filleul.cookie } })
  check('un autre compte ne peut pas lire ces statistiques', foreign.status === 403 || foreign.status === 404, `HTTP ${foreign.status}`)

  // ── 6. Résolution du code sur /activation ───────────────────────────────
  console.log('6. Reconnaissance du code commerçant sur /activation')
  const resolved = await (await fetch(`${BASE_URL}/api/referral/resolve?code=${code}`)).json().catch(() => null)
  check('le code commerçant est reconnu', resolved?.found === true && resolved?.kind === 'commerce', JSON.stringify(resolved))

  // ── 7. Remise automatique (Stripe TEST uniquement) ──────────────────────
  console.log('7. Remise automatique sur la facture du parrain (Stripe test)')
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    console.log('  ⏭  ignoré : clé Stripe non-test')
    return
  }
  // Le filleul s'abonne (vrai abonnement de test, payé immédiatement), avec les
  // métadonnées que pose désormais le checkout.
  const fCustomer = await stripe.customers.create({
    email: filleul.email,
    payment_method: 'pm_card_visa',
    invoice_settings: { default_payment_method: 'pm_card_visa' },
  })
  createdCustomers.push(fCustomer.id)
  const sub = await stripe.subscriptions.create({
    customer: fCustomer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID! }],
    metadata: { user_id: filleul.userId },
  })
  await admin.from('businesses').update({ subscription_status: 'active' }).eq('id', filleulBiz)
  const invoice = await stripe.invoices.retrieve(sub.latest_invoice as string)
  check('facture du filleul payée', invoice.status === 'paid', `${invoice.status}, ${invoice.total_excluding_tax} ${invoice.currency}`)

  async function sendInvoicePaid(inv: Stripe.Invoice = invoice) {
    const evtId = `evt_e2e_${RUN}_${webhookEventIds.length}`
    webhookEventIds.push(evtId)
    const payload = JSON.stringify({ id: evtId, object: 'event', type: 'invoice.paid', data: { object: inv } })
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    } as Parameters<typeof stripe.webhooks.generateTestHeaderString>[0])
    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'stripe-signature': header, 'Content-Type': 'application/json' },
      body: payload,
    })
    return res.status
  }
  check('webhook invoice.paid accepté', (await sendInvoicePaid()) === 200)

  const { data: pBiz } = await admin.from('businesses').select('stripe_customer_id').eq('id', parrainBiz).single()
  const pCustomer = (pBiz?.stripe_customer_id ?? null) as string | null
  if (pCustomer) createdCustomers.push(pCustomer)
  check('un client Stripe a été créé pour le parrain (encore en essai)', !!pCustomer, pCustomer ?? '')
  const expected = Math.round((invoice.total_excluding_tax ?? 0) * 0.2)
  const balanceOf = async () => (pCustomer ? ((await stripe.customers.retrieve(pCustomer)) as Stripe.Customer).balance : 0)
  const balance1 = await balanceOf()
  check('crédit de 20 % sur le solde du parrain', balance1 === -expected, `solde ${balance1}, attendu ${-expected}`)

  check('re-livraison de la même facture acceptée', (await sendInvoicePaid()) === 200)
  const balance2 = await balanceOf()
  check('pas de double crédit pour la même facture', balance2 === balance1, `solde ${balance2}`)

  const stats2 = await (await fetch(`${BASE_URL}/api/referral/stats?businessId=${parrainBiz}`, { headers: { Cookie: parrain.cookie } })).json()
  check('le parrain voit son filleul abonné', stats2.activeCount === 1 && stats2.filleuls[0].status === 'active')
  check(
    'le parrain voit la remise déduite',
    stats2.totalCreditedCents === expected && stats2.availableCreditCents === expected,
    JSON.stringify({ total: stats2.totalCreditedCents, dispo: stats2.availableCreditCents, mois: stats2.monthlyCreditCents })
  )

  // Le checkout du parrain doit réutiliser SON client (sinon le crédit serait perdu).
  const co = await post('/api/stripe/checkout', parrain, '', { formule: 'qr' })
  const sessionId = (co.json?.url as string | undefined)?.match(/cs_test_[A-Za-z0-9]+/)?.[0]
  if (sessionId) {
    const cs = await stripe.checkout.sessions.retrieve(sessionId)
    check('le checkout du parrain réutilise son client crédité', cs.customer === pCustomer, `${cs.customer}`)
    await stripe.checkout.sessions.expire(sessionId).catch(() => {})
  } else {
    check('checkout du parrain créé', false, JSON.stringify(co.json))
  }

  // ── 8. Cas limites de la remise ─────────────────────────────────────────
  console.log('8. Cas limites')
  // Facture ponctuelle (hors abonnement) du filleul : aucune remise.
  const oneOff = await stripe.invoices.create({ customer: fCustomer.id, collection_method: 'charge_automatically', auto_advance: false })
  await stripe.invoiceItems.create({ customer: fCustomer.id, invoice: oneOff.id, amount: 5000, currency: 'eur', description: 'E2E matériel' })
  const paidOneOff = await stripe.invoices.pay(oneOff.id!)
  check('facture ponctuelle payée', paidOneOff.status === 'paid')
  check('webhook facture ponctuelle accepté', (await sendInvoicePaid(paidOneOff)) === 200)
  check('aucune remise sur une facture hors abonnement', (await balanceOf()) === balance1, `solde ${await balanceOf()}`)

  // Client Stripe du parrain supprimé côté Stripe : ni le checkout ni la remise
  // ne doivent casser.
  await stripe.customers.del(pCustomer!)
  const co2 = await post('/api/stripe/checkout', parrain, '', { formule: 'qr' })
  check('checkout OK malgré un client Stripe supprimé', co2.status === 200 && !!co2.json?.url, `HTTP ${co2.status} ${JSON.stringify(co2.json)}`)
  const sid2 = (co2.json?.url as string | undefined)?.match(/cs_test_[A-Za-z0-9]+/)?.[0]
  if (sid2) await stripe.checkout.sessions.expire(sid2).catch(() => {})

  const sub2 = await stripe.subscriptions.create({
    customer: fCustomer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID! }],
    metadata: { user_id: filleul.userId },
  })
  const inv2 = await stripe.invoices.retrieve(sub2.latest_invoice as string)
  check('webhook 2e facture accepté', (await sendInvoicePaid(inv2)) === 200)
  const { data: pBiz2 } = await admin.from('businesses').select('stripe_customer_id').eq('id', parrainBiz).single()
  const newCustomer = (pBiz2?.stripe_customer_id ?? null) as string | null
  if (newCustomer) createdCustomers.push(newCustomer)
  check('un nouveau client remplace le client supprimé', !!newCustomer && newCustomer !== pCustomer, `${newCustomer}`)
  const bal3 = newCustomer ? ((await stripe.customers.retrieve(newCustomer)) as Stripe.Customer).balance : 0
  check('la remise est créditée sur le nouveau client', bal3 === -Math.round((inv2.total_excluding_tax ?? 0) * 0.2), `solde ${bal3}`)
  await stripe.subscriptions.cancel(sub2.id).catch(() => {})
  await stripe.subscriptions.cancel(sub.id).catch(() => {})
}

async function cleanup() {
  for (const c of createdCustomers) await stripe.customers.del(c).catch(() => {})
  if (webhookEventIds.length) await admin.from('stripe_webhook_events').delete().in('event_id', webhookEventIds)
  console.log('\nNettoyage des comptes de test…')
  for (const id of createdUsers) {
    await admin.from('businesses').delete().eq('user_id', id) // referrers : ON DELETE CASCADE
    const { error } = await admin.auth.admin.deleteUser(id)
    console.log(`  ${error ? '⚠' : '🧹'} user ${id}${error ? ` : ${error.message}` : ''}`)
  }
}

main()
  .catch((e) => {
    failures++
    console.error('\n💥', e instanceof Error ? e.message : e)
  })
  .finally(async () => {
    await cleanup()
    console.log(failures ? `\n${failures} échec(s).` : '\nTout est OK.')
    process.exit(failures ? 1 : 0)
  })
