import Link from 'next/link'
import { getWidgetData } from '@/lib/widget'

export const dynamic = 'force-dynamic'

const GOLD = '#C9973A'
const STAR_EMPTY = '#3a3633'
const FONT = 'Space Grotesk, system-ui, sans-serif'

// Étoile pleine (path de la maquette variante B).
const STAR_D =
  'M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 18.23 6.09 20.34l1.13-6.57L2.45 9.14l6.6-.96z'

/* 5 étoiles PLEINES avec remplissage fractionnaire (gradient à stop net). */
function Stars({ rating, uid, size = 16 }: { rating: number; uid: string; size?: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = Math.max(0, Math.min(1, rating - i))
        let fill = STAR_EMPTY
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
                <stop offset={pct} stopColor={STAR_EMPTY} />
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

const PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  background: '#0d0d0d',
  border: '1px solid #292929',
  borderRadius: 999,
  padding: '11px 20px',
  fontFamily: FONT,
  whiteSpace: 'nowrap',
}

const Brand = () => (
  <Link href="/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: GOLD, textDecoration: 'none', whiteSpace: 'nowrap' }}>
    ScanAvis
  </Link>
)

const Divider = () => <span style={{ width: 1, height: 18, background: '#292929', flexShrink: 0 }} />

// Fond de l'iframe transparent → seul le pill s'affiche, identique sur fond clair/sombre.
const RESET = 'html,body{margin:0;background:transparent !important}'

export default async function WidgetPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const data = await getWidgetData(businessId)

  // États neutres : aucun avis ≥4★ → pas de "0,0 ★".
  if (!data || data.rating == null || data.count <= 0) {
    return (
      <div style={CENTER}>
        <style>{RESET}</style>
        <div style={PILL}>
          <Stars rating={0} uid={businessId} />
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>Pas encore d&apos;avis</span>
          <Divider />
          <Brand />
        </div>
      </div>
    )
  }

  const ratingStr = data.rating.toFixed(1).replace('.', ',')

  return (
    <div style={CENTER}>
      <style>{RESET}</style>
      <div style={PILL}>
        <span style={{ fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: -0.3 }}>
          {ratingStr}
        </span>
        <Stars rating={data.rating} uid={businessId} />
        <span style={{ color: '#52525b', fontSize: 14 }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>{data.count} avis</span>
        <Divider />
        <Brand />
      </div>
    </div>
  )
}
