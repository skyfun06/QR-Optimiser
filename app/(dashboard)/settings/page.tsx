'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  user_id: string
  name: string | null
  google_review_url: string | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)

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

        if (!cancelled) setUserId(user.id)

        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id,user_id,name,google_review_url')
          .eq('user_id', user.id)
          .maybeSingle<BusinessRow>()

        if (businessError) throw businessError

        if (business) {
          if (!cancelled) {
            setBusinessId(business.id)
            setName(business.name ?? '')
            setGoogleReviewUrl(business.google_review_url ?? '')
          }
        } else {
          if (!cancelled) {
            setBusinessId(null)
            setName('')
            setGoogleReviewUrl('')
          }
        }
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

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!userId) {
        setError('Vous devez être connecté.')
        return
      }

      const payload = {
        name: name.trim() || null,
        google_review_url: googleReviewUrl.trim() || null,
      }

      if (businessId) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', businessId)

        if (updateError) throw updateError
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('businesses')
          .insert({ ...payload, user_id: userId })
          .select('id')
          .single()

        if (insertError) throw insertError
        setBusinessId(inserted.id)
      }

      setSuccess('Paramètres sauvegardés.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const canSave = !saving && (!!name.trim() || !!googleReviewUrl.trim())

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-sm text-gray-500">
              Configurez votre commerce et votre lien Google.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ← Retour
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-green-200">
            <p className="text-sm font-medium text-green-700">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-600">Chargement…</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nom du commerce</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boulangerie Martin"
                className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Lien Google Maps</label>
              <input
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/... ou https://www.google.com/maps?..."
                className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400">
                Astuce : utilisez le lien vers la fiche Google (ou un lien d&apos;avis).
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-blue-700 transition-colors"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

