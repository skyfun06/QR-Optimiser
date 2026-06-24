import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type WidgetData = {
  name: string | null
  rating: number | null
  count: number
}

// Données STRICTEMENT publiques pour le widget : nom du commerce, note moyenne,
// nombre d'avis. Aucune donnée privée (feedbacks internes, emails, abo) n'est lue.
export async function getWidgetData(businessId: string): Promise<WidgetData | null> {
  if (!businessId || !UUID_RE.test(businessId)) return null

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .maybeSingle<{ name: string | null }>()

  if (!biz) return null

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId)

  const ratings = (reviews ?? [])
    .map((r) => (r as { rating: number | null }).rating)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  const count = ratings.length
  const rating = count ? ratings.reduce((a, v) => a + v, 0) / count : null

  return { name: biz.name, rating, count }
}
