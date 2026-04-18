'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup() {
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('Un compte existe déjà avec cette adresse email.')
      } else if (error.message.includes('Password')) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
      } else {
        setError('Une erreur est survenue. Vérifie tes informations.')
      }
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('businesses').insert({
        user_id: data.user.id,
        name: '',
        subscription_status: 'free',
        subscription_plan: 'free',
      })

      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            businessName: null,
          }),
        })
      } catch (emailError) {
        console.error('Welcome email trigger error:', emailError)
      }
    }

    router.push('/login?registered=true')
  }

  return (
    <div className="w-full h-[100vh] flex flex-col justify-center items-center gap-4">
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
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Confirmez le mot de passe</label>
                    <input
                        type="password"
                        placeholder="Confirmez le mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#292929] px-4 py-3 rounded-xl text-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSignup}
                    disabled={!email || !password || !confirmPassword || loading}
                    className="w-full flex flex-row justify-center items-center gap-2 bg-gold py-2 rounded-xl text-[#12100e] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Création...' : 'Créer mon compte'}
                </button>
            </div>
            <p className="text-sm text-[#8c8c8c]">Déjà un compte ? <a href="/login" className="text-gold">Se connecter</a></p>
            {error && (
                <div className="text-red-500 text-sm mt-2 text-center">{error}</div>
            )}
        </div>
        <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
