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

export default async function CustomRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServerSupabaseClient()

  const { error: scanError } = await supabase.from('scans').insert({
    business_id: id,
    qr_type: 'custom',
  })

  if (scanError) {
    console.error('[custom scan] insertion failed:', scanError.message)
  }

  const { data } = await supabase
    .from('businesses')
    .select('custom_url')
    .eq('id', id)
    .maybeSingle<{ custom_url: string | null }>()

  const customUrl = data?.custom_url?.trim()

  if (!customUrl) notFound()
  redirect(customUrl)
}
