'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')

  async function handleDecline() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleSubscribe() {
    setLoading(true)

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Erreur lors de la création du paiement')
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-[100vh] flex flex-col justify-center items-center gap-4">
        <div className="max-w-md mx-auto">

            <h1 className="text-3xl font-bold text-white mt-6 mb-2">
            Passer à la version Pro
            </h1>
            <p className="text-[#8c8c8c] mb-8">
            Rentable dès le 2ème client.
            </p>

            {success && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6">
                <p className="text-green-400 text-sm">✓ Paiement réussi ! Bienvenue dans ScanAvis Pro.</p>
            </div>
            )}

            {cancelled && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm">Paiement annulé. Vous pouvez réessayer.</p>
            </div>
            )}

            <div className="bg-[#171717] border border-[#C9973A] rounded-2xl p-6 flex flex-col gap-4">
            <span className="text-xs text-[#C9973A] bg-[#28231a] px-3 py-1 rounded-full w-fit">
                Offre unique
            </span>

            <div>
                <h2 className="text-xl font-bold text-white">ScanAvis Pro</h2>
                <p className="text-4xl font-bold text-[#C9973A] mt-1">
                19.99€<span className="text-sm text-[#8c8c8c] font-normal">/mois</span>
                </p>
            </div>

            <ul className="flex flex-col gap-2">
                {[
                'QR code unique pour votre commerce',
                'Dashboard de suivi en temps réel',
                'Feedbacks négatifs interceptés en privé',
                'Historique complet des avis',
                'Support par email',
                ].map((f) => (
                <li key={f} className="text-sm text-[#8c8c8c] flex items-center gap-2">
                    <span className="text-[#C9973A]">✓</span> {f}
                </li>
                ))}
            </ul>

            <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold bg-[#C9973A] text-black
                        hover:opacity-90 transition-all active:scale-95
                        disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
                {loading ? 'Redirection...' : "S'abonner maintenant"}
            </button>

            <p className="text-center text-xs text-[#444]">
                Paiement sécurisé par Stripe · Résiliable à tout moment
            </p>
            </div>

            <button
            type="button"
            onClick={handleDecline}
            disabled={signingOut}
            className="w-full mt-4 py-3 rounded-xl text-sm text-[#555] hover:text-[#888] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
            {signingOut ? 'Déconnexion...' : 'Non merci, me déconnecter'}
            </button>

        </div>
    </div>
  )
}