'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'
import { generateReportPdf, generateReportCsv, type ReportMetrics } from '@/lib/export'

/* ─── Types ─────────────────────────────────────────────── */
type Business = { id: string; name?: string | null }
type ReviewRow  = { id?: string; rating: number | null; created_at?: string | null }
type FeedbackRow = { id?: string; message: string | null; rating: number | null; created_at?: string | null }
type ScanType   = 'review' | 'menu' | 'custom'
type ScanRow    = { id?: string; qr_type: ScanType | null; created_at?: string | null }
type HistoriqueItem = { id: string; rating: number | null; created_at: string | null; message?: string | null }

type PeriodId = '7' | '30' | '90' | 'all'

/* ─── Constants ──────────────────────────────────────────── */
const DAY_MS = 86_400_000

const PERIODS: { id: PeriodId; label: string; days: number | null }[] = [
  { id: '7',   label: '7 jours',  days: 7 },
  { id: '30',  label: '30 jours', days: 30 },
  { id: '90',  label: '90 jours', days: 90 },
  { id: 'all', label: 'Tout',     days: null },
]

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Tant que les clés (API / paiement) ne sont pas en place : on grise l'export
// et le bilan IA en "Bientôt disponible". Passer à false pour tout réactiver.
const FEATURES_COMING_SOON = true

const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

