import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Vide un bucket storage du commerce. Lève une erreur si list/remove échoue :
// la purge est BLOQUANTE avant toute suppression en base (pas de fichiers
// orphelins). Même garantie que /api/delete-account.
async function purgeBusinessStorage(bucket: 'logos' | 'menus', businessId: string) {
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(businessId, { limit: 1000 })

  if (listError) throw new Error(`list ${bucket}/${businessId}: ${listError.message}`)
  if (!files || files.length === 0) return

  const paths = files.map((f) => `${businessId}/${f.name}`)
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths)
  if (removeError) throw new Error(`remove ${bucket}/${businessId}: ${removeError.message}`)
}

export async function DELETE(request: NextRequest) {
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
    }

    const businessId =
      body && typeof body === 'object' && 'businessId' in body && typeof (body as { businessId: unknown }).businessId === 'string'
        ? (body as { businessId: string }).businessId
        : null

    if (!businessId || !UUID_RE.test(businessId)) {
      return NextResponse.json({ error: 'businessId invalide.' }, { status: 400 })
    }

    // Vérifie la propriété : le commerce doit appartenir à l'utilisateur connecté.
    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id,user_id')
      .eq('id', businessId)
      .maybeSingle<{ id: string; user_id: string }>()

    if (bizError) return NextResponse.json({ error: bizError.message }, { status: 500 })
    if (!business || business.user_id !== user.id) {
      // Anti-énumération : même réponse que "introuvable" si ce n'est pas le sien.
      return NextResponse.json({ error: 'Commerce introuvable.' }, { status: 404 })
    }

    // Purge le storage (logos / menus) EN PREMIER — BLOQUANT. Si ça échoue, on
    // n'exécute AUCUNE suppression en base (pas de fichiers orphelins).
    try {
      await purgeBusinessStorage('logos', businessId)
      await purgeBusinessStorage('menus', businessId)
    } catch (e) {
      console.error('[business/delete] purge storage failed:', e)
      return NextResponse.json(
        { error: "Le nettoyage des fichiers a échoué. Le commerce n'a pas été supprimé, réessayez." },
        { status: 500 }
      )
    }

    // Supprime les enfants avant la ligne business (FK non garantie en cascade),
    // via service role. business_id uniquement → n'affecte AUCUN autre commerce.
    for (const table of ['feedback', 'reviews', 'scans'] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq('business_id', businessId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    // monthly_reports : FK ON DELETE CASCADE → supprimé automatiquement avec le
    // commerce. On ne le supprime pas explicitement (la table peut ne pas encore
    // exister puisque la feature bilan est gelée), pour éviter une erreur "table absente".

    // Supprime le commerce.
    const { error: deleteError } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('id', businessId)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
