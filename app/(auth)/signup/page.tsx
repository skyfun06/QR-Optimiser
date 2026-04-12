'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup() {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      // On affiche l'erreur si quelque chose ne va pas
      setError(error.message)
      setLoading(false)
      return
    }

    // Inscription réussie on redirige vers le dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">

        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">
          Créer un compte
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Commencez gratuitement
        </p>

        {/* Affiche l'erreur si elle existe */}
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
            type="button"
            onClick={handleSignup}
            disabled={!email || !password || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-2
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                       hover:bg-blue-700 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="text-blue-600 underline-offset-2 transition-all duration-200 hover:text-blue-700 hover:underline active:scale-[0.98] inline-flex"
          >
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  )
}