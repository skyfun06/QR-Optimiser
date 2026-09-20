import { VendeurStatusCard } from '@/components/vendeurs/status-card'

// Vendeur suspendu : page neutre, aucun accès à quoi que ce soit d'autre.
export default function VendeurSuspenduPage() {
  return (
    <VendeurStatusCard
      title="Accès suspendu"
      message="Ton accès à l'espace vendeur est actuellement suspendu."
    />
  )
}
