/**
 * NETTOYAGE des commerces en double (compte lborrelli248@gmail.com).
 * Garde "Boulangerie" + "Boulangerie 2" ; supprime les 3 autres.
 * Ne touche à RIEN côté Stripe. Vérifie l'appartenance + compte les données
 * liées avant de supprimer (suppression en cascade par les FK).
 */
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

const OWNER = '2bf39da4-1081-44f7-8292-c9a35e3236b0'
const KEEP = new Set([
  '7eb07b52-0b2a-42b3-936b-1d637b3fd161', // Boulangerie
  '555ad1c8-798d-4330-a45c-4893d32d1b39', // Boulangerie 2
])
const DELETE: { id: string; expectedName: string }[] = [
  { id: '87c439fb-35b6-4606-b45f-7bb610364a9c', expectedName: 'Patisserie martin' },
  { id: '3e8e193c-6060-4b58-ac65-32dcb0d3e0f8', expectedName: 'Louis Borrelli' },
  { id: '112db1b7-5ac1-45a2-b7a9-ba04a803c340', expectedName: 'aaaa' },
]

async function countFor(table: string, bizId: string): Promise<number> {
  const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('business_id', bizId)
  return count ?? 0
}

async function main() {
  console.log('--- Vérification avant suppression ---')
  for (const target of DELETE) {
    const { data: b } = await admin.from('businesses')
      .select('id, name, user_id, stripe_subscription_id').eq('id', target.id).maybeSingle<{ id: string; name: string | null; user_id: string | null; stripe_subscription_id: string | null }>()
    if (!b) { console.log(`  ⚠️  ${target.id} introuvable (déjà supprimé ?) — ignoré`); target.id = ''; continue }
    if (b.user_id !== OWNER) { console.log(`  ⛔ ${target.id} n'appartient pas au compte attendu — ABANDON`); process.exit(1) }
    if (KEEP.has(b.id)) { console.log(`  ⛔ ${target.id} est dans la liste à GARDER — ABANDON`); process.exit(1) }
    const scans = await countFor('scans', b.id)
    const reviews = await countFor('reviews', b.id)
    const feedback = await countFor('feedback', b.id)
    console.log(`  • ${b.name} [${b.id}] : ${scans} scan(s), ${reviews} avis, ${feedback} feedback(s), stripe_sub=${b.stripe_subscription_id ?? '—'}`)
  }

  console.log('\n--- Suppression (cascade) ---')
  for (const target of DELETE) {
    if (!target.id) continue
    const { error } = await admin.from('businesses').delete().eq('id', target.id).eq('user_id', OWNER)
    console.log(`  ${error ? '❌' : '✅'} ${target.expectedName} [${target.id}]${error ? ' — ' + error.message : ' supprimé'}`)
  }

  console.log('\n--- Commerces restants pour ce compte ---')
  const { data: rest } = await admin.from('businesses').select('id, name, created_at').eq('user_id', OWNER).order('created_at', { ascending: true })
  for (const b of (rest as { id: string; name: string | null; created_at: string }[] | null) ?? []) {
    console.log(`  • ${b.name} [${b.id}] — créé ${b.created_at}`)
  }
  console.log('')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
