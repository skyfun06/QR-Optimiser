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
    // L'IntersectionObserver rappelle aussi les éléments déjà visibles au montage.
    // En prefers-reduced-motion, la transition est neutralisée globalement
    // (globals.css) → la révélation devient instantanée, sans à-coups.
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

/* ─── Fond ambiant plein écran (fixe) : remplit le vide, surtout sur desktop ─── */
function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Halos dorés flous, dérive douce */}
      <div
        className="absolute -top-32 -left-40 w-[560px] h-[560px] rounded-full blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.14), transparent 60%)' }}
      />
      <div
        className="absolute top-1/3 -right-52 w-[620px] h-[620px] rounded-full blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.10), transparent 62%)', animationDelay: '1.5s' }}
      />
      <div
        className="absolute -bottom-48 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.07), transparent 62%)', animationDelay: '2.6s' }}
      />
      {/* Anneaux lents ancrés aux bords — habillent les flancs vides sur PC */}
      <svg className="absolute top-[18%] -left-44 w-[400px] h-[400px] animate-spin-slow hidden md:block" viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.07" strokeWidth="0.5" strokeDasharray="2 8">
        <circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="32" strokeDasharray="1 6" />
      </svg>
      <svg className="absolute bottom-[8%] -right-44 w-[460px] h-[460px] animate-spin-slow hidden md:block" style={{ animationDirection: 'reverse' }} viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="3 9">
        <circle cx="50" cy="50" r="48" />
      </svg>
      {/* Grille pointillée très subtile, estompée vers les bords */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
        }}
      />
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
    <div className="w-full max-w-md flex flex-col gap-20 pb-4">
      <AmbientBackground />

      {/* ══════════ HERO ══════════ */}
      <section className="relative flex flex-col items-center text-center gap-6 pt-8">
        {/* Décor : halo + anneaux + étoiles flottantes (contenus, discrets) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-10 w-[420px] h-[420px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.20), transparent 65%)' }}
          />
          <svg className="absolute -top-6 -right-10 w-56 h-56 animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.12" strokeWidth="0.6" strokeDasharray="3 7">
            <circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="34" strokeDasharray="1 6" />
          </svg>
          {[
            { top: '12%', left: '10%', s: 20, d: '0s', o: 0.25 },
            { top: '26%', left: '82%', s: 14, d: '1.1s', o: 0.2 },
            { top: '60%', left: '6%', s: 12, d: '2s', o: 0.16 },
          ].map((st, i) => (
            <svg key={i} className="absolute animate-float" style={{ top: st.top, left: st.left, width: st.s, height: st.s, animationDelay: st.d, opacity: st.o }} viewBox="0 0 24 24" fill="#C9973A" aria-hidden>
              <polygon points="12 2 15 9 22 9.3 16.5 14 18 21 12 17.3 6 21 7.5 14 2 9.3 9 9" />
            </svg>
          ))}
        </div>

        <span className="animate-fade-up inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-gold border border-[#3a2f18] bg-[#1a150c] rounded-full px-4 py-1.5">
          Réseau vendeurs · ScanAvis
        </span>

        <h1 className="animate-fade-up stagger-1 text-4xl sm:text-5xl font-bold text-white leading-[1.08]">
          Fais-toi{' '}
          <span className="animate-gradient-text">de l’argent</span>
          <br />
          en aidant les commerces de ta ville.
        </h1>

        <p className="animate-fade-up stagger-2 text-lg text-[#c7c7c7] leading-relaxed">
          Tu démarches des commerçants près de chez toi, tu les aides à récolter des avis Google, et
          tu touches <span className="text-white font-semibold">35 € par commerce signé</span>.
        </p>

        <div className="animate-fade-up stagger-3 w-full flex flex-col items-center gap-3">
          <CtaButton className="w-full" />
          <p className="flex items-center gap-2 text-xs text-[#8c8c8c]">
            <IconShield /> Gratuit · Sans engagement · Dès 18 ans
          </p>
        </div>
      </section>

      {/* ══════════ RÉMUNÉRATION (showpiece) ══════════ */}
      <Reveal>
        <div className="relative overflow-hidden flex flex-col items-center text-center gap-2 px-6 py-10 bg-gradient-to-b from-[#1c1710] to-[#171717] border border-[#3a2f18] rounded-3xl animate-pulse-glow">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
          <span className="text-xs uppercase tracking-[2px] text-[#8c8c8c]">Ta rémunération</span>
          <p className="text-7xl font-bold text-gold leading-none">35€</p>
          <p className="text-base text-[#e5e5e5]">par commerce signé.</p>
          <p className="text-sm text-[#8c8c8c]">À chaque fois. Sans plafond.</p>
        </div>
      </Reveal>

      {/* ══════════ C'EST QUOI ══════════ */}
      <Reveal className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white">C’est quoi, concrètement ?</h2>
        <div className="flex flex-col gap-4 p-6 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
          <p className="text-base text-[#c7c7c7] leading-relaxed">
            ScanAvis aide les commerces — restaurants, coiffeurs, garages… — à récolter plus d’avis
            Google grâce à un simple QR code.
          </p>
          <p className="text-base text-[#c7c7c7] leading-relaxed">
            Ton job : aller les voir, leur montrer l’intérêt en 2 minutes, et les convaincre de se
            lancer. Tu démarches <span className="text-white font-medium">près de chez toi</span> et tu
            es <span className="text-white font-medium">payé sur chaque vente</span>. C’est tout.
          </p>
        </div>
      </Reveal>

      {/* ══════════ COMMENT ÇA MARCHE (timeline) ══════════ */}
      <Reveal className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-white text-center">Comment ça marche</h2>
        <div className="relative flex flex-col gap-4">
          {/* ligne verticale reliant les étapes */}
          <span aria-hidden className="absolute left-[22px] top-6 bottom-6 w-px bg-gradient-to-b from-[#3a2f18] via-[#3a2f18] to-transparent" />
          {ETAPES.map((e, i) => (
            <Reveal key={e.titre} delay={i * 90} className="relative flex items-start gap-4 p-4 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
              <span className="relative z-10 shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-[#1a150c] border border-[#3a2f18]">
                {e.icon}
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-gold text-[#12100e] text-[11px] font-bold">
                  {i + 1}
                </span>
              </span>
              <div className="flex flex-col gap-1 pt-0.5">
                <span className="font-semibold text-white text-base">{e.titre}</span>
                <span className="text-sm text-[#c7c7c7] leading-relaxed">{e.texte}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ══════════ CE QUE ÇA T'APPORTE ══════════ */}
      <Reveal className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-white text-center">Ce que ça t’apporte</h2>
        <div className="flex flex-col gap-4">
          {ATOUTS.map((a, i) => (
            <Reveal key={a.titre} delay={i * 90} className="flex items-start gap-4 p-5 bg-[#171717] border border-[#292929] rounded-2xl hover-lift">
              <span className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-[#1a150c] border border-[#3a2f18]">
                {a.icon}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-gold text-base">{a.titre}</span>
                <span className="text-sm text-[#c7c7c7] leading-relaxed">{a.texte}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ══════════ CTA FINAL ══════════ */}
      <Reveal>
        <div className="relative overflow-hidden flex flex-col items-center text-center gap-5 px-6 py-10 bg-gradient-to-b from-[#1c1710] to-[#171717] border border-[#3a2f18] rounded-3xl">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
          <h2 className="text-3xl font-bold text-white leading-tight">Prêt à te lancer ?</h2>
          <p className="text-base text-[#c7c7c7]">
            Rejoins le réseau aujourd’hui. Tu pourrais signer ton premier commerce cette semaine.
          </p>
          <CtaButton className="w-full" label="Je rejoins le réseau" />
          <p className="flex items-center gap-2 text-xs text-[#8c8c8c]">
            <IconShield /> Réservé aux 18 ans et plus.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
