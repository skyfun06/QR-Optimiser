import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUser } from '@/lib/admin-auth'
import { listBusinessOptions } from '@/lib/plaques-admin'
import { normalizePlaqueCode, type PlaqueRow } from '@/lib/plaques'
import { EmptyScreen } from '@/components/state-screen'
import ActivationClient from './activation-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Plaque ScanAvis',
  robots: { index: false, follow: false },
}

/**
 * Lien PERMANENT imprimé sur les plaques (QR + NFC) : /p/<code>.
 *   • plaque activée     → redirection TEMPORAIRE (307) vers /review/<commerce>.
 *     Jamais de redirection permanente : les navigateurs la mettraient en cache
 *     et une réaffectation de plaque ne serait plus prise en compte.
 *   • plaque non activée → écran neutre, ou écran d'activation si l'admin est
 *     connecté (c'est lui qui active les plaques chez le commerçant).
 */
export default async function PlaquePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = normalizePlaqueCode(rawCode)
  if (!code) notFound()

  const { data: plaque, error } = await supabaseAdmin
    .from('plaques')
    .select('id, numero, code, business_id, activated_at, created_at')
    .eq('code', code)
    .maybeSingle<PlaqueRow>()

  if (error) {
    console.error('[plaque] lookup failed:', error.message)
    throw new Error('Plaque momentanément indisponible.')
  }
  if (!plaque) notFound()

  if (plaque.business_id) {
    redirect(`/review/${plaque.business_id}`)
  }

  const admin = await getAdminUser()
  if (!admin) {
    return (
      <EmptyScreen
        title="Plaque pas encore activée"
        message="Cette plaque sera bientôt active. Merci de réessayer un peu plus tard."
        secondaryAction={{
          label: 'Vous installez cette plaque ? Se connecter',
          href: `/login?next=${encodeURIComponent(`/p/${plaque.code}`)}`,
        }}
      />
    )
  }

  const businesses = await listBusinessOptions()
  return <ActivationClient code={plaque.code} numero={plaque.numero} businesses={businesses} />
}
