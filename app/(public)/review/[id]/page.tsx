import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { hasAccess } from '@/lib/access'
import { isSafeHttpUrl } from '@/lib/security'
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
  subscription_status: string | null
  trial_ends_at: string | null
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServerSupabaseClient()

  // On lit le commerce côté serveur : zéro flicker, zéro état "loading", et on
  // évite tout problème RLS sur la view public_businesses depuis le navigateur.
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, google_review_url, subscription_status, trial_ends_at')
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

  // RÈGLE CRITIQUE : la page scannée par les clients finaux n'est JAMAIS bloquée.
  // Si l'essai du commerçant est terminé ou son compte suspendu, on redirige
  // directement vers la fiche Google, sans le formulaire de satisfaction.
  // Le commerçant perd sa valeur ajoutée (le tri des avis), pas la face devant
  // ses clients. (redirect() est appelé hors try/catch : il lève volontairement.)
  if (!hasAccess(business)) {
    if (business.google_review_url && isSafeHttpUrl(business.google_review_url)) {
      redirect(business.google_review_url)
    }
    // Pas de lien Google configuré : rien vers quoi rediriger → page neutre.
    notFound()
  }

  return <ReviewClientPage business={business} />
}
