import { VendeurStatusCard } from '@/components/vendeurs/status-card'

// Vendeur au statut "en_attente" : sa candidature est en cours d'examen. Il ne
// voit rien d'autre (le routing du sous-domaine le maintient sur cette page).
export default function VendeurEnAttentePage() {
  return (
    <VendeurStatusCard
      title="Ta candidature est en cours d'examen"
      message="Nous étudions ton inscription au réseau. Tu recevras une réponse très prochainement."
    />
  )
}
