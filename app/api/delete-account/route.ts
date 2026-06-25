import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Vide un bucket storage pour un commerce. Lève une erreur si la liste ou la
// suppression échoue (la purge storage est BLOQUANTE avant la suppression du
// compte : on ne veut pas effacer le compte en laissant des fichiers orphelins).
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

export async function DELETE() {
  const cookieStore = await cookies()

  // Auth : on n'agit QUE sur le compte connecté (user.id issu de la session,
  // jamais d'un paramètre client).
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // 1. Récupère les commerces du compte (pour purger leur storage).
  const { data: businesses, error: bizError } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 500 })
  }

  const businessIds = (businesses ?? []).map((b) => b.id as string)

  // 2. Purge storage (logos + menus) — BLOQUANT. Si ça échoue, on N'EFFACE PAS
  //    le compte : on renvoie une erreur claire et on laisse tout en l'état.
  try {
    for (const id of businessIds) {
      await purgeBusinessStorage('logos', id)
      await purgeBusinessStorage('menus', id)
    }
  } catch (e) {
    console.error('[delete-account] purge storage failed:', e)
    return NextResponse.json(
      { error: "Le nettoyage de vos fichiers a échoué. Votre compte n'a pas été supprimé, réessayez." },
      { status: 500 }
    )
  }

  // 3. Suppression du compte Auth EN DERNIER. Toutes les FK étant ON DELETE
  //    CASCADE, cela supprime en base les businesses + reviews/feedback/scans/
  //    monthly_reports du compte (atomique côté DB). Le storage a déjà été purgé.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
