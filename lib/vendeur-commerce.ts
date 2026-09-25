// Config partagée des formules d'abonnement vendues par les vendeurs.
// Source unique : formulaire d'inscription (labels/prix), checkout Stripe
// (sélection du prix par formule) et webhook (montants de commission).

export type Formule = 'qr' | 'qr_nfc'

export const FORMULES: Record<
  Formule,
  {
    label: string
    /** Prix mensuel affiché (€). */
    prixMensuel: number
    /** Commissions vendeur [part 1 (1er paiement), part 2 (3e mois)]. */
    commissions: [number, number]
    /** Nom de la variable d'env portant le Stripe Price ID de cette formule. */
    stripePriceEnv: 'STRIPE_PRICE_QR' | 'STRIPE_PRICE_QR_NFC'
  }
> = {
  qr: {
    label: 'QR code',
    prixMensuel: 35,
    commissions: [17.5, 17.5],
    stripePriceEnv: 'STRIPE_PRICE_QR',
  },
  qr_nfc: {
    label: 'QR + plaque NFC',
    prixMensuel: 40,
    commissions: [20, 20],
    stripePriceEnv: 'STRIPE_PRICE_QR_NFC',
  },
}

export function isFormule(value: unknown): value is Formule {
  return value === 'qr' || value === 'qr_nfc'
}

/**
 * Stripe Price ID pour une formule (serveur uniquement). Repli sur
 * STRIPE_PRICE_ID tant que les prix dédiés ne sont pas configurés, pour ne
 * jamais bloquer un paiement.
 */
export function stripePriceForFormule(formule: Formule): string | undefined {
  return process.env[FORMULES[formule].stripePriceEnv] || process.env.STRIPE_PRICE_ID
}
