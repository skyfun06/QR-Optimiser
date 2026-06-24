'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'

export default function NewBusinessPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      if (!user) throw new Error('Vous devez être connecté.')

      const trimmedName = name.trim()
      const trimmedUrl = googleReviewUrl.trim()
      if (!trimmedName) throw new Error('Le nom du commerce est requis.')
      if (trimmedName.length > INPUT_LIMITS.shortName) throw new Error('Le nom du commerce est trop long.')
      if (trimmedUrl && !isSafeHttpUrl(trimmedUrl)) throw new Error('Le lien Google doit être une URL HTTPS valide.')

      const { data: inserted, error: insertError } = await supabase
        .from('businesses')
        .insert({
          user_id: user.id,
          name: trimmedName,
          google_review_url: trimmedUrl || null,
          subscription_status: 'free',
          subscription_plan: 'free',
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      router.replace(`/business/${inserted.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Ajouter un commerce" onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-4">
        <Link href="/businesses" className="text-xs text-[#8c8c8c] hover:text-white transition-colors w-fit">‹ Mes commerces</Link>

        <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold">Nouveau commerce</h1>
            <p className="text-sm text-[#8c8c8c]">Rattaché à votre compte. Vous pourrez le configurer ensuite.</p>
          </div>

          {error && (
            <div className="w-full rounded-xl bg-[#181010] border border-[#2e1515] p-3">
              <p className="text-sm font-medium text-[#ef4343]">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Nom du commerce</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Boulangerie Martin"
              maxLength={INPUT_LIMITS.shortName}
              className="w-full bg-[#292929] px-3 py-2.5 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[#8c8c8c]">Lien Google Reviews (optionnel)</label>
            <input
              type="url"
              inputMode="url"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/xxx/review"
              maxLength={INPUT_LIMITS.url}
              className="w-full bg-[#292929] px-3 py-2.5 rounded-xl text-sm text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[44px]"
            />
            <p className="text-xs text-[#5c5c5c]">Vous pourrez l&apos;ajouter plus tard dans les paramètres du commerce.</p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full min-h-[44px] flex justify-center items-center gap-2 bg-gold text-[#0d0d0d] font-semibold rounded-2xl py-2.5 cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création…' : 'Créer le commerce'}
          </button>
        </div>
      </div>
    </div>
  )
}
