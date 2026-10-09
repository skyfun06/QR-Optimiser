'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'
import { useLanguage } from '@/lib/i18n/use-language'
import type { Lang } from '@/lib/i18n/translations'

type BusinessRow = {
  id: string
  user_id: string
  name: string | null
  google_review_url: string | null
  subscription_status: string | null
}

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
]

const inputClass =
  'w-full min-h-[46px] bg-[#0d0d0d] border border-[#292929] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:border-[#C9973A]/60 transition-colors'

const labelClass = 'text-xs text-[#8c8c8c]'
const sectionLabelClass = 'text-xs uppercase tracking-widest text-[#8c8c8c]'
const goldBtnClass =
  'min-h-[44px] flex flex-row justify-center items-center gap-2 bg-gold px-5 py-2.5 rounded-xl text-[#12100e] font-semibold text-sm cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed'

export default function SettingsPage() {
  const { businessId: routeBusinessId } = useParams<{ businessId: string }>()
  const { lang, setLang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deletingBusiness, setDeletingBusiness] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [name, setName] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

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
          .eq('id', routeBusinessId)
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
  }, [routeBusinessId])

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

      if (!businessId) {
        setError('Commerce introuvable.')
        return
      }
      const { error: updateError } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', businessId)
      if (updateError) throw updateError

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

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } catch {
      /* on redirige quand même */
    }
    window.location.href = '/login'
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

  async function handleDeleteBusiness() {
    if (!businessId) { setError('Commerce introuvable.'); return }
    const label = name.trim() || 'ce commerce'
    if (!confirm(`Supprimer « ${label} » ? Cette action est irréversible : tous les avis, scans et feedbacks de ce commerce seront définitivement supprimés.`)) return
    setDeletingBusiness(true)
    setError(null)
    try {
      const res = await fetch('/api/business/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erreur lors de la suppression.')
      }
      window.location.href = '/businesses'
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
      setDeletingBusiness(false)
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
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle={name.trim() || null} onSignOutError={(message) => setError(message)} />

      <div className="w-full max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-4 md:gap-5">
        <div className={mounted ? 'animate-fade-up' : 'opacity-0'}>
          <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight">
            <span className="animate-gradient-text">Paramètres</span>
          </h1>
          <p className="text-sm text-[#8c8c8c] mt-1">Gérez votre commerce, votre compte et votre abonnement.</p>
        </div>

        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}
        {success && (
          <div className="w-full rounded-2xl bg-[#121a12] border border-[#1e3a1e] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#39d98a]">{success}</p>
          </div>
        )}

        {loading ? (
          <>
            <div className="skeleton w-full h-56 rounded-2xl" />
            <div className="skeleton w-full h-72 rounded-2xl" />
          </>
        ) : (
          <>
            {/* ════════ MON COMMERCE ════════ */}
            <div className={['w-full flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6', mounted ? 'animate-fade-up stagger-1' : 'opacity-0'].join(' ')}>
              <p className={sectionLabelClass}>Mon commerce</p>
              <div className="w-full flex flex-col gap-1.5">
                <label className={labelClass}>Nom du commerce</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de votre commerce"
                  maxLength={INPUT_LIMITS.shortName}
                  className={inputClass}
                />
              </div>
              <div className="w-full flex flex-col gap-1.5">
                <label className={labelClass}>Lien Google Reviews</label>
                <input
                  type="url"
                  inputMode="url"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/xxx/review"
                  maxLength={INPUT_LIMITS.url}
                  className={inputClass}
                />
                <p className="text-xs text-[#5c5c5c]">
                  Dans Google Business Profile → « Demander des avis » → Copier le lien.
                </p>
              </div>
              <button type="button" onClick={handleSave} disabled={!canSave} className={`w-full ${goldBtnClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>

            {/* ════════ MON COMPTE ════════ */}
            <div className={['w-full flex flex-col gap-5 bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6', mounted ? 'animate-fade-up stagger-2' : 'opacity-0'].join(' ')}>
              <p className={sectionLabelClass}>Mon compte</p>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Adresse email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
                <button
                  type="button"
                  onClick={handleUpdateEmail}
                  disabled={updatingEmail || !newEmail.trim() || newEmail.trim() === userEmail}
                  className={`self-start ${goldBtnClass}`}
                >
                  {updatingEmail ? 'Envoi en cours…' : "Mettre à jour l'email"}
                </button>
              </div>

              <div className="h-px bg-[#242424]" />

              {/* Mot de passe */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className={labelClass}>Mot de passe</span>
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 bg-[#181010] border border-[#2e1515] rounded-lg px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4343" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    <p className="text-xs text-[#ef4343]">{passwordError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className={inputClass} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" className={inputClass} />
                </div>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword || !newPassword || !confirmPassword}
                  className={`self-start ${goldBtnClass}`}
                >
                  {updatingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>

              <div className="h-px bg-[#242424]" />

              {/* Déconnexion */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full min-h-[44px] flex flex-row justify-center items-center gap-2 text-sm text-[#c7c7c7] border border-[#292929] rounded-xl py-2.5 cursor-pointer transition-colors hover:text-white hover:border-[#3a3a3a] disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                </svg>
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>

            {/* ════════ LANGUE ════════ */}
            <div className={['w-full flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6', mounted ? 'animate-fade-up stagger-3' : 'opacity-0'].join(' ')}>
              <div className="flex flex-col gap-0.5">
                <p className={sectionLabelClass}>Langue</p>
                <p className="text-xs text-[#5c5c5c]">Langue d&apos;affichage de vos pages clients (avis &amp; feedback).</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 sm:gap-3">
                {LANG_OPTIONS.map((opt) => {
                  const active = lang === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLang(opt.value)}
                      aria-pressed={active}
                      className={[
                        'flex items-center justify-center gap-2 min-h-[48px] rounded-xl border text-sm font-medium cursor-pointer active:scale-[0.98] transition-all',
                        active
                          ? 'bg-[#1e1a12] border-gold text-gold shadow-[0_0_20px_-6px_rgba(201,151,58,0.5)]'
                          : 'bg-[#0d0d0d] border-[#292929] text-[#c7c7c7] hover:border-[#3a3a3a] hover:text-white',
                      ].join(' ')}
                    >
                      <span className="text-base leading-none">{opt.flag}</span>
                      {opt.label}
                      {active && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ════════ ABONNEMENT ════════ */}
            <div className={['w-full flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6', mounted ? 'animate-fade-up stagger-4' : 'opacity-0'].join(' ')}>
              <p className={sectionLabelClass}>Abonnement</p>
              {subscriptionStatus === 'active' ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 text-sm text-[#e5e5e5]">
                    <span className="w-2 h-2 rounded-full bg-[#39d98a]" /> Abonnement actif
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={cancelingSubscription}
                    className="min-h-[42px] border border-[#9c3232] text-[#ef4343] hover:bg-[#2e1515] rounded-xl px-4 py-2 text-sm disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {cancelingSubscription ? 'Annulation…' : 'Annuler mon abonnement'}
                  </button>
                </div>
              ) : subscriptionStatus === 'canceling' ? (
                <p className="text-sm text-[#8c8c8c]">Votre abonnement sera annulé à la fin de la période en cours.</p>
              ) : (
                <p className="text-sm text-[#8c8c8c]">Aucun abonnement actif.</p>
              )}
            </div>

            {/* ════════ ZONE DE DANGER ════════ */}
            <div className={['w-full flex flex-col gap-5 bg-[#140e0e] border border-[#2e1515] rounded-2xl p-5 md:p-6', mounted ? 'animate-fade-up stagger-5' : 'opacity-0'].join(' ')}>
              <div className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4343" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" /><path d="M12 17h.01" />
                </svg>
                <p className="text-xs uppercase tracking-widest text-[#ef6a6a]">Zone de danger</p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#e5e5e5] font-medium">Supprimer ce commerce</p>
                <p className="text-sm text-[#8c8c8c]">
                  Le commerce et toutes ses données (avis, scans, feedbacks) seront définitivement supprimés.
                  Votre compte et vos autres commerces ne sont pas affectés.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteBusiness}
                  disabled={deletingBusiness}
                  className="self-start min-h-[42px] flex flex-row justify-center items-center gap-2 border border-[#9c3232] text-[#ef4343] hover:bg-[#2e1515] rounded-xl px-4 py-2 text-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  {deletingBusiness ? 'Suppression…' : 'Supprimer ce commerce'}
                </button>
              </div>

              <div className="h-px bg-[#2e1515]" />

              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#e5e5e5] font-medium">Supprimer mon compte</p>
                <p className="text-sm text-[#8c8c8c]">Cette action est irréversible. Toutes vos données seront supprimées.</p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="w-full min-h-[46px] flex flex-row justify-center items-center gap-2 bg-[#ef4343] text-white py-2.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  {deletingAccount ? 'Suppression…' : 'Supprimer mon compte'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
