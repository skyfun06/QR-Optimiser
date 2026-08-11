import { EmptyScreen } from '@/components/state-screen'

export const metadata = {
  title: 'Page introuvable',
}

export default function NotFound() {
  return (
    <EmptyScreen
      title="Page introuvable"
      message="La page que vous cherchez n’existe pas ou a été déplacée."
      action={{ label: "Retour à l'accueil", href: '/' }}
    />
  )
}
