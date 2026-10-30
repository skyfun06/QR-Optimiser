import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUser } from '@/lib/admin-auth'
import { assignPlaque, listBusinessOptions } from '@/lib/plaques-admin'
import type { PlaqueRow } from '@/lib/plaques'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Liste des plaques + commerces (pour l'affichage et la réaffectation). */
export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  try {
    const { data, error } = await supabaseAdmin
      .from('plaques')
      .select('id, numero, code, business_id, activated_at, created_at')
      .order('numero', { ascending: true })
      .returns<PlaqueRow[]>()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const businesses = await listBusinessOptions()
    return NextResponse.json({ plaques: data ?? [], businesses })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

/** Réaffecte une plaque à un commerce, ou la libère (businessId: null). */
export async function PATCH(request: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  let body: { plaqueId?: unknown; businessId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const plaqueId = typeof body.plaqueId === 'string' && UUID_RE.test(body.plaqueId) ? body.plaqueId : null
  const businessId =
    body.businessId === null ? null : typeof body.businessId === 'string' && UUID_RE.test(body.businessId) ? body.businessId : undefined
  if (!plaqueId || businessId === undefined) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  try {
    const ok = await assignPlaque(plaqueId, businessId)
    if (!ok) return NextResponse.json({ error: 'Plaque ou commerce introuvable.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
