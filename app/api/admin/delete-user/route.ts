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
// Best-effort : si Supabase Storage râle, on log et on continue, le reste de la
// suppression doit pouvoir aboutir pour ne pas laisser de compte zombie.
async function purgeBusinessStorage(bucket: 'logos' | 'menus', businessId: string) {
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(businessId, { limit: 1000 })

  if (listError) {
    console.error(`[admin/delete-user] list ${bucket}/${businessId} failed`, listError)
    return
  }

  if (!files || files.length === 0) return

  const paths = files.map((f) => `${businessId}/${f.name}`)
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths)
  if (removeError) {
    console.error(`[admin/delete-user] remove ${bucket}/${businessId} failed`, removeError)
  }
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

    // 2-4. Supprime les enfants (feedback, reviews, scans) avant les business
    //      pour respecter les FK, dans l'ordre demandé.
    if (businessIds.length > 0) {
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

      // 4bis. Vide les buckets storage (logos / menus) — best-effort.
      for (const id of businessIds) {
        await purgeBusinessStorage('logos', id)
        await purgeBusinessStorage('menus', id)
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
