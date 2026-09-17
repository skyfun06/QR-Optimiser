import { VendeurDashboard } from '@/components/vendeurs/dashboard'

// Page principale de l'espace vendeur (statuts formation / actif, routés ici
// par le proxy). Le dashboard s'affiche pour les vendeurs actifs ; les autres
// voient un accueil sobre. Lecture seule, isolée par RLS.
export default function VendeurAccueilPage() {
  return <VendeurDashboard />
}
