'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'

/* ─── Révélation au scroll (safe : contenu SSR présent, visible si reduced-motion) ─── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[800ms] ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ─── Icônes (traits or, légères) ─── */
const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: '#C9973A', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const IconUser = () => (<svg {...ic} aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>)
const IconBook = () => (<svg {...ic} aria-hidden><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>)
const IconCheck = () => (<svg {...ic} aria-hidden><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>)
const IconTarget = () => (<svg {...ic} aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="#C9973A" /></svg>)
const IconCap = () => (<svg {...ic} aria-hidden><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5" /></svg>)
const IconClock = () => (<svg {...ic} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>)
const IconUnlock = () => (<svg {...ic} aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-1.5" /></svg>)
const IconShield = () => (<svg {...ic} width={16} height={16} aria-hidden><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>)
const Star = ({ s = 16 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="#C9973A" aria-hidden><polygon points="12 2 15 9 22 9.3 16.5 14 18 21 12 17.3 6 21 7.5 14 2 9.3 9 9" /></svg>)

/* ─── Fond ambiant plein écran (fixe) : remplit le vide, surtout sur desktop ─── */
function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-40 w-[560px] h-[560px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.14), transparent 60%)' }} />
      <div className="absolute top-1/3 -right-52 w-[620px] h-[620px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.10), transparent 62%)', animationDelay: '1.5s' }} />
      <div className="absolute -bottom-48 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.07), transparent 62%)', animationDelay: '2.6s' }} />
      <svg className="absolute top-[18%] -left-44 w-[400px] h-[400px] animate-spin-slow hidden md:block" viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.07" strokeWidth="0.5" strokeDasharray="2 8"><circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="32" strokeDasharray="1 6" /></svg>
      <svg className="absolute bottom-[8%] -right-44 w-[460px] h-[460px] animate-spin-slow hidden md:block" style={{ animationDirection: 'reverse' }} viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="3 9"><circle cx="50" cy="50" r="48" /></svg>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)', WebkitMaskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)' }} />
    </div>
  )
}

function CtaButton({ label = 'Rejoindre le réseau', className = '' }: { label?: string; className?: string }) {
  return (
    <Link
      href="/rejoindre/inscription"
      className={`inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-2xl bg-gold text-[#12100e] font-bold text-lg shadow-[0_10px_40px_-12px_rgba(201,151,58,0.6)] active:scale-[0.98] transition-transform ${className}`}
    >
      {label}
      <span aria-hidden>→</span>
    </Link>
  )
}

/* ─── Accent "luxe" : le mot mis en valeur DANS un titre. Police serif à
   caractère (Fraunces), un poil plus grasse, dorée, design identique partout.
   Le titre lui-même reste blanc/gras. ─── */
function Lux({ children }: { children: ReactNode }) {
  return (
    <span
      className="font-medium animate-gradient-text text-[1.05em]"
      style={{ fontFamily: 'var(--font-display), Georgia, serif', filter: 'drop-shadow(0 0 16px rgba(201,151,58,0.25))' }}
    >
      {children}
    </span>
  )
}

/* ─── En-tête de section : bandeau + titre + accroche (chaque section a son rôle) ─── */
function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[2px] text-gold">{eyebrow}</span>
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h2>
      {subtitle && <p className="text-base text-[#8c8c8c] max-w-xl leading-relaxed">{subtitle}</p>}
    </div>
  )
}

