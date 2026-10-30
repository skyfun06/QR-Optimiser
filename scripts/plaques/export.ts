// Exporte les plaques EN BASE vers un dossier prêt pour le fournisseur, puis
// vérifie le résultat (verify.ts) en décodant chaque QR écrit sur le disque.
//
//   plaques-export/plaques.csv               (séparateur « ; », ouvrable dans Excel)
//   plaques-export/qr/plaque-001-K7M2QX.svg  (vectoriel, pour l'impression)
//   plaques-export/qr/plaque-001-K7M2QX.png  (2000 px, fond blanc)
//
// Usage : node --import ./scripts/loy-test/preload.mjs scripts/plaques/export.ts [dossier]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import QRCode from 'qrcode'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { plaqueUrl } from '@/lib/plaques'
import { CSV_HEADER, CSV_NAME, verifyExport } from '@/scripts/plaques/verify'

// Niveau Q : ~25 % de redondance, résiste aux rayures / reflets sur une plaque.
const QR_OPTIONS = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } } as const

async function main() {
  const dir = resolve(process.argv[2] ?? 'plaques-export')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'qr'), { recursive: true })

  const { data, error } = await supabaseAdmin.from('plaques').select('numero, code').order('numero', { ascending: true })
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Aucune plaque en base : lancez generate.ts d’abord.')

  const lines = [CSV_HEADER.join(';')]
  for (const { numero, code } of data as { numero: number; code: string }[]) {
    const url = plaqueUrl(code)
    const base = `plaque-${String(numero).padStart(3, '0')}-${code}`
    writeFileSync(join(dir, 'qr', `${base}.svg`), await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' }))
    await QRCode.toFile(join(dir, 'qr', `${base}.png`), url, { ...QR_OPTIONS, type: 'png', width: 2000 })
    lines.push([numero, code, url, url, `qr/${base}.svg`, `qr/${base}.png`].join(';'))
  }
  // BOM UTF-8 + CRLF : Excel (FR) ouvre le fichier avec les bons accents et colonnes.
  writeFileSync(join(dir, CSV_NAME), '﻿' + lines.join('\r\n') + '\r\n', 'utf8')
  console.log(`Export écrit dans ${dir}`)

  const errors = await verifyExport(dir)
  if (errors.length) throw new Error(`VÉRIFICATION ÉCHOUÉE — ${errors.length} erreur(s) :\n` + errors.join('\n'))
  console.log('Vérification OK — chaque QR contient exactement le lien de sa ligne.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
