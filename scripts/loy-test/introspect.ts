import { supabaseAdmin } from '@/lib/supabase-admin'
import { parisToday } from '@/lib/loyalty'

async function main() {
  console.log('parisToday() =', parisToday())

  const { data: sample, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) { console.error('businesses error:', error.message); process.exit(1) }
  console.log('businesses columns:', sample ? Object.keys(sample) : '(aucune ligne)')
  if (sample) {
    const redacted: Record<string, unknown> = {}
    for (const k of Object.keys(sample)) {
      const v = (sample as Record<string, unknown>)[k]
      redacted[k] = typeof v === 'string' && v.length > 24 ? v.slice(0, 24) + '…' : v
    }
    console.log('businesses sample (tronqué):', redacted)
  }

  for (const t of ['loyalty_programs', 'loyalty_rewards', 'loyalty_cards', 'loyalty_stamps', 'loyalty_redemptions']) {
    const { count } = await supabaseAdmin.from(t).select('id', { count: 'exact', head: true })
    console.log(`  ${t}: ${count ?? 0} lignes`)
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
