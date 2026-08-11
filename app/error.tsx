'use client' // Les error boundaries doivent être des Client Components

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/state-screen'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorScreen
      onRetry={() => unstable_retry()}
      secondaryAction={{ label: "Retour à l'accueil", href: '/' }}
    />
  )
}
