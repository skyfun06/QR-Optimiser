/**
 * TEST — commissions vendeur à trois paliers.
 *
 * Vrai Stripe (mode test, horloge de test qui fait défiler 6 mois) + vraie base
 * Supabase, avec un compte et un commerce jetables supprimés à la fin. Les
 * fonctions du webhook sont appelées directement : pas besoin de serveur.
 *   node --import ./scripts/loy-test/preload.mjs scripts/referral-test/commission-paliers.ts
 */
import Stripe from 'stripe'
import { supabaseAdmin as admin } from '@/lib/supabase-admin'
import { commissionCumulee, montantCommission } from '@/lib/vendeur-commerce'
import {
  compterMoisPayes,
  debloquerCommissionsPourFacture,
  declencherCommissionSiVente,
  marquerVentesResiliees,
} from '@/lib/vendeur-commissions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const RUN = Date.now().toString(36)
let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ` — ${detail}` : ''}`)
}

async function avancer(clockId: string, frozenTime: number) {
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: frozenTime })
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const c = await stripe.testHelpers.testClocks.retrieve(clockId)
    if (c.status === 'ready') return
  }
  throw new Error('horloge de test bloquée')
}

async function main() {
  // ── Barème : les cumuls demandés, sur les deux formules ─────────────────
  console.log('1. Barème')
  check('40 € : 20 / 40 / 100', [1, 2, 3].every((p, i) => commissionCumulee('qr_nfc', p as 1 | 2 | 3) === [20, 40, 100][i]))
  check('35 € : 17,5 / 35 / 87,5', [1, 2, 3].every((p, i) => commissionCumulee('qr', p as 1 | 2 | 3) === [17.5, 35, 87.5][i]))
  check('versements 40 € : 20 + 20 + 60', [1, 2, 3].every((p, i) => montantCommission('qr_nfc', p as 1 | 2 | 3) === [20, 20, 60][i]))

  const email = `e2e-paliers-${RUN}@example.com`
  const { data: created, error: userErr } = await admin.auth.admin.createUser({ email, password: `E2e-${RUN}-pw!`, email_confirm: true })
  if (userErr || !created.user) throw new Error(`createUser: ${userErr?.message}`)
  const userId = created.user.id
  let clockId: string | null = null

  try {
    await admin.from('user_billing').upsert({ user_id: userId })
    const { data: vendeur, error: vErr } = await admin
      .from('vendeurs')
      .insert({ user_id: userId, prenom: 'E2E', date_naissance: '2000-01-01', statut: 'actif' })
      .select('id')
      .single()
    if (vErr) throw new Error(`vendeur: ${vErr.message}`)

    const now = Math.floor(Date.now() / 1000)
    const clock = await stripe.testHelpers.testClocks.create({ frozen_time: now })
    clockId = clock.id
    const customer = await stripe.customers.create({ email, test_clock: clock.id, payment_method: 'pm_card_visa', invoice_settings: { default_payment_method: 'pm_card_visa' } })
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: process.env.STRIPE_PRICE_ID! }] })

    const { data: biz, error: bErr } = await admin
      .from('businesses')
      .insert({ name: `E2E Paliers ${RUN}`, user_id: userId, stripe_customer_id: customer.id, stripe_subscription_id: sub.id, subscription_status: 'active' })
      .select('id')
      .single()
    if (bErr) throw new Error(`commerce: ${bErr.message}`)
    const { data: vente, error: vtErr } = await admin
      .from('ventes')
      .insert({ vendeur_id: vendeur.id, business_id: biz.id, business_nom: 'E2E', formule: 'qr_nfc', statut_commerce: 'en_attente_paiement' })
      .select('id')
      .single()
    if (vtErr) throw new Error(`vente: ${vtErr.message}`)

    async function etats() {
      const { data } = await admin.from('commissions').select('part,statut,montant').eq('vente_id', vente!.id).order('part')
      return (data ?? []) as { part: number; statut: string; montant: number }[]
    }
    const statuts = async () => (await etats()).map((c) => c.statut).join(',')
    async function factureEtTraite() {
      const { data: [inv] } = await stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 1 })
      return debloquerCommissionsPourFacture(admin, stripe, inv)
    }

    // ── 1er paiement ────────────────────────────────────────────────────────
    console.log('2. Premier paiement')
    await declencherCommissionSiVente(admin, biz.id)
    const initial = await etats()
    check('trois parts créées', initial.length === 3, initial.map((c) => c.montant).join(' + '))
    check('montants 20 / 20 / 60', initial.map((c) => Number(c.montant)).join() === '20,20,60')
    check('seule la part 1 est à verser', (await statuts()) === 'a_payer,en_attente,en_attente', await statuts())

    // ── Les renouvellements font avancer les paliers ────────────────────────
    console.log('3. Renouvellements')
    const attendu: Record<number, string> = {
      2: 'a_payer,en_attente,en_attente',
      3: 'a_payer,a_payer,en_attente',
      4: 'a_payer,a_payer,en_attente',
      5: 'a_payer,a_payer,en_attente',
      6: 'a_payer,a_payer,a_payer',
    }
    for (let mois = 2; mois <= 6; mois++) {
      await avancer(clock.id, now + (mois - 1) * 31 * 86400 + 3600)
      await factureEtTraite()
      const compte = await compterMoisPayes(stripe, sub.id)
      check(`mois ${mois} : ${compte} mois comptés`, compte === mois)
      check(`mois ${mois} : ${attendu[mois]}`, (await statuts()) === attendu[mois], await statuts())
    }

    await factureEtTraite()
    check('événement rejoué : aucun changement', (await statuts()) === attendu[6])

    // ── Résiliation ─────────────────────────────────────────────────────────
    console.log('4. Résiliation')
    await marquerVentesResiliees(admin, sub.id)
    const { data: v2 } = await admin.from('ventes').select('statut_commerce').eq('id', vente.id).single()
    check('vente marquée résiliée', v2?.statut_commerce === 'resilie')
  } finally {
    if (clockId) await stripe.testHelpers.testClocks.del(clockId).catch(() => undefined)
    // Le commerce et la vente/commissions partent en cascade.
    await admin.from('businesses').delete().eq('user_id', userId)
    await admin.from('vendeurs').delete().eq('user_id', userId)
    await admin.from('user_billing').delete().eq('user_id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  console.log(failures ? `\n❌ ${failures} échec(s)` : '\n✅ Tout est bon')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
