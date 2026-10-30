// Vérifie un export de plaques EN RELISANT LES FICHIERS SUR LE DISQUE :
//   • chaque ligne du tableau correspond à une plaque en base (numéro ↔ code) ;
//   • le lien QR et le lien NFC valent exactement https://www.qrscanavis.fr/p/<code> ;
//   • chaque QR (SVG ET PNG) est décodé et contient exactement ce lien ;
//   • aucun doublon de numéro, de code ou de lien.
//
// Usage seul : node --import ./scripts/loy-test/preload.mjs scripts/plaques/verify.ts [dossier]
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import jsQR from 'jsqr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { plaqueUrl } from '@/lib/plaques'

export const CSV_NAME = 'plaques.csv'
export const CSV_HEADER = ['Numéro', 'Code', 'Lien QR code', 'Lien NFC', 'Fichier QR (SVG)', 'Fichier QR (PNG)']

async function decodeQr(file: string): Promise<string | null> {
  const { data, info } = await sharp(file, { density: 300 })
    .resize(800, 800, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height)
  return result?.data ?? null
}

export async function verifyExport(dir: string): Promise<string[]> {
  const errors: string[] = []
  const csvPath = join(dir, CSV_NAME)
  if (!existsSync(csvPath)) return [`Tableau introuvable : ${csvPath}`]

  const lines = readFileSync(csvPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  if (lines[0] !== CSV_HEADER.join(';')) errors.push('En-tête du tableau inattendu.')
  const rows = lines.slice(1).map((l) => l.split(';'))

  const { data: dbRows, error } = await supabaseAdmin.from('plaques').select('numero, code')
  if (error) return [`Lecture base : ${error.message}`]
  const dbByNumero = new Map((dbRows ?? []).map((p) => [p.numero as number, p.code as string]))

  const seen = { numero: new Set<string>(), code: new Set<string>(), link: new Set<string>() }
  for (const [i, cols] of rows.entries()) {
    const at = `ligne ${i + 2}`
    if (cols.length !== CSV_HEADER.length) { errors.push(`${at} : ${cols.length} colonnes`); continue }
    const [numero, code, qrLink, nfcLink, svgFile, pngFile] = cols

    for (const [key, value] of [['numero', numero], ['code', code], ['link', qrLink]] as const) {
      if (seen[key].has(value)) errors.push(`${at} : doublon ${key} ${value}`)
      seen[key].add(value)
    }

    const dbCode = dbByNumero.get(Number(numero))
    if (dbCode !== code) errors.push(`${at} : plaque n°${numero} = ${dbCode ?? 'absente'} en base, ${code} dans le tableau`)

    const expected = plaqueUrl(code)
    if (qrLink !== expected) errors.push(`${at} : lien QR ${qrLink} ≠ ${expected}`)
    if (nfcLink !== expected) errors.push(`${at} : lien NFC ${nfcLink} ≠ ${expected}`)

    for (const f of [svgFile, pngFile]) {
      const path = join(dir, f)
      if (!f.includes(code)) errors.push(`${at} : le fichier ${f} ne porte pas le code ${code}`)
      if (!existsSync(path)) { errors.push(`${at} : fichier manquant ${f}`); continue }
      const decoded = await decodeQr(path)
      if (decoded !== expected) errors.push(`${at} : ${f} décodé « ${decoded ?? 'illisible'} » ≠ ${expected}`)
    }
  }

  if (rows.length === 0) errors.push('Tableau vide.')
  console.log(`${rows.length} plaques vérifiées (${rows.length * 2} QR décodés).`)
  return errors
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = resolve(process.argv[2] ?? 'plaques-export')
  verifyExport(dir)
    .then((errors) => {
      if (errors.length) { console.error(`ÉCHEC — ${errors.length} erreur(s) :\n` + errors.join('\n')); process.exit(1) }
      console.log('OK — aucune erreur.')
      process.exit(0)
    })
    .catch((e) => { console.error(e); process.exit(1) })
}
