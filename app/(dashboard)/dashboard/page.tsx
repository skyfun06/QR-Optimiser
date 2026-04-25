'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

/* ─── Types ─────────────────────────────────────────────── */
type Business = { id: string; name?: string | null }
type ReviewRow  = { id?: string; rating: number | null; created_at?: string | null }
type FeedbackRow = { id?: string; message: string | null; rating: number | null; created_at?: string | null }
type ScanType   = 'review' | 'menu' | 'custom'
type ScanRow    = { id?: string; qr_type: ScanType | null; created_at?: string | null }
type HistoriqueItem = { id: string; rating: number | null; created_at: string | null; message?: string | null }

/* ─── Styles ─────────────────────────────────────────────── */
const DASH_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes barGrow {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  .bar-grow {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: barGrow 0.55s ease-out both;
  }
  .feedback-card { transition: border-color 0.3s ease, transform 0.2s ease; }
  .feedback-card:hover { border-color: #C9973A !important; transform: translateY(-1px); }
  .history-row { transition: background-color 0.2s ease; border-radius: 8px; padding: 8px 10px; margin: 0 -10px; }
  .history-row:hover { background-color: #212121; }
  @media (prefers-reduced-motion: reduce) {
    .dash-anim  { animation: none !important; opacity: 1 !important; transform: none !important; }
    .bar-grow   { animation: none !important; transform: scaleY(1) !important; }
  }
`

/* ─── Constants ──────────────────────────────────────────── */
const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

/* ─── Helpers ────────────────────────────────────────────── */
function formatPercent(v: number) { return `${Math.round(v)}%` }

function formatRelativeShort(iso: string | null | undefined) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return '—'
  const h = Math.floor(ms / 3_600_000)
  return h < 24 ? `il y a ${Math.max(1, h)}h` : `il y a ${Math.floor(h / 24)}j`
}

function formatReviewDateFr(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function anim(delay: number, duration = 0.5) {
  return { animation: `fadeUp ${duration}s ease-out ${delay}ms both` }
}

/* ─── useCountUp ─────────────────────────────────────────── */
/** Compte de 0 jusqu'à target avec un ease-out cubique (même logique que la landing page). */
function useCountUp(target: number, decimals = 0, duration = 1400): string {
  const [display, setDisplay] = useState('0')
  const triggered = useRef(false)

  useEffect(() => {
    if (target === 0 || triggered.current) return
    triggered.current = true

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(decimals > 0 ? target.toFixed(decimals) : String(Math.round(target)))
      return
    }

    const startTime = performance.now()
    let rafId = 0

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const val = eased * target
      setDisplay(decimals > 0 ? val.toFixed(decimals) : String(Math.round(val)))
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setDisplay(decimals > 0 ? target.toFixed(decimals) : String(Math.round(target)))
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, decimals, duration])

  return display
}

/** Catmull-Rom → Cubic Bezier smooth SVG path through points */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`
  let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d
}

/* ─── StarRow ────────────────────────────────────────────── */
function StarRow({ rating, size }: { rating: number | null | undefined; size: 12 | 14 }) {
  const r = typeof rating === 'number' && Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0
  const filled = Math.min(5, Math.max(0, Math.round(r)))
  const fillColor = r >= 4 ? '#C9973A' : '#ef4444'
  return (
    <div className="flex flex-row items-center gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
          fill="none" stroke={i < filled ? fillColor : '#333333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={STAR_PATH} fill={i < filled ? fillColor : 'none'} />
        </svg>
      ))}
    </div>
  )
}

