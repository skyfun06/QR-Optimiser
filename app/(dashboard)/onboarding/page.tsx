'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [name, setName] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [hasMultiple, setHasMultiple] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Garde carte : tant que faux, on n'affiche pas le formulaire (on vérifie que
  // l'utilisateur a bien une carte enregistrée, sinon on l'envoie sur
  // /payment-setup). Couvre TOUS les chemins d'entrée vers /onboarding.
  const [cardChecked, setCardChecked] = useState(false)

  // Vérifie l'accès (carte enregistrée) au chargement. On réutilise la même
  // logique que /payment-setup : POST /api/stripe/setup-intent renvoie
  // { alreadyVerified: true } si une carte existe déjà. Exception : un retour
  // du paiement d'abonnement (session_id présent) n'est PAS soumis à cette
  // garde — l'utilisateur vient de payer, il enchaîne sur l'activation.
  useEffect(() => {
    let cancelled = false
    if (sessionId) {
      setCardChecked(true)
      return
    }
    async function guard() {
      try {
        const res = await fetch('/api/stripe/setup-intent', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data.alreadyVerified) {
          setCardChecked(true)
        } else {
          router.replace('/payment-setup')
        }
      } catch {
        if (!cancelled) router.replace('/payment-setup')
      }
    }
    guard()
    return () => { cancelled = true }
  }, [sessionId, router])

  function handlePickLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Seuls les fichiers image sont acceptés.')
      return
    }
    setError(null)
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleRemoveLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

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

      let businessId: string
      if (existing) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', existing.id)
        if (updateError) throw updateError
        businessId = existing.id
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('businesses')
          .insert({ ...payload, user_id: user.id })
          .select('id')
          .single()
        if (insertError) throw insertError
        businessId = inserted.id

        // Parrainage : si un code valide est en cookie (déposé sur /activation),
        // on l'attache côté serveur (service role). Best-effort : n'interrompt
        // jamais l'onboarding, et la route purge le cookie une fois consommé.
        try {
          await fetch('/api/referral/attach', { method: 'POST' })
        } catch {
          // ignoré volontairement
        }

        // Self-referral : ce commerce devient lui-même un parrain (code unique
        // généré côté serveur en service role). Best-effort : ne bloque jamais.
        try {
          await fetch('/api/referral/self', { method: 'POST' })
        } catch {
          // ignoré volontairement
        }
      }

      // Logo (optionnel) : uploadé APRÈS la création du commerce, car la policy
      // RLS du bucket `logos` exige que le business existe et appartienne au
      // user. Best-effort : un échec ne bloque jamais l'onboarding.
      if (logoFile) {
        try {
          const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png'
          const path = `${businessId}/logo.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(path, logoFile, { upsert: true, contentType: logoFile.type })
          if (!uploadError) {
            const { data: publicData } = supabase.storage.from('logos').getPublicUrl(path)
            const publicUrl = publicData?.publicUrl
            if (publicUrl) {
              await supabase
                .from('businesses')
                .update({ logo_url: `${publicUrl}?t=${Date.now()}` })
                .eq('id', businessId)
            }
          }
        } catch {
          // logo optionnel : on ignore toute erreur pour ne pas bloquer.
        }
      }

      // "Plusieurs commerces" : on enchaîne directement sur l'ajout du suivant.
      // Sinon on part sur /businesses (qui ouvre le commerce fraîchement créé).
      router.push(hasMultiple ? '/businesses/new' : '/businesses')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  // Tant que la garde carte n'a pas confirmé, on n'affiche pas le formulaire
  // (évite tout flash de contenu avant une éventuelle redirection).
  if (!cardChecked) {
    return (
      <div className="h-[100vh] flex flex-col justify-center items-center gap-2">
        <span className="w-5 h-5 rounded-full border-2 border-[#333] border-t-[#C9973A] animate-spin" />
        <p className="text-sm text-[#8c8c8c]">Chargement…</p>
      </div>
    )
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
                    <label className="text-sm text-[#8c8c8c]">Logo du commerce (optionnel)</label>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePickLogo(file)
                        }}
                    />
                    {logoPreview ? (
                        <div className="w-full flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoPreview} alt="Aperçu du logo" className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-[#292929] shrink-0" />
                            <button type="button" onClick={() => logoInputRef.current?.click()} className="flex-1 min-h-[44px] text-sm text-gold border border-gold rounded-xl py-2 font-medium cursor-pointer hover:bg-gold/10 transition-colors">
                                Remplacer
                            </button>
                            <button type="button" onClick={handleRemoveLogo} className="min-h-[44px] text-sm text-[#ef4343] border border-[#2e1515] rounded-xl px-3 py-2 cursor-pointer hover:bg-[#2e1515] transition-colors">
                                Retirer
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full min-h-[44px] flex items-center justify-center gap-2 text-gold border border-gold rounded-xl py-2.5 font-medium cursor-pointer hover:bg-gold/10 transition-colors">
                            Ajouter un logo
                        </button>
                    )}
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
                <div className="w-full flex flex-col justify-start items-start gap-2">
                    <label className="text-sm text-[#8c8c8c]">Avez-vous plusieurs commerces ?</label>
                    <div className="w-full flex gap-2">
                        {([['Un seul', false], ['Plusieurs', true]] as const).map(([label, value]) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setHasMultiple(value)}
                                className={[
                                    'flex-1 min-h-[44px] rounded-xl text-sm font-medium border transition-colors',
                                    hasMultiple === value
                                        ? 'bg-gold text-[#12100e] border-gold'
                                        : 'bg-[#292929] text-[#c7c7c7] border-[#3a3a3a] hover:bg-[#333]',
                                ].join(' ')}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-[#8c8c8c]">Vous pourrez ajouter les suivants juste après.</p>
                </div>
            </div>
            <button type="button" onClick={handleSave} disabled={!name.trim() || loading} className="w-full flex flex-row justify-center items-center gap-2 bg-gold py-2 rounded-xl text-[#12100e] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
                {loading ? 'Enregistrement...' : hasMultiple ? 'Continuer' : 'Commencer'}
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
