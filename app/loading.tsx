import { LoadingScreen } from '@/components/state-screen'

// Fallback de chargement global (Suspense) affiché pendant le streaming des routes.
export default function Loading() {
  return <LoadingScreen />
}
