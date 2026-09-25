import { VendeurEspace } from '@/components/vendeurs/espace'

// Page principale de l'espace vendeur (statuts formation / actif, routés ici
// par le proxy). Coquille à onglets : « Tableau de bord » et « Formation »,
// cette dernière restant accessible en permanence. Lecture seule, isolée par RLS.
export default function VendeurAccueilPage() {
  return <VendeurEspace />
}
