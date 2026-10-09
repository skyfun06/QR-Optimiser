/**
 * DIAGNOSTIC onboarding/doublons (lecture seule, ne modifie RIEN).
 * node --import ./scripts/loy-test/preload.mjs scripts/loy-test/diag-onboarding.ts
 */
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

type Biz = {
  id: string; name: string | null; user_id: string | null; created_at: string | null
  subscription_status: string | null; subscription_plan: string | null
  stripe_customer_id: string | null; stripe_subscription_id: string | null; trial_ends_at: string | null
}

async function main() {
  // 1. Tous les utilisateurs auth (id → email), pour repérer d'éventuels doublons d'email.
  const users: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) { console.error('listUsers:', error.message); break }
    users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null })))
    if (data.users.length < 1000) break
  }
  const byEmail = new Map<string, typeof users>()
  for (const u of users) {
    const k = (u.email ?? '(null)').toLowerCase()
    if (!byEmail.has(k)) byEmail.set(k, [])
    byEmail.get(k)!.push(u)
  }
  console.log(`\n=== AUTH USERS : ${users.length} au total ===`)
  const dupEmails = [...byEmail.entries()].filter(([, arr]) => arr.length > 1)
  if (dupEmails.length) {
    console.log('⚠️  Emails avec PLUSIEURS comptes auth :')
    for (const [email, arr] of dupEmails) {
      console.log(`   ${email} → ${arr.length} comptes :`)
      arr.forEach((u) => console.log(`      - ${u.id}  créé ${u.created_at}  dernier login ${u.last_sign_in_at ?? '—'}`))
    }
  } else {
    console.log('Aucun email en double (1 compte auth par email).')
  }

  // 2. Tous les commerces.
  const { data: bizData } = await admin.from('businesses')
    .select('id, name, user_id, created_at, subscription_status, subscription_plan, stripe_customer_id, stripe_subscription_id, trial_ends_at')
    .order('created_at', { ascending: true })
  const businesses = (bizData as Biz[] | null) ?? []
  const emailOf = (uid: string | null) => users.find((u) => u.id === uid)?.email ?? '(user inconnu)'

  // 3. Scans par commerce.
  const scanCount = new Map<string, number>()
  for (const b of businesses) {
    const { count } = await admin.from('scans').select('id', { count: 'exact', head: true }).eq('business_id', b.id)
    scanCount.set(b.id, count ?? 0)
  }

  // 4. user_billing (cartes enregistrées).
  const { data: billing } = await admin.from('user_billing').select('user_id, stripe_customer_id, created_at')
  const billingByUser = new Map<string, { stripe_customer_id: string | null; created_at: string | null }>()
  for (const r of (billing as { user_id: string; stripe_customer_id: string | null; created_at: string | null }[] | null) ?? []) {
    billingByUser.set(r.user_id, { stripe_customer_id: r.stripe_customer_id, created_at: r.created_at })
  }

  // Regroupe les commerces par user.
  const byUser = new Map<string, Biz[]>()
  for (const b of businesses) {
    const k = b.user_id ?? '(null)'
    if (!byUser.has(k)) byUser.set(k, [])
    byUser.get(k)!.push(b)
  }

  console.log(`\n=== COMMERCES : ${businesses.length} au total, ${byUser.size} propriétaire(s) ===`)
  for (const [uid, list] of byUser) {
    const bill = billingByUser.get(uid)
    console.log(`\n▶ user ${uid}  (${emailOf(uid)})  — ${list.length} commerce(s)  — user_billing: ${bill ? 'OUI (carte enregistrée)' : 'NON'}`)
    for (const b of list) {
      console.log(`   • ${b.name ?? '(sans nom)'}  [${b.id}]`)
      console.log(`       créé ${b.created_at} · ${scanCount.get(b.id)} scan(s) · statut=${b.subscription_status}/${b.subscription_plan}`)
      console.log(`       stripe_customer=${b.stripe_customer_id ?? '—'} · stripe_sub=${b.stripe_subscription_id ?? '—'}`)
    }
  }
  console.log('')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
