/**
 * Vérifie empiriquement, via le serveur dev, que l'ouverture de /review/<id>
 * par un simple GET (= aperçu de lien WhatsApp/iMessage/robot, sans exécution du
 * JS client) ne crée AUCUNE carte de fidélité. Crée un commerce de test jetable,
 * fait le GET, vérifie 0 carte, puis nettoie.
 *
 * Prérequis : serveur dev lancé (npm run dev) sur le port donné (défaut 3000).
 * node --import ./scripts/loy-test/preload.mjs scripts/loy-test/linkpreview.ts [port]
 */
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

const port = process.argv[2] ?? '3000'

async function main() {
  const { data: u } = await admin.from('businesses').select('user_id').not('user_id', 'is', null).limit(1).maybeSingle<{ user_id: string }>()
  const { data: biz } = await admin.from('businesses').insert({
    user_id: u!.user_id,
    name: `ZZZ_TEST_LOYALTY_LINKPREVIEW ${Date.now()}`,
    subscription_status: 'active',   // hasAccess doit laisser passer la page
    subscription_plan: 'free',
  }).select('id').single<{ id: string }>()
  const bizId = biz!.id
  const { data: prog } = await admin.from('loyalty_programs').insert({ business_id: bizId, is_active: true }).select('id').single<{ id: string }>()
  await admin.from('loyalty_rewards').insert({ program_id: prog!.id, threshold: 3, label: 'Café offert' })

  const url = `http://localhost:${port}/review/${bizId}`
  let status = 0
  let ok = false
  try {
    const res = await fetch(url, { redirect: 'manual' })
    status = res.status
    await res.text()
    ok = true
  } catch (e) {
    console.error('fetch error:', e instanceof Error ? e.message : e)
  }

  // Laisser le temps à une éventuelle écriture asynchrone de se produire.
  await new Promise((r) => setTimeout(r, 1500))
  const { count } = await admin.from('loyalty_cards').select('id', { count: 'exact', head: true }).eq('program_id', prog!.id)

  console.log(`GET ${url} → HTTP ${status} (${ok ? 'servi' : 'échec'})`)
  console.log(`  cartes créées : ${count ?? 0} (attendu 0)`)
  const pass = ok && (status === 200) && (count ?? 0) === 0

  await admin.from('businesses').delete().eq('id', bizId)
  console.log('  commerce de test supprimé.')
  console.log(pass ? '✅ Aperçu de lien → aucune carte créée' : '❌ échec')
  process.exit(pass ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(2) })
