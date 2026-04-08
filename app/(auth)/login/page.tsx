'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">

        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">
          Connexion
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Accédez à votre dashboard
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-blue-700 transition-colors mt-2"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            S'inscrire
          </Link>
        </p>

      </div>
    </div>
  )
}