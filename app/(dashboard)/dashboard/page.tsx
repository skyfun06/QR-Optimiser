'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  name?: string | null
}

type ReviewRow = {
  id?: string
  rating: number | null
  created_at?: string | null
}

type FeedbackRow = {
  id?: string
  message: string | null
  rating: number | null
  created_at?: string | null
}

type ScanType = 'review' | 'menu' | 'custom'

type ScanRow = {
  id?: string
  qr_type: ScanType | null
  created_at?: string | null
}

const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatRelativeShort(iso: string | null | undefined) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  const ms = Date.now() - t
  if (ms < 0 || Number.isNaN(t)) return '—'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 24) return `il y a ${Math.max(1, hours)}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function formatReviewDateFr(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarRow({ rating, size }: { rating: number | null | undefined; size: 12 | 14 }) {
  const r =
    typeof rating === 'number' && Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0
  const filledCount = Math.min(5, Math.max(0, Math.round(r)))
  const positive = r >= 4
  const fillColor = positive ? '#C9973A' : '#ef4444'
  const emptyColor = '#333333'

  return (
    <div className="flex flex-row justify-center items-center gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < filledCount
        return (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={filled ? fillColor : emptyColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={STAR_PATH} fill={filled ? fillColor : 'none'} />
          </svg>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [scansThisMonth, setScansThisMonth] = useState<ScanRow[]>([])
  const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackRow[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          // Normalement géré par le middleware, mais on sécurise l'UI.
          if (!cancelled) setError('Vous devez être connecté.')
          return
        }

        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id,name')
          .eq('user_id', user.id)
          .maybeSingle()

        if (businessError) throw businessError

        if (!businessData) {
          if (!cancelled) {
            setBusiness(null)
            setScansThisMonth([])
          }
          return
        }

        if (!cancelled) setBusiness(businessData)

        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('id,rating,created_at')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })

        if (reviewsError) throw reviewsError
        if (!cancelled) setReviews(reviewsData ?? [])

        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        nextMonthStart.setHours(0, 0, 0, 0)

        const { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('id,qr_type,created_at')
          .eq('business_id', businessData.id)
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', nextMonthStart.toISOString())
          .order('created_at', { ascending: false })

        if (scansError) throw scansError
        if (!cancelled) setScansThisMonth((scansData as ScanRow[] | null) ?? [])

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('*')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })
          .limit(8)

        if (feedbackError) throw feedbackError
        if (!cancelled) setRecentFeedbacks(feedbackData ?? [])
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = useMemo(() => {
    const totalScans = scansThisMonth.length

    const ratings = reviews
      .map((r) => r.rating)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

    const avgRating =
      ratings.length > 0 ? ratings.reduce((acc, v) => acc + v, 0) / ratings.length : 0

    const satisfiedCount = ratings.filter((v) => v >= 4).length
    const satisfactionRate = ratings.length > 0 ? (satisfiedCount / ratings.length) * 100 : 0

    return {
      totalScans,
      avgRating,
      satisfactionRate,
      hasValidRatings: ratings.length > 0,
    }
  }, [reviews, scansThisMonth])

  const todayVsYesterdayPercent = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(todayStart.getDate() - 1)

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const todayKey = dayKey(todayStart)
    const yesterdayKey = dayKey(yesterdayStart)

    const todayCount = reviews.filter((r) => {
      if (!r.created_at) return false
      return dayKey(new Date(r.created_at)) === todayKey
    }).length

    const yesterdayCount = reviews.filter((r) => {
      if (!r.created_at) return false
      return dayKey(new Date(r.created_at)) === yesterdayKey
    }).length

    if (yesterdayCount === 0) return todayCount > 0 ? 100 : null
    return Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
  }, [reviews])

  const avisCeMoisChart = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const reviewsThisMonth = reviews.filter((r) => {
      if (!r.created_at) return false
      const t = new Date(r.created_at).getTime()
      return t >= monthStart.getTime() && t <= monthEnd.getTime()
    })
    const monthTotal = reviewsThisMonth.length

    const dayKeyLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const counts: number[] = []
    for (let i = 12; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = dayKeyLocal(d)
      const count = reviewsThisMonth.filter((r) => {
        if (!r.created_at) return false
        const rd = new Date(r.created_at)
        return dayKeyLocal(rd) === key
      }).length
      counts.push(count)
    }

    const maxCount = counts.length ? Math.max(...counts) : 0

    const heights = counts.map((count) => {
      if (monthTotal === 0) return 8
      if (count === 0) return 8
      if (maxCount <= 0) return 8
      return (count / maxCount) * 60
    })

    return { monthTotal, heights }
  }, [reviews])

  const scansByQrType = useMemo(() => {
    return scansThisMonth.reduce(
      (acc, scan) => {
        if (scan.qr_type === 'review') acc.review += 1
        if (scan.qr_type === 'menu') acc.menu += 1
        if (scan.qr_type === 'custom') acc.custom += 1
        return acc
      },
      { review: 0, menu: 0, custom: 0 }
    )
  }, [scansThisMonth])

  const scansDerniersJoursChart = useMemo(() => {
    const dayKeyLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const keys: string[] = []
    for (let i = 12; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(start.getDate() - i)
      keys.push(dayKeyLocal(d))
    }

    const keyToIndex = new Map(keys.map((key, index) => [key, index]))
    const byType: Record<ScanType, number[]> = {
      review: Array.from({ length: keys.length }, () => 0),
      menu: Array.from({ length: keys.length }, () => 0),
      custom: Array.from({ length: keys.length }, () => 0),
    }

    scansThisMonth.forEach((scan) => {
      if (!scan.created_at || !scan.qr_type) return
      const index = keyToIndex.get(dayKeyLocal(new Date(scan.created_at)))
      if (index === undefined) return
      if (scan.qr_type === 'review' || scan.qr_type === 'menu' || scan.qr_type === 'custom') {
        byType[scan.qr_type][index] += 1
      }
    })

    const maxCount = Math.max(
      ...byType.review,
      ...byType.menu,
      ...byType.custom,
      0
    )

    const toPoints = (series: number[]) =>
      series
        .map((value, index) => {
          const x = (index / (series.length - 1)) * 100
          const y = maxCount > 0 ? 100 - (value / maxCount) * 100 : 100
          return `${x},${y}`
        })
        .join(' ')

    return {
      monthTotal: scansThisMonth.length,
      hasData: maxCount > 0,
      lines: [
        { key: 'review', label: 'Avis Google', color: '#C9973A', points: toPoints(byType.review) },
        { key: 'menu', label: 'Menu', color: '#3B82F6', points: toPoints(byType.menu) },
        { key: 'custom', label: 'Lien custom', color: '#8B5CF6', points: toPoints(byType.custom) },
      ],
    }
  }, [scansThisMonth])

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
        <DashboardHeader
          subtitle={business?.name ?? null}
          onSignOutError={(message) => setError(message)}
        />
        <div className="flex flex-col justify-center items-center gap-4 p-4">
            {error && (
            <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
                <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            )}

            {loading && (
            <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
                <p className="text-[#8c8c8c]">Chargement…</p>
            </div>
            )}

            {!loading && !error && !business && (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Configurez votre commerce d&apos;abord
                </h2>
                <p className="text-sm text-gray-600">
                Aucun commerce n&apos;est associé à votre compte pour le moment.
                </p>
            </div>
            )}

            {!loading && !error && business && (
            <>
                <div className="w-full flex flex-row justify-between items-center gap-4 pt-4">
                    <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Total de scans</p>
                        <p className="text-5xl font-bold text-white">{kpis.totalScans}</p>
                        <p className="text-sm text-[#8c8c8c]">scans ce mois</p>
                    </div>

                    <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Note moyenne</p>
                        <p className="text-5xl font-bold text-gold">{kpis.hasValidRatings ? kpis.avgRating.toFixed(1) : '—'}<span className="text-4xl">★</span></p>
                        <p className="text-sm text-[#8c8c8c]">sur 5</p>
                    </div>

                    <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                        <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Satisfaction</p>
                        <p className="text-5xl font-bold text-white">{kpis.hasValidRatings ? formatPercent(kpis.satisfactionRate) : '—'}</p>
                        <p className="text-sm text-[#8c8c8c]">clients satisfaits</p>
                    </div>
                </div>

                <div className="w-full">
                    <p className="text-sm text-[#8c8c8c] tracking-[0.5px] uppercase mb-3">Scans par QR code</p>
                    <div className="w-full flex flex-row justify-between items-center gap-4">
                        <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                            <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">🌟 Avis Google</p>
                            <p className="text-5xl font-bold text-white">{scansByQrType.review}</p>
                            <p className="text-sm text-[#8c8c8c]">scans ce mois</p>
                        </div>
                        <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                            <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">🍽️ Menu</p>
                            <p className="text-5xl font-bold text-white">{scansByQrType.menu}</p>
                            <p className="text-sm text-[#8c8c8c]">scans ce mois</p>
                        </div>
                        <div className="w-full flex flex-col justify-start items-start bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-3">
                            <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">🔗 Lien custom</p>
                            <p className="text-5xl font-bold text-white">{scansByQrType.custom}</p>
                            <p className="text-sm text-[#8c8c8c]">scans ce mois</p>
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-row justify-start items-start gap-4">
                    <div className="w-full flex flex-col justify-start items-start gap-4">
                      <div className="w-full h-[324px] flex flex-col justify-start items-start gap-4 border border-[#222222] bg-[#171717] p-6 rounded-xl">
                          <div className="w-full flex flex-row justify-between items-center">
                              <p className="text-sm text-[#8c8c8c] tracking-[0.5px] uppercase">Avis ces derniers jours</p>
                              {todayVsYesterdayPercent !== null && (
                                <span className={`py-1 px-2 text-xs rounded-full ${todayVsYesterdayPercent >= 0 ? 'bg-[#3a2f1d] text-gold' : 'bg-[#2e1515] text-[#ef4343]'}`}>
                                  {todayVsYesterdayPercent >= 0 ? '+' : ''}{todayVsYesterdayPercent}%
                                </span>
                              )}
                          </div>
                          <div className="w-full flex items-end gap-1.5 pt-24">
                              {avisCeMoisChart.heights.map((h, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      height: `${h}px`,
                                      backgroundColor:'#C9973A',
                                    }}
                                    className="rounded-xl flex-1 min-h-0"
                                  />
                              ))}
                          </div>
                          <p className="text-4xl font-bold">{avisCeMoisChart.monthTotal}</p>
                      </div>

                      <div className="w-full h-[324px] flex flex-col justify-start items-start gap-4 border border-[#222222] bg-[#171717] p-6 rounded-xl">
                        <div className="w-full flex flex-row justify-between items-center">
                          <p className="text-sm text-[#8c8c8c] tracking-[0.5px] uppercase">Scans ces derniers jours</p>
                          <div className="flex flex-row items-center gap-3">
                            {scansDerniersJoursChart.lines.map((line) => (
                              <span key={line.key} className="flex items-center gap-1 text-xs text-[#8c8c8c]">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: line.color }}
                                />
                                {line.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="w-full h-[200px]">
                          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <line x1="0" y1="100" x2="100" y2="100" stroke="#2d2d2d" strokeWidth="0.8" />
                            <line x1="0" y1="0" x2="0" y2="100" stroke="#2d2d2d" strokeWidth="0.8" />
                            {scansDerniersJoursChart.lines.map((line) => (
                              <polyline
                                key={line.key}
                                points={line.points}
                                fill="none"
                                stroke={line.color}
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ))}
                          </svg>
                        </div>
                        <p className="text-4xl font-bold">{scansDerniersJoursChart.monthTotal}</p>
                      </div>
                    </div>

                    <div className="max-w-[471px] h-[664px] w-full flex flex-col justify-start items-start gap-5 border border-[#222222] bg-[#171717] p-6 rounded-xl">
                        <p className="text-sm text-[#8c8c8c] tracking-[0.5px] uppercase">Feedbacks récents</p>

                        <div className="w-full flex flex-col justify-start items-start gap-3">
                            {recentFeedbacks.length === 0 ? (
                              <p className="text-sm text-[#8c8c8c]">Aucun feedback pour le moment</p>
                            ) : (
                              recentFeedbacks.map((fb, idx) => (
                                <div key={fb.id ?? `fb-${idx}`} className="w-full flex flex-col gap-3">
                                  {idx > 0 ? <hr className="h-[1px] w-full border-0 bg-[#303030]" /> : null}
                                  <div className="w-full flex flex-row justify-between items-start gap-2">
                                    <div className="flex flex-col justify-start items-start gap-2 min-w-0">
                                      <p className="text-sm text-[#8c8c8c] whitespace-pre-wrap break-words">
                                        {fb.message?.trim() ? fb.message : '—'}
                                      </p>
                                      <StarRow rating={fb.rating} size={12} />
                                    </div>
                                    <p className="text-sm text-[#8c8c8c] shrink-0">
                                      {formatRelativeShort(fb.created_at)}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col justify-start items-start gap-5 border border-[#222222] bg-[#171717] p-6 rounded-xl">
                    <p className="text-sm text-[#8c8c8c] tracking-[0.5px] uppercase">Historique</p>
                    <div className="w-full flex flex-col justify-start items-start gap-4">
                        {reviews.length === 0 ? (
                          <p className="text-sm text-[#8c8c8c]">Aucun avis pour le moment.</p>
                        ) : (
                          reviews.slice(0, 5).map((rev, idx) => {
                            const r =
                              typeof rev.rating === 'number' && Number.isFinite(rev.rating)
                                ? rev.rating
                                : 0
                            const google = r >= 4
                            return (
                              <div key={rev.id ?? `rev-${idx}`} className="w-full flex flex-col gap-4">
                                {idx > 0 ? <hr className="h-[1px] w-full border-0 bg-[#303030]" /> : null}
                                <div className="w-full flex flex-row justify-between items-center gap-3 flex-wrap">
                                  <p className="text-sm text-[#8c8c8c] shrink-0">
                                    {formatReviewDateFr(rev.created_at)}
                                  </p>
                                  <StarRow rating={rev.rating} size={14} />
                                  {google ? (
                                    <p className="text-gold bg-[#28231a] py-0.5 px-2 text-xs rounded-full font-medium shrink-0">
                                      Google
                                    </p>
                                  ) : (
                                    <p className="w-[56px] flex justify-center items-center text-[#888888] bg-[#292929] py-0.5 px-2 text-xs rounded-full font-medium shrink-0">
                                      Privé
                                    </p>
                                  )}
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
