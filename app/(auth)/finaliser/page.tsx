'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full min-h-[46px] bg-[#292929] px-4 py-3 rounded-xl text-sm md:text-base text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200'

// Finalisation du compte patron après un commerce inscrit par un vendeur.
// L'utilisateur arrive ici connecté (via /auth/confirm) : il choisit son mot de
// passe, puis enchaîne sur /subscription (parcours de paiement commerçant existant).
export default function FinaliserPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      setAuthed(!!user)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setError(null)
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error: updErr } = await supabase.auth.updateUser({ password })
    if (updErr) {
      setError('Impossible d’enregistrer le mot de passe. Réessaie.')
      setLoading(false)
      return
    }
    // Dernière étape : le paiement, via le parcours commerçant existant.
    router.push('/subscription')
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0d0d0d] px-6 py-8">
      <div className="w-full max-w-[400px] flex flex-col gap-6 animate-fade-up">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold animate-gradient-text">ScanAvis</h1>
          <p className="text-sm text-[#8c8c8c]">Dernière étape avant d’activer votre commerce</p>
        </div>

        {checking ? (
          <p className="text-sm text-[#8c8c8c] text-center">Chargement…</p>
        ) : !authed ? (
          <div className="flex flex-col gap-3 p-6 bg-[#171717] border border-[#292929] rounded-2xl text-center">
            <p className="font-semibold text-white">Lien expiré ou invalide</p>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              Ce lien de finalisation n’est plus valide. Demandez à votre conseiller ScanAvis de vous
              le renvoyer.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6 bg-[#171717] border border-[#292929] rounded-2xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Choisissez un mot de passe</label>
              <input
                type="password"
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Confirmez le mot de passe</label>
              <input
                type="password"
                placeholder="Confirmez le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!password || !confirm || loading}
              className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Enregistrement…' : 'Continuer vers le paiement'}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
