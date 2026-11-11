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
    /** Nom de la variable d'env portant le Stripe Price ID de cette formule. */
    stripePriceEnv: 'STRIPE_PRICE_QR' | 'STRIPE_PRICE_QR_NFC'
  }
> = {
  // Clés techniques inchangées (`qr` / `qr_nfc`, stockées en base et chez
  // Stripe) ; seuls les noms affichés ont changé. Premium = carte de fidélité
  // + plaque NFC (cf. hasLoyaltyAccess dans lib/access.ts).
  qr: {
    label: 'Essentiel',
    prixMensuel: 35,
    stripePriceEnv: 'STRIPE_PRICE_QR',
  },
  qr_nfc: {
    label: 'Premium',
    prixMensuel: 40,
    stripePriceEnv: 'STRIPE_PRICE_QR_NFC',
  },
}

/**
 * Barème vendeur : gain CUMULÉ, en multiple de l'abonnement mensuel, quand le
 * commerce atteint `mois` mois payés. Une part de commission par palier.
 */
export const PALIERS_COMMISSION = [
  { part: 1, mois: 1, multiple: 0.5 },
  { part: 2, mois: 3, multiple: 1 },
  { part: 3, mois: 6, multiple: 2.5 },
] as const

export type PartCommission = (typeof PALIERS_COMMISSION)[number]['part']

/** Gain cumulé (€) d'une formule une fois le palier atteint. */
export function commissionCumulee(formule: Formule, part: PartCommission): number {
  const palier = PALIERS_COMMISSION.find((p) => p.part === part)!
  return FORMULES[formule].prixMensuel * palier.multiple
}

/** Montant (€) du seul versement d'un palier : l'écart avec le palier précédent. */
export function montantCommission(formule: Formule, part: PartCommission): number {
  return commissionCumulee(formule, part) - (part > 1 ? commissionCumulee(formule, (part - 1) as PartCommission) : 0)
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

/**
 * Formule correspondant à un Stripe Price ID (serveur uniquement). null si le
 * prix n'est pas un prix dédié connu (ex. repli STRIPE_PRICE_ID) : on ne devine
 * pas, l'appelant garde alors la formule déjà enregistrée.
 */
export function formuleForStripePrice(priceId: string | null | undefined): Formule | null {
  if (!priceId) return null
  for (const f of Object.keys(FORMULES) as Formule[]) {
    if (process.env[FORMULES[f].stripePriceEnv] === priceId) return f
  }
  return null
}
