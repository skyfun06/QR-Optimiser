import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

// Service role : lecture des agrégats + écriture du bilan (bypass RLS).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Instancié dans le handler pour éviter un crash au build si la clé manque.
function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey: key })
}

type ReviewRow = { rating: number | null; created_at: string | null }
type FeedbackRow = { message: string | null }

// Mots vides FR (sans accents, car on retire les diacritiques avant comparaison).
const STOPWORDS = new Set([
  'avec', 'pour', 'tres', 'mais', 'dans', 'nous', 'vous', 'leur', 'leurs', 'etre',
  'fait', 'trop', 'plus', 'bien', 'rien', 'tout', 'tous', 'cette', 'comme', 'alors',
  'donc', 'elle', 'elles', 'sans', 'sous', 'meme', 'aussi', 'cela', 'celui', 'quand',
  'parce', 'etait', 'sont', 'avait', 'avons', 'avez', 'votre', 'notre', 'mais',
  'beaucoup', 'vraiment', 'jamais', 'toujours', 'quelque', 'quelques', 'autre', 'autres',
  'cette', 'etes', 'etait', 'etaient', 'fois', 'pris', 'apres', 'avant', 'encore',
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
    // Dédupe par message pour qu'un long commentaire ne domine pas.
    for (const w of new Set(words)) {
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map((e) => e[0])
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) return NextResponse.json({ error: userError.message }, { status: 401 })
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id,name')
      .eq('user_id', user.id)
      .maybeSingle<{ id: string; name: string | null }>()

    if (!business) return NextResponse.json({ content: null })

    // Mois précédent terminé (ex : si on est en juin, on bilan mai).
    const now = new Date()
    const targetStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const targetEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const month = monthKey(targetStart)
    const monthLabel = targetStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    // Déjà généré ? → on renvoie, AUCUN appel IA.
    const { data: existing } = await supabaseAdmin
      .from('monthly_reports')
      .select('content')
      .eq('business_id', business.id)
      .eq('month', month)
      .maybeSingle<{ content: string }>()

    if (existing) {
      return NextResponse.json({ month, monthLabel, content: existing.content })
    }

    // Agrégats côté serveur (reviews sur 2 mois pour la comparaison).
    const [{ data: reviews }, { data: scans }, { data: feedback }] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('rating,created_at')
        .eq('business_id', business.id)
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', targetEnd.toISOString()),
      supabaseAdmin
        .from('scans')
        .select('id')
        .eq('business_id', business.id)
        .gte('created_at', targetStart.toISOString())
        .lt('created_at', targetEnd.toISOString()),
      supabaseAdmin
        .from('feedback')
        .select('message')
        .eq('business_id', business.id)
        .gte('created_at', targetStart.toISOString())
        .lt('created_at', targetEnd.toISOString()),
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
    const ratings = targetReviews
      .map((r) => r.rating)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const avg = ratings.length ? ratings.reduce((a, v) => a + v, 0) / ratings.length : 0
    const scanCount = (scans ?? []).length
    const themes = extractThemes(((feedback ?? []) as FeedbackRow[]).map((f) => f.message ?? ''))

    // Pas d'activité le mois dernier → pas de bilan, donc aucun appel IA.
    if (targetReviews.length === 0 && scanCount === 0) {
      return NextResponse.json({ month, monthLabel, content: null })
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

    const content = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()

    if (!content) return NextResponse.json({ month, monthLabel, content: null })

    // Stockage — l'unicité (business_id, month) protège contre les doublons/race.
    const { error: insErr } = await supabaseAdmin
      .from('monthly_reports')
      .insert({ business_id: business.id, month, content })

    if (insErr && (insErr as { code?: string }).code !== '23505') {
      console.error('[monthly-report] insert error', insErr)
    }

    return NextResponse.json({ month, monthLabel, content })
  } catch (err) {
    console.error('[monthly-report] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
