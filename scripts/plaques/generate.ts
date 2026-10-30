// Crée un lot de plaques en base (codes aléatoires uniques, numéros suivis).
// La base est la SOURCE DE VÉRITÉ : l'export (QR + tableau) est ensuite relu
// depuis la base par export.ts, jamais depuis la mémoire de ce script.
//
// Usage : node --import ./scripts/loy-test/preload.mjs scripts/plaques/generate.ts 100
import { randomInt } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLAQUE_ALPHABET, PLAQUE_CODE_LENGTH, normalizePlaqueCode } from '@/lib/plaques'

function randomCode(): string {
  let code = ''
  for (let i = 0; i < PLAQUE_CODE_LENGTH; i++) code += PLAQUE_ALPHABET[randomInt(PLAQUE_ALPHABET.length)]
  return code
}

async function main() {
  const count = Number(process.argv[2] ?? 100)
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Nombre de plaques invalide (1 à 1000).')

  const { data: existing, error } = await supabaseAdmin.from('plaques').select('numero, code')
  if (error) throw new Error(`Lecture plaques : ${error.message} (migration 0017 appliquée ?)`)

  const usedCodes = new Set((existing ?? []).map((p) => p.code as string))
  const startNumero = Math.max(0, ...(existing ?? []).map((p) => p.numero as number)) + 1

  const rows: { numero: number; code: string }[] = []
  while (rows.length < count) {
    const code = randomCode()
    if (!normalizePlaqueCode(code)) throw new Error(`Code généré invalide : ${code}`)
    if (usedCodes.has(code)) continue
    usedCodes.add(code)
    rows.push({ numero: startNumero + rows.length, code })
  }

  // Insertion en une seule requête : tout ou rien (contraintes UNIQUE en base).
  const { error: insertError } = await supabaseAdmin.from('plaques').insert(rows)
  if (insertError) throw new Error(`Insertion : ${insertError.message}`)

  console.log(`${count} plaques créées : n°${startNumero} à n°${startNumero + count - 1}.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
