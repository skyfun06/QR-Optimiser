'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  name?: string | null
}

type ReviewRow = {
  rating: number | null
}

type FeedbackRow = {
  id?: string
  message: string | null
  rating: number | null
  created_at?: string | null
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [negativeFeedbacks, setNegativeFeedbacks] = useState<FeedbackRow[]>([])

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.push('/login')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setSigningOut(false)
    }
  }

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
          if (!cancelled) setBusiness(null)
          return
        }

        if (!cancelled) setBusiness(businessData)

        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('business_id', businessData.id)

        if (reviewsError) throw reviewsError
        if (!cancelled) setReviews(reviewsData ?? [])

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('id,message,rating,created_at')
          .eq('business_id', businessData.id)
          .lt('rating', 4)
          .order('created_at', { ascending: false })
          .limit(10)

        if (feedbackError) throw feedbackError
        if (!cancelled) setNegativeFeedbacks(feedbackData ?? [])
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
    const totalScans = reviews.length

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
    }
  }, [reviews])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">
              {business?.name ? `Commerce : ${business.name}` : 'Suivi de vos performances'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/feedback-history"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Voir tous les feedbacks
            </Link>
            <Link
              href="/qrcode"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Mon QR Code
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Paramètres
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {signingOut ? 'Déconnexion...' : 'Déconnexion'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-600">Chargement…</p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Total de scans</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{kpis.totalScans}</p>
                <p className="mt-1 text-xs text-gray-400">= nombre d&apos;avis</p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Note moyenne</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {kpis.totalScans ? kpis.avgRating.toFixed(1) : '—'}
                </p>
                <p className="mt-1 text-xs text-gray-400">sur 5</p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Taux de satisfaction</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {kpis.totalScans ? formatPercent(kpis.satisfactionRate) : '—'}
                </p>
                <p className="mt-1 text-xs text-gray-400">avis ≥ 4</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Derniers feedbacks négatifs
                  </h2>
                  <p className="text-sm text-gray-500">Notes &lt; 4</p>
                </div>
                <p className="text-sm text-gray-500">{negativeFeedbacks.length} affiché(s)</p>
              </div>

              {negativeFeedbacks.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">
                    Aucun feedback négatif pour le moment.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {negativeFeedbacks.map((fb, idx) => (
                    <li key={fb.id ?? `${idx}`} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            Note {fb.rating ?? '—'} / 5
                          </p>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                            {fb.message || '—'}
                          </p>
                        </div>
                        {fb.created_at && (
                          <p className="shrink-0 text-xs text-gray-400">
                            {new Date(fb.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

