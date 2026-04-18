'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  user_id: string
  name: string | null
  google_review_url: string | null
  subscription_status: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)

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

        if (!cancelled) {
          setUserId(user.id)
          setUserEmail(user.email ?? null)
        }

        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id,user_id,name,google_review_url,subscription_status')
          .eq('user_id', user.id)
          .maybeSingle<BusinessRow>()

        if (businessError) throw businessError

        if (business) {
          if (!cancelled) {
            setBusinessId(business.id)
            setName(business.name ?? '')
            setGoogleReviewUrl(business.google_review_url ?? '')
            setSubscriptionStatus(business.subscription_status ?? 'free')
          }
        } else {
          if (!cancelled) {
            setBusinessId(null)
            setName('')
            setGoogleReviewUrl('')
            setSubscriptionStatus('free')
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

  async function handlePasswordReset() {
    if (!userEmail) return
    setError(null)
    setSuccess(null)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (resetError) throw resetError
      setSuccess(`Un email de réinitialisation a été envoyé à ${userEmail}.`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Êtes-vous sûr ? Cette action est irréversible et supprimera toutes vos données.')) return
    setDeletingAccount(true)
    setError(null)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erreur lors de la suppression.')
      }
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
      setDeletingAccount(false)
    }
  }

  async function handleCancelSubscription() {
    const shouldCancel = window.confirm(
      "Êtes-vous sûr de vouloir annuler ? Votre abonnement restera actif jusqu'à la fin de la période en cours."
    )

    if (!shouldCancel) return

    setCancelingSubscription(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Erreur lors de l'annulation.")
      }
      setSubscriptionStatus('canceling')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setCancelingSubscription(false)
    }
  }

  const canSave = !saving && (!!name.trim() || !!googleReviewUrl.trim())

  return (
    <div className="w-full flex flex-col justify-center items-center gap-4">
        <div className="w-full flex flex-col justify-center items-center gap-4">
            <DashboardHeader
              subtitle={name.trim() || null}
              onSignOutError={(message) => setError(message)}
            />

            {error && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
                <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            )}

            {success && (
            <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222] flex flex-col gap-4">
                <p className="text-sm font-medium text-[#8c8c8c]">{success}</p>
            </div>
            )}

            {loading ? (
            <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
                <p className="text-[#8c8c8c]">Chargement…</p>
            </div>
            ) : (
            <div className="w-full flex flex-col justify-center items-center gap-4 p-4">
                <div className="w-[624px] flex flex-col justify-start items-start gap-4 p-6 bg-[#171717] border border-[#222222] rounded-xl">
                    <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Mon commerce</p>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <label className="text-sm text-[#8c8c8c]">Nom du commerce</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={name}
                            className="w-full bg-[#292929] px-3 py-2 rounded-xl text-[#8c8c8c]"
                        />
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <label className="text-sm text-[#8c8c8c]">Lien Google Maps</label>
                        <input
                            value={googleReviewUrl}
                            onChange={(e) => setGoogleReviewUrl(e.target.value)}
                            placeholder="https://g.page/..."
                            className="w-full bg-[#292929] px-3 py-2 rounded-xl text-[#8c8c8c]"
                        />
                        <p className="text-[#8c8c8c] text-xs">Trouvez votre lien dans Google Maps → Partager → Copier le lien</p>
                    </div>
                    <button type="button" onClick={handleSave} disabled={!canSave} className="w-full flex flex-row justify-center items-center gap-2 bg-gold py-2 rounded-2xl text-[#12100e] cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
                <div className="w-[624px] flex flex-col justify-start items-start gap-6 p-6 bg-[#171717] border border-[#222222] rounded-xl">
                    <p className="text-[#8c8c8c] text-sm uppercase tracking-[0.5px]">Mon compte</p>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <p className="text-[#8c8c8c] text-sm">Email :</p>
                        <p className="w-full bg-[#292929] text-[#8c8c8c] px-3 py-2 rounded-xl">{userEmail ?? '—'}</p>
                    </div>
                    <div className="w-full flex flex-row justify-center items-center gap-4">
                        <button type="button" onClick={handlePasswordReset} disabled={!userEmail} className="w-full flex flex-row justify-center items-center text-sm text-[#777777] gap-2 border border-[#222222] py-3 rounded-2xl cursor-pointer disabled:opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Changer le mot de passe
                        </button>
                        <a href="#" className="w-full flex flex-row justify-center items-center text-sm gap-2 border border-[#b93838] text-[#b93838] py-3 rounded-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-log-out-icon lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
                            Déconnexion
                        </a>
                    </div>
                </div>
                <div className="w-[624px] flex flex-col justify-start items-start gap-4 p-6 bg-[#171717] border border-[#222222] rounded-xl">
                    <p className="text-[#8c8c8c] text-sm uppercase tracking-[0.5px]">Abonnement</p>
                    {subscriptionStatus === 'active' ? (
                        <button
                            type="button"
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            className="border border-red-800 text-red-500 hover:bg-red-950 rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                        >
                            {cancelingSubscription ? 'Annulation...' : 'Annuler mon abonnement'}
                        </button>
                    ) : subscriptionStatus === 'canceling' ? (
                        <p className="text-sm text-[#8c8c8c]">Votre abonnement sera annulé à la fin de la période en cours.</p>
                    ) : (
                        <p className="text-sm text-[#8c8c8c]">Aucun abonnement actif.</p>
                    )}
                </div>
                <div className="w-[624px] flex flex-col justify-start items-start gap-4 p-6 bg-[#181010] border border-[#2e1515] rounded-xl">
                    <p className="text-sm text-[#8c8c8c]">Cette action est irréversible. Toutes vos données seront supprimées.</p>
                    <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} className="w-full flex flex-row justify-center items-center gap-2 bg-[#ef4343] py-2 rounded-2xl font-medium cursor-pointer disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        {deletingAccount ? 'Suppression...' : 'Supprimer mon compte'}
                    </button>
                </div>
            </div>
            )}
        </div>
    </div>
  )
}

