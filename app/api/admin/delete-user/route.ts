import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin() {
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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }

  if (user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user }
}

// On vide les buckets storage du commerce avant de supprimer la ligne en base.
// Purge BLOQUANTE : lève une erreur si list/remove échoue, pour ne jamais
// supprimer le compte en laissant des fichiers orphelins (même garantie que
// /api/delete-account).
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
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
    }

    const userId =
      body && typeof body === 'object' && 'userId' in body && typeof (body as { userId: unknown }).userId === 'string'
        ? (body as { userId: string }).userId
        : null

    if (!userId || !UUID_RE.test(userId)) {
      return NextResponse.json({ error: 'userId invalide.' }, { status: 400 })
    }

    if (userId === adminCheck.user.id) {
      return NextResponse.json(
        { error: 'Impossible de supprimer son propre compte admin.' },
        { status: 400 }
      )
    }

    // 1. Récupère les business du user (peut être 0 ou plusieurs).
    const { data: businesses, error: businessFetchError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', userId)

    if (businessFetchError) {
      return NextResponse.json({ error: businessFetchError.message }, { status: 500 })
    }

    const businessIds = (businesses ?? []).map((b) => b.id as string)

    if (businessIds.length > 0) {
      // 2. Purge storage (logos / menus) EN PREMIER — BLOQUANT. Si ça échoue, on
      //    n'exécute AUCUNE suppression en base (pas de fichiers orphelins).
      try {
        for (const id of businessIds) {
          await purgeBusinessStorage('logos', id)
          await purgeBusinessStorage('menus', id)
        }
      } catch (e) {
        console.error('[admin/delete-user] purge storage failed:', e)
        return NextResponse.json(
          { error: "Le nettoyage des fichiers a échoué. Le compte n'a pas été supprimé, réessayez." },
          { status: 500 }
        )
      }

      // 3-5. Supprime les enfants (feedback, reviews, scans) avant les business
      //      pour respecter les FK, dans l'ordre demandé.
      const { error: feedbackError } = await supabaseAdmin
        .from('feedback')
        .delete()
        .in('business_id', businessIds)
      if (feedbackError) {
        return NextResponse.json({ error: feedbackError.message }, { status: 500 })
      }

      const { error: reviewsError } = await supabaseAdmin
        .from('reviews')
        .delete()
        .in('business_id', businessIds)
      if (reviewsError) {
        return NextResponse.json({ error: reviewsError.message }, { status: 500 })
      }

      const { error: scansError } = await supabaseAdmin
        .from('scans')
        .delete()
        .in('business_id', businessIds)
      if (scansError) {
        return NextResponse.json({ error: scansError.message }, { status: 500 })
      }
    }

    // 5. Supprime les business du user.
    const { error: businessDeleteError } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('user_id', userId)
    if (businessDeleteError) {
      return NextResponse.json({ error: businessDeleteError.message }, { status: 500 })
    }

    // 6. Supprime l'utilisateur Supabase Auth.
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
