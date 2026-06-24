'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

const HISTORY_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .history-fade { animation: fadeUp 0.45s ease-out both; }
  .row-dim { opacity: 0.5; transition: opacity 0.2s ease; }
  @media (prefers-reduced-motion: reduce) {
    .history-fade { animation: none; opacity: 1; transform: none; }
  }
`

type BusinessRow = {
  id: string
  name: string | null
}

type FeedbackStatus = 'nouveau' | 'traite'

type FeedbackRow = {
  id: string
  message: string | null
  rating: number | null
  created_at: string | null
  status: FeedbackStatus | null
  treated_at: string | null
}

type StatusFilter = 'nouveau' | 'traite' | 'all'

const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

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

/* Petit indicateur visuel "traité" — coche or en micro-accent */
function TreatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#1f1f1f] text-[#8c8c8c] border border-[#292929]">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Traité
    </span>
  )
}

/* Bouton marquer traité / rouvrir — discret, micro-accent or */
function TreatButton({
  treated, busy, onClick,
}: { treated: boolean; busy: boolean; onClick: () => void }) {
  if (treated) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs text-[#666] border border-[#292929] rounded-lg px-2.5 py-1.5 min-h-[36px] cursor-pointer transition-colors duration-150 hover:text-[#aaa] hover:border-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        {busy ? '…' : 'Rouvrir'}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs text-[#8c8c8c] border border-[#292929] rounded-lg px-2.5 py-1.5 min-h-[36px] cursor-pointer transition-colors duration-150 hover:text-white hover:border-[#C9973A]/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {busy ? '…' : 'Marquer traité'}
    </button>
  )
}

const ITEMS_PER_PAGE = 10

function isTreated(fb: FeedbackRow) {
  return fb.status === 'traite'
}

export default function FeedbackHistoryPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'negative'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('nouveau')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const counts = useMemo(() => ({
    nouveau: feedbacks.filter((fb) => !isTreated(fb)).length,
    traite: feedbacks.filter((fb) => isTreated(fb)).length,
    all: feedbacks.length,
  }), [feedbacks])

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'nouveau' && !isTreated(fb)) ||
        (statusFilter === 'traite' && isTreated(fb))
      const ratingOk =
        ratingFilter === 'all' ||
        (ratingFilter === 'positive' && (fb.rating ?? 0) >= 4) ||
        (ratingFilter === 'negative' && (fb.rating ?? 0) <= 3)
      const query = search.trim().toLowerCase()
      const messageOk = !query || (fb.message ?? '').toLowerCase().includes(query)
      return statusOk && ratingOk && messageOk
    })
  }, [feedbacks, statusFilter, ratingFilter, search])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE)),
    [filteredFeedbacks.length]
  )

  const paginatedFeedbacks = useMemo(
    () => filteredFeedbacks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredFeedbacks, currentPage]
  )

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
          if (!cancelled) setError('Vous devez être connecté.')
          return
        }

        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id,name')
          .eq('id', businessId)
          .maybeSingle<BusinessRow>()

        if (businessError) throw businessError
        if (!businessData) {
          if (!cancelled) setBusiness(null)
          if (!cancelled) setFeedbacks([])
          return
        }

        if (!cancelled) setBusiness(businessData)

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('id,message,rating,created_at,status,treated_at')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })

        if (feedbackError) throw feedbackError
        if (!cancelled) setFeedbacks((feedbackData as FeedbackRow[] | null) ?? [])
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
  }, [businessId])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  async function toggleTreated(fb: FeedbackRow) {
    const nextStatus: FeedbackStatus = isTreated(fb) ? 'nouveau' : 'traite'
    const nextTreatedAt = nextStatus === 'traite' ? new Date().toISOString() : null

    // Optimiste
    setUpdatingId(fb.id)
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === fb.id ? { ...f, status: nextStatus, treated_at: nextTreatedAt } : f))
    )

    const { error: updateError } = await supabase
      .from('feedback')
      .update({ status: nextStatus, treated_at: nextTreatedAt })
      .eq('id', fb.id)

    if (updateError) {
      // Revert
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === fb.id ? { ...f, status: fb.status, treated_at: fb.treated_at } : f))
      )
      setError('Impossible de mettre à jour le statut. Réessayez.')
    }
    setUpdatingId(null)
  }

  function formatDate(iso: string | null) {
    return iso
      ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
  }

  const segments: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'nouveau', label: 'À traiter', count: counts.nouveau },
    { id: 'traite', label: 'Traités', count: counts.traite },
    { id: 'all', label: 'Tous', count: counts.all },
  ]

  return (
    <div className="w-full flex flex-col justify-start items-start gap-3 md:gap-6">
        <style>{HISTORY_STYLES}</style>
        <div className="w-full flex flex-col justify-center items-center gap-3 md:gap-6">
            <DashboardHeader
              subtitle={business?.name ?? null}
              onSignOutError={(message) => setError(message)}
            />

            {error && (
            <div className="w-full max-w-6xl rounded-2xl bg-[#181010] border border-[#2e1515] p-4 md:p-6">
                <p className="text-sm font-medium text-[#ef4343]">{error}</p>
            </div>
            )}

            {loading ? (
            <div className="w-full max-w-6xl rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
                <p className="text-[#8c8c8c]">Chargement…</p>
            </div>
            ) : !business ? (
            <div className="w-full max-w-5xl rounded-2xl bg-[#171717] border border-[#292929] p-4">
                <h2 className="text-lg font-semibold mb-2">
                Configurez votre commerce d&apos;abord
                </h2>
                <p className="text-sm font-medium">
                Aucun commerce n&apos;est associé à votre compte pour le moment.
                </p>
            </div>
            ) : feedbacks.length === 0 ? (
            <div className="w-full max-w-5xl rounded-2xl bg-[#171717] border border-[#292929] p-4">
                <p className="text-sm font-medium">Aucun feedback pour le moment.</p>
            </div>
            ) : (
            <div className="w-full max-w-6xl flex flex-col justify-start items-center gap-3 md:gap-6 px-4 py-6 sm:px-8 lg:px-12 md:py-8 history-fade">
                {/* Filtre statut — segmented control sobre */}
                <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="inline-flex flex-row items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
                    {segments.map((seg) => {
                      const active = statusFilter === seg.id
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => {
                            setStatusFilter(seg.id)
                            setCurrentPage(1)
                          }}
                          className={[
                            'inline-flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 rounded-lg min-h-[40px] transition-all duration-200 cursor-pointer whitespace-nowrap',
                            active
                              ? 'bg-[#292929] text-white'
                              : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
                          ].join(' ')}
                        >
                          {seg.label}
                          <span
                            className={[
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              active ? 'bg-[#0d0d0d] text-[#C9973A]' : 'bg-[#1f1f1f] text-[#666]',
                            ].join(' ')}
                          >
                            {seg.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="w-full flex flex-col md:flex-row gap-3">
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Rechercher un message..."
                    className="w-full min-h-[44px] bg-[#171717] border border-[#292929] rounded-xl px-3 py-2 text-sm text-[#e5e5e5] placeholder:text-[#666]"
                  />
                  <select
                    value={ratingFilter}
                    onChange={(e) => {
                      setRatingFilter(e.target.value as 'all' | 'positive' | 'negative')
                      setCurrentPage(1)
                    }}
                    className="w-full md:w-56 min-h-[44px] bg-[#171717] border border-[#292929] rounded-xl px-3 py-2 text-sm text-[#e5e5e5]"
                  >
                    <option value="all">Toutes les notes</option>
                    <option value="positive">4-5 étoiles</option>
                    <option value="negative">1-3 étoiles</option>
                  </select>
                </div>

                {filteredFeedbacks.length === 0 ? (
                  <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-6">
                    <p className="text-sm text-[#8c8c8c]">
                      {statusFilter === 'nouveau'
                        ? 'Aucun feedback à traiter 🎉 Tout est à jour.'
                        : 'Aucun feedback dans cette vue.'}
                    </p>
                  </div>
                ) : (
                <>
                {/* Desktop table */}
                <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-[#242424] bg-[#171717]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#242424]">
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Date</th>
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Note</th>
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Message</th>
                        <th className="text-right text-xs text-[#8c8c8c] uppercase p-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFeedbacks.map((fb) => {
                        const treated = isTreated(fb)
                        const dim = treated ? 'row-dim' : ''
                        return (
                          <tr key={fb.id} className="border-b border-[#202020] last:border-b-0 align-top">
                            <td className={`p-4 text-sm text-[#8c8c8c] ${dim}`}>
                              <div className="flex flex-col gap-1.5">
                                {formatDate(fb.created_at)}
                                {treated && <TreatedBadge />}
                              </div>
                            </td>
                            <td className={`p-4 ${dim}`}>
                              <StarRow rating={fb.rating} size={14} />
                            </td>
                            <td className={`p-4 text-sm text-[#d1d1d1] whitespace-pre-wrap break-words ${dim}`}>
                              {fb.message?.trim() ? fb.message : '—'}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end">
                                <TreatButton
                                  treated={treated}
                                  busy={updatingId === fb.id}
                                  onClick={() => toggleTreated(fb)}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden w-full space-y-3">
                  {paginatedFeedbacks.map((fb) => {
                    const treated = isTreated(fb)
                    return (
                      <div key={fb.id} className="bg-[#171717] border border-[#292929] rounded-xl p-4">
                        <div className={treated ? 'row-dim' : ''}>
                          <div className="flex justify-between items-center mb-2 gap-2">
                            <span className="text-xs text-[#8c8c8c]">Note</span>
                            <StarRow rating={fb.rating} size={12} />
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-[#8c8c8c]">Message</span>
                            <p className="text-sm mt-1 text-[#d1d1d1]">{fb.message?.trim() ? fb.message : '—'}</p>
                          </div>
                          <p className="text-xs text-[#8c8c8c]">{formatDate(fb.created_at)}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#222222] flex items-center justify-between gap-2">
                          {treated ? <TreatedBadge /> : <span className="text-[10px] text-[#555] uppercase tracking-wide">Nouveau</span>}
                          <TreatButton
                            treated={treated}
                            busy={updatingId === fb.id}
                            onClick={() => toggleTreated(fb)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-2 md:mt-4 w-full">
                    <button
                      onClick={() => setCurrentPage(p => p - 1)}
                      disabled={currentPage === 1}
                      className="min-h-[40px] bg-[#171717] border border-[#292929] text-[#8c8c8c] px-3 md:px-4 py-2 rounded-full text-xs md:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-[#C9973A] hover:enabled:text-white transition-colors"
                    >
                      ‹ Précédent
                    </button>
                    <span className="text-xs md:text-sm text-[#8c8c8c]">Page {currentPage}/{totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage === totalPages}
                      className="min-h-[40px] bg-[#171717] border border-[#292929] text-[#8c8c8c] px-3 md:px-4 py-2 rounded-full text-xs md:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-[#C9973A] hover:enabled:text-white transition-colors"
                    >
                      Suivant ›
                    </button>
                  </div>
                )}
                </>
                )}
            </div>
            )}
        </div>
    </div>
  )
}
