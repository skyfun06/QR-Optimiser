import { supabaseAdmin } from '@/lib/supabase-admin'

/** Commerce proposé à l'admin lors de l'activation / réaffectation d'une plaque. */
export type BusinessOption = {
  id: string
  name: string
  email: string
  createdAt: string | null
}

/**
 * Tous les commerces (plus récents d'abord) avec l'email du propriétaire, pour
 * distinguer deux commerces homonymes. Service role : réservé au serveur, et
 * uniquement après vérification admin.
 */
export async function listBusinessOptions(): Promise<BusinessOption[]> {
  const { data: businesses, error } = await supabaseAdmin
    .from('businesses')
    .select('id, name, user_id, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const emails = new Map<string, string>()
  for (let page = 1; ; page++) {
    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (usersError) throw new Error(usersError.message)
    data.users.forEach((u) => emails.set(u.id, u.email ?? ''))
    if (data.users.length < 1000) break
  }

  return (businesses ?? []).map((b) => ({
    id: b.id as string,
    name: (b.name as string | null) || 'Commerce sans nom',
    email: emails.get(b.user_id as string) ?? '',
    createdAt: (b.created_at as string | null) ?? null,
  }))
}

/**
 * Lie une plaque LIBRE à un commerce. La condition `business_id is null` rend
 * l'opération atomique : une plaque déjà activée n'est jamais écrasée par ce
 * chemin (la réaffectation volontaire passe par assignPlaque).
 */
export async function activateFreePlaque(code: string, businessId: string): Promise<'ok' | 'already' | 'unknown'> {
  const { data: business } = await supabaseAdmin.from('businesses').select('id').eq('id', businessId).maybeSingle()
  if (!business) return 'unknown'

  const { data, error } = await supabaseAdmin
    .from('plaques')
    .update({ business_id: businessId, activated_at: new Date().toISOString() })
    .eq('code', code)
    .is('business_id', null)
    .select('id')
  if (error) throw new Error(error.message)
  return data && data.length === 1 ? 'ok' : 'already'
}

/** Réaffecte (businessId) ou libère (null) une plaque — back-office admin. */
export async function assignPlaque(plaqueId: string, businessId: string | null): Promise<boolean> {
  if (businessId) {
    const { data: business } = await supabaseAdmin.from('businesses').select('id').eq('id', businessId).maybeSingle()
    if (!business) return false
  }
  const { data, error } = await supabaseAdmin
    .from('plaques')
    .update({ business_id: businessId, activated_at: businessId ? new Date().toISOString() : null })
    .eq('id', plaqueId)
    .select('id')
  if (error) throw new Error(error.message)
  return !!data && data.length === 1
}
