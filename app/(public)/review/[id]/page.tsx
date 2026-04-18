import { createClient } from '@supabase/supabase-js'
import ReviewClientPage from './review-client'

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

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServerSupabaseClient()

  const { error: scanError } = await supabase.from('scans').insert({
    business_id: id,
    qr_type: 'review',
  })

  if (scanError) {
    console.error('[review scan] insertion failed:', scanError.message)
  }

  return <ReviewClientPage businessId={id} />
}