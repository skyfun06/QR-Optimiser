'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full min-h-[46px] bg-[#292929] px-4 py-3 rounded-xl text-sm md:text-base text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200'

function ConnexionForm() {
  const searchParams = useSearchParams()
  const inscrit = searchParams.get('inscrit') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    // Rechargement complet : le routing du sous-domaine réévalue le statut et
    // envoie le vendeur vers la bonne page (en attente / accueil / suspendu).
    window.location.assign('/')
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6 animate-fade-up">
      <div className="w-full flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl md:text-3xl font-bold animate-gradient-text">Espace vendeur</h1>
        <p className="text-sm text-[#8c8c8c]">Connecte-toi à ton espace</p>
      </div>

      {inscrit && (
        <div
          className="w-full px-4 py-3 text-sm text-center text-white rounded-lg"
          style={{ background: '#166534' }}
        >
          Candidature envoyée ! Connecte-toi pour suivre son avancement.
        </div>
      )}

      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Email</label>
          <input
            type="email"
            placeholder="toi@email.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={!email || !password || loading}
          className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <p className="text-sm text-[#8c8c8c] text-center">
          Pas encore inscrit ?{' '}
          <Link href="/inscription" className="text-gold font-medium hover:underline">
            Rejoindre le réseau
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VendeurConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  )
}
