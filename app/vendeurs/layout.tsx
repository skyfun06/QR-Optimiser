import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Espace vendeur (sous-domaine vendeurs.qrscanavis.fr). Aucun lien depuis le
// site public → on interdit aussi l'indexation par les moteurs.
export const metadata: Metadata = {
  title: 'Espace vendeur · ScanAvis',
  robots: { index: false, follow: false },
}

export default function VendeursLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8">
      {children}
    </main>
  )
}
