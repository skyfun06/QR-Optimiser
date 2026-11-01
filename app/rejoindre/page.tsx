import type { Metadata } from 'next'
import { RejoindreContent } from '@/components/vendeurs/rejoindre-content'
import { SiteFooter } from '@/components/site-footer'

// Page de recrutement publique — INDEXABLE (surcharge le noindex du layout).
export const metadata: Metadata = {
  title: 'Deviens vendeur ScanAvis — gagne jusqu’à 100 € par commerce',
  description:
    "Rejoins le réseau ScanAvis : démarche les commerces près de chez toi, apprends à vendre avec une formation gratuite, et gagne jusqu’à 100 € par commerce qui reste abonné 6 mois. Sans engagement, quand tu veux, dès 18 ans.",
  robots: { index: true, follow: true },
}

export default function RejoindrePage() {
  return (
    <>
      <RejoindreContent />
      <SiteFooter />
    </>
  )
}
