import type { SupabaseClient } from '@supabase/supabase-js'
import { FORMULES, isFormule } from './vendeur-commerce'

// Déclenchement des commissions d'une vente au 1er paiement du commerce.
// Partagé entre le webhook Stripe (paiement réel) et l'acceptation d'une
// réclamation par l'admin quand le commerce est déjà abonné.
//
// La vente passe en "abonné" (date du 1er paiement) et les deux parts sont
// créées : part 1 (1er paiement) devient "à verser", part 2 (3e mois) reste
// "en attente". Idempotent : ne rejoue rien si la vente est déjà déclenchée.
export async function declencherCommissionSiVente(admin: SupabaseClient, businessId: string) {
  const { data: vente } = await admin
    .from('ventes')
    .select('id,formule,date_premier_paiement')
    .eq('business_id', businessId)
    .maybeSingle<{ id: string; formule: string; date_premier_paiement: string | null }>()

  if (!vente || vente.date_premier_paiement) return // pas de vente, ou déjà déclenchée
  if (!isFormule(vente.formule)) return

  const now = new Date().toISOString()
  const [montant1, montant2] = FORMULES[vente.formule].commissions

  await admin
    .from('ventes')
    .update({ date_premier_paiement: now, statut_commerce: 'abonne' })
    .eq('id', vente.id)

  // upsert idempotent (unique (vente_id, part)).
  await admin.from('commissions').upsert(
    [
      { vente_id: vente.id, part: 1, montant: montant1, statut: 'a_payer', date_passage_a_payer: now },
      { vente_id: vente.id, part: 2, montant: montant2, statut: 'en_attente' },
    ],
    { onConflict: 'vente_id,part', ignoreDuplicates: true }
  )
}
