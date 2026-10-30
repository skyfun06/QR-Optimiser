/**
 * Plaques physiques pré-imprimées (QR + NFC). Voir db/migrations/0017_plaques.sql.
 *
 * Le lien imprimé est PERMANENT : `${PLAQUE_BASE_URL}/p/<code>`. Ne jamais
 * changer ce domaine ni ce chemin une fois des plaques fabriquées.
 */

export const PLAQUE_BASE_URL = 'https://www.qrscanavis.fr'

// 31 caractères : chiffres 2-9 + lettres sans I, L, O (pas de confusion 0/O, 1/I/L).
export const PLAQUE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const PLAQUE_CODE_LENGTH = 6

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/

/** Normalise un code saisi/scanné (casse, espaces) ; null s'il est invalide. */
export function normalizePlaqueCode(input: string): string | null {
  const code = input.trim().toUpperCase()
  return CODE_RE.test(code) ? code : null
}

export function plaqueUrl(code: string): string {
  return `${PLAQUE_BASE_URL}/p/${code}`
}

export type PlaqueRow = {
  id: string
  numero: number
  code: string
  business_id: string | null
  activated_at: string | null
  created_at: string
}
