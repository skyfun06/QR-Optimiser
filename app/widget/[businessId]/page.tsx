import { headers } from 'next/headers'
import { getWidgetData } from '@/lib/widget'

export const dynamic = 'force-dynamic'

const GOLD = '#C9973A'
const FONT = 'Space Grotesk, system-ui, sans-serif'

// Étoile pleine (path de la maquette variante B).
const STAR_D =
  'M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 18.23 6.09 20.34l1.13-6.57L2.45 9.14l6.6-.96z'

type VariantId = 'pill' | 'card' | 'compact' | 'banner'
type ThemeId = 'dark' | 'light'

type Theme = {
  bg: string
  border: string
  text: string
  sub: string
  dot: string
  starEmpty: string
  shadow: string
}

const THEMES: Record<ThemeId, Theme> = {
  dark: {
    bg: '#0d0d0d',
    border: '#292929',
    text: '#e4e4e7',
    sub: '#a1a1aa',
    dot: '#52525b',
    starEmpty: '#3a3633',
    shadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  light: {
    bg: '#ffffff',
    border: '#e5e7eb',
    text: '#18181b',
    sub: '#71717a',
    dot: '#d4d4d8',
    starEmpty: '#e4e4e7',
    shadow: '0 10px 40px rgba(0,0,0,0.12)',
  },
}

function parseVariant(v: string | string[] | undefined): VariantId {
  const s = Array.isArray(v) ? v[0] : v
  return s === 'card' || s === 'compact' || s === 'banner' ? s : 'pill'
}
function parseTheme(t: string | string[] | undefined): ThemeId {
  const s = Array.isArray(t) ? t[0] : t
  return s === 'light' ? 'light' : 'dark'
}

/* 5 étoiles PLEINES avec remplissage fractionnaire (gradient à stop net). */
function Stars({
  rating,
  uid,
  size = 16,
  emptyColor,
}: {
  rating: number
  uid: string
  size?: number
  emptyColor: string
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = Math.max(0, Math.min(1, rating - i))
        let fill = emptyColor
        let gradient: React.ReactNode = null

        if (frac >= 1) {
          fill = GOLD
        } else if (frac > 0) {
          const gid = `wstar-${uid}-${i}`
          const pct = `${(frac * 100).toFixed(2)}%`
          fill = `url(#${gid})`
          gradient = (
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                <stop offset={pct} stopColor={GOLD} />
                <stop offset={pct} stopColor={emptyColor} />
              </linearGradient>
            </defs>
          )
        }

        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
            {gradient}
            <path d={STAR_D} fill={fill} />
          </svg>
        )
      })}
    </div>
  )
}

const CENTER: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100vh',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 8,
  fontFamily: FONT,
}

// Fond de l'iframe transparent → seul le widget s'affiche (fond clair/sombre).
const RESET = 'html,body{margin:0;background:transparent !important}'

function Brand() {
  return (
    <a
      href="https://www.qrscanavis.fr"
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontSize: 11, color: GOLD, textDecoration: 'none', whiteSpace: 'nowrap' }}
    >
      ScanAvis
    </a>
  )
}

function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: 'linear-gradient(135deg, #C9973A, #e6b84a)',
        color: '#12100e',
        fontWeight: 700,
        fontSize: 13,
        textDecoration: 'none',
        borderRadius: 999,
        padding: '9px 16px',
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 22px -10px rgba(201,151,58,0.6)',
      }}
    >
      ★ {label}
    </a>
  )
}

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { businessId } = await params
  const sp = await searchParams
  const variant = parseVariant(sp.variant)
  const themeId = parseTheme(sp.theme)
  const theme = THEMES[themeId]

  const data = await getWidgetData(businessId)
  const hasReviews = !!data && data.rating != null && data.count > 0
  const rating = hasReviews ? (data!.rating as number) : 0
  const ratingStr = rating.toFixed(1).replace('.', ',')
  const count = data?.count ?? 0
  const name = data?.name ?? null

  // Origine réelle (domaine servant l'iframe) pour un lien absolu vers l'avis.
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const reviewUrl = host ? `${proto}://${host}/review/${businessId}` : `/review/${businessId}`

  // ── CARD : carte verticale avec CTA ────────────────────────────────────────
  if (variant === 'card') {
    return (
      <div style={CENTER}>
        <style>{RESET}</style>
        <div
          style={{
            boxSizing: 'border-box',
            width: 288,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: '20px 18px',
            boxShadow: theme.shadow,
            fontFamily: FONT,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: -0.5 }}>
              {hasReviews ? ratingStr : '—'}
            </span>
            <Stars rating={rating} uid={businessId} size={20} emptyColor={theme.starEmpty} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: theme.sub }}>
            {hasReviews ? `${count} avis Google` : "Pas encore d'avis"}
          </span>
          {name ? (
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
          ) : null}
          <div style={{ height: 2 }} />
          <CtaButton href={reviewUrl} label="Laisser un avis" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: theme.dot }}>Propulsé par</span>
            <Brand />
          </div>
        </div>
      </div>
    )
  }

  // ── COMPACT : mini-badge ────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div style={CENTER}>
        <style>{RESET}</style>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 999,
            padding: '8px 14px',
            boxShadow: theme.shadow,
            fontFamily: FONT,
            whiteSpace: 'nowrap',
          }}
        >
          <Stars rating={rating} uid={businessId} size={14} emptyColor={theme.starEmpty} />
          <span style={{ fontSize: 14, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            {hasReviews ? ratingStr : '—'}
          </span>
          {hasReviews ? (
            <span style={{ fontSize: 12, color: theme.sub }}>({count})</span>
          ) : null}
        </div>
      </div>
    )
  }

  // ── BANNER : bannière horizontale large avec CTA ───────────────────────────
  if (variant === 'banner') {
    return (
      <div style={CENTER}>
        <style>{RESET}</style>
        <div
          style={{
            boxSizing: 'border-box',
            width: 464,
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: '14px 18px',
            boxShadow: theme.shadow,
            fontFamily: FONT,
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: -0.5 }}>
            {hasReviews ? ratingStr : '—'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
            <Stars rating={rating} uid={businessId} size={15} emptyColor={theme.starEmpty} />
            <span style={{ fontSize: 12, color: theme.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasReviews ? `${count} avis Google` : "Pas encore d'avis"}
              {name ? ` · ${name}` : ''}
            </span>
          </div>
          <CtaButton href={reviewUrl} label="Laisser un avis" />
        </div>
      </div>
    )
  }

  // ── PILL : pastille horizontale (défaut) ───────────────────────────────────
  return (
    <div style={CENTER}>
      <style>{RESET}</style>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 999,
          padding: '11px 20px',
          boxShadow: theme.shadow,
          fontFamily: FONT,
          whiteSpace: 'nowrap',
        }}
      >
        {hasReviews ? (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: -0.3 }}>
              {ratingStr}
            </span>
            <Stars rating={rating} uid={businessId} emptyColor={theme.starEmpty} />
            <span style={{ color: theme.dot, fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>{count} avis</span>
          </>
        ) : (
          <>
            <Stars rating={0} uid={businessId} emptyColor={theme.starEmpty} />
            <span style={{ fontSize: 13, color: theme.sub }}>Pas encore d&apos;avis</span>
          </>
        )}
        <span style={{ width: 1, height: 18, background: theme.border, flexShrink: 0 }} />
        <Brand />
      </div>
    </div>
  )
}
