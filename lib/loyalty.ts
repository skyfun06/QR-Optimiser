/**
 * Logique serveur du programme de fidélité (tampons).
 *
 * TOUT passe par la service role (supabaseAdmin, qui bypass la RLS). Ce module
 * ne doit JAMAIS être importé côté client : il lit SUPABASE_SERVICE_ROLE_KEY.
 *
 * RÈGLE MÉTIER : le tampon récompense la VISITE, jamais l'avis. Aucune
 * dépendance avec les tables reviews / feedback ici.
 *
 * Points clés :
 *   • 1 tampon / jour (fuseau Europe/Paris), garanti par la contrainte UNIQUE
 *     (card_id, stamped_on) : un double scan simultané ne pose qu'un tampon.
 *   • La carte n'est créée QUE lors d'un appel explicite (applyScan /
 *     saveContact / recoverCard), jamais pendant le rendu de la page (sinon les
 *     aperçus de lien WhatsApp/iMessage et les robots fausseraient les stats).
 *   • Récompenses : snapshot (label + threshold) → l'historique reste correct
 *     même si le commerçant modifie ses paliers ensuite.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

/* ─── Types ──────────────────────────────────────────────── */
export type LoyaltyReward = { id: string; threshold: number; label: string }

export type LoyaltyState = {
  active: boolean
  hasCard: boolean
  stampCount: number
  cycle: number
  rewards: LoyaltyReward[]
  maxThreshold: number
  nextReward: { threshold: number; label: string; remaining: number } | null
  justStamped: boolean
  alreadyStampedToday: boolean
  pendingReward: { redemptionId: string; label: string; threshold: number } | null
  contactSaved: boolean
}

type ProgramRow = { id: string; is_active: boolean }
type RewardRow = { id: string; threshold: number; label: string }
type CardRow = {
  id: string
  program_id: string
  device_id: string
  email: string | null
  phone: string | null
  stamp_count: number
  cycle: number
  last_stamp_date: string | null
}

/* ─── Helpers date / validation ──────────────────────────── */