// Couleur d'une note — palette désaturée (rouge→vert) pour garder le code
// couleur sans effet "flashy", cohérent avec le thème sombre/gold.
const RATING_COLORS: Record<number, string> = {
  1: '#a5564f', // brique
  2: '#b07d4e', // terracotta
  3: '#b0a052', // ocre
  4: '#C9973A', // gold (marque)
  5: '#6e9e74', // sauge
}

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
  @keyframes growX {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .bar-grow {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: barGrow 0.55s ease-out both;
  }
  .grow-x {
    transform-origin: left center;
    animation: growX 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }
  .feedback-card { transition: border-color 0.3s ease, transform 0.2s ease; }
  .feedback-card:hover { border-color: #C9973A !important; transform: translateY(-1px); }
  .history-row { transition: background-color 0.2s ease; border-radius: 8px; padding: 8px 10px; margin: 0 -10px; }
  .history-row:hover { background-color: #212121; }
  .heat-cell { transition: transform 0.12s ease; }
  .heat-cell:hover { transform: scale(1.35); border-radius: 2px; }
  @media (prefers-reduced-motion: reduce) {
    .dash-anim  { animation: none !important; opacity: 1 !important; transform: none !important; }
    .bar-grow   { animation: none !important; transform: scaleY(1) !important; }
    .grow-x     { animation: none !important; transform: scaleX(1) !important; }
  }
`

/* ─── Helpers ────────────────────────────────────────────── */
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

/** % d'évolution entre deux valeurs. null si pas de base de comparaison. */
function pctDelta(cur: number, prev: number | null): number | null {
  if (prev === null) return null
  if (prev === 0) return cur > 0 ? 100 : null
  return Math.round(((cur - prev) / prev) * 100)
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return NaN
  return new Date(iso).getTime()
}

function inWindow(iso: string | null | undefined, start: number, end: number): boolean {
  const t = parseTime(iso)
  if (Number.isNaN(t)) return false
  return t >= start && t <= end
}

/* ─── useCountUp ─────────────────────────────────────────── */
/** Compte/anime de la valeur précédente vers `target`. Se relance à chaque
 *  changement de target (ex : changement de période). */
function useCountUp(target: number, decimals = 0, duration = 1000): string {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const startTime = performance.now()
    let rafId = 0

    // Toutes les mises à jour de state passent par ce callback rAF (asynchrone)
    // pour éviter un setState synchrone dans le corps de l'effet.
    function tick(now: number) {
      const t = reduce ? 1 : Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])

  return decimals > 0 ? display.toFixed(decimals) : String(Math.round(display))
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

/* ─── DeltaBadge ─────────────────────────────────────────── */
function DeltaBadge({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value === null || Number.isNaN(value)) return null
  const positive = value >= 0
  return (
    <span
      className={`shrink-0 py-0.5 px-2 text-xs rounded-full font-medium ${
        positive ? 'bg-[#3a2f1d] text-gold' : 'bg-[#2e1515] text-[#ef4343]'
      }`}
    >
      {positive ? '▲' : '▼'} {positive ? '+' : ''}{value}{suffix}
    </span>
  )
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

/* ─── Icônes SVG ─────────────────────────────────────────── */
function IconStar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  )
}
function IconShield({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}
function IconUtensils({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  )
}
function IconLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function IconFlame({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}
function IconCornerDownRight({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 10 5 5-5 5" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  )
}

/* ─── PeriodSelector ─────────────────────────────────────── */
function PeriodSelector({ value, onChange }: { value: PeriodId; onChange: (p: PeriodId) => void }) {
  return (
    <div className="inline-flex flex-row items-center gap-1 bg-[#171717] border border-[#292929] rounded-2xl p-1">
      {PERIODS.map((p) => {
        const active = p.id === value
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={[
              'text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl min-h-[40px] transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.97]',
              active ? 'bg-gold text-[#0d0d0d] font-semibold' : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
            ].join(' ')}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── ConversionFunnel ───────────────────────────────────── */
function ConversionFunnel({ scans, ratings, google }: { scans: number; ratings: number; google: number }) {
  const max = Math.max(scans, ratings, google, 1)
  const stages = [
    { label: 'Scans QR Avis',          value: scans,   color: '#8c8c8c', hint: 'clients ayant scanné' },
    { label: 'Avis déposés',           value: ratings, color: '#C9973A', hint: 'ont laissé une note' },
    { label: 'Redirigés vers Google',  value: google,  color: '#e6b84a', hint: 'avis 4-5★ → Google' },
  ]
  const rateRatings = scans > 0 ? Math.round((ratings / scans) * 100) : null
  const rateGoogle  = ratings > 0 ? Math.round((google / ratings) * 100) : null

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Tunnel de conversion</p>
        {scans > 0 && (
          <span className="shrink-0 py-0.5 px-2 text-xs rounded-full bg-[#3a2f1d] text-gold font-medium">
            {Math.round((google / Math.max(scans, 1)) * 100)}% scan → avis Google
          </span>
        )}
      </div>

      <div className="w-full flex flex-col gap-2.5">
        {stages.map((s, i) => {
          const width = Math.max(8, (s.value / max) * 100)
          const rate = i === 1 ? rateRatings : i === 2 ? rateGoogle : null
          return (
            <div key={s.label} className="w-full flex flex-col gap-1.5">
              {rate !== null && (
                <div className="flex items-center gap-2 pl-1 text-[#555]">
                  <IconCornerDownRight size={12} />
                  <span className="text-xs text-[#8c8c8c]">{rate}% de conversion</span>
                </div>
              )}
              <div className="w-full flex flex-row items-center gap-3">
                <div className="flex-1 min-w-0 h-11 rounded-xl bg-[#0f0f0f] border border-[#222222] overflow-hidden relative">
                  <div
                    className="grow-x h-full rounded-xl flex items-center"
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  >
                    <span className="pl-3 text-sm font-bold text-[#0d0d0d] truncate">{s.value}</span>
                  </div>
                </div>
                <div className="w-[130px] shrink-0 flex flex-col">
                  <span className="text-sm text-[#e5e5e5] leading-tight">{s.label}</span>
                  <span className="text-[11px] text-[#666] leading-tight">{s.hint}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── RatingDistribution ─────────────────────────────────── */
function RatingDistribution({ counts }: { counts: number[] }) {
  // counts[0] = 1★ … counts[4] = 5★
  const total = counts.reduce((a, v) => a + v, 0)
  const max = Math.max(...counts, 1)
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Répartition des notes</p>
        <span className="text-xs text-[#8c8c8c]">{total} avis</span>
      </div>
      <div className="w-full flex-1 flex flex-col justify-between gap-3 min-h-[180px]">
        {[5, 4, 3, 2, 1].map((star) => {
          const c = counts[star - 1] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          const width = Math.max(2, (c / max) * 100)
          return (
            <div key={star} className="w-full flex-1 flex flex-row items-center gap-3">
              <div className="w-9 shrink-0 flex flex-row items-center gap-1" style={{ color: RATING_COLORS[star] }}>
                <span className="text-sm text-[#e5e5e5] font-medium">{star}</span>
                <IconStar size={12} />
              </div>
              <div className="flex-1 min-w-0 h-full max-h-9 min-h-[24px] rounded-lg bg-[#0f0f0f] border border-[#222222] overflow-hidden">
                <div
                  className="grow-x h-full rounded-lg"
                  style={{ width: `${width}%`, backgroundColor: RATING_COLORS[star], animationDelay: `${(5 - star) * 70}ms` }}
                />
              </div>
              <div className="w-[78px] shrink-0 text-right">
                <span className="text-sm text-[#e5e5e5] font-medium">{c}</span>
                <span className="text-xs text-[#666] ml-1">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── ActivityHeatmap ────────────────────────────────────── */
function ActivityHeatmap({ grid, max, peak }: {
  grid: number[][]
  max: number
  peak: { day: number; hour: number; count: number }
}) {
  const HOURS = Array.from({ length: 24 }, (_, h) => h)
  function cellColor(count: number) {
    if (count <= 0) return '#161616'
    const a = 0.18 + (count / max) * 0.82
    return `rgba(201,151,58,${a.toFixed(3)})`
  }
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Heures de pointe</p>
        {peak.count > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 py-0.5 px-2 text-xs rounded-full bg-[#3a2f1d] text-gold font-medium">
            <IconFlame size={11} /> Pic : {DAYS_SHORT[peak.day]} {peak.hour}h ({peak.count} scans)
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: '520px' }} className="flex flex-col gap-1">
          {/* En-tête des heures (toutes les 3h) */}
          <div className="flex flex-row items-center gap-1">
            <div className="w-8 shrink-0" />
            <div className="flex-1 grid" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
              {HOURS.map((h) => (
                <span key={h} className="text-center" style={{ fontSize: '8px', color: '#555' }}>
                  {h % 3 === 0 ? `${h}h` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Lignes jour × heures */}
          {grid.map((row, dayIdx) => (
            <div key={dayIdx} className="flex flex-row items-center gap-1">
              <span className="w-8 shrink-0 text-[10px] text-[#8c8c8c]">{DAYS_SHORT[dayIdx]}</span>
              <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                {row.map((count, h) => (
                  <div
                    key={h}
                    className="heat-cell rounded-[2px]"
                    title={`${DAYS_SHORT[dayIdx]} ${h}h — ${count} scan${count > 1 ? 's' : ''}`}
                    style={{ aspectRatio: '1 / 1', backgroundColor: cellColor(count) }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── BarChartSvg ────────────────────────────────────────── */
function BarChartSvg({
  counts, labels, total, delta, title, unitLabel,
}: {
  counts: number[]
  labels: string[]
  total: number
  delta: number | null
  title: string
  unitLabel: string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)

  const n       = counts.length || 1
  const maxCount = Math.max(...counts, 1)
  const slotW   = 100 / n
  const barW    = slotW * 0.55
  const padT    = 6

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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{title}</p>
        <DeltaBadge value={delta} />
      </div>
      <p className="text-2xl font-bold">{total} <span className="text-xs text-[#8c8c8c] font-normal">{unitLabel}</span></p>

      <div className="relative w-full">
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '140px' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
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
  lines, total, title, unitLabel,
}: {
  lines: Array<{ key: string; label: string; color: string; data: number[] }>
  total: number
  title: string
  unitLabel: string
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{title}</p>
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
      <p className="text-2xl font-bold">{total} <span className="text-xs text-[#8c8c8c] font-normal">{unitLabel}</span></p>

      <div className="relative w-full">
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '140px' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {gridYs.map((y, i) => (
            <line key={i} x1={padL} y1={y.toFixed(2)} x2={100 - padR} y2={y.toFixed(2)}
              stroke="#292929" strokeWidth="0.6" strokeDasharray="2.5,2" strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke" />
          ))}

          {lines.map(line => {
            const pts: Array<[number, number]> = line.data.map((v, i) => [toX(i), toY(v)])
            const d       = smoothPath(pts)
            const lastIdx = line.data.length - 1
            const lx      = toX(lastIdx)
            const ly      = toY(line.data[lastIdx] ?? 0)
            const opacity = line.color === '#ffffff' ? 0.6 : 1
            return (
              <g key={line.key}>
                <path d={d} fill="none" stroke={line.color} strokeWidth="1.5"
                  strokeOpacity={opacity} strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke" />
                <rect x={(lx - 1.2).toFixed(2)} y={(ly - 1.2).toFixed(2)}
                  width="2.4" height="2.4" rx="1.2" ry="1.2"
                  fill={line.color} fillOpacity={opacity} />
              </g>
            )
          })}

          {hoveredIdx !== null && (
            <line x1={toX(hoveredIdx).toFixed(2)} y1={padT} x2={toX(hoveredIdx).toFixed(2)} y2={padT + chartH}
              stroke="white" strokeWidth="0.6" strokeOpacity="0.2"
              vectorEffect="non-scaling-stroke" />
          )}
        </svg>

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

/* ─── ExportMenu ─────────────────────────────────────────── */
function ExportMenu({ busy, onSelect, comingSoon = false }: { busy: boolean; onSelect: (f: 'pdf' | 'csv') => void; comingSoon?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const downloadIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />
    </svg>
  )

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const options = [
    { id: 'pdf' as const, label: 'PDF', hint: 'Rapport imprimable' },
    { id: 'csv' as const, label: 'CSV', hint: 'Données (Excel)' },
  ]

  if (comingSoon) {
    return (
      <button
        type="button"
        disabled
        title="Bientôt disponible"
        className="inline-flex items-center gap-2 text-xs md:text-sm text-[#555] border border-[#232323] rounded-2xl px-3 md:px-4 py-2 min-h-[40px] opacity-60 cursor-not-allowed"
      >
        {downloadIcon}
        Exporter
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1f1f1f] text-[#8c8c8c] border border-[#292929]">Bientôt</span>
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="inline-flex items-center gap-2 text-xs md:text-sm text-[#8c8c8c] border border-[#292929] rounded-2xl px-3 md:px-4 py-2 min-h-[40px] cursor-pointer transition-colors duration-200 hover:text-white hover:border-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#444] border-t-[#C9973A] animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />
          </svg>
        )}
        Exporter
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 z-30 w-44 bg-[#171717] border border-[#292929] rounded-xl p-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setOpen(false); onSelect(opt.id) }}
              className="w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors duration-150 hover:bg-white/5"
            >
              <span className="text-sm text-[#e5e5e5]">{opt.label}</span>
              <span className="text-[11px] text-[#666]">{opt.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews]   = useState<ReviewRow[]>([])
  const [scans, setScans]       = useState<ScanRow[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])

  const [period, setPeriod] = useState<PeriodId>('30')
  const [exporting, setExporting] = useState(false)
  const [bilan, setBilan] = useState<{ monthLabel: string; content: string } | null>(null)

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
        if (!biz) { if (!cancelled) { setBusiness(null) }; return }
        if (!cancelled) setBusiness(biz)

        const { data: rev, error: revErr } = await supabase.from('reviews').select('id,rating,created_at').eq('business_id', biz.id).order('created_at', { ascending: false })
        if (revErr) throw revErr
        if (!cancelled) setReviews(rev ?? [])

        const { data: sc, error: scanErr } = await supabase.from('scans').select('id,qr_type,created_at').eq('business_id', biz.id).order('created_at', { ascending: false })
        if (scanErr) throw scanErr
        if (!cancelled) setScans((sc as ScanRow[] | null) ?? [])

        const { data: fb, error: fbErr } = await supabase.from('feedback').select('id,message,rating,created_at').eq('business_id', biz.id).order('created_at', { ascending: false })
        if (fbErr) throw fbErr
        if (!cancelled) setFeedbacks(fb ?? [])
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  /* ── Bilan mensuel IA (lecture/génération côté serveur, 1×/mois) ── */
  useEffect(() => {
    if (FEATURES_COMING_SOON) return
    if (!business?.id) return
    let cancelled = false
    fetch('/api/monthly-report')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { monthLabel?: string; content?: string | null } | null) => {
        if (!cancelled && d && d.content && d.monthLabel) {
          setBilan({ monthLabel: d.monthLabel, content: d.content })
        }
      })
      .catch(() => { /* silencieux : le bilan est un bonus, ne bloque jamais le dashboard */ })
    return () => { cancelled = true }
  }, [business?.id])

  /* ── Fenêtres temporelles (courante + précédente) ── */
  const windows = useMemo(() => {
    const now = Date.now()
    const cfg = PERIODS.find(p => p.id === period)!
    if (cfg.days === null) {
      return { curStart: -Infinity, curEnd: now, prevStart: null as number | null, prevEnd: null as number | null }
    }
    const span = cfg.days * DAY_MS
    return { curStart: now - span, curEnd: now, prevStart: now - 2 * span, prevEnd: now - span }
  }, [period])

  /* ── Datasets filtrés par période ── */
  const reviewsCur = useMemo(
    () => reviews.filter(r => inWindow(r.created_at, windows.curStart, windows.curEnd)),
    [reviews, windows]
  )
  const reviewsPrev = useMemo(
    () => windows.prevStart === null ? null : reviews.filter(r => inWindow(r.created_at, windows.prevStart!, windows.prevEnd!)),
    [reviews, windows]
  )
  const scansCur = useMemo(
    () => scans.filter(s => inWindow(s.created_at, windows.curStart, windows.curEnd)),
    [scans, windows]
  )
  const scansPrev = useMemo(
    () => windows.prevStart === null ? null : scans.filter(s => inWindow(s.created_at, windows.prevStart!, windows.prevEnd!)),
    [scans, windows]
  )
  const feedbacksCur = useMemo(
    () => feedbacks.filter(f => inWindow(f.created_at, windows.curStart, windows.curEnd)),
    [feedbacks, windows]
  )

  /* ── Stat helpers ── */
  function ratingStats(rows: ReviewRow[]) {
    const ratings = rows.map(r => r.rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const avg = ratings.length > 0 ? ratings.reduce((a, v) => a + v, 0) / ratings.length : 0
    const sat = ratings.length > 0 ? (ratings.filter(v => v >= 4).length / ratings.length) * 100 : 0
    return { count: ratings.length, avg, sat, positives: ratings.filter(v => v >= 4).length, negatives: ratings.filter(v => v <= 3).length }
  }

  const cur  = useMemo(() => ratingStats(reviewsCur), [reviewsCur])
  const prev = useMemo(() => reviewsPrev ? ratingStats(reviewsPrev) : null, [reviewsPrev])

  /* ── KPIs principaux ── */
  const totalScans     = scansCur.length
  const scansDelta     = pctDelta(totalScans, scansPrev ? scansPrev.length : null)
  const avgDelta       = prev && prev.count > 0 && cur.count > 0 ? Math.round((cur.avg - prev.avg) * 10) / 10 : null
  const satDelta       = prev && prev.count > 0 && cur.count > 0 ? Math.round(cur.sat - prev.sat) : null

  /* ── Cartes impact ── */
  const googleGenerated = cur.positives
  const googleDelta     = pctDelta(googleGenerated, prev ? prev.positives : null)
  const intercepted     = cur.negatives
  const interceptedDelta = pctDelta(intercepted, prev ? prev.negatives : null)

  /* ── Tunnel de conversion ── */
  const reviewScansCount = useMemo(() => scansCur.filter(s => s.qr_type === 'review').length, [scansCur])

  /* ── Répartition des notes ── */
  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    reviewsCur.forEach(r => {
      if (typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++
    })
    return counts
  }, [reviewsCur])

  /* ── Heatmap heures × jours ── */
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
    let max = 0
    let peak = { day: 0, hour: 0, count: 0 }
    scansCur.forEach(s => {
      const t = parseTime(s.created_at)
      if (Number.isNaN(t)) return
      const d = new Date(t)
      const row = (d.getDay() + 6) % 7 // Lun=0 … Dim=6
      const h = d.getHours()
      grid[row][h]++
      if (grid[row][h] > max) max = grid[row][h]
      if (grid[row][h] > peak.count) peak = { day: row, hour: h, count: grid[row][h] }
    })
    return { grid, max: Math.max(max, 1), peak }
  }, [scansCur])

  /* ── Buckets pour les graphes (≤13, adaptés à la période) ── */
  const buckets = useMemo(() => {
    const now = Date.now()
    let startMs: number
    if (period === 'all') {
      const times = [...reviews, ...scans].map(x => parseTime(x.created_at)).filter(t => !Number.isNaN(t))
      startMs = times.length ? Math.min(...times) : now - 30 * DAY_MS
    } else {
      startMs = now - Number(period) * DAY_MS
    }
    const startD = new Date(startMs); startD.setHours(0, 0, 0, 0)
    const startAligned = startD.getTime()
    const totalDays = Math.max(1, Math.ceil((now - startAligned) / DAY_MS))
    const bucketDays = Math.max(1, Math.ceil(totalDays / 13))

    const list: { start: number; end: number; label: string }[] = []
    let s = startAligned
    while (s <= now && list.length < 14) {
      const e = s + bucketDays * DAY_MS
      const sd = new Date(s)
      const label = bucketDays === 1
        ? String(sd.getDate())
        : `${sd.getDate()}/${sd.getMonth() + 1}`
      list.push({ start: s, end: e, label })
      s = e
    }
    return list
  }, [period, reviews, scans])

  function bucketize(rows: { created_at?: string | null }[], pred?: (r: { created_at?: string | null }) => boolean): number[] {
    return buckets.map(b =>
      rows.filter(r => {
        if (pred && !pred(r)) return false
        const t = parseTime(r.created_at)
        return !Number.isNaN(t) && t >= b.start && t < b.end
      }).length
    )
  }

  const barChartData = useMemo(() => {
    const counts = bucketize(reviews)
    return { counts, labels: buckets.map(b => b.label), total: counts.reduce((a, v) => a + v, 0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, reviews])

  const lineChartData = useMemo(() => {
    const review = bucketize(scans, s => (s as ScanRow).qr_type === 'review')
    const menu   = bucketize(scans, s => (s as ScanRow).qr_type === 'menu')
    const custom = bucketize(scans, s => (s as ScanRow).qr_type === 'custom')
    const total  = review.reduce((a, v) => a + v, 0) + menu.reduce((a, v) => a + v, 0) + custom.reduce((a, v) => a + v, 0)
    return {
      total,
      lines: [
        { key: 'review', label: 'Avis Google', color: '#C9973A', data: review },
        { key: 'menu',   label: 'Menu',        color: '#ffffff', data: menu   },
        { key: 'custom', label: 'Lien custom', color: '#8c8c8c', data: custom },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, scans])

  const reviewsDeltaForBar = pctDelta(cur.count, prev ? prev.count : null)

  /* ── Scans par QR code (période) ── */
  const scansByQrType = useMemo(() =>
    scansCur.reduce((acc, s) => {
      if (s.qr_type === 'review') acc.review++
      if (s.qr_type === 'menu')   acc.menu++
      if (s.qr_type === 'custom') acc.custom++
      return acc
    }, { review: 0, menu: 0, custom: 0 }), [scansCur])

  /* ── Feedbacks récents (période) ── */
  const recentFeedbacks = useMemo(() => feedbacksCur.slice(0, 8), [feedbacksCur])

  /* ── Historique combiné (période) ── */
  const historiqueItems = useMemo((): HistoriqueItem[] => {
    const pos: HistoriqueItem[] = reviewsCur.filter(r => r.rating !== null && r.rating >= 4).map((r, i) => ({ id: r.id ?? `rev-${i}`, rating: r.rating, created_at: r.created_at ?? null }))
    const neg: HistoriqueItem[] = feedbacksCur.map((f, i) => ({ id: f.id ?? `fb-${i}`, rating: f.rating, created_at: f.created_at ?? null, message: f.message }))
    return [...pos, ...neg].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 8)
  }, [reviewsCur, feedbacksCur])

  /* ── Compteurs animés ── */
  const hasRatings        = cur.count > 0
  const animTotalScans    = useCountUp(totalScans)
  const animAvgRating     = useCountUp(cur.avg, 1)
  const animSatisfaction  = useCountUp(cur.sat)
  const animGoogle        = useCountUp(googleGenerated)
  const animIntercepted   = useCountUp(intercepted)
  const animReviewScans   = useCountUp(scansByQrType.review)
  const animMenuScans     = useCountUp(scansByQrType.menu)
  const animCustomScans   = useCountUp(scansByQrType.custom)

  const periodLabel = PERIODS.find(p => p.id === period)!.label.toLowerCase()

  /* ── Export PDF / CSV ── */
  async function handleExport(fmt: 'pdf' | 'csv') {
    if (!business) return
    try {
      setExporting(true)
      if (fmt === 'csv') {
        generateReportCsv({
          businessName: business.name ?? '',
          reviews: reviewsCur,
          feedbacks: feedbacksCur,
        })
      } else {
        const rangeText = period === 'all'
          ? 'Toutes les données'
          : `${new Date(windows.curStart).toLocaleDateString('fr-FR')} – ${new Date(windows.curEnd).toLocaleDateString('fr-FR')}`
        const metrics: ReportMetrics = {
          avisCollectes: cur.count,
          noteMoyenne: cur.count > 0 ? cur.avg : null,
          satisfaction: cur.count > 0 ? cur.sat : null,
          scans: totalScans,
          googleGenerated,
          intercepted,
        }
        await generateReportPdf({
          businessName: business.name ?? '',
          periodLabel: PERIODS.find(p => p.id === period)!.label,
          rangeText,
          metrics,
          bilan: bilan?.content ?? null,
        })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export impossible.')
    } finally {
      setExporting(false)
    }
  }

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
            {/* ── Sélecteur de période ── */}
            <div className="dash-anim w-full flex flex-row items-center justify-between flex-wrap gap-3" style={anim(0)}>
              <p className="text-sm text-[#8c8c8c]">
                Vue d&apos;ensemble · <span className="text-[#e5e5e5]">{periodLabel}</span>
              </p>
              <div className="flex items-center gap-2">
                <PeriodSelector value={period} onChange={setPeriod} />
                <ExportMenu busy={exporting} onSelect={handleExport} comingSoon={FEATURES_COMING_SOON} />
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
              {[
                { label: 'Total de scans', value: animTotalScans,                              sub: `scans · ${periodLabel}`, delay: 0,   gold: false, delta: scansDelta, suffix: '%' },
                { label: 'Note moyenne',   value: hasRatings ? animAvgRating + '★' : '—',     sub: 'sur 5',                  delay: 80,  gold: true,  delta: avgDelta,   suffix: '' },
                { label: 'Satisfaction',   value: hasRatings ? animSatisfaction + '%' : '—',  sub: 'clients satisfaits',     delay: 160, gold: false, delta: satDelta,   suffix: ' pts' },
              ].map(({ label, value, sub, delay, gold, delta, suffix }) => (
                <div key={label} className="dash-anim w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-2 md:gap-3" style={anim(delay)}>
                  <div className="w-full flex flex-row items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{label}</p>
                    <DeltaBadge value={delta} suffix={suffix} />
                  </div>
                  <p className={`text-4xl md:text-5xl font-bold ${gold ? 'text-gold' : 'text-white'}`}>{value}</p>
                  <p className="text-sm text-[#8c8c8c]">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Cartes impact ── */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-6">
              <div className="dash-anim w-full flex flex-row items-center gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6" style={anim(220)}>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#28231a] flex items-center justify-center text-gold"><IconStar size={22} /></div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="w-full flex flex-row items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Avis Google générés</p>
                    <DeltaBadge value={googleDelta} />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-gold">{animGoogle}</p>
                  <p className="text-xs text-[#8c8c8c]">avis 4-5★ redirigés vers Google</p>
                </div>
              </div>

              <div className="dash-anim w-full flex flex-row items-center gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6" style={anim(300)}>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#241a1a] flex items-center justify-center text-gold"><IconShield size={22} /></div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="w-full flex flex-row items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Négatifs interceptés</p>
                    <DeltaBadge value={interceptedDelta} />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-white">{animIntercepted}</p>
                  <p className="text-xs text-[#8c8c8c]">avis 1-3★ captés avant Google</p>
                </div>
              </div>
            </div>

            {/* ── Bilan du mois (IA) ── */}
            {FEATURES_COMING_SOON ? (
              <div className="dash-anim w-full border border-[#232323] bg-[#171717] rounded-2xl p-4 md:p-6 flex flex-col gap-2.5 opacity-60" style={anim(340, 0.6)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-[#8c8c8c]">Bilan du mois</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1f1f1f] text-[#8c8c8c] border border-[#292929]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Bientôt disponible
                  </span>
                </div>
                <p className="text-sm md:text-[15px] leading-relaxed text-[#666]">
                  Un résumé clair de votre mois, rédigé automatiquement pour vous. Disponible très bientôt.
                </p>
              </div>
            ) : bilan ? (
              <div className="dash-anim w-full border border-[#292929] bg-[#171717] rounded-2xl p-4 md:p-6 flex flex-col gap-2.5" style={anim(340, 0.6)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-gold">Bilan du mois</span>
                  <span className="text-xs text-[#666] capitalize">· {bilan.monthLabel}</span>
                </div>
                <p className="text-sm md:text-[15px] leading-relaxed text-[#d1d1d1]">{bilan.content}</p>
              </div>
            ) : null}

            {/* ── Tunnel de conversion ── */}
            <div className="dash-anim w-full border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl" style={anim(360, 0.6)}>
              <ConversionFunnel scans={reviewScansCount} ratings={cur.count} google={googleGenerated} />
            </div>

            {/* ── Scans par QR code ── */}
            <div className="dash-anim w-full" style={anim(420)}>
              <p className="text-xs text-[#8c8c8c] tracking-widest uppercase mb-3">Scans par QR code</p>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                {[
                  { icon: <IconStar size={13} />,     label: 'Avis Google', value: animReviewScans, delay: 420 },
                  { icon: <IconUtensils size={13} />, label: 'Menu',        value: animMenuScans,   delay: 480 },
                  { icon: <IconLink size={13} />,     label: 'Lien custom', value: animCustomScans, delay: 540 },
                ].map(({ icon, label, value, delay }) => (
                  <div key={label} className="dash-anim w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-2 md:gap-3" style={anim(delay)}>
                    <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#8c8c8c]">{icon} {label}</p>
                    <p className="text-4xl md:text-5xl font-bold text-white">{value}</p>
                    <p className="text-sm text-[#8c8c8c]">scans · {periodLabel}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Graphes + Feedbacks ── */}
            <div className="dash-anim w-full flex flex-col lg:flex-row items-stretch gap-3 lg:gap-6" style={anim(600, 0.6)}>
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                  <BarChartSvg
                    counts={barChartData.counts}
                    labels={barChartData.labels}
                    total={barChartData.total}
                    delta={reviewsDeltaForBar}
                    title="Avis sur la période"
                    unitLabel={`avis · ${periodLabel}`}
                  />
                </div>
                <div className="border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                  <LineChartSvg
                    lines={lineChartData.lines}
                    total={lineChartData.total}
                    title="Scans sur la période"
                    unitLabel={`scans · ${periodLabel}`}
                  />
                </div>
              </div>

              <div className="w-full lg:w-[380px] shrink-0 flex flex-col border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                <p className="text-xs text-[#8c8c8c] tracking-widest uppercase mb-4 shrink-0">
                  Feedbacks récents
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {recentFeedbacks.length === 0 ? (
                      <p className="text-sm text-[#8c8c8c]">Aucun feedback sur cette période</p>
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

            {/* ── Répartition + Heatmap ── */}
            <div className="dash-anim w-full flex flex-col lg:flex-row items-stretch gap-3 lg:gap-6" style={anim(680, 0.6)}>
              <div className="w-full lg:w-[420px] shrink-0 border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                <RatingDistribution counts={ratingCounts} />
              </div>
              <div className="flex-1 min-w-0 border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl">
                <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} peak={heatmap.peak} />
              </div>
            </div>

            {/* ── Historique ── */}
            <div className="dash-anim w-full flex flex-col justify-start items-start gap-4 border border-[#222222] bg-[#171717] p-4 md:p-6 rounded-xl" style={anim(760, 0.6)}>
              <p className="text-xs text-[#8c8c8c] tracking-widest uppercase">Historique</p>
              <div className="w-full flex flex-col gap-1">
                {historiqueItems.length === 0 ? (
                  <p className="text-sm text-[#8c8c8c]">Aucun avis sur cette période.</p>
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
