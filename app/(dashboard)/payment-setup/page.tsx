'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Phase = 'checking' | 'ready' | 'activating'

function PaymentSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const cancelled = searchParams.get('cancelled') === 'true'

  const [phase, setPhase] = useState<Phase>('checking')
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelledEffect = false

    async function run() {
      // Retour de Stripe : on confirme la capture puis on file vers l'onboarding.
      if (sessionId) {
        setPhase('activating')
        try {
          const res = await fetch('/api/stripe/setup-activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error ?? 'La vérification de la carte a échoué.')
          if (!cancelledEffect) router.replace('/onboarding')
          return
        } catch (e: unknown) {
          if (!cancelledEffect) {
            setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
            setPhase('ready')
            // On prépare une nouvelle session pour permettre de réessayer.
            void prepareCheckout()
          }
          return
        }
      }

      // Chargement normal : déjà vérifié ? → onboarding. Sinon prépare la session.
      await prepareCheckout()
    }

    async function prepareCheckout() {
      try {
        const res = await fetch('/api/stripe/setup-intent', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error ?? 'Impossible de démarrer la vérification.')
        if (cancelledEffect) return
        if (data.alreadyVerified) {
          router.replace('/onboarding')
          return
        }
        setCheckoutUrl(data.url ?? null)
        setPhase('ready')
      } catch (e: unknown) {
        if (!cancelledEffect) {
          setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
          setPhase('ready')
        }
      }
    }

    run()
    return () => { cancelledEffect = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function handleRegisterCard() {
    setError(null)
    // On réutilise l'URL déjà préparée si disponible, sinon on en crée une.
    if (checkoutUrl) {
      window.location.href = checkoutUrl
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/stripe/setup-intent', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Impossible de démarrer la vérification.')
      if (data.alreadyVerified) {
        router.replace('/onboarding')
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Lien de vérification indisponible.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setSubmitting(false)
    }
  }

  const busy = phase === 'checking' || phase === 'activating' || submitting

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col justify-center items-center px-4 py-10 gap-4">
      <div className="w-full max-w-md flex flex-col gap-6 p-6 md:p-7 bg-[#171717] border border-[#292929] rounded-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] animate-scale-in">
        <div className="flex flex-col gap-2 text-center">
          <span className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-[#C9973A]/10 text-gold animate-float">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Validez votre <span className="animate-gradient-text">compte</span>
          </h1>
          <p className="text-sm text-[#c7c7c7]">
            Enregistrez une carte pour activer votre espace. <span className="text-white">Aucun montant ne sera prélevé maintenant.</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-[#1d1d1d] border border-[#292929] p-4">
          {[
            'Aucun prélèvement aujourd’hui',
            'La facturation ne démarre qu’à l’activation de votre abonnement, plus tard',
            'Carte gérée et sécurisée par Stripe',
          ].map((line) => (
            <div key={line} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid place-items-center h-5 w-5 shrink-0 rounded-full bg-[#C9973A]/10 text-gold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-[13px] leading-snug text-[#c7c7c7]">{line}</span>
            </div>
          ))}
        </div>

        {cancelled && !error && (
          <div className="w-full rounded-xl bg-[#1d1a12] border border-[#3a2f1d] p-3">
            <p className="text-sm text-[#c7a24a]">Vérification annulée. Vous pouvez réessayer quand vous voulez.</p>
          </div>
        )}

        {error && (
          <div className="w-full rounded-xl bg-[#181010] border border-[#2e1515] p-3">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        {phase === 'activating' ? (
          <div className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[#8c8c8c]">
            <span className="w-4 h-4 rounded-full border-2 border-[#444] border-t-[#C9973A] animate-spin" />
            Vérification de votre carte…
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRegisterCard}
            disabled={busy}
            className="group w-full min-h-[50px] flex justify-center items-center gap-2 bg-gold text-[#12100e] font-semibold rounded-2xl py-3 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'checking' ? (
              'Chargement…'
            ) : submitting ? (
              'Redirection…'
            ) : (
              <>
                Enregistrer ma carte
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}

export default function PaymentSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d]" />}>
      <PaymentSetupContent />
    </Suspense>
  )
}
