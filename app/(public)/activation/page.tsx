'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS } from '@/lib/security'

export default function ActivationPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center gap-4 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-6 p-5 md:p-6 bg-[#171717] border border-[#292929] rounded-2xl">
        {/* En-tête + réassurance */}
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gold">Activez votre espace</h1>
          <p className="text-sm text-[#c7c7c7]">
            1<sup>er</sup> mois offert, sans engagement, sans carte bancaire.
          </p>
        </div>

        {error && (
          <div className="w-full rounded-xl bg-[#181010] border border-[#2e1515] p-3">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <div className="w-full flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@commerce.fr"
              maxLength={INPUT_LIMITS.email}
              className="w-full min-h-[44px] bg-[#292929] px-4 py-3 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              maxLength={200}
              className="w-full min-h-[44px] bg-[#292929] px-4 py-3 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
            <p className="text-xs text-[#5c5c5c]">Vous choisissez votre mot de passe.</p>
          </div>

          <button
            type="button"
            onClick={handleActivate}
            disabled={!email.trim() || !password || loading}
            className="w-full min-h-[48px] flex justify-center items-center gap-2 bg-gold text-[#12100e] font-semibold rounded-2xl py-3 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Activation…' : 'Démarrer mon mois offert'}
          </button>
        </div>

        <p className="text-center text-sm text-[#8c8c8c]">
          Déjà un compte ? <a href="/login" className="text-gold">Se connecter</a>
        </p>
      </div>
      <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
