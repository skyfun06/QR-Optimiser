'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  name: string | null
}

type FeedbackRow = {
  id: string
  message: string | null
  rating: number | null
  created_at: string | null
}

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

const ITEMS_PER_PAGE = 10

export default function FeedbackHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'negative'>('all')
  const [search, setSearch] = useState('')

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const ratingOk =
        ratingFilter === 'all' ||
        (ratingFilter === 'positive' && (fb.rating ?? 0) >= 4) ||
        (ratingFilter === 'negative' && (fb.rating ?? 0) <= 3)
      const query = search.trim().toLowerCase()
      const messageOk = !query || (fb.message ?? '').toLowerCase().includes(query)
      return ratingOk && messageOk
    })
  }, [feedbacks, ratingFilter, search])

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
          .eq('user_id', user.id)
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
          .select('id,message,rating,created_at')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })

        if (feedbackError) throw feedbackError
        if (!cancelled) setFeedbacks(feedbackData ?? [])
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <div className="w-full flex flex-col justify-start items-start gap-3 md:gap-6">
        <div className="w-full flex flex-col justify-center items-center gap-3 md:gap-6">
            <DashboardHeader
              subtitle={business?.name ?? null}
              onSignOutError={(message) => setError(message)}
            />

            {error && (
            <div className="w-full max-w-6xl rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
                <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            )}

            {loading ? (
            <div className="w-full max-w-6xl rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
                <p className="text-[#8c8c8c]">Chargement…</p>
            </div>
            ) : !business ? (
            <div className="w-full max-w-6xl rounded-2xl bg-white p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Configurez votre commerce d&apos;abord
                </h2>
                <p className="text-sm text-gray-600">
                Aucun commerce n&apos;est associé à votre compte pour le moment.
                </p>
            </div>
            ) : feedbacks.length === 0 ? (
            <div className="w-full max-w-6xl rounded-2xl bg-white p-6 md:p-8 shadow-sm">
                <p className="text-sm text-gray-600">Aucun feedback pour le moment.</p>
            </div>
            ) : (
            <div className="w-full max-w-6xl flex flex-col justify-start items-center gap-3 md:gap-6 px-4 py-6 sm:px-8 lg:px-12 md:py-8">
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

                {/* Desktop table */}
                <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-[#242424] bg-[#171717]">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-[#242424]">
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Date</th>
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Note</th>
                        <th className="text-left text-xs text-[#8c8c8c] uppercase p-4">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFeedbacks.map((fb) => (
                        <tr key={fb.id} className="border-b border-[#202020] last:border-b-0">
                          <td className="p-4 text-sm text-[#8c8c8c]">
                            {fb.created_at
                              ? new Date(fb.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="p-4">
                            <StarRow rating={fb.rating} size={14} />
                          </td>
                          <td className="p-4 text-sm text-[#d1d1d1] whitespace-pre-wrap break-words">
                            {fb.message?.trim() ? fb.message : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden w-full space-y-3">
                  {paginatedFeedbacks.map((fb) => (
                    <div key={fb.id} className="bg-[#171717] border border-[#292929] rounded-xl p-4">
                      <div className="flex justify-between mb-2 gap-2">
                        <span className="text-xs text-[#8c8c8c]">Note</span>
                        <span className="text-sm">
                          <StarRow rating={fb.rating} size={12} />
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-[#8c8c8c]">Message</span>
                        <p className="text-sm mt-1 text-[#d1d1d1]">{fb.message?.trim() ? fb.message : '—'}</p>
                      </div>
                      <p className="text-xs text-[#8c8c8c]">
                        {fb.created_at
                          ? new Date(fb.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  ))}
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
            </div>
            )}
        </div>
    </div>
  )
}

