'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 30px rgba(201,151,58,0.15), 0 0 60px rgba(201,151,58,0.05); }
    50%       { box-shadow: 0 0 40px rgba(201,151,58,0.25), 0 0 80px rgba(201,151,58,0.1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .sub-card {
    animation: glow 4s ease-in-out infinite;
  }
  .fade-1 { animation: fadeUp 0.5s ease-out 0.05s both; }
  .fade-2 { animation: fadeUp 0.5s ease-out 0.15s both; }
  .fade-3 { animation: fadeUp 0.5s ease-out 0.25s both; }
  .fade-4 { animation: fadeUp 0.5s ease-out 0.35s both; }
  .fade-5 { animation: fadeUp 0.5s ease-out 0.45s both; }
  .fade-6 { animation: fadeUp 0.5s ease-out 0.55s both; }
  @media (prefers-reduced-motion: reduce) {
    .fade-1,.fade-2,.fade-3,.fade-4,.fade-5,.fade-6 {
      animation: none; opacity: 1; transform: none;
    }
    .sub-card { animation: none; }
  }
`

const FAQ_ITEMS = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui. Vous pouvez annuler depuis vos paramètres. Votre accès reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: 'Combien de QR Codes puis-je créer ?',
    a: "Avec le plan Pro, vous pouvez créer autant de QR Codes que vous le souhaitez (Avis, Menu, Lien custom).",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Oui. Vos données sont hébergées sur Supabase (infrastructure sécurisée, chiffrement en transit et au repos).",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left border border-[#222222] rounded-xl overflow-hidden transition-colors duration-200 cursor-pointer hover:border-[#C9973A40]"
    >
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <span className="text-sm font-medium text-[#e5e5e5]">{q}</span>
        <span
          className="text-[#C9973A] text-xl leading-none transition-transform duration-200 shrink-0"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          +
        </span>
      </div>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#8c8c8c] leading-relaxed">{a}</p>
        </div>
      )}
    </button>
  )
}

function SubscriptionContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

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

  const monthlyPrice = 19.99
  const annualPrice = Math.round(monthlyPrice * 0.8 * 100) / 100
  const price = billing === 'annual' ? annualPrice : monthlyPrice

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="w-full min-h-screen flex flex-col"
        style={{
          background:
            'radial-gradient(ellipse 900px 600px at 50% 0%, rgba(201,151,58,0.07) 0%, transparent 70%), #0d0d0d',
        }}
      >
        {/* Header */}
        <header className="w-full flex flex-row justify-between items-center border-b border-[#1a1a1a] px-6 py-4">
          <a href="/" className="text-[#C9973A] font-bold text-xl hover:text-[#e6b84a] transition-colors">
            ScanAvis
          </a>
          <button
            type="button"
            onClick={handleDecline}
            disabled={signingOut}
            className="text-xs text-[#555] cursor-pointer border border-[#222] rounded-xl px-3 py-1.5 hover:text-[#8c8c8c] hover:border-[#333] transition-colors"
          >
            {signingOut ? 'Déconnexion...' : 'Non merci, me déconnecter'}
          </button>
        </header>

        {/* Notifications success/cancel */}
        {success && (
          <div className="mx-auto mt-6 max-w-xl w-full px-4">
            <div className="bg-[#0f2e1a] border border-[#1a4a2a] rounded-xl px-4 py-3 text-sm text-[#22c55e]">
              ✓ Abonnement activé — bienvenue dans ScanAvis Pro !
            </div>
          </div>
        )}
        {cancelled && (
          <div className="mx-auto mt-6 max-w-xl w-full px-4">
            <div className="bg-[#1f1010] border border-[#3a1a1a] rounded-xl px-4 py-3 text-sm text-[#ef4444]">
              Paiement annulé. Vous pouvez réessayer à tout moment.
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="flex flex-col items-center gap-3 pt-14 pb-8 px-4 text-center fade-1">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-xl">
            Boostez votre<br />
            <span style={{ color: '#C9973A' }}>réputation en ligne</span>
          </h1>
          <p className="text-[#8c8c8c] text-base md:text-lg max-w-md">
            Collectez plus d&apos;avis Google, captez les insatisfaits en privé, et suivez vos performances.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pb-8 fade-2">
          <div className="flex items-center gap-1 bg-[#171717] border border-[#222] rounded-xl p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-sm py-1.5 px-4 rounded-lg font-medium cursor-pointer transition-all duration-200 ${
                billing === 'monthly'
                  ? 'bg-[#C9973A] text-[#0d0d0d] shadow-sm'
                  : 'text-[#8c8c8c] hover:text-white'
              }`}
            >
              Mensuel
            </button>
            <div className="relative">
              <button
                onClick={() => setBilling('annual')}
                className={`text-sm py-1.5 px-4 rounded-lg font-medium cursor-pointer transition-all duration-200 ${
                  billing === 'annual'
                    ? 'bg-[#C9973A] text-[#0d0d0d] shadow-sm'
                    : 'text-[#8c8c8c] hover:text-white'
                }`}
              >
                Annuel
              </button>
              <span className="absolute -top-3 -right-2 bg-[#22c55e] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                -20%
              </span>
            </div>
          </div>
        </div>

        {/* Plan card */}
        <div className="flex justify-center px-4 pb-10 fade-3">
          <div
            className="sub-card relative w-full max-w-sm flex flex-col gap-6 bg-[#141414] rounded-2xl border-2 border-[#C9973A] p-7"
          >
            {/* Badge populaire */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C9973A] text-[#0d0d0d] text-xs font-bold px-4 py-1 rounded-full tracking-wide">
              ✦ Populaire
            </span>

            {/* Plan header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2a2316] text-[#C9973A] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
                  <path d="M5 21h14"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Pro</h3>
                <p className="text-xs text-[#555]">Pour les commerces actifs</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold">{price}€</span>
              <div className="pb-1 flex flex-col text-[#8c8c8c] text-xs">
                <span>/mois</span>
                {billing === 'annual' && <span className="text-[#22c55e]">facturé annuellement</span>}
              </div>
            </div>
            {billing === 'annual' && (
              <p className="text-xs text-[#22c55e] -mt-4 flex items-center gap-1">
                <span>✓</span>
                <span>Économisez {Math.round((monthlyPrice - annualPrice) * 12 * 100) / 100}€ par an</span>
              </p>
            )}

            {/* Divider */}
            <div className="h-px bg-[#222]" />

            {/* Features */}
            <ul className="flex flex-col gap-3">
              {[
                'QR Codes illimités (Avis, Menu, Lien)',
                'Collecte de feedbacks illimitée',
                'Dashboard analytics avancé',
                'Notifications par email',
                'Export CSV des données',
                'Personnalisation des affiches',
                'Support prioritaire',
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-3 text-sm text-[#e5e5e5]">
                  <span className="w-4 h-4 rounded-full bg-[#1e1a10] text-[#C9973A] flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-[#0d0d0d] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] mt-2"
              style={{ background: 'linear-gradient(135deg, #C9973A, #e6b84a)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-[#0d0d0d]/30 border-t-[#0d0d0d] animate-spin" />
                  Redirection…
                </span>
              ) : (
                'Commencer avec Pro →'
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 px-6 pb-12 fade-4">
          {[
            { icon: '🔒', label: 'Paiement sécurisé', sub: 'Stripe — chiffrement SSL' },
            { icon: '↩️', label: 'Annulable à tout moment', sub: 'Sans engagement' },
            { icon: '💬', label: 'Support réactif', sub: 'Réponse sous 24h' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-xl">{b.icon}</span>
              <div>
                <p className="text-xs font-medium text-[#e5e5e5]">{b.label}</p>
                <p className="text-xs text-[#555]">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="flex flex-col items-center gap-4 px-4 pb-16 w-full max-w-xl mx-auto fade-5">
          <h2 className="text-lg font-semibold text-[#e5e5e5] self-start">Questions fréquentes</h2>
          <div className="w-full flex flex-col gap-2">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pb-8 text-center fade-6">
          <p className="text-xs text-[#444]">
            Propulsé par <span className="text-[#C9973A]">ScanAvis</span>
          </p>
        </div>
      </div>
    </>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-[#0d0d0d] flex items-center justify-center"><span className="text-[#8c8c8c] text-sm">Chargement...</span></div>}>
      <SubscriptionContent />
    </Suspense>
  )
}
