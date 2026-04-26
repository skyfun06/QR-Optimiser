'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'

const SETTINGS_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .settings-fade { animation: fadeUp 0.45s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .settings-fade { animation: none; opacity: 1; transform: none; }
  }
`

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

  const [newEmail, setNewEmail] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
          setNewEmail(user.email ?? '')
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

      const trimmedName = name.trim()
      const trimmedUrl = googleReviewUrl.trim()

      if (trimmedName.length > INPUT_LIMITS.shortName) {
        setError('Le nom du commerce est trop long.')
        return
      }
      if (trimmedUrl && !isSafeHttpUrl(trimmedUrl)) {
        setError('Le lien Google doit être une URL HTTPS valide.')
        return
      }

      const payload = {
        name: trimmedName || null,
        google_review_url: trimmedUrl || null,
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

  async function handleUpdateEmail() {
    if (!newEmail.trim() || newEmail.trim() === userEmail) return
    setUpdatingEmail(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (updateError) throw updateError
      setSuccess(`Un email de confirmation a été envoyé à ${newEmail.trim()}.`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setUpdatingEmail(false)
    }
  }

  async function handleUpdatePassword() {
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    setUpdatingPassword(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setSuccess('Mot de passe mis à jour ✓')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setPasswordError(message)
    } finally {
      setUpdatingPassword(false)
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
    <div className="w-full flex flex-col justify-center items-center gap-3 md:gap-6">
        <style>{SETTINGS_STYLES}</style>
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-center items-center gap-3">
            <DashboardHeader
              subtitle={name.trim() || null}
              onSignOutError={(message) => setError(message)}
            />

            {error && (
            <div className="w-full max-w-2xl rounded-2xl bg-white p-4 md:p-5 shadow-sm ring-1 ring-red-200">
                <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            )}

            {success && (
            <div className="w-full max-w-2xl rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222] flex flex-col gap-4">
                <p className="text-sm font-medium text-[#8c8c8c]">{success}</p>
            </div>
            )}

            {loading ? (
            <div className="w-full max-w-2xl rounded-2xl bg-[#171717] p-4 md:p-6 border border-[#222222]">
                <p className="text-[#8c8c8c]">Chargement…</p>
            </div>
            ) : (
            <div className="w-full flex flex-col justify-center items-center gap-3 md:gap-6">
                <div className="w-full max-w-2xl flex flex-col justify-start items-start gap-4 p-4 md:p-6 bg-[#171717] border border-[#222222] rounded-xl settings-fade" style={{ animationDelay: '0.05s' }}>
                    <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Mon commerce</p>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <label className="text-xs text-[#8c8c8c]">Nom du commerce</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={name}
                            maxLength={INPUT_LIMITS.shortName}
                            className="w-full bg-[#292929] px-3 py-2 rounded-xl text-sm md:text-base text-[#8c8c8c] min-h-[44px]"
                        />
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <label className="text-xs text-[#8c8c8c]">Lien Google Reviews</label>
                        <input
                            type="url"
                            inputMode="url"
                            value={googleReviewUrl}
                            onChange={(e) => setGoogleReviewUrl(e.target.value)}
                            placeholder="https://g.page/r/xxx/review"
                            maxLength={INPUT_LIMITS.url}
                            className="w-full bg-[#292929] px-3 py-2 rounded-xl text-sm md:text-base text-[#8c8c8c] min-h-[44px]"
                        />
                        <p className="text-[#8c8c8c] text-xs">Trouvez ce lien dans Google Business Profile → &quot;Demander des avis&quot; → Copier le lien</p>
                    </div>
                    <button type="button" onClick={handleSave} disabled={!canSave} className="w-full min-h-[44px] flex flex-row justify-center items-center gap-2 bg-gold px-4 py-2 rounded-2xl text-[#12100e] cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
                <div className="w-full max-w-2xl flex flex-col bg-[#171717] border border-[#222222] rounded-xl overflow-hidden settings-fade" style={{ animationDelay: '0.15s' }}>
                    <div className="px-4 md:px-6 pt-5 pb-4">
                        <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Mon compte</p>
                    </div>

                    {/* Email */}
                    <div className="px-4 md:px-6 pb-5 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[#555555] uppercase tracking-wide">Adresse email</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-[#202020] border border-[#2a2a2a] focus:border-[#C9973A] outline-none px-3 py-2.5 rounded-xl text-sm text-[#cccccc] min-h-[44px] transition-colors"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleUpdateEmail}
                            disabled={updatingEmail || !newEmail.trim() || newEmail.trim() === userEmail}
                            className="w-full self-start min-h-[40px] flex flex-row justify-center items-center gap-2 px-5 py-2 rounded-xl text-[#12100e] font-semibold text-sm disabled:opacity-40 cursor-pointer transition-opacity"
                            style={{ backgroundColor: '#C9973A' }}
                        >
                            {updatingEmail ? 'Envoi en cours…' : "Mettre à jour l'email"}
                        </button>
                    </div>

                    <div className="h-px bg-[#1f1f1f] mx-4 md:mx-6" />

                    {/* Mot de passe */}
                    <div className="px-4 md:px-6 py-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#555555]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="text-xs text-[#555555] uppercase tracking-wide font-medium">Mot de passe</span>
                        </div>
                        {passwordError && (
                            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                <p className="text-xs text-red-400">{passwordError}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-[#555555]">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#202020] border border-[#2a2a2a] focus:border-[#C9973A] outline-none px-3 py-2.5 rounded-xl text-sm text-[#cccccc] min-h-[44px] transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-[#555555]">Confirmer le mot de passe</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#202020] border border-[#2a2a2a] focus:border-[#C9973A] outline-none px-3 py-2.5 rounded-xl text-sm text-[#cccccc] min-h-[44px] transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleUpdatePassword}
                            disabled={updatingPassword || !newPassword || !confirmPassword}
                            className="w-full self-start min-h-[40px] flex flex-row justify-center items-center gap-2 px-5 py-2 rounded-xl text-[#12100e] font-semibold text-sm disabled:opacity-40 cursor-pointer transition-opacity"
                            style={{ backgroundColor: '#C9973A' }}
                        >
                            {updatingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                        </button>
                    </div>

                    <div className="h-px bg-[#1f1f1f] mx-4 md:mx-6" />

                    {/* Déconnexion */}
                    <div className="w-full flex flex-row justify-center items-center  px-4 md:px-6 py-4">
                        <a href="#" className="w-full flex flex-row justify-center items-center inline-flex flex-row items-center text-sm gap-2 text-[#b93838] hover:text-red-400 transition-colors py-1 border border-[#9c3232] rounded-xl py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
                            Déconnexion
                        </a>
                    </div>
                </div>
                <div className="w-full max-w-2xl flex flex-col justify-start items-start gap-4 p-4 md:p-6 bg-[#171717] border border-[#222222] rounded-xl settings-fade" style={{ animationDelay: '0.25s' }}>
                    <p className="text-[#8c8c8c] text-sm uppercase tracking-[0.5px]">Abonnement</p>
                    {subscriptionStatus === 'active' ? (
                        <button
                            type="button"
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            className="w-full md:w-auto min-h-[44px] border border-red-800 text-red-500 hover:bg-red-950 rounded-xl px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
                        >
                            {cancelingSubscription ? 'Annulation...' : 'Annuler mon abonnement'}
                        </button>
                    ) : subscriptionStatus === 'canceling' ? (
                        <p className="text-sm text-[#8c8c8c]">Votre abonnement sera annulé à la fin de la période en cours.</p>
                    ) : (
                        <p className="text-sm text-[#8c8c8c]">Aucun abonnement actif.</p>
                    )}
                </div>
                <div className="w-full max-w-2xl flex flex-col justify-start items-start gap-4 p-4 md:p-6 bg-[#181010] border border-[#2e1515] rounded-xl settings-fade" style={{ animationDelay: '0.35s' }}>
                    <p className="text-sm text-[#8c8c8c]">Cette action est irréversible. Toutes vos données seront supprimées.</p>
                    <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} className="w-full min-h-[44px] flex flex-row justify-center items-center gap-2 bg-[#ef4343] py-2 rounded-2xl font-medium cursor-pointer disabled:opacity-50">
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

