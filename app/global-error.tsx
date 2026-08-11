'use client' // Les error boundaries doivent être des Client Components

import { ErrorScreen } from '@/components/state-screen'
import './globals.css'

// Filet de sécurité ultime : remplace le root layout si une erreur y survient.
// Doit fournir ses propres <html>/<body> et importer les styles globaux.
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="en">
      <body
        className="min-h-full flex flex-col font-sans antialiased"
        style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}
      >
        <ErrorScreen
          onRetry={() => unstable_retry()}
          secondaryAction={{ label: "Retour à l'accueil", href: '/' }}
        />
      </body>
    </html>
  )
}
