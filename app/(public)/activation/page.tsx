'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS } from '@/lib/security'

const TRUST = ['1ᵉʳ mois offert', 'Sans carte bancaire', 'Sans engagement']

export default function ActivationPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleActivate() {
    setError(null)

    const mail = email.trim()
    if (!mail || !password) return
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Une erreur est survenue.')

      // Le compte est créé et confirmé côté serveur : on ouvre la session avec
      // le mot de passe choisi, puis on enchaîne sur l'onboarding existant.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      })
      if (signInError) {
        // Compte créé mais connexion auto impossible : on renvoie vers le login.
        router.replace('/login?activated=true')
        return
      }

      router.replace('/onboarding')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  const canSubmit = !!email.trim() && !!password && !loading

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-center items-center gap-6 px-4 py-10 overflow-hidden">
      {/* Halo doré d'ambiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[380px] w-[380px] rounded-full bg-[#C9973A]/15 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[320px] w-[320px] rounded-full bg-[#C9973A]/10 blur-[130px]"
      />

      {/* Marque */}
      <div className="relative flex items-center gap-2.5">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/30 text-gold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 5.9 6.4.5-4.9 4.1 1.5 6.2L12 15.9 6.1 18.7l1.5-6.2L2.7 8.4l6.4-.5L12 2z" />
          </svg>
        </span>
        <span className="text-lg font-semibold tracking-tight text-white">Scan<span className="text-gold">Avis</span></span>
      </div>

      {/* Carte */}
      <div className="relative w-full max-w-md flex flex-col gap-6 p-6 md:p-7 bg-[#171717] border border-[#292929] rounded-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]">
        {/* En-tête */}
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight">
            Activez votre <span className="text-gold">espace</span>
          </h1>
          <p className="text-sm text-[#c7c7c7]">
            Créez votre compte en 30 secondes. Aucune carte bancaire requise.
          </p>
        </div>

        {/* Réassurance */}
        <div className="grid grid-cols-3 gap-2">
          {TRUST.map((label) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-[#1d1d1d] border border-[#292929] px-2 py-3 text-center"
            >
              <span className="grid place-items-center h-6 w-6 rounded-full bg-[#C9973A]/10 text-gold">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-[11px] leading-tight text-[#c7c7c7]">{label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="w-full rounded-xl bg-[#181010] border border-[#2e1515] p-3">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          {/* Email */}
          <div className="w-full flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Email</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c5c5c]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleActivate() }}
                placeholder="vous@commerce.fr"
                maxLength={INPUT_LIMITS.email}
                className="w-full min-h-[46px] bg-[#292929] pl-11 pr-4 py-3 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] border border-transparent focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 transition-all"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="w-full flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c5c5c]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleActivate() }}
                placeholder="Au moins 6 caractères"
                maxLength={200}
                className="w-full min-h-[46px] bg-[#292929] pl-11 pr-11 py-3 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] border border-transparent focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-lg text-[#8c8c8c] hover:text-[#e5e5e5] hover:bg-white/5 transition-colors"
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.3 13.3 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    <path d="M2 2l20 20" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-[#5c5c5c]">Vous choisissez votre mot de passe.</p>
          </div>

          <button
            type="button"
            onClick={handleActivate}
            disabled={!canSubmit}
            className="group w-full min-h-[50px] flex justify-center items-center gap-2 bg-gold text-[#12100e] font-semibold rounded-2xl py-3 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Activation…'
            ) : (
              <>
                Démarrer mon mois offert
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-[#8c8c8c]">
          Déjà un compte ? <a href="/login" className="text-gold hover:underline">Se connecter</a>
        </p>
      </div>

      <p className="relative text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
