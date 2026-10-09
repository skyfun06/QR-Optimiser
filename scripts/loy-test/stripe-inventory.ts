/**
 * INVENTAIRE Stripe (lecture seule, n'annule/ne supprime RIEN).
 * Liste clients + abonnements Stripe pour un email donné, et croise avec les
 * stripe_customer_id / stripe_subscription_id stockés en base.
 * node --import ./scripts/loy-test/preload.mjs scripts/loy-test/stripe-inventory.ts <email>
 */
import Stripe from 'stripe'
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const email = process.argv[2] ?? 'lborrelli248@gmail.com'

async function main() {
  console.log(`\n=== STRIPE — clients pour ${email} ===`)
  const customers = await stripe.customers.list({ email, limit: 100 })
  console.log(`Clients Stripe trouvés : ${customers.data.length}`)
  for (const c of customers.data) {
    console.log(`\n • customer ${c.id}  créé ${new Date(c.created * 1000).toISOString()}  email=${c.email ?? '—'}`)
    const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 100 })
    if (subs.data.length === 0) {
      console.log('     (aucun abonnement)')
    }
    for (const s of subs.data) {
      const item = s.items.data[0]
      console.log(`     - sub ${s.id}  statut=${s.status}  créé ${new Date(s.created * 1000).toISOString()}  prix=${item?.price?.id ?? '—'}`)
    }
  }

  // Croisement avec la base.
  console.log(`\n=== BASE — stripe ids référencés par les commerces de cet email ===`)
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const u = users.users.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase())
  if (!u) { console.log('(utilisateur introuvable)'); process.exit(0) }
  const { data: biz } = await admin.from('businesses')
    .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('user_id', u.id)
  for (const b of (biz as { id: string; name: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null }[] | null) ?? []) {
    console.log(` • ${b.name}: customer=${b.stripe_customer_id ?? '—'} sub=${b.stripe_subscription_id ?? '—'} statut=${b.subscription_status}`)
  }
  console.log('')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
