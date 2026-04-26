/**
 * Helpers de sécurité partagés (client + serveur).
 *
 * - URL validation : on n'accepte que http(s) pour éviter les schémas
 *   dangereux (javascript:, data:, file:, vbscript:, etc.) qui pourraient
 *   être exécutés via un href ou un Location header.
 * - HTML escape : à utiliser à chaque fois qu'on injecte une valeur
 *   utilisateur dans un template HTML (ex. emails Resend).
 * - Rate limit : token bucket en mémoire, suffisant pour bloquer le spam
 *   trivial. Pour de la vraie protection multi-instance, brancher un
 *   store partagé (Upstash, Redis…).
 */

const TEXT_LIMITS = {
  shortName: 200,
  url: 2048,
  email: 320,
  message: 5000,
} as const

export const INPUT_LIMITS = TEXT_LIMITS

export function isSafeHttpUrl(value: unknown, opts: { httpsOnly?: boolean } = {}): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.length > TEXT_LIMITS.url) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  const httpsOnly = opts.httpsOnly ?? true
  if (httpsOnly) {
    return parsed.protocol === 'https:'
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:'
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v || v.length > TEXT_LIMITS.email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

type RateLimitEntry = { count: number; reset: number }

const rateLimitStore = new Map<string, RateLimitEntry>()

export type RateLimitOptions = {
  /** Nombre maximum de hits autorisés pendant la fenêtre. */
  limit: number
  /** Fenêtre glissante en millisecondes. */
  windowMs: number
}

export function rateLimit(key: string, opts: RateLimitOptions): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.reset <= now) {
    rateLimitStore.set(key, { count: 1, reset: now + opts.windowMs })
    return { allowed: true, remaining: opts.limit - 1, retryAfterMs: 0 }
  }

  if (entry.count >= opts.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.reset - now }
  }

  entry.count += 1
  return { allowed: true, remaining: opts.limit - entry.count, retryAfterMs: 0 }
}

/** Best-effort pour récupérer une IP depuis une Request Next.js. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
