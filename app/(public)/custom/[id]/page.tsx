import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables Supabase publiques manquantes.')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export default async function CustomRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getPublicSupabaseClient()

  await supabase.from('scans').insert({
    business_id: id,
    qr_type: 'custom',
  })

  const { data } = await supabase
    .from('businesses')
    .select('custom_url')
    .eq('id', id)
    .maybeSingle<{ custom_url: string | null }>()

  redirect(data?.custom_url || '/merci')
}
