'use server'

/**
 * Server Actions de la carte de fidélité, appelées depuis le navigateur une
 * fois la page affichée.
 *
 * Pourquoi une Server Action et pas le rendu de la page : les aperçus de lien
 * (WhatsApp, iMessage, robots) ouvrent /review/[id] tout seuls. Si on créait la
 * carte / posait le tampon pendant le rendu, ces ouvertures fausseraient les
 * stats. Ici, rien n'est écrit tant que le navigateur réel n'a pas déclenché
 * l'action après l'affichage.
 *
 * L'identifiant d'appareil provient du cookie httpOnly `sa_device` posé par le
 * serveur dans proxy.ts (illisible en JS → on le relit ici côté serveur).
 */
import { cookies } from 'next/headers'
import {
  applyScan,
  validateReward,
  saveContact,
  recoverCard,
  type LoyaltyState,
} from '@/lib/loyalty'

const DEVICE_COOKIE = 'sa_device'

async function getDeviceId(): Promise<string | null> {
  const store = await cookies()
  return store.get(DEVICE_COOKIE)?.value ?? null
}

/** État « fidélité inactive » renvoyé quand on ne peut pas suivre l'appareil. */
function inactive(): LoyaltyState {
  return {
    active: false,
    hasCard: false,
    stampCount: 0,
    cycle: 1,
    rewards: [],
    maxThreshold: 0,
    nextReward: null,
    justStamped: false,
    alreadyStampedToday: false,
    pendingReward: null,
    contactSaved: false,
  }
}

/** Enregistre la visite (carte + tampon du jour) et renvoie l'état complet. */
export async function recordVisitAction(businessId: string): Promise<LoyaltyState> {
  const deviceId = await getDeviceId()
  if (!deviceId) return inactive()
  return applyScan(businessId, deviceId)
}

/** Valide une récompense obtenue (après confirmation côté client). */
export async function validateRewardAction(
  businessId: string,
  redemptionId: string
): Promise<LoyaltyState> {
  const deviceId = await getDeviceId()
  if (!deviceId) return inactive()
  return validateReward(businessId, deviceId, redemptionId)
}

/** Sauvegarde email OU téléphone pour retrouver la carte plus tard. */
export async function saveContactAction(
  businessId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<{ ok: boolean; error?: 'inactive' | 'empty' | 'email' | 'phone'; state?: LoyaltyState }> {
  const deviceId = await getDeviceId()
  if (!deviceId) return { ok: false, error: 'inactive' }
  return saveContact(businessId, deviceId, input)
}

/** Rattache une carte existante (email OU téléphone) à l'appareil courant. */
export async function recoverCardAction(
  businessId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<{ recovered: boolean; state?: LoyaltyState }> {
  const deviceId = await getDeviceId()
  if (!deviceId) return { recovered: false }
  return recoverCard(businessId, deviceId, input)
}
