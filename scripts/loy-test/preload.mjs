// Préchargeur pour exécuter des scripts de test qui importent la vraie logique
// applicative (lib/loyalty.ts) hors du bundler Next :
//   1. charge .env.local dans process.env (pas de dépendance dotenv) ;
//   2. résout l'alias de chemin "@/..." vers la racine du projet.
// Usage : node --import ./scripts/loy-test/preload.mjs scripts/loy-test/run.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { register } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')

// --- 1. .env.local → process.env ---
try {
  const raw = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val
  }
} catch (e) {
  console.error('preload: impossible de lire .env.local —', e.message)
}

// --- 2. résolution de l'alias "@/" ---
register(pathToFileURL(resolve(here, 'resolve-alias.mjs')))
