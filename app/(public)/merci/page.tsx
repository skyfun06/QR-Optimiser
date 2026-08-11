import MerciClient from './merci-client'

export const metadata = {
  title: 'Merci pour votre retour',
}

// Le contenu visible est traduit côté client (FR/EN) selon le choix du client
// final. La metadata (titre d'onglet) reste statique, non dépendante du client.
export default function MerciPage() {
  return <MerciClient />
}
