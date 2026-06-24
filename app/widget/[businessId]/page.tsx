import Link from 'next/link'
import { getWidgetData } from '@/lib/widget'

export const dynamic = 'force-dynamic'

const GOLD = '#C9973A'
const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

function Star({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={{ display: 'block' }}>
      <path d={STAR_PATH} />
    </svg>
  )
}

/* Rangée d'étoiles avec remplissage fractionnaire (overlay or clippé). */
function Stars({ rating, size = 17 }: { rating: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  const row = (color: string) => (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ flexShrink: 0 }}><Star color={color} size={size} /></span>
      ))}
    </div>
  )
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {row('#3a3a3a')}
      <div style={{ position: 'absolute', top: 0, left: 0, width: `${pct}%`, overflow: 'hidden' }}>
        {row(GOLD)}
      </div>
    </div>
  )
}

const SHELL: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100vh',
  margin: 0,
  background: '#161616',
  borderTop: `2px solid ${GOLD}`,
  padding: '16px 20px',
  fontFamily: 'Space Grotesk, system-ui, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 10,
  color: '#e5e5e5',
}

export default async function WidgetPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const data = await getWidgetData(businessId)

  if (!data) {
    return (
      <div style={{ ...SHELL, justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: '#8c8c8c' }}>Commerce introuvable.</span>
      </div>
    )
  }

  const name = data.name?.trim() || 'Votre commerce'
  const hasReviews = data.count > 0 && data.rating != null

  return (
    <div style={SHELL}>
      <div style={{ fontSize: 12, color: '#9a9a9a', letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>

      {hasReviews ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: -0.5 }}>
            {data.rating!.toFixed(1).replace('.', ',')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Stars rating={data.rating!} />
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              {data.count} avis
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Stars rating={0} />
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>Aucun avis pour le moment</span>
        </div>
      )}

      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 10.5, color: GOLD, textDecoration: 'none', marginTop: 2, opacity: 0.9 }}
      >
        Propulsé par ScanAvis
      </Link>
    </div>
  )
}
