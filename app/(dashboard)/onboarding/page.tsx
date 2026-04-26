'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [name, setName] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const trimmedName = name.trim()
      const trimmedUrl = googleReviewUrl.trim()

      if (trimmedName.length > INPUT_LIMITS.shortName) {
        throw new Error('Le nom du commerce est trop long.')
      }
      if (trimmedUrl && !isSafeHttpUrl(trimmedUrl)) {
        throw new Error('Le lien Google doit être une URL HTTPS valide.')
      }

      if (sessionId) {
        const res = await fetch('/api/stripe/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Impossible d'activer l'abonnement")
        }
      }

      const payload = {
        name: trimmedName || null,
        google_review_url: trimmedUrl || null,
      }

      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle<{ id: string }>()

      if (existing) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('businesses')
          .insert({ ...payload, user_id: user.id })
        if (insertError) throw insertError
      }

      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="h-[100vh] flex flex-col justify-center items-center gap-4">
        <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 bg-[#171717] border border-[#222222] rounded-xl">
            <div className="w-full flex flex-col justify-center items-center gap-2">
                <h2 className="text-2xl font-bold text-gold">ScanAvis</h2>
                <p className="text-sm text-[#8c8c8c]">Configurer votre commerce</p>
            </div>
            <div className="w-full flex flex-col justify-start items-start gap-4">
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Nom du commerce</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex : Boulangerie Martin"
                        maxLength={INPUT_LIMITS.shortName}
                        className="w-full bg-[#292929] px-4 py-3 rounded-xl text-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200"
                    />
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Lien Google Maps (pour rediriger vos clients)</label>
                    <input
                        type="url"
                        inputMode="url"
                        value={googleReviewUrl}
                        onChange={(e) => setGoogleReviewUrl(e.target.value)}
                        placeholder="https://g.page/r/..."
                        maxLength={INPUT_LIMITS.url}
                        className="w-full bg-[#292929] px-4 py-3 rounded-xl text-[#8c8c8c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200"
                    />
                    <p className="text-xs text-[#8c8c8c]">Trouvez votre lien dans Google Maps → Partager → Copier le lien</p>
                </div>
            </div>
            <button type="button" onClick={handleSave} disabled={!name.trim() || loading} className="w-full flex flex-row justify-center items-center gap-2 bg-gold py-2 rounded-xl text-[#12100e] font-medium cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
                {loading ? 'Enregistrement...' : 'Commencer'}
            </button>
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}
