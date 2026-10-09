/**
 * Step 7 — tests de bout en bout de la logique de fidélité (lib/loyalty.ts),
 * exécutés contre la vraie base sur des COMMERCES DE TEST jetables (préfixe
 * "ZZZ_TEST_LOYALTY"), tous supprimés (cascade) en fin de run.
 *
 * « Le lendemain » est simulé en reculant les dates en base (stamped_on et
 * last_stamp_date) d'un jour — aucune horloge à manipuler.
 *
 * Lancement : node --import ./scripts/loy-test/preload.mjs scripts/loy-test/run.ts
 */
import { supabaseAdmin as admin } from '@/lib/supabase-admin'
import { applyScan, validateReward, saveContact, recoverCard, parisToday } from '@/lib/loyalty'

/* ─── util assertions ────────────────────────────────────── */
type Result = { name: string; ok: boolean; detail: string }
const results: Result[] = []
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/* ─── util dates ─────────────────────────────────────────── */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/* ─── accès base (service role) ──────────────────────────── */
type Card = { id: string; stamp_count: number; cycle: number; last_stamp_date: string | null; device_id: string; email: string | null; phone: string | null }
const createdBusinessIds: string[] = []

async function getUserId(): Promise<string> {
  const { data } = await admin.from('businesses').select('user_id').not('user_id', 'is', null).limit(1).maybeSingle<{ user_id: string }>()
  if (!data?.user_id) throw new Error('Aucun user_id existant pour rattacher le commerce de test.')
  return data.user_id
}
async function createBusiness(userId: string): Promise<string> {
  const { data, error } = await admin.from('businesses').insert({
    user_id: userId,
    name: `ZZZ_TEST_LOYALTY ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subscription_status: 'pending_payment',
    subscription_plan: 'free',
  }).select('id').single<{ id: string }>()
  if (error || !data) throw new Error('createBusiness: ' + (error?.message ?? 'no data'))
  createdBusinessIds.push(data.id)
  return data.id
}
async function createProgram(businessId: string, tiers: { threshold: number; label: string }[], active = true): Promise<string> {
  const { data, error } = await admin.from('loyalty_programs').insert({ business_id: businessId, is_active: active }).select('id').single<{ id: string }>()
  if (error || !data) throw new Error('createProgram: ' + (error?.message ?? 'no data'))
  if (tiers.length) {
    const { error: rErr } = await admin.from('loyalty_rewards').insert(tiers.map((t) => ({ program_id: data.id, threshold: t.threshold, label: t.label })))
    if (rErr) throw new Error('createRewards: ' + rErr.message)
  }
  return data.id
}
async function getCard(programId: string, deviceId: string): Promise<Card | null> {
  const { data } = await admin.from('loyalty_cards').select('*').eq('program_id', programId).eq('device_id', deviceId).maybeSingle<Card>()
  return data ?? null
}
async function rewindOneDay(cardId: string) {
  // Recule toutes les dates de la carte d'un jour (ordre croissant pour ne pas
  // heurter la contrainte UNIQUE (card_id, stamped_on)), libérant « aujourd'hui ».
  const { data: stamps } = await admin.from('loyalty_stamps').select('id, stamped_on').eq('card_id', cardId).order('stamped_on', { ascending: true })
  for (const s of (stamps as { id: string; stamped_on: string }[] | null) ?? []) {
    await admin.from('loyalty_stamps').update({ stamped_on: addDays(s.stamped_on, -1) }).eq('id', s.id)
  }
  const { data: card } = await admin.from('loyalty_cards').select('last_stamp_date').eq('id', cardId).maybeSingle<{ last_stamp_date: string | null }>()
  if (card?.last_stamp_date) {
    await admin.from('loyalty_cards').update({ last_stamp_date: addDays(card.last_stamp_date, -1) }).eq('id', cardId)
  }
}
const dev = () => crypto.randomUUID()

/** Monte une carte jusqu'à `target` tampons, un « jour » à la fois. */
async function climbTo(programId: string, businessId: string, deviceId: string, target: number) {
  let state = await applyScan(businessId, deviceId)
  let guard = 0
  while (state.stampCount < target && guard++ < 50) {
    const card = await getCard(programId, deviceId)
    if (card) await rewindOneDay(card.id)
    state = await applyScan(businessId, deviceId)
  }
  return state
}

/* ─── scénarios ──────────────────────────────────────────── */
async function main() {
  console.log(`\nStep 7 — tests fidélité (today=${parisToday()})\n`)
  const userId = await getUserId()

  /* 1 & 2 — 2 scans le même jour = 1 tampon ; lendemain = +1 */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 3, label: 'Café offert' }, { threshold: 5, label: 'Dessert offert' }])
    const d = dev()
    const s1 = await applyScan(biz, d)
    const s2 = await applyScan(biz, d)
    check('2 scans le même jour → 1 seul tampon', s1.stampCount === 1 && s2.stampCount === 1 && s1.justStamped && !s2.justStamped && s2.alreadyStampedToday, `count ${s1.stampCount}/${s2.stampCount}`)
    const card = await getCard(prog, d)
    await rewindOneDay(card!.id)
    const s3 = await applyScan(biz, d)
    check('Le lendemain → +1 tampon', s3.stampCount === 2 && s3.justStamped, `count ${s3.stampCount}`)

    /* 3 — palier atteint → popup → validation → ne revient plus */
    const s4 = await climbTo(prog, biz, d, 3)
    const poppedCafe = s4.pendingReward?.threshold === 3 && s4.pendingReward?.label === 'Café offert'
    check('Palier atteint → récompense en attente (popup)', poppedCafe, `pending=${s4.pendingReward?.label ?? 'null'}`)
    const s5 = await validateReward(biz, d, s4.pendingReward!.redemptionId)
    check('Validation récompense → plus de récompense en attente', s5.pendingReward === null, `pending=${s5.pendingReward?.label ?? 'null'}`)
    const card3 = await getCard(prog, d)
    await rewindOneDay(card3!.id)
    const s6 = await applyScan(biz, d)
    check('Palier déjà validé → ne revient pas au scan suivant', s6.stampCount === 4 && s6.pendingReward === null, `count ${s6.stampCount}, pending=${s6.pendingReward?.label ?? 'null'}`)

    /* 4 — dernier palier validé → reset */
    const s7 = await climbTo(prog, biz, d, 5)
    const poppedDessert = s7.pendingReward?.threshold === 5
    check('Dernier palier atteint → récompense en attente', poppedDessert, `pending=${s7.pendingReward?.label ?? 'null'}`)
    const s8 = await validateReward(biz, d, s7.pendingReward!.redemptionId)
    const cardR = await getCard(prog, d)
    check('Dernier palier validé → remise à zéro (count=0, cycle+1)', s8.stampCount === 0 && cardR?.stamp_count === 0 && cardR?.cycle === 2, `count=${cardR?.stamp_count}, cycle=${cardR?.cycle}`)
  }

  /* 5 — palier baissé sous le stamp_count → déclenché au tampon suivant + reset */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 3, label: 'Café offert' }, { threshold: 5, label: 'Dessert offert' }])
    const d = dev()
    const s = await climbTo(prog, biz, d, 4)
    // café@3 déjà en attente → on le valide pour être à 4 sans récompense en attente
    if (s.pendingReward) await validateReward(biz, d, s.pendingReward.redemptionId)
    const before = await applyScan(biz, d) // même jour, pas de nouveau tampon
    check('Avant baisse : à 4 tampons, aucune récompense en attente', before.stampCount === 4 && before.pendingReward === null, `count=${before.stampCount}, pending=${before.pendingReward?.label ?? 'null'}`)
    // On baisse le dessert de 5 → 4 (désormais sous/à hauteur du compteur, non encore obtenu)
    const { data: dessert } = await admin.from('loyalty_rewards').select('id').eq('program_id', prog).eq('threshold', 5).single<{ id: string }>()
    await admin.from('loyalty_rewards').update({ threshold: 4 }).eq('id', dessert!.id)
    const card = await getCard(prog, d)
    await rewindOneDay(card!.id)
    const after = await applyScan(biz, d) // count 5 → dessert@4 <= 5, non obtenu → déclenché
    check('Palier baissé → récompense déclenchée au tampon suivant', after.pendingReward?.label === 'Dessert offert', `pending=${after.pendingReward?.label ?? 'null'}`)
    const afterVal = await validateReward(biz, d, after.pendingReward!.redemptionId)
    const cardR = await getCard(prog, d)
    check('Palier baissé = dernier → reset après validation', afterVal.stampCount === 0 && cardR?.stamp_count === 0 && cardR!.cycle >= 2, `count=${cardR?.stamp_count}, cycle=${cardR?.cycle}`)
  }

  /* 6 — suppression d'un palier : jamais bloquée, historique gardé, en attente validable */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 2, label: 'Menu offert' }])
    const d = dev()
    const s = await climbTo(prog, biz, d, 2)
    check('Récompense en attente créée avant suppression', s.pendingReward?.label === 'Menu offert', `pending=${s.pendingReward?.label ?? 'null'}`)
    const { data: menu } = await admin.from('loyalty_rewards').select('id').eq('program_id', prog).eq('threshold', 2).single<{ id: string }>()
    const { error: delErr } = await admin.from('loyalty_rewards').delete().eq('id', menu!.id)
    check('Suppression d\'un palier jamais bloquée', !delErr, delErr?.message ?? 'ok')
    const after = await applyScan(biz, d) // relecture d'état
    check('Récompense en attente conservée malgré suppression (snapshot)', after.pendingReward?.label === 'Menu offert', `pending=${after.pendingReward?.label ?? 'null'}`)
    const val = await validateReward(biz, d, after.pendingReward!.redemptionId)
    check('Récompense en attente toujours validable après suppression', val.pendingReward === null, `pending=${val.pendingReward?.label ?? 'null'}`)
    // historique gardé : la redemption existe encore (reward_id mis à null, snapshot conservé)
    const { data: cardRow } = await admin.from('loyalty_cards').select('id').eq('program_id', prog).eq('device_id', d).single<{ id: string }>()
    const { data: reds } = await admin.from('loyalty_redemptions').select('reward_label, reward_id, validated_at').eq('card_id', cardRow!.id)
    const kept = (reds ?? []).some((r) => r.reward_label === 'Menu offert' && r.validated_at)
    check('Historique gardé (redemption snapshot conservée)', kept, `${reds?.length ?? 0} redemption(s)`)
  }

  /* 7 — programme en pause → page d'avis normale sans carte */
  {
    const biz = await createBusiness(userId)
    await createProgram(biz, [{ threshold: 3, label: 'Café offert' }], false)
    const d = dev()
    const s = await applyScan(biz, d)
    const card = await getCard((await admin.from('loyalty_programs').select('id').eq('business_id', biz).single<{ id: string }>()).data!.id, d)
    check('Programme en pause → état inactif, aucune carte créée', s.active === false && s.hasCard === false && s.stampCount === 0 && card === null, `active=${s.active}, card=${card ? 'existe' : 'null'}`)
  }

  /* 8 — sauvegarde contact puis récupération sur un autre appareil */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 3, label: 'Café offert' }])
    const dA = dev(), dB = dev()
    await climbTo(prog, biz, dA, 2)
    const email = `test_${Math.random().toString(36).slice(2, 8)}@exemple.com`
    const save = await saveContact(biz, dA, { email })
    check('Sauvegarde du contact (email)', save.ok === true && save.state?.contactSaved === true, `ok=${save.ok}`)
    const rec = await recoverCard(biz, dB, { email })
    const cardB = await getCard(prog, dB)
    check('Récupération sur un autre appareil → même carte, tampons conservés', rec.recovered === true && rec.state?.stampCount === 2 && cardB?.stamp_count === 2, `recovered=${rec.recovered}, count=${rec.state?.stampCount}`)
    const cardA = await getCard(prog, dA)
    check('Ancienne carte de l\'appareil rattachée (device_id réécrit)', cardA === null, cardA ? 'carte A encore présente' : 'ok')
  }

  /* 9a — récupération quand l'appareil courant a DÉJÀ une carte du jour (pas de double tampon) */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 5, label: 'Café offert' }])
    const dSrc = dev(), dCur = dev()
    await climbTo(prog, biz, dSrc, 2)          // carte source : 2 tampons, tamponnée aujourd'hui
    const email = `test_${Math.random().toString(36).slice(2, 8)}@exemple.com`
    await saveContact(biz, dSrc, { email })
    await applyScan(biz, dCur)                 // appareil courant : 1 tampon aujourd'hui
    const rec = await recoverCard(biz, dCur, { email })
    check('Récup avec carte du jour existante → aucun gain (pas de double tampon)', rec.recovered === true && rec.state?.stampCount === 2, `count=${rec.state?.stampCount} (attendu 2)`)
  }

  /* 9b — récupération quand la carte source n'a PAS le tampon du jour → transfert (net neutre) */
  {
    const biz = await createBusiness(userId)
    const prog = await createProgram(biz, [{ threshold: 5, label: 'Café offert' }])
    const dSrc = dev(), dCur = dev()
    await climbTo(prog, biz, dSrc, 1)
    const cardSrc = await getCard(prog, dSrc)
    await rewindOneDay(cardSrc!.id)            // carte source : 1 tampon, PAS aujourd'hui
    const email = `test_${Math.random().toString(36).slice(2, 8)}@exemple.com`
    await saveContact(biz, dSrc, { email })
    await applyScan(biz, dCur)                 // appareil courant : 1 tampon aujourd'hui
    const rec = await recoverCard(biz, dCur, { email })
    check('Récup sans tampon du jour sur la source → tampon du jour transféré', rec.recovered === true && rec.state?.stampCount === 2, `count=${rec.state?.stampCount} (attendu 2)`)
  }

  /* ─── nettoyage ─── */
  let cleaned = 0
  for (const id of createdBusinessIds) {
    const { error } = await admin.from('businesses').delete().eq('id', id)
    if (!error) cleaned++
    else console.error('cleanup error', id, error.message)
  }
  console.log(`\nNettoyage : ${cleaned}/${createdBusinessIds.length} commerces de test supprimés (cascade).`)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length === 0 ? '✅ TOUS LES CAS PASSENT' : `❌ ${failed.length} CAS EN ÉCHEC`} (${results.length - failed.length}/${results.length})`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERREUR HARNAIS:', e); process.exit(2) })
