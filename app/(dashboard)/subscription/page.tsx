'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
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
    <div className="w-full min-h-[100vh] flex flex-col justify-start items-center gap-12 pb-[50px]">
        <header className="w-full flex flex-row justify-between items-center border-b px-6 py-4 border-b-[#222222]">
            <a href="/" className="text-gold font-bold text-xl transition-colors duration-200 hover:text-[#c9973a]">ScanAvis</a>
            <button
                type="button"
                onClick={handleDecline}
                disabled={signingOut}
                className="text-xs text-[#8c8c8c] cursor-pointer border border-[#222222] rounded-xl px-2 py-1"
                >
                {signingOut ? 'Déconnexion...' : 'Non merci, me déconnecter'}
            </button>
        </header>
        <div className="w-full flex flex-col justify-center items-center gap-4">
            <h2 className="text-3xl font-bold">Choisissez votre plan</h2>
            <p className="text-sm text-[#8c8c8c]">Développez votre réputation en ligne avec le plan adapté à votre activité.</p>
        </div>
        <div className="w-full flex flex-row justify-center items-center gap-4">
            <button
                onClick={() => setBilling('monthly')}
                className={`text-sm py-2 px-4 rounded-xl font-medium cursor-pointer transition-colors ${billing === 'monthly' ? 'bg-gold text-[#0d0d0d]' : 'text-[#8c8c8c]'}`}
            >
                Mensuel
            </button>
            <div className="relative">
                <button
                    onClick={() => setBilling('annual')}
                    className={`text-sm py-2 px-4 rounded-xl font-medium cursor-pointer transition-colors ${billing === 'annual' ? 'bg-gold text-[#0d0d0d]' : 'text-[#8c8c8c]'}`}
                >
                    Annuel
                </button>
                <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    -20%
                </span>
            </div>
        </div>
        <div className="w-full flex flex-row justify-center items-center gap-8">
            <div className="relative w-[350px] flex flex-col justify-start items-start gap-6 bg-[#171717] rounded-2xl border-2 border-gold p-6">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-[#0d0d0d] text-xs font-bold px-3 py-1 rounded-full">
                    Populaire
                </span>
                <div className="w-full flex flex-row justify-start items-center gap-4">
                    <div className="w-[40px] h-[40px] bg-[#312a1c] rounded-xl text-gold flex justify-center items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-crown-icon lucide-crown"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>
                    </div>
                    <div className="flex flex-col justify-start items-start">
                        <h3 className="text-xl font-bold">Pro</h3>
                        <p className="text-sm text-[#525252]">Les commerces actifs</p>
                    </div>
                </div>
                <p className="text-4xl font-bold">
                    {billing === 'annual' ? '23€' : '29€'}
                    <span className="text-sm text-[#8c8c8c] font-light">
                        {billing === 'annual' ? ' /mois (facturé annuellement)' : ' /mois'}
                    </span>
                </p>
                <div className="w-full flex flex-col justify-start items-start gap-4">
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        QR Codes illimités
                    </p>
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        Feedbacks illimités
                    </p>
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        Dashboard avancé
                    </p>
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        Export CSV
                    </p>
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        Support prioritaire     
                    </p>
                    <p className="w-full flex flex-row justify-start items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                        Personnalisation QR Code
                    </p>
                </div>
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-medium bg-gold text-[#0d0d0d] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-12"
                >
                    {loading ? 'Redirection...' : "Choisir Pro"}
                </button>
            </div>
        </div>
    </div>
  )
}
