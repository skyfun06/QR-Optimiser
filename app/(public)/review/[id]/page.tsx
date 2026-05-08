import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
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

type BusinessRow = {
  id: string
  name: string | null
  google_review_url: string | null
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServerSupabaseClient()

  // On lit le commerce côté serveur : zéro flicker, zéro état "loading", et on
  // évite tout problème RLS sur la view public_businesses depuis le navigateur.
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, google_review_url')
    .eq('id', id)
    .maybeSingle<BusinessRow>()

  if (businessError) {
    console.error('[review business] fetch failed:', businessError.message)
  }

  if (!business) {
    notFound()
  }

  // Compteur de scans — fire-and-forget, ne doit jamais bloquer le rendu.
  const { error: scanError } = await supabase.from('scans').insert({
    business_id: id,
    qr_type: 'review',
  })

  if (scanError) {
    console.error('[review scan] insertion failed:', scanError.message)
  }

  return <ReviewClientPage business={business} />
}
