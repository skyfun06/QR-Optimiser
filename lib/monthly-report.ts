import type { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// -----------------------------------------------------------------------------
// Génération / lecture du bilan mensuel IA d'un commerce.
// Utilisé par la route admin (génération manuelle) et la route commerçant
// (lecture seule). Le stockage se fait dans public.monthly_reports
// (contrainte d'unicité business_id + month).
// -----------------------------------------------------------------------------

type ReviewRow = { rating: number | null; created_at: string | null }
type FeedbackRow = { message: string | null }

export type MonthlyReport = { month: string; monthLabel: string; content: string | null }

// Mots vides FR (sans accents : on retire les diacritiques avant comparaison).
const STOPWORDS = new Set([
  'avec', 'pour', 'tres', 'mais', 'dans', 'nous', 'vous', 'leur', 'leurs', 'etre',
  'fait', 'trop', 'plus', 'bien', 'rien', 'tout', 'tous', 'cette', 'comme', 'alors',
  'donc', 'elle', 'elles', 'sans', 'sous', 'meme', 'aussi', 'cela', 'celui', 'quand',
  'parce', 'etait', 'sont', 'avait', 'avons', 'avez', 'votre', 'notre',
  'beaucoup', 'vraiment', 'jamais', 'toujours', 'quelque', 'quelques', 'autre', 'autres',
  'etes', 'etaient', 'fois', 'pris', 'apres', 'avant', 'encore',
])

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Extraction de thèmes par fréquence de mots (gratuit, sans IA).
function extractThemes(messages: string[], max = 3): string[] {
  const freq = new Map<string, number>()
  for (const m of messages) {
    const words = (m || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    for (const w of new Set(words)) {
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map((e) => e[0])
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey: key })
}

/** Bornes du mois cible (offset en mois ; 1 = mois précédent complet). */
function monthWindow(monthOffset: number) {
  const now = new Date()
  const targetStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const targetEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1)
  const prevStart = new Date(now.getFullYear(), now.getMonth() - monthOffset - 1, 1)
  return {
    targetStart,
    targetEnd,
    prevStart,
    month: monthKey(targetStart),
    monthLabel: targetStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
}

/** Lit le bilan déjà stocké (sans IA). */
export async function getStoredMonthlyReport(
  admin: SupabaseClient,
  businessId: string,
  monthOffset = 1
): Promise<MonthlyReport> {
  const { month, monthLabel } = monthWindow(monthOffset)
  const { data } = await admin
    .from('monthly_reports')
    .select('content')
    .eq('business_id', businessId)
    .eq('month', month)
    .maybeSingle<{ content: string }>()
  return { month, monthLabel, content: data?.content ?? null }
}

/**
 * Génère (via IA) puis stocke le bilan d'un commerce. `force` réécrit l'existant.
 * Renvoie `generated: false` si un bilan existait déjà (sans force) ou si le mois
 * n'a aucune activité (aucun appel IA dans ces cas).
 */
export async function generateMonthlyReport(
  admin: SupabaseClient,
  businessId: string,
  opts: { monthOffset?: number; force?: boolean } = {}
): Promise<MonthlyReport & { generated: boolean }> {
  const monthOffset = opts.monthOffset ?? 1
  const { targetStart, targetEnd, prevStart, month, monthLabel } = monthWindow(monthOffset)

  if (!opts.force) {
    const { data: existing } = await admin
      .from('monthly_reports')
      .select('content')
      .eq('business_id', businessId)
      .eq('month', month)
      .maybeSingle<{ content: string }>()
    if (existing) return { month, monthLabel, content: existing.content, generated: false }
  }

  const [{ data: reviews }, { data: scans }, { data: feedback }] = await Promise.all([
    admin.from('reviews').select('rating,created_at').eq('business_id', businessId).gte('created_at', prevStart.toISOString()).lt('created_at', targetEnd.toISOString()),
    admin.from('scans').select('id').eq('business_id', businessId).gte('created_at', targetStart.toISOString()).lt('created_at', targetEnd.toISOString()),
    admin.from('feedback').select('message').eq('business_id', businessId).gte('created_at', targetStart.toISOString()).lt('created_at', targetEnd.toISOString()),
  ])

  const inTarget = (iso: string | null) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= targetStart.getTime() && t < targetEnd.getTime()
  }
  const inPrev = (iso: string | null) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= prevStart.getTime() && t < targetStart.getTime()
  }

  const revRows = (reviews ?? []) as ReviewRow[]
  const targetReviews = revRows.filter((r) => inTarget(r.created_at))
  const prevCount = revRows.filter((r) => inPrev(r.created_at)).length
  const ratings = targetReviews.map((r) => r.rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const avg = ratings.length ? ratings.reduce((a, v) => a + v, 0) / ratings.length : 0
  const scanCount = (scans ?? []).length
  const themes = extractThemes(((feedback ?? []) as FeedbackRow[]).map((f) => f.message ?? ''))

  // Aucune activité → pas de bilan (aucun appel IA).
  if (targetReviews.length === 0 && scanCount === 0) {
    return { month, monthLabel, content: null, generated: false }
  }

  const avgStr = avg > 0 ? avg.toFixed(1).replace('.', ',') : '—'
  const promptLines = [
    `Mois : ${monthLabel}.`,
    `Avis collectés : ${targetReviews.length} (mois précédent : ${prevCount}).`,
    `Note moyenne : ${avgStr}/5.`,
    `Scans : ${scanCount}.`,
  ]
  if (themes.length) {
    promptLines.push(`Sujets qui reviennent dans les retours clients : ${themes.join(', ')}.`)
  }
  promptLines.push('Rédige le bilan.')

  const anthropic = getAnthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system:
      "Tu rédiges un bilan mensuel court pour le patron d'un commerce local, non technique. " +
      'Français, 3 à 4 phrases maximum, ton professionnel et bienveillant. ' +
      "Pas de jargon, pas de listes à puces, pas de markdown. Termine par un point d'attention concret si pertinent.",
    messages: [{ role: 'user', content: promptLines.join(' ') }],
  })

  const content = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
  if (!content) return { month, monthLabel, content: null, generated: false }

  // Upsert : réécrit si le bilan du mois existait déjà (régénération admin).
  const { error: upErr } = await admin
    .from('monthly_reports')
    .upsert({ business_id: businessId, month, content }, { onConflict: 'business_id,month' })
  if (upErr) console.error('[monthly-report] upsert error', upErr)

  return { month, monthLabel, content, generated: true }
}
