/**
 * Logique d'accès partagée (serveur + client).
 *
 * Un seul champ pilote l'accès : `subscription_status`.
 *   - 'trial'     : essai en cours (accès OK tant que trial_ends_at > maintenant)
 *   - 'active'    : payant Stripe OU compte historique à vie (accès OK)
 *   - 'expired'   : essai dépassé (auto) ou abonnement terminé (accès coupé)
 *   - 'suspended' : coupure manuelle par l'admin (accès coupé)
 *
 * Fin d'essai automatique SANS cron : un statut 'trial' dont la date est
 * dépassée est traité comme 'expired' au moment de la lecture (statut effectif).
 */

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended'

export type AccessInput = {
  subscription_status: string | null
  trial_ends_at: string | null
}

const DAY_MS = 86_400_000

/** Statut réellement appliqué : un essai expiré devient 'expired'. */
export function effectiveStatus(input: AccessInput): SubscriptionStatus {
  const status = (input.subscription_status ?? 'active') as SubscriptionStatus
  if (status === 'trial' && input.trial_ends_at) {
    if (new Date(input.trial_ends_at).getTime() < Date.now()) return 'expired'
  }
  return status
}

/** true si le commerce donne accès au dashboard (essai en cours ou actif). */
export function hasAccess(input: AccessInput): boolean {
  const s = effectiveStatus(input)
  return s === 'trial' || s === 'active'
}

/**
 * Nombre de jours restants sur l'essai (arrondi au jour supérieur).
 * null si le commerce n'est pas en essai. Peut être négatif si l'essai est
 * déjà dépassé (utile pour l'affichage admin).
 */
export function trialDaysLeft(input: AccessInput): number | null {
  if ((input.subscription_status ?? '') !== 'trial' || !input.trial_ends_at) return null
  const ms = new Date(input.trial_ends_at).getTime() - Date.now()
  return Math.ceil(ms / DAY_MS)
}
