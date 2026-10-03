'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FORMULES, type Formule } from '@/lib/vendeur-commerce'

// Plan réellement facturé, résolu côté serveur (/api/subscription/plan) : la
// formule du patron (QR 35 € / QR+NFC 40 €) vit dans `ventes`, illisible pour lui
// en RLS. On affiche donc exactement ce que Stripe prélèvera, tout en laissant le
// patron CHOISIR sa formule (ex. ajouter la plaque NFC à 40 €).
type Plan =
  | { kind: 'pending'; businessName: string | null; formule: Formule; label: string; prixMensuel: number; includesNfc: boolean }
  | { kind: 'generic'; formule: Formule; label: string; prixMensuel: number; includesNfc: boolean }
  | { kind: 'active' }

const FAQ_ITEMS = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, sans engagement. Vous résiliez depuis vos paramètres et l'accès reste actif jusqu'à la fin de la période déjà payée.",
  },
  {
    q: "Qu'est-ce qui est inclus dans l'abonnement ?",
    a: "Votre QR code d'avis Google, la collecte illimitée d'avis, le filtrage des retours négatifs en privé et votre tableau de bord de suivi. La formule QR + NFC ajoute une plaque sans contact à poser sur le comptoir.",
  },
  {
    q: 'Le paiement est-il sécurisé ?',
    a: "Oui. Le paiement est géré par Stripe (chiffrement SSL). Nous ne stockons jamais vos coordonnées bancaires.",
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. Vos données sont hébergées sur une infrastructure sécurisée, chiffrées en transit et au repos.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="w-full text-left bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden cursor-pointer transition-colors duration-200 hover:border-[#3a3a3a]"
    >
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <span className="text-sm font-medium text-[#e5e5e5]">{q}</span>
        <span
          className="text-gold text-xl leading-none transition-transform duration-200 shrink-0"
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

const Check = () => (
  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#221c10] text-gold flex items-center justify-center shrink-0">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </span>
)

function planFeatures(includesNfc: boolean): string[] {
  return [
    'Votre QR code ScanAvis, prêt à poser',
    ...(includesNfc ? ['Plaque NFC « Avis Google » à poser sur le comptoir'] : []),
    "Plus d'avis Google, automatiquement",
    'Les retours négatifs captés en privé, jamais publiés',
    'Tableau de bord de suivi de vos avis',
    'Sans engagement — annulable à tout moment',
    'Support réactif',
  ]
}

const FORMULE_ORDER: Formule[] = ['qr', 'qr_nfc']

// Sélecteur de formule : le patron confirme ou bascule vers QR + plaque NFC.
function FormuleSelector({ selected, onSelect }: { selected: Formule; onSelect: (f: Formule) => void }) {
  return (
    <div className="w-full max-w-sm grid grid-cols-2 gap-3">
      {FORMULE_ORDER.map((f) => {
        const info = FORMULES[f]
        const active = selected === f
        const isNfc = f === 'qr_nfc'
        return (
          <button
            key={f}
            type="button"
            onClick={() => onSelect(f)}
            aria-pressed={active}
            className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left cursor-pointer transition-all duration-200 ${
              active
                ? 'border-gold bg-[#1b1710] shadow-[0_0_24px_rgba(201,151,58,0.18)]'
                : 'border-[#292929] bg-[#171717] hover:border-[#3a3a3a]'
            }`}
          >
            {isNfc && (
              <span className="absolute -top-2.5 right-3 bg-gold text-[#12100e] text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                Recommandé
              </span>
            )}
            <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-[#bdbdbd]'}`}>
              {isNfc ? 'QR + plaque NFC' : 'QR code'}
            </span>
            <span className="flex items-end gap-0.5">
              <span className={`text-2xl font-bold leading-none ${active ? 'text-white' : 'text-[#e5e5e5]'}`}>
                {info.prixMensuel}€
              </span>
              <span className="text-[11px] text-[#8c8c8c] pb-0.5">/mois</span>
            </span>
            <span className="text-[11px] text-[#8c8c8c] leading-snug">
              {isNfc ? 'Plaque sans contact incluse' : 'La formule essentielle'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full max-w-sm bg-[#171717] border border-[#292929] rounded-2xl p-7 flex flex-col gap-6">
      <div className="skeleton h-10 w-2/3" />
      <div className="skeleton h-14 w-1/2" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-4 w-full" />)}
      </div>
      <div className="skeleton h-12 w-full" />
    </div>
  )
}

function ActiveCard() {
  return (
    <div className="w-full max-w-sm bg-[#171717] border border-[#292929] rounded-2xl p-7 flex flex-col items-center gap-4 text-center">
      <span className="w-14 h-14 rounded-full bg-[#0f2e1a] text-[#22c55e] flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold text-white">Abonnement déjà actif</p>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Votre abonnement ScanAvis est en cours. Rien à faire de plus.
        </p>
      </div>
      <Link
        href="/businesses"
        className="w-full min-h-[48px] flex items-center justify-center rounded-xl bg-gold text-[#12100e] font-semibold"
      >
        Accéder à mes commerces
      </Link>
    </div>
  )
}

function PlanCard({
  formule,
  businessName,
  loading,
  onSubscribe,
}: {
  formule: Formule
  businessName: string | null
  loading: boolean
  onSubscribe: () => void
}) {
  const info = FORMULES[formule]
  const includesNfc = formule === 'qr_nfc'
  const features = planFeatures(includesNfc)

  return (
    <div className="relative w-full max-w-sm flex flex-col gap-6 bg-[#171717] border-2 border-gold rounded-2xl p-7 animate-pulse-glow">
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-[#12100e] text-xs font-bold px-4 py-1 rounded-full tracking-wide">
        ✦ Votre formule
      </span>

      {/* En-tête du plan */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#221c10] text-gold flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3h-3zM21 14v7M17 21h4M17 17v4" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{info.label}</h3>
          <p className="text-xs text-[#8c8c8c] truncate">
            {businessName ? `Pour ${businessName}` : 'Pour votre commerce'}
          </p>
        </div>
      </div>

      {/* Prix */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-bold text-white leading-none">{info.prixMensuel}€</span>
        <span className="pb-1 text-[#8c8c8c] text-sm">/mois</span>
      </div>

      <div className="h-px bg-[#292929]" />

      {/* Ce qui est inclus */}
      <ul className="flex flex-col gap-3">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-3 text-sm text-[#e5e5e5] leading-snug">
            <Check />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={onSubscribe}
        disabled={loading}
        className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-gold text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-[#12100e]/30 border-t-[#12100e] animate-spin" />
            Redirection…
          </>
        ) : (
          'Activer mon abonnement →'
        )}
      </button>
    </div>
  )
}

// Trois gages de confiance, en cartes distinctes avec icônes dédiées.
const TRUST_BADGES = [
  {
    label: 'Paiement sécurisé',
    sub: 'Stripe · SSL',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: 'Sans engagement',
    sub: 'Annulable à tout moment',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    ),
  },
  {
    label: 'Support réactif',
    sub: 'Réponse sous 24 h',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 2.5V13" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
]

function TrustBadges() {
  return (
    <div className="mx-auto w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TRUST_BADGES.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-3 bg-[#171717] border border-[#292929] rounded-2xl px-4 py-4 transition-colors duration-200 hover:border-[#3a3a3a]"
        >
          <span className="w-10 h-10 rounded-xl bg-[#221c10] text-gold flex items-center justify-center shrink-0">
            {b.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#e5e5e5] leading-tight">{b.label}</p>
            <p className="text-xs text-[#8c8c8c] leading-tight mt-0.5">{b.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SubscriptionContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [selected, setSelected] = useState<Formule | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        router.push('/login')
        return
      }
      fetch('/api/subscription/plan')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Plan | null) => {
          if (cancelled || !data) return
          setPlan(data)
          if (data.kind !== 'active') setSelected(data.formule)
        })
        .catch(() => {
          // Repli silencieux : le bouton de paiement reste fonctionnel sans détail.
          if (cancelled) return
          setPlan({ kind: 'generic', formule: 'qr', label: 'ScanAvis', prixMensuel: 35, includesNfc: false })
          setSelected('qr')
        })
    })
    return () => {
      cancelled = true
    }
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
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formule: selected }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erreur lors de la création du paiement')
        setLoading(false)
      }
    } catch {
      alert('Erreur lors de la création du paiement')
      setLoading(false)
    }
  }

  const businessName = plan && plan.kind === 'pending' ? plan.businessName : null
  const showSelector = plan !== null && plan.kind !== 'active' && selected !== null

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#0d0d0d] text-[#ededed]">
      {/* Header */}
      <header className="w-full flex flex-row justify-between items-center border-b border-[#1a1a1a] px-6 py-4">
        <Link href="/" className="text-xl font-bold animate-gradient-text">
          ScanAvis
        </Link>
        <button
          type="button"
          onClick={handleDecline}
          disabled={signingOut}
          className="text-xs text-[#8c8c8c] cursor-pointer border border-[#292929] rounded-xl px-3 py-1.5 hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Déconnexion…' : 'Non merci, me déconnecter'}
        </button>
      </header>

      {/* Notifications success/cancel */}
      {success && (
        <div className="mx-auto mt-6 max-w-xl w-full px-4 animate-fade-up">
          <div className="flex items-center gap-2 bg-[#0f2e1a] border border-[#1a4a2a] rounded-2xl px-4 py-3 text-sm text-[#22c55e]">
            <span>✓</span> Abonnement activé — bienvenue sur ScanAvis !
          </div>
        </div>
      )}
      {cancelled && (
        <div className="mx-auto mt-6 max-w-xl w-full px-4 animate-fade-up">
          <div className="bg-[#181010] border border-[#3a1a1a] rounded-2xl px-4 py-3 text-sm text-[#ef8a8a]">
            Paiement annulé. Vous pouvez réessayer quand vous voulez.
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-14 pb-8 px-4 text-center animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-xl">
          Activez votre <span className="animate-gradient-text">commerce</span>
        </h1>
        <p className="text-[#8c8c8c] text-base md:text-lg max-w-md leading-relaxed">
          Collectez plus d&apos;avis Google, recueillez les retours des insatisfaits en privé, et suivez vos performances.
        </p>
      </div>

      {/* Sélecteur de formule + carte du plan */}
      <div className="flex flex-col items-center gap-6 px-4 pb-12 animate-fade-up stagger-2">
        {showSelector && (
          <>
            <FormuleSelector selected={selected!} onSelect={setSelected} />
            <PlanCard
              formule={selected!}
              businessName={businessName}
              loading={loading}
              onSubscribe={handleSubscribe}
            />
          </>
        )}
        {plan?.kind === 'active' && <ActiveCard />}
        {plan === null && <SkeletonCard />}
      </div>

      {/* Trust badges */}
      <div className="px-6 pb-12 animate-fade-up stagger-3">
        <TrustBadges />
      </div>

      {/* FAQ */}
      <div className="flex flex-col items-center gap-4 px-4 pb-16 w-full max-w-xl mx-auto animate-fade-up stagger-4">
        <h2 className="text-lg font-semibold text-[#e5e5e5] self-start">Questions fréquentes</h2>
        <div className="w-full flex flex-col gap-2">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pb-8 text-center">
        <p className="text-xs text-[#555]">
          Propulsé par <span className="text-gold">ScanAvis</span>
        </p>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-[#0d0d0d] flex items-center justify-center">
          <span className="text-[#8c8c8c] text-sm">Chargement…</span>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  )
}