/* ─── BarChartSvg ────────────────────────────────────────── */
function BarChartSvg({
  counts, labels, total, delta,
}: {
  counts: number[]
  labels: string[]
  total: number
  delta: number | null
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)

  const n       = counts.length || 1
  const maxCount = Math.max(...counts, 1)
  const slotW   = 100 / n        // viewBox % per slot
  const barW    = slotW * 0.55   // bar occupies 55% of slot
  const padT    = 6              // top padding in viewBox units

  function barH(count: number) {
    if (count === 0) return 5
    return Math.max(10, ((count / maxCount) * (100 - padT - 2)))
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const idx  = Math.max(0, Math.min(n - 1, Math.floor(xPct * n)))
    setHoveredIdx(idx)
    setTooltipLeft(((idx + 0.5) / n) * rect.width)
  }

  const trendPoints = counts.map((c, i) => {
    const x = (i + 0.5) * slotW
    const h = barH(c)
    return `${x.toFixed(2)},${(100 - h).toFixed(2)}`
  }).join(' ')

  return (
    <div className="w-full h-[284px] flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Avis ces derniers jours</p>
        {delta !== null && (
          <span className={`shrink-0 py-0.5 px-2 text-xs rounded-full ${delta >= 0 ? 'bg-[#3a2f1d] text-gold' : 'bg-[#2e1515] text-[#ef4343]'}`}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{total} <span className="text-xs text-[#8c8c8c] font-normal">avis ce mois</span></p>

      {/* SVG */}
      <div className="relative w-full">
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '140px' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Bars */}
          {counts.map((count, i) => {
            const h = barH(count)
            const x = i * slotW + (slotW - barW) / 2
            const y = 100 - h
            const isEmpty = count === 0
            return (
              <rect
                key={i}
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                width={barW.toFixed(2)}
                height={h.toFixed(2)}
                rx={1.5}
                ry={1.5}
                fill={hoveredIdx === i && !isEmpty ? '#e8a842' : isEmpty ? '#1e1e1e' : '#C9973A'}
                className={isEmpty ? '' : 'bar-grow'}
                style={{ animationDelay: `${i * 45}ms` }}
              />
            )
          })}

          {/* Trend line */}
          <polyline
            points={trendPoints}
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.15"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Tooltip HTML */}
        {hoveredIdx !== null && (
          <div
            className="absolute -top-9 z-20 pointer-events-none"
            style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
          >
            <div className="bg-[#171717] border border-[#292929] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
              <span className="text-xs font-bold text-gold">{counts[hoveredIdx]}</span>
              <span className="text-xs text-[#8c8c8c] ml-1">avis</span>
            </div>
          </div>
        )}
      </div>

      {/* Day labels */}
      <div className="w-full flex">
        {labels.map((label, i) => (
          <span key={i} className="flex-1 text-center" style={{ fontSize: '9px', color: '#555' }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── LineChartSvg ───────────────────────────────────────── */
function LineChartSvg({
  lines, total,
}: {
  lines: Array<{ key: string; label: string; color: string; data: number[] }>
  total: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)

  const n      = lines[0]?.data.length ?? 13
  const maxVal = Math.max(...lines.flatMap(l => l.data), 1)

  const padL = 1, padR = 1, padT = 8, padB = 5
  const chartW = 100 - padL - padR
  const chartH = 100 - padT - padB

  function toX(i: number) { return padL + (n > 1 ? (i / (n - 1)) : 0.5) * chartW }
  function toY(v: number) { return padT + (1 - v / maxVal) * chartH }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const idx  = Math.max(0, Math.min(n - 1, Math.round(xPct * (n - 1))))
    setHoveredIdx(idx)
    setTooltipLeft((n > 1 ? idx / (n - 1) : 0.5) * rect.width)
  }

  const gridYs = [0.25, 0.5, 0.75].map(pct => padT + pct * chartH)

  return (
    <div className="w-full h-[284px] flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Scans ces derniers jours</p>
        <div className="flex items-center gap-3">
          {lines.map(line => (
            <span key={line.key} className="flex items-center gap-1.5" style={{ fontSize: '10px', color: '#8c8c8c' }}>
              <span className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: line.color, opacity: line.color === '#ffffff' ? 0.6 : 1 }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-2xl font-bold">{total} <span className="text-xs text-[#8c8c8c] font-normal">scans ce mois</span></p>

      {/* SVG */}
      <div className="relative w-full">
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '140px' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Dashed grid */}
          {gridYs.map((y, i) => (
            <line key={i} x1={padL} y1={y.toFixed(2)} x2={100 - padR} y2={y.toFixed(2)}
              stroke="#292929" strokeWidth="0.6" strokeDasharray="2.5,2" strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke" />
          ))}

          {/* Curves + last-point dots */}
          {lines.map(line => {
            const pts: Array<[number, number]> = line.data.map((v, i) => [toX(i), toY(v)])
            const d       = smoothPath(pts)
            const lastIdx = line.data.length - 1
            const lx      = toX(lastIdx)
            const ly      = toY(line.data[lastIdx])
            const opacity = line.color === '#ffffff' ? 0.6 : 1
            return (
              <g key={line.key}>
                <path d={d} fill="none" stroke={line.color} strokeWidth="1.5"
                  strokeOpacity={opacity} strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke" />
                {/* Last-point marker: use tiny rect to avoid ellipse distortion */}
                <rect x={(lx - 1.2).toFixed(2)} y={(ly - 1.2).toFixed(2)}
                  width="2.4" height="2.4" rx="1.2" ry="1.2"
                  fill={line.color} fillOpacity={opacity} />
              </g>
            )
          })}

          {/* Hover vertical line */}
          {hoveredIdx !== null && (
            <line x1={toX(hoveredIdx).toFixed(2)} y1={padT} x2={toX(hoveredIdx).toFixed(2)} y2={padT + chartH}
              stroke="white" strokeWidth="0.6" strokeOpacity="0.2"
              vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Tooltip HTML */}
        {hoveredIdx !== null && (
          <div
            className="absolute top-2 z-20 pointer-events-none"
            style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
          >
            <div className="bg-[#171717] border border-[#292929] rounded-lg px-2 py-1.5 shadow-lg">
              {lines.map(line => (
                <div key={line.key} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: line.color, opacity: line.color === '#ffffff' ? 0.6 : 1 }} />
                  <span className="text-xs font-bold whitespace-nowrap"
                    style={{ color: line.color === '#ffffff' ? '#aaa' : line.color }}>
                    {line.data[hoveredIdx]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [business, setBusiness]           = useState<Business | null>(null)
  const [reviews, setReviews]             = useState<ReviewRow[]>([])
  const [scansThisMonth, setScansThisMonth] = useState<ScanRow[]>([])
  const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr) throw userErr
        if (!user) { if (!cancelled) setError('Vous devez être connecté.'); return }

        const { data: biz, error: bizErr } = await supabase.from('businesses').select('id,name').eq('user_id', user.id).maybeSingle()
        if (bizErr) throw bizErr
        if (!biz) { if (!cancelled) { setBusiness(null); setScansThisMonth([]) }; return }
        if (!cancelled) setBusiness(biz)

        const { data: rev, error: revErr } = await supabase.from('reviews').select('id,rating,created_at').eq('business_id', biz.id).order('created_at', { ascending: false })
        if (revErr) throw revErr
        if (!cancelled) setReviews(rev ?? [])

        const now = new Date()
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1); mStart.setHours(0, 0, 0, 0)
        const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1); mEnd.setHours(0, 0, 0, 0)
        const { data: scans, error: scanErr } = await supabase.from('scans').select('id,qr_type,created_at').eq('business_id', biz.id).gte('created_at', mStart.toISOString()).lt('created_at', mEnd.toISOString()).order('created_at', { ascending: false })
        if (scanErr) throw scanErr
        if (!cancelled) setScansThisMonth((scans as ScanRow[] | null) ?? [])

        const { data: fb, error: fbErr } = await supabase.from('feedback').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(8)
        if (fbErr) throw fbErr
        if (!cancelled) setRecentFeedbacks(fb ?? [])
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const ratings = reviews.map(r => r.rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const avg = ratings.length > 0 ? ratings.reduce((a, v) => a + v, 0) / ratings.length : 0
    const sat = ratings.length > 0 ? (ratings.filter(v => v >= 4).length / ratings.length) * 100 : 0
    return { totalScans: scansThisMonth.length, avgRating: avg, satisfactionRate: sat, hasRatings: ratings.length > 0 }
  }, [reviews, scansThisMonth])

  const todayVsYesterday = useMemo(() => {
    const now   = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yest  = new Date(today); yest.setDate(today.getDate() - 1)
    const key   = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const t     = reviews.filter(r => r.created_at && key(new Date(r.created_at)) === key(today)).length
    const y     = reviews.filter(r => r.created_at && key(new Date(r.created_at)) === key(yest)).length
    if (y === 0) return t > 0 ? 100 : null
    return Math.round(((t - y) / y) * 100)
  }, [reviews])

  /* ── Bar chart data ── */
  const barChartData = useMemo(() => {
    const now     = new Date()
    const dayKey  = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const days    = Array.from({ length: 13 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (12 - i)); return d })
    const counts  = days.map(d => reviews.filter(r => r.created_at && dayKey(new Date(r.created_at)) === dayKey(d)).length)
    const labels  = days.map(d => String(d.getDate()))
    const mStart  = new Date(now.getFullYear(), now.getMonth(), 1); mStart.setHours(0, 0, 0, 0)
    const mEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const total   = reviews.filter(r => { if (!r.created_at) return false; const t = new Date(r.created_at).getTime(); return t >= mStart.getTime() && t <= mEnd.getTime() }).length
    return { counts, labels, total }
  }, [reviews])

  /* ── Scans par QR code ── */
  const scansByQrType = useMemo(() =>
    scansThisMonth.reduce((acc, s) => {
      if (s.qr_type === 'review') acc.review++
      if (s.qr_type === 'menu')   acc.menu++
      if (s.qr_type === 'custom') acc.custom++
      return acc
    }, { review: 0, menu: 0, custom: 0 }), [scansThisMonth])

  /* ── Line chart data ── */
  const lineChartData = useMemo(() => {
    const now    = new Date()
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const days   = Array.from({ length: 13 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (12 - i)); return d })
    const keys   = days.map(d => dayKey(d))
    const kMap   = new Map(keys.map((k, i) => [k, i]))
    const by: Record<ScanType, number[]> = { review: Array(13).fill(0), menu: Array(13).fill(0), custom: Array(13).fill(0) }
    scansThisMonth.forEach(s => {
      if (!s.created_at || !s.qr_type) return
      const idx = kMap.get(dayKey(new Date(s.created_at)))
      if (idx !== undefined && (s.qr_type === 'review' || s.qr_type === 'menu' || s.qr_type === 'custom'))
        by[s.qr_type][idx]++
    })
    return {
      total: scansThisMonth.length,
      lines: [
        { key: 'review', label: 'Avis Google', color: '#C9973A', data: by.review },
        { key: 'menu',   label: 'Menu',        color: '#ffffff', data: by.menu   },
        { key: 'custom', label: 'Lien custom', color: '#8c8c8c', data: by.custom },
      ],
    }
  }, [scansThisMonth])

  /* ── Historique combiné ── */
  const historiqueItems = useMemo((): HistoriqueItem[] => {
    const pos: HistoriqueItem[] = reviews.filter(r => r.rating !== null && r.rating >= 4).map((r, i) => ({ id: r.id ?? `rev-${i}`, rating: r.rating, created_at: r.created_at ?? null }))
    const neg: HistoriqueItem[] = recentFeedbacks.map((f, i) => ({ id: f.id ?? `fb-${i}`, rating: f.rating, created_at: f.created_at ?? null, message: f.message }))
    return [...pos, ...neg].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 8)
  }, [reviews, recentFeedbacks])

  /* ── Compteurs animés (même logique que la landing page) ── */
  const animTotalScans   = useCountUp(kpis.totalScans)
  const animAvgRating    = useCountUp(kpis.avgRating, 1)
  const animSatisfaction = useCountUp(kpis.satisfactionRate)
  const animReviewScans  = useCountUp(scansByQrType.review)
  const animMenuScans    = useCountUp(scansByQrType.menu)
  const animCustomScans  = useCountUp(scansByQrType.custom)

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <style>{DASH_STYLES}</style>
      <DashboardHeader subtitle={business?.name ?? null} onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col gap-4 md:gap-6 py-6 md:py-8">

        {error && (
          <div className="w-full rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}
        {loading && (
          <div className="w-full rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
            <p className="text-[#8c8c8c] text-sm">Chargement…</p>
          </div>
        )}
        {!loading && !error && !business && (
          <div className="rounded-2xl bg-[#171717] border border-[#222222] p-8">
            <h2 className="text-lg font-semibold mb-2">Configurez votre commerce d&apos;abord</h2>
            <p className="text-sm text-[#8c8c8c]">Aucun commerce n&apos;est associé à votre compte pour le moment.</p>
          </div>
        )}

        {!loading && !error && business && (
          <>
            {/* ── KPIs ── */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 pt-2 md:pt-4">
              {[
                { label: 'Total de scans', value: animTotalScans,                                                       sub: 'scans ce mois',      delay: 0,   gold: false },
                { label: 'Note moyenne',   value: kpis.hasRatings ? animAvgRating + '★' : '—',                         sub: 'sur 5',              delay: 100, gold: true  },
                { label: 'Satisfaction',   value: kpis.hasRatings ? animSatisfaction + '%' : '—',                      sub: 'clients satisfaits', delay: 200, gold: false },
              ].map(({ label, value, sub, delay, gold }) => (
                <div key={label} className="dash-anim w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-2 md:gap-3" style={anim(delay)}>
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{label}</p>
                  <p className={`text-4xl md:text-5xl font-bold ${gold ? 'text-gold' : 'text-white'}`}>{value}</p>
                  <p className="text-sm text-[#8c8c8c]">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Scans par QR code ── */}
            <div className="dash-anim w-full" style={anim(300)}>
              <p className="text-xs text-[#8c8c8c] tracking-widest uppercase mb-3">Scans par QR code</p>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                {[
                  { emoji: '🌟', label: 'Avis Google', value: animReviewScans, delay: 300 },
                  { emoji: '🍽️', label: 'Menu',        value: animMenuScans,   delay: 400 },
                  { emoji: '🔗', label: 'Lien custom', value: animCustomScans, delay: 500 },
                ].map(({ emoji, label, value, delay }) => (
                  <div key={label} className="dash-anim w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-2 md:gap-3" style={anim(delay)}>
                    <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{emoji} {label}</p>
                    <p className="text-4xl md:text-5xl font-bold text-white">{value}</p>
                    <p className="text-sm text-[#8c8c8c]">scans ce mois</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Graphes + Feedbacks — layout items-stretch ── */}
            <div
              className="dash-anim w-full flex flex-col lg:flex-row items-stretch gap-3 lg:gap-6"
              style={anim(550, 0.6)}
            >
              {/* Colonne gauche : 2 graphes */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                  <BarChartSvg
                    counts={barChartData.counts}
                    labels={barChartData.labels}
                    total={barChartData.total}
                    delta={todayVsYesterday}
                  />
                </div>
                <div className="border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                  <LineChartSvg lines={lineChartData.lines} total={lineChartData.total} />
                </div>
              </div>

              {/* Colonne droite : feedbacks récents — même hauteur via items-stretch */}
              <div className="w-full lg:w-[380px] shrink-0 flex flex-col border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                <p className="text-xs text-[#8c8c8c] tracking-widest uppercase mb-4 shrink-0">
                  Feedbacks récents
                </p>
                {/* overflow-y-auto pour scroller si plus de feedbacks que de hauteur */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {recentFeedbacks.length === 0 ? (
                      <p className="text-sm text-[#8c8c8c]">Aucun feedback pour le moment</p>
                    ) : (
                      recentFeedbacks.map((fb, idx) => {
                        const isPrivate = typeof fb.rating === 'number' && fb.rating <= 3
                        return (
                          <div key={fb.id ?? `fb-${idx}`} className="feedback-card w-full flex flex-col gap-2.5 rounded-xl border border-[#292929] p-3 md:p-4">
                            <div className="w-full flex flex-row justify-between items-center gap-2">
                              <p className="text-xs text-[#555]">{formatRelativeShort(fb.created_at)}</p>
                              {isPrivate && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2e1515] text-[#ef4444]">Privé</span>
                              )}
                            </div>
                            <p className="text-sm text-[#8c8c8c] line-clamp-2 leading-relaxed">
                              {fb.message?.trim() || '—'}
                            </p>
                            <StarRow rating={fb.rating} size={12} />
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Historique ── */}
            <div
              className="dash-anim w-full flex flex-col justify-start items-start gap-4 border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl"
              style={anim(700, 0.6)}
            >
              <p className="text-xs text-[#8c8c8c] tracking-widest uppercase">Historique</p>
              <div className="w-full flex flex-col gap-1">
                {historiqueItems.length === 0 ? (
                  <p className="text-sm text-[#8c8c8c]">Aucun avis pour le moment.</p>
                ) : (
                  historiqueItems.map((item, idx) => {
                    const r = typeof item.rating === 'number' && Number.isFinite(item.rating) ? item.rating : 0
                    const google = r >= 4
                    return (
                      <div key={item.id}>
                        {idx > 0 && <hr className="h-[1px] border-0 bg-[#222222] my-1" />}
                        <div className="history-row w-full flex flex-row justify-between items-center gap-3 flex-wrap">
                          <p className="text-sm text-[#8c8c8c] shrink-0 min-w-[80px]">{formatReviewDateFr(item.created_at)}</p>
                          {item.message?.trim() ? (
                            <p className="flex-1 text-xs text-[#666] truncate min-w-0">{item.message.trim()}</p>
                          ) : null}
                          <div className="flex flex-row items-center gap-2 shrink-0">
                            <StarRow rating={item.rating} size={14} />
                            <span className={`py-0.5 px-2 text-xs rounded-full font-medium ${google ? 'text-gold bg-[#28231a]' : 'text-[#888888] bg-[#292929]'}`}>
                              {google ? 'Google' : 'Privé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
