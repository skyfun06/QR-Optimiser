import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Espace "Rejoindre le réseau" (vendeurs), servi sur le domaine principal.
// Par défaut noindex (inscription / connexion / dashboard / statuts). La page
// de recrutement /rejoindre surcharge cette valeur pour être indexable.
export const metadata: Metadata = {
  title: 'Espace vendeur · ScanAvis',
  robots: { index: false, follow: false },
}

export default function RejoindreLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-10">
      {children}
    </main>
  )
}
