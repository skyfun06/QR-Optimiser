'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="w-full h-[100vh] flex flex-col justify-center items-center gap-4">
        {registered && (
          <div className="w-[400px] px-4 py-3 text-sm text-center text-white rounded-lg" style={{ background: '#166534' }}>
            Compte créé avec succès ! Connectez-vous pour continuer.
          </div>
        )}
        <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 bg-[#171717] border border-[#222222] rounded-xl">
            <div className="w-full flex flex-col justify-center items-center gap-2">
                <h1 className="text-2xl font-bold text-gold">ScanAvis</h1>
                <p className="text-sm text-[#8c8c8c]">Accédez à votre dashboard</p>
            </div>

            <div className="w-full flex flex-col justify-start items-start gap-4">
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Email</label>
                    <input
                        type="email"
                        placeholder="Votre email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#292929] px-4 py-3 rounded-xl text-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200"
                    />
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Mot de passe</label>
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#292929] px-4 py-3 rounded-xl text-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200"
                    />

                </div>
                <button
                    type="button"
                    onClick={handleLogin}
                    disabled={!email || !password || loading}
                    className="w-full flex flex-row justify-center items-center gap-2 bg-gold py-2 rounded-xl text-[#12100e] font-medium cursor-pointer"
                >
                    {loading ? 'Connexion...' : 'Se connecter'}
                </button>
            </div>
            <p className="text-sm text-[#8c8c8c]">Pas encore de compte ? <a href="/signup" className="text-gold">S'inscrire</a></p>
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
        <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}