/** Date du jour en Europe/Paris, format 'YYYY-MM-DD' (comparable à une `date` SQL). */
export function parisToday(d: Date = new Date()): string {
  // 'en-CA' produit directement 'YYYY-MM-DD'.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
function normalizePhone(v: string): string {
  return v.replace(/[\s.\-()]/g, '')
}
function isPhone(v: string): boolean {
  return /^\+?[0-9]{6,15}$/.test(normalizePhone(v))
}

function nowIso(): string {
  return new Date().toISOString()
}

function inactiveState(): LoyaltyState {
  return {
    active: false,
    hasCard: false,
    stampCount: 0,
    cycle: 1,
    rewards: [],
    maxThreshold: 0,
    nextReward: null,
    justStamped: false,
    alreadyStampedToday: false,
    pendingReward: null,
    contactSaved: false,
  }
}

/* ─── Accès programme / carte ────────────────────────────── */

/**
 * Programme + paliers d'un commerce (triés par palier). null si aucun programme.
 * Lecture seule — utilisable au rendu SSR (ne crée AUCUNE carte).
 */
export async function getProgram(
  businessId: string
): Promise<{ program: ProgramRow; rewards: RewardRow[] } | null> {
  const { data: program } = await supabaseAdmin
    .from('loyalty_programs')
    .select('id, is_active')
    .eq('business_id', businessId)
    .maybeSingle<ProgramRow>()

  if (!program) return null

  const { data: rewards } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('id, threshold, label')
    .eq('program_id', program.id)
    .order('threshold', { ascending: true })

  return { program, rewards: (rewards as RewardRow[] | null) ?? [] }
}

async function getCard(programId: string, deviceId: string): Promise<CardRow | null> {
  const { data } = await supabaseAdmin
    .from('loyalty_cards')
    .select('*')
    .eq('program_id', programId)
    .eq('device_id', deviceId)
    .maybeSingle<CardRow>()
  return data ?? null
}

async function getOrCreateCard(programId: string, deviceId: string): Promise<CardRow> {
  // upsert idempotent : insère si absent, ne touche à rien si déjà présent.
  await supabaseAdmin
    .from('loyalty_cards')
    .upsert(
      { program_id: programId, device_id: deviceId },
      { onConflict: 'program_id,device_id', ignoreDuplicates: true }
    )
  const card = await getCard(programId, deviceId)
  // En théorie toujours présent après l'upsert.
  return card as CardRow
}

/** Crée une récompense en attente pour chaque palier dont le seuil == count. */
async function createPendingForThreshold(card: CardRow, rewards: RewardRow[], count: number) {
  const hit = rewards.filter((r) => r.threshold === count)
  for (const r of hit) {
    await supabaseAdmin.from('loyalty_redemptions').upsert(
      {
        card_id: card.id,
        reward_id: r.id,
        reward_label: r.label,
        threshold: r.threshold,
        cycle: card.cycle,
      },
      { onConflict: 'card_id,reward_id,cycle', ignoreDuplicates: true }
    )
  }
}

/* ─── Construction de l'état renvoyé au client ───────────── */
async function buildState(
  rewards: RewardRow[],
  card: CardRow | null,
  justStamped: boolean,
  alreadyStampedToday: boolean
): Promise<LoyaltyState> {
  const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold)
  const maxThreshold = sorted.length ? sorted[sorted.length - 1].threshold : 0

  if (!card) {
    const first = sorted[0] ?? null
    return {
      active: true,
      hasCard: false,
      stampCount: 0,
      cycle: 1,
      rewards: sorted,
      maxThreshold,
      nextReward: first
        ? { threshold: first.threshold, label: first.label, remaining: first.threshold }
        : null,
      justStamped: false,
      alreadyStampedToday: false,
      pendingReward: null,
      contactSaved: false,
    }
  }

  // Récompense en attente la plus ancienne (affichée tant que non validée).
  // Lue via le snapshot → fonctionne même si le palier a été supprimé depuis.
  const { data: pending } = await supabaseAdmin
    .from('loyalty_redemptions')
    .select('id, reward_label, threshold')
    .eq('card_id', card.id)
    .is('validated_at', null)
    .order('earned_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; reward_label: string; threshold: number }>()

  const next = sorted.find((r) => r.threshold > card.stamp_count) ?? null

  return {
    active: true,
    hasCard: true,
    stampCount: card.stamp_count,
    cycle: card.cycle,
    rewards: sorted,
    maxThreshold,
    nextReward: next
      ? { threshold: next.threshold, label: next.label, remaining: next.threshold - card.stamp_count }
      : null,
    justStamped,
    alreadyStampedToday,
    pendingReward: pending
      ? { redemptionId: pending.id, label: pending.reward_label, threshold: pending.threshold }
      : null,
    contactSaved: Boolean(card.email || card.phone),
  }
}

/* ─── Opérations ─────────────────────────────────────────── */

/**
 * Scan : crée la carte si besoin, ajoute un tampon si le programme est actif et
 * qu'aucun tampon n'a été posé aujourd'hui (Europe/Paris). Détecte un palier
 * atteint → crée une récompense en attente. Renvoie l'état complet.
 */
export async function applyScan(businessId: string, deviceId: string): Promise<LoyaltyState> {
  const prog = await getProgram(businessId)
  if (!prog || !prog.program.is_active) return inactiveState()
  const { program, rewards } = prog

  const card = await getOrCreateCard(program.id, deviceId)
  const today = parisToday()
  let justStamped = false
  let alreadyStampedToday = card.last_stamp_date === today

  if (!alreadyStampedToday) {
    // Tentative d'insertion du tampon du jour. La contrainte UNIQUE
    // (card_id, stamped_on) est le garde-fou anti double-scan simultané.
    const { error } = await supabaseAdmin
      .from('loyalty_stamps')
      .insert({ card_id: card.id, stamped_on: today })

    if (error) {
      // 23505 = unique_violation → un tampon a déjà été posé aujourd'hui.
      if ((error as { code?: string }).code === '23505') {
        alreadyStampedToday = true
      } else {
        throw error
      }
    } else {
      const newCount = card.stamp_count + 1
      await supabaseAdmin
        .from('loyalty_cards')
        .update({ stamp_count: newCount, last_stamp_date: today, updated_at: nowIso() })
        .eq('id', card.id)
      justStamped = true
      await createPendingForThreshold({ ...card, stamp_count: newCount }, rewards, newCount)
    }
  }

  // On relit la carte (compteur à jour, robuste aux cas de course).
  const finalCard = (await getCard(program.id, deviceId)) ?? card
  return buildState(rewards, finalCard, justStamped, alreadyStampedToday)
}

/**
 * Validation d'une récompense (« J'ai reçu ma récompense » + confirmation).
 * Pose validated_at → la popup ne réapparaît plus pour cette récompense.
 * Si c'est le dernier palier (aucun palier supérieur) → la carte repart à zéro,
 * nouveau cycle.
 */
export async function validateReward(
  businessId: string,
  deviceId: string,
  redemptionId: string
): Promise<LoyaltyState> {
  const prog = await getProgram(businessId)
  if (!prog) return inactiveState()
  const { program, rewards } = prog

  const card = await getCard(program.id, deviceId)
  if (!card) return buildState(rewards, null, false, false)

  const { data: red } = await supabaseAdmin
    .from('loyalty_redemptions')
    .select('id, threshold, validated_at')
    .eq('id', redemptionId)
    .eq('card_id', card.id)
    .maybeSingle<{ id: string; threshold: number; validated_at: string | null }>()

  if (red && !red.validated_at) {
    await supabaseAdmin
      .from('loyalty_redemptions')
      .update({ validated_at: nowIso() })
      .eq('id', red.id)

    // Dernier palier = aucun palier courant avec un seuil supérieur.
    const isLast = !rewards.some((r) => r.threshold > red.threshold)
    if (isLast) {
      await supabaseAdmin
        .from('loyalty_cards')
        .update({ stamp_count: 0, cycle: card.cycle + 1, updated_at: nowIso() })
        .eq('id', card.id)
    }
  }

  const finalCard = (await getCard(program.id, deviceId)) ?? card
  return buildState(rewards, finalCard, false, finalCard.last_stamp_date === parisToday())
}

/**
 * Sauvegarde du contact (email OU téléphone) pour retrouver la carte plus tard.
 * V1 assumée : aucune vérification SMS/email, validation de format uniquement.
 */
export async function saveContact(
  businessId: string,
  deviceId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<{ ok: boolean; error?: 'inactive' | 'empty' | 'email' | 'phone'; state?: LoyaltyState }> {
  const prog = await getProgram(businessId)
  if (!prog || !prog.program.is_active) return { ok: false, error: 'inactive' }

  const email = input.email?.trim() || null
  const phone = input.phone?.trim() || null
  if (!email && !phone) return { ok: false, error: 'empty' }
  if (email && !isEmail(email)) return { ok: false, error: 'email' }
  if (phone && !isPhone(phone)) return { ok: false, error: 'phone' }

  const card = await getOrCreateCard(prog.program.id, deviceId)
  await supabaseAdmin
    .from('loyalty_cards')
    .update({
      email: email ? email.toLowerCase() : null,
      phone: phone ? normalizePhone(phone) : null,
      updated_at: nowIso(),
    })
    .eq('id', card.id)

  const finalCard = (await getCard(prog.program.id, deviceId)) ?? card
  return { ok: true, state: await buildState(prog.rewards, finalCard, false, finalCard.last_stamp_date === parisToday()) }
}

/**
 * Récupération d'une carte existante sur un nouvel appareil (email OU téléphone).
 *
 * Invariant : le client ne perd ni ne gagne jamais de tampon.
 *   1. On rattache la carte trouvée à l'appareil courant (écrasement du device_id).
 *   2. Si l'appareil courant avait déjà une carte (créée au scan du jour) :
 *      - on transfère son tampon du jour à la carte récupérée SI celle-ci n'en a
 *        pas encore un aujourd'hui (sinon le tampon du jour est simplement perdu
 *        côté carte jetable — pas de double tampon le même jour) ;
 *      - puis on supprime cette carte jetable.
 */
export async function recoverCard(
  businessId: string,
  deviceId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<{ recovered: boolean; state?: LoyaltyState }> {
  const prog = await getProgram(businessId)
  if (!prog || !prog.program.is_active) return { recovered: false }
  const { program, rewards } = prog

  const email = input.email?.trim().toLowerCase() || null
  const phone = input.phone ? normalizePhone(input.phone.trim()) : null
  if (!email && !phone) return { recovered: false }

  // Carte du MÊME programme, correspondant au contact, sur un AUTRE appareil.
  const base = supabaseAdmin
    .from('loyalty_cards')
    .select('*')
    .eq('program_id', program.id)
    .neq('device_id', deviceId)
  const { data: found } = await (email
    ? base.ilike('email', email)
    : base.eq('phone', phone as string)
  )
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<CardRow>()

  if (!found) return { recovered: false }

  const today = parisToday()
  const currentCard = await getCard(program.id, deviceId)
  const transferToday =
    !!currentCard && currentCard.last_stamp_date === today && found.last_stamp_date !== today

  // 1. Supprimer la carte jetable de cet appareil (libère la contrainte UNIQUE
  //    (program_id, device_id)). Ses tampons partent en cascade — on a déjà
  //    déterminé si celui du jour doit être transféré.
  if (currentCard) {
    await supabaseAdmin.from('loyalty_cards').delete().eq('id', currentCard.id)
  }

  // 2. Transférer le tampon du jour si la carte récupérée ne l'a pas déjà.
  let recovered = found
  if (transferToday) {
    const newCount = found.stamp_count + 1
    await supabaseAdmin
      .from('loyalty_stamps')
      .upsert(
        { card_id: found.id, stamped_on: today },
        { onConflict: 'card_id,stamped_on', ignoreDuplicates: true }
      )
    await supabaseAdmin
      .from('loyalty_cards')
      .update({ stamp_count: newCount, last_stamp_date: today, updated_at: nowIso() })
      .eq('id', found.id)
    recovered = { ...found, stamp_count: newCount, last_stamp_date: today }
    await createPendingForThreshold(recovered, rewards, newCount)
  }

  // 3. Rattacher la carte récupérée à l'appareil courant.
  await supabaseAdmin
    .from('loyalty_cards')
    .update({ device_id: deviceId, updated_at: nowIso() })
    .eq('id', recovered.id)

  const finalCard = (await getCard(program.id, deviceId)) ?? recovered
  return {
    recovered: true,
    state: await buildState(rewards, finalCard, false, finalCard.last_stamp_date === today),
  }
}
