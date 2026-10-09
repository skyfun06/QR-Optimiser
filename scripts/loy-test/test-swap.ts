/**
 * Vérifie que l'échange de seuils entre 2 paliers (5 ↔ 10) ne viole plus la
 * contrainte UNIQUE(program_id, threshold), grâce au « parking » des seuils.
 * Compare : séquence NAÏVE (update direct → doit échouer 23505) vs séquence
 * PARKING (doit réussir). Commerce de test jetable, supprimé en fin de run.
 */
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

async function main() {
  const { data: u } = await admin.from('businesses').select('user_id').not('user_id', 'is', null).limit(1).maybeSingle<{ user_id: string }>()
  const { data: biz } = await admin.from('businesses').insert({
    user_id: u!.user_id, name: `ZZZ_TEST_SWAP ${Date.now()}`, subscription_status: 'pending_payment', subscription_plan: 'free',
  }).select('id').single<{ id: string }>()
  const { data: prog } = await admin.from('loyalty_programs').insert({ business_id: biz!.id }).select('id').single<{ id: string }>()
  const { data: rws } = await admin.from('loyalty_rewards').insert([
    { program_id: prog!.id, threshold: 5, label: 'Café' },
    { program_id: prog!.id, threshold: 10, label: 'Dessert' },
  ]).select('id, threshold, label')
  const cafe = (rws as { id: string; threshold: number }[]).find((r) => r.threshold === 5)!
  const dessert = (rws as { id: string; threshold: number }[]).find((r) => r.threshold === 10)!

  // 1) Séquence NAÏVE : café 5→10 directement (dessert est encore à 10) → doit échouer.
  const { error: naive } = await admin.from('loyalty_rewards').update({ threshold: 10 }).eq('id', cafe.id)
  console.log(`Séquence naïve (café 5→10 direct) : ${naive ? `échoue comme attendu (${naive.code})` : '⚠️ réussit (inattendu)'}`)

  // 2) Séquence PARKING (celle du correctif) : park → finaux.
  const PARK = 1_000_000
  let ok = true
  const steps = [
    admin.from('loyalty_rewards').update({ threshold: PARK + 0 }).eq('id', cafe.id),
    admin.from('loyalty_rewards').update({ threshold: PARK + 1 }).eq('id', dessert.id),
    admin.from('loyalty_rewards').update({ threshold: 10, label: 'Café' }).eq('id', cafe.id),
    admin.from('loyalty_rewards').update({ threshold: 5, label: 'Dessert' }).eq('id', dessert.id),
  ]
  for (const s of steps) { const { error } = await s; if (error) { ok = false; console.log('  parking step error:', error.code, error.message) } }

  const { data: finalRows } = await admin.from('loyalty_rewards').select('threshold, label').eq('program_id', prog!.id).order('threshold', { ascending: true })
  console.log(`Séquence parking (swap 5↔10) : ${ok ? '✅ réussit sans conflit' : '❌ échec'}`)
  console.log('  état final :', JSON.stringify(finalRows))

  await admin.from('businesses').delete().eq('id', biz!.id)
  console.log('nettoyé.')
  const pass = !!naive && ok && JSON.stringify(finalRows) === JSON.stringify([{ threshold: 5, label: 'Dessert' }, { threshold: 10, label: 'Café' }])
  console.log(pass ? '\n✅ Correctif swap validé' : '\n❌ Vérifier')
  process.exit(pass ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
