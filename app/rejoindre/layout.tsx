import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

// Deux polices chargées UNIQUEMENT sur le segment /rejoindre (exposées en CSS
// vars). La page de recrutement les applique ; le reste du site garde Space Grotesk.
//   --font-body    : texte général de la page (un peu plus caractériel que la norme)
//   --font-display : accents "luxe" dans les titres (spans dorés), serif à caractère
const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})
const display = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
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
    <main className={`${body.variable} ${display.variable} min-h-screen w-full flex flex-col items-center px-4 py-8`}>
      {children}
    </main>
  )
}
