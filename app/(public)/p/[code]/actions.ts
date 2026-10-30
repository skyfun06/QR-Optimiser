'use server'

import { getAdminUser } from '@/lib/admin-auth'
import { activateFreePlaque } from '@/lib/plaques-admin'
import { normalizePlaqueCode } from '@/lib/plaques'

export type ActivateResult = { ok: true } | { ok: false; error: string }

/** Activation d'une plaque libre par l'admin, depuis le scan de la plaque. */
export async function activatePlaqueAction(rawCode: string, businessId: string): Promise<ActivateResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Accès réservé à l’administrateur.' }

  const code = normalizePlaqueCode(rawCode)
  if (!code) return { ok: false, error: 'Code de plaque invalide.' }

  try {
    const result = await activateFreePlaque(code, businessId)
    if (result === 'unknown') return { ok: false, error: 'Commerce introuvable.' }
    if (result === 'already') {
      return { ok: false, error: 'Cette plaque est déjà activée. Pour la changer, passez par Admin → Plaques.' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[plaque] activation failed:', e)
    return { ok: false, error: 'L’activation a échoué, réessayez.' }
  }
}
