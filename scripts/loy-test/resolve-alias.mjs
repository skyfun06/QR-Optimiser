// Hook de résolution de module : mappe "@/..." vers la racine du projet, afin
// que lib/loyalty.ts (qui importe "@/lib/supabase-admin") s'importe hors Next.
// Sonde les extensions (.ts/.tsx/.js/.mjs + /index.*) comme le ferait le bundler.
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, resolve as rpath } from 'node:path'
import { existsSync } from 'node:fs'

const projectRoot = rpath(dirname(fileURLToPath(import.meta.url)), '..', '..')
const EXTS = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.cjs']

function probe(base) {
  if (existsSync(base) && !base.endsWith('/')) return base
  for (const ext of EXTS) if (existsSync(base + ext)) return base + ext
  for (const ext of EXTS) if (existsSync(rpath(base, 'index' + ext))) return rpath(base, 'index' + ext)
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const found = probe(rpath(projectRoot, specifier.slice(2)))
    if (found) return nextResolve(pathToFileURL(found).href, context)
  }
  return nextResolve(specifier, context)
}
