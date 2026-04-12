'use client'

import { useEffect, useState } from 'react'
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

function renderStars(rating: number | null) {
  const value = typeof rating === 'number' && Number.isFinite(rating) ? rating : 0
  return (
    <span className="inline-flex gap-0.5" aria-label={`Note ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="text-lg">
          {star <= value ? '⭐' : '☆'}
        </span>
      ))}
    </span>
  )
}

export default function FeedbackHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])

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

  return (
    <div className="w-full flex flex-col justify-start items-start gap-4">
        <div className="w-full flex flex-col justify-start items-start gap-4">
            <DashboardHeader
              subtitle={business?.name ?? null}
              onSignOutError={(message) => setError(message)}
            />

            {error && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
                <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            )}

            {loading ? (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
                <p className="text-gray-600">Chargement…</p>
            </div>
            ) : !business ? (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Configurez votre commerce d&apos;abord
                </h2>
                <p className="text-sm text-gray-600">
                Aucun commerce n&apos;est associé à votre compte pour le moment.
                </p>
            </div>
            ) : feedbacks.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
                <p className="text-sm text-gray-600">Aucun feedback pour le moment.</p>
            </div>
            ) : (
            <div className="space-y-4">
                {feedbacks.map((fb) => (
                <div key={fb.id} className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-gray-900">Note</p>
                        {renderStars(fb.rating)}
                        </div>
                        <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">
                        {fb.message || '—'}
                        </p>
                    </div>
                    {fb.created_at && (
                        <p className="shrink-0 text-xs text-gray-400">
                        {new Date(fb.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                        })}
                        </p>
                    )}
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
    </div>
  )
}

