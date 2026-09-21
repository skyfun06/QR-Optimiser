import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Cormorant_Garamond } from 'next/font/google'

// Police display élégante et fine ("luxe"), chargée UNIQUEMENT sur le segment
// /rejoindre (exposée via --font-display, utilisée sur TOUS les titres de la
// page de recrutement — contraste voulu avec Space Grotesk du reste du site).
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
})

// Espace "Rejoindre le réseau" (vendeurs), servi sur le domaine principal.
// Par défaut noindex (inscription / connexion / dashboard / statuts). La page
// de recrutement /rejoindre surcharge cette valeur pour être indexable.
export const metadata: Metadata = {
  title: 'Espace vendeur · ScanAvis',
  robots: { index: false, follow: false },
}

export default function RejoindreLayout({ children }: { children: ReactNode }) {
  return (
    <main className={`${display.variable} min-h-screen w-full flex flex-col items-center px-4 py-8`}>
      {children}
    </main>
  )
}