/* ─── Visuel produit du hero : mockup téléphone (écran ScanAvis). ─────────────────
   Remplaçable par une vraie photo : dépose public/images/rejoindre-hero.jpg
   et remplace <PhoneMockup /> par un <Image src="/images/rejoindre-hero.jpg" …/>. */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px] lg:w-[340px] animate-float">
      {/* halo derrière le téléphone */}
      <div aria-hidden className="absolute -inset-12 -z-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.28), transparent 65%)' }} />

      {/* châssis (format téléphone plein, bien haut) */}
      <div className="relative rounded-[2.8rem] border border-[#2a2a2a] bg-[#0a0a0a] p-2.5 shadow-[0_40px_100px_-28px_rgba(0,0,0,0.95)]">
        {/* écran — ratio 9:19 pour une vraie hauteur de téléphone */}
        <div className="relative rounded-[2.3rem] overflow-hidden bg-gradient-to-b from-[#151515] to-[#0e0e0e] aspect-[9/19] flex flex-col items-center text-center px-6 pt-7 pb-8">
          <span aria-hidden className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-[#2a2a2a]" />

          {/* en-tête */}
          <div className="flex flex-col items-center gap-3 mt-5">
            <div className="w-14 h-14 rounded-2xl bg-[#1a150c] border border-[#3a2f18] flex items-center justify-center">
              <Star s={26} />
            </div>
            <span className="text-sm font-semibold text-white">Boulangerie du Coin</span>
          </div>

          {/* cœur : question + étoiles */}
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <span className="text-base text-[#e5e5e5] leading-snug px-1">Comment s’est passée votre visite ?</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (<Star key={i} s={26} />))}
            </div>
          </div>

          {/* bouton + signature */}
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full min-h-[46px] rounded-xl bg-gold text-[#12100e] text-[13px] font-bold flex items-center justify-center">
              Laisser un avis Google
            </div>
            <span className="text-[10px] text-[#5c5c5c]">Propulsé par ScanAvis</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const STATS = [
  { value: '35 €', label: 'par commerce signé' },
  { value: '2 min', label: 'pour convaincre' },
  { value: '0 €', label: 'pour te lancer' },
]

const ETAPES = [
  { icon: <IconUser />, titre: 'Je m’inscris', texte: 'Deux minutes, gratuit. Quelques questions pour qu’on apprenne à te connaître.' },
  { icon: <IconBook />, titre: 'Je suis la formation', texte: 'Gratuite. Tu apprends ce qu’est ScanAvis et comment le présenter à un commerçant.' },
  { icon: <IconCheck />, titre: 'Je passe le test', texte: 'Un court test pour valider que tu maîtrises. Réussi, tu deviens vendeur officiel.' },
  { icon: <IconTarget />, titre: 'Je démarche, je suis payé', texte: 'Tu vas voir les commerces près de chez toi. Chaque commerce signé = 35 €.' },
]

const ATOUTS = [
  { icon: <IconCap />, titre: 'Tu apprends à vendre', texte: 'Une vraie compétence qui te servira toute ta vie, encadrée par notre formation.' },
  { icon: <IconClock />, titre: 'Tu bosses quand tu veux', texte: 'Pas d’horaires, pas de patron sur le dos. Tu gères ton temps comme tu l’entends.' },
  { icon: <IconUnlock />, titre: 'Aucun engagement', texte: 'Tu testes, tu vois si ça te plaît. Tu arrêtes quand tu veux, sans te justifier.' },
]

export function RejoindreContent() {
  return (
    <div
      className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex flex-col gap-24 md:gap-36 pb-10"
      style={{ fontFamily: 'var(--font-body), var(--font-space-grotesk), sans-serif' }}
    >
      <AmbientBackground />

      {/* ══════════ 1. HERO ══════════ */}
      <section className="relative pt-2 md:pt-0 md:min-h-[82vh] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 items-center">
        <div className="flex flex-col items-center text-center md:items-start md:text-left gap-6">
          <span className="animate-fade-up inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-gold border border-[#3a2f18] bg-[#1a150c] rounded-full px-4 py-1.5">
            Réseau vendeurs · ScanAvis
          </span>
          <h1 className="animate-fade-up stagger-1 text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
            Fais-toi <Lux>de l’argent</Lux> en aidant les commerces de ta ville.
          </h1>
          <p className="animate-fade-up stagger-2 text-lg text-[#c7c7c7] leading-relaxed max-w-md">
            Tu démarches des commerçants près de chez toi, tu les aides à récolter des avis Google, et
            tu touches <span className="text-white font-semibold">35 € par commerce signé</span>.
          </p>
          <div className="animate-fade-up stagger-3 w-full flex flex-col items-center md:items-start gap-3">
            <CtaButton className="w-full sm:w-auto" />
            <p className="flex items-center gap-2 text-xs text-[#8c8c8c]">
              <IconShield /> Gratuit · Sans engagement · Dès 18 ans
            </p>
          </div>
        </div>

        <div className="animate-fade-up stagger-2 flex justify-center">
          <PhoneMockup />
        </div>
      </section>

      {/* ══════════ 2. CHIFFRES CLÉS (scannable en 1 seconde) ══════════ */}
      <Reveal>
        <div className="grid grid-cols-3 divide-x divide-[#292929] rounded-2xl bg-[#171717] border border-[#292929] overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-2 py-6 text-center">
              <span className="text-2xl md:text-4xl font-bold text-gold">{s.value}</span>
              <span className="text-[11px] md:text-sm text-[#8c8c8c] leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ══════════ 3. LE CONCEPT ══════════ */}
      <Reveal className="flex flex-col gap-8">
        <SectionHead
          eyebrow="Le concept"
          title={<>C’est quoi, <Lux>concrètement</Lux> ?</>}
          subtitle="Aucune expérience requise. Tu représentes un produit simple et utile, sur le terrain."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto w-full">
          <div className="flex flex-col gap-2 p-6 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
            <span className="font-semibold text-white">Le produit</span>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              ScanAvis aide les commerces — restaurants, coiffeurs, garages… — à récolter plus d’avis
              Google grâce à un simple QR code.
            </p>
          </div>
          <div className="flex flex-col gap-2 p-6 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
            <span className="font-semibold text-white">Ton rôle</span>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              Aller les voir près de chez toi, montrer l’intérêt en 2 minutes, les convaincre de se
              lancer. Chaque commerce signé te rapporte.
            </p>
          </div>
        </div>
      </Reveal>

      {/* ══════════ 4. LA RÉMUNÉRATION ══════════ */}
      <Reveal>
        <div className="relative overflow-hidden flex flex-col items-center text-center gap-4 px-6 py-12 md:py-16 bg-gradient-to-b from-[#1c1710] to-[#171717] border border-[#3a2f18] rounded-3xl animate-pulse-glow">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
          <span className="text-xs uppercase tracking-[2px] text-[#8c8c8c]">Combien tu gagnes</span>
          <p className="text-6xl md:text-7xl font-bold text-gold leading-none">35 €</p>
          <p className="text-base text-[#e5e5e5]">par commerce signé — à chaque fois, sans plafond.</p>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#12100e]/60 border border-[#3a2f18]">
            <span className="text-sm text-[#c7c7c7]">10 commerces ce mois-ci</span>
            <span aria-hidden className="text-[#8c8c8c]">→</span>
            <span className="text-sm font-bold text-gold">350 €</span>
          </div>
        </div>
      </Reveal>

      {/* ══════════ 5. COMMENT ÇA MARCHE ══════════ */}
      <Reveal className="flex flex-col gap-8">
        <SectionHead eyebrow="En 4 étapes" title={<>Comment <Lux>ça marche</Lux></>} subtitle="De l’inscription à ta première paie, le parcours est balisé." />
        <div className="relative flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5">
          <span aria-hidden className="md:hidden absolute left-[26px] top-8 bottom-8 w-px bg-gradient-to-b from-[#3a2f18] via-[#3a2f18] to-transparent" />
          {ETAPES.map((e, i) => (
            <Reveal key={e.titre} delay={i * 90} className="relative flex items-start gap-4 p-5 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
              <span className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#1a150c] border border-[#3a2f18]">
                {e.icon}
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-gold text-[#12100e] text-[11px] font-bold">{i + 1}</span>
              </span>
              <div className="flex flex-col gap-1 pt-0.5">
                <span className="font-semibold text-white">{e.titre}</span>
                <span className="text-sm text-[#c7c7c7] leading-relaxed">{e.texte}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ══════════ 6. CE QUE ÇA T'APPORTE ══════════ */}
      <Reveal className="flex flex-col gap-8">
        <SectionHead eyebrow="Les avantages" title={<>Ce que ça <Lux>t’apporte</Lux></>} subtitle="Au-delà de l’argent, une expérience qui compte." />
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
          {ATOUTS.map((a, i) => (
            <Reveal key={a.titre} delay={i * 90} className="flex flex-col gap-3 p-6 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
              <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1a150c] border border-[#3a2f18]">{a.icon}</span>
              <span className="font-semibold text-gold">{a.titre}</span>
              <span className="text-sm text-[#c7c7c7] leading-relaxed">{a.texte}</span>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ══════════ 7. CTA FINAL ══════════ */}
      <Reveal>
        <div className="relative overflow-hidden flex flex-col items-center text-center gap-5 px-6 py-14 md:py-20 bg-gradient-to-b from-[#1c1710] to-[#171717] border border-[#3a2f18] rounded-3xl">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight max-w-2xl">
            Prêt à te <Lux>lancer</Lux> ?
          </h2>
          <p className="text-base md:text-lg text-[#c7c7c7] max-w-xl">
            Rejoins le réseau aujourd’hui. Tu pourrais signer ton premier commerce cette semaine.
          </p>
          <CtaButton className="w-full sm:w-auto" label="Je rejoins le réseau" />
          <p className="flex items-center gap-2 text-xs text-[#8c8c8c]"><IconShield /> Réservé aux 18 ans et plus.</p>
        </div>
      </Reveal>
    </div>
  )
}
