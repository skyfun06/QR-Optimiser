import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

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
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  if (user.email !== ADMIN_EMAIL) return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { user }
}

async function purgeBusinessStorage(bucket: 'logos' | 'menus', businessId: string) {
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(businessId, { limit: 1000 })
  if (listError) {
    console.error(`[admin/delete-business] list ${bucket}/${businessId} failed`, listError)
    return
  }
  if (!files || files.length === 0) return
  const paths = files.map((f) => `${businessId}/${f.name}`)
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths)
  if (removeError) {
    console.error(`[admin/delete-business] remove ${bucket}/${businessId} failed`, removeError)
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

    const businessId =
      body && typeof body === 'object' && 'businessId' in body && typeof (body as { businessId: unknown }).businessId === 'string'
        ? (body as { businessId: string }).businessId
        : null

    if (!businessId || !UUID_RE.test(businessId)) {
      return NextResponse.json({ error: 'businessId invalide.' }, { status: 400 })
    }

    // Supprime les enfants (business_id uniquement) avant la ligne business.
    // monthly_reports : FK ON DELETE CASCADE → supprimé avec le commerce (et la
    // table peut ne pas exister), donc pas de suppression explicite.
    for (const table of ['feedback', 'reviews', 'scans'] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq('business_id', businessId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    await purgeBusinessStorage('logos', businessId)
    await purgeBusinessStorage('menus', businessId)

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
