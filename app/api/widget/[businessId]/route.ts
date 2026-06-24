import { NextResponse } from 'next/server'
import { getWidgetData } from '@/lib/widget'

export const dynamic = 'force-dynamic'

// Endpoint public en LECTURE SEULE : note moyenne + nombre d'avis + nom.
// Aucune donnée privée. CORS ouvert pour permettre une lecture côté tiers.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params
  const data = await getWidgetData(businessId)

  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: CORS })
  }

  return NextResponse.json(
    { name: data.name, rating: data.rating, count: data.count },
    { headers: CORS }
  )
}
