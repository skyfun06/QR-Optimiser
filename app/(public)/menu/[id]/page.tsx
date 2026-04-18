import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variables Supabase serveur manquantes.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export default async function MenuRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServerSupabaseClient()

  const { error: scanError } = await supabase.from('scans').insert({
    business_id: id,
    qr_type: 'menu',
  })

  if (scanError) {
    console.error('[menu scan] insertion failed:', scanError.message)
  }

  const { data } = await supabase
    .from('businesses')
    .select('menu_url')
    .eq('id', id)
    .maybeSingle<{ menu_url: string | null }>()

  const menuUrl = data?.menu_url?.trim()

  if (!menuUrl) notFound()
  redirect(menuUrl)
}
