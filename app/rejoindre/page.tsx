import type { Metadata } from 'next'
import { RejoindreContent } from '@/components/vendeurs/rejoindre-content'

// Page de recrutement publique — INDEXABLE (surcharge le noindex du layout).
export const metadata: Metadata = {
  title: 'Deviens vendeur ScanAvis — gagne 35 € par commerce signé',
  description:
    "Rejoins le réseau ScanAvis : démarche les commerces près de chez toi, apprends à vendre avec une formation gratuite, et sois payé 35 € pour chaque commerce signé. Sans engagement, quand tu veux, dès 18 ans.",
  robots: { index: true, follow: true },
}

export default function RejoindrePage() {
  return <RejoindreContent />
}
