import type { Metadata } from 'next'
import Link from 'next/link'

// Page de recrutement publique — INDEXABLE (surcharge le noindex du layout).
export const metadata: Metadata = {
  title: 'Deviens vendeur ScanAvis — gagne 35 € par commerce signé',
  description:
    "Rejoins le réseau ScanAvis : démarche les commerces près de chez toi, apprends à vendre avec une formation gratuite, et sois payé 35 € pour chaque commerce signé. Sans engagement, quand tu veux, dès 18 ans.",
  robots: { index: true, follow: true },
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/rejoindre/inscription"
      className={`inline-flex items-center justify-center min-h-[52px] px-8 rounded-2xl bg-gold text-[#12100e] font-bold text-base active:scale-[0.98] transition-transform ${className}`}
    >
      Rejoindre le réseau →
    </Link>
  )
}

const ETAPES = [
  { n: '1', titre: 'Je m’inscris', texte: 'Deux minutes, gratuit. Tu réponds à quelques questions pour qu’on apprenne à te connaître.' },
  { n: '2', titre: 'Je suis la formation', texte: 'Gratuite. Tu apprends ce qu’est ScanAvis et comment le présenter à un commerçant.' },
  { n: '3', titre: 'Je passe le test', texte: 'Un court test pour valider que tu maîtrises. Réussi, tu deviens vendeur officiel.' },
  { n: '4', titre: 'Je démarche et je suis payé', texte: 'Tu vas voir les commerces près de chez toi. Chaque commerce signé = 35 €.' },
]

const ATOUTS = [
  { titre: 'Tu apprends à vendre', texte: 'Une vraie compétence qui te servira toute ta vie, encadrée par notre formation.' },
  { titre: 'Tu bosses quand tu veux', texte: 'Pas d’horaires, pas de patron sur le dos. Tu gères ton temps comme tu l’entends.' },
  { titre: 'Aucun engagement', texte: 'Tu testes, tu vois si ça te plaît. Tu arrêtes quand tu veux, sans justification.' },
]

export default function RejoindrePage() {
  return (
    <div className="w-full max-w-md flex flex-col gap-12 animate-fade-up">
      {/* Accroche */}
      <section className="flex flex-col items-center text-center gap-5 pt-6">
        <span className="text-xs font-semibold uppercase tracking-[2px] text-gold">Réseau vendeurs ScanAvis</span>
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Fais-toi de l’argent en aidant les commerces de ta ville.
        </h1>
        <p className="text-base text-[#c7c7c7] leading-relaxed">
          Tu démarches des commerçants près de chez toi, tu leur fais gagner des avis Google, et tu
          touches <span className="text-gold font-semibold">35 € pour chaque commerce signé</span>.
        </p>
        <PrimaryCta className="w-full" />
        <p className="text-xs text-[#8c8c8c]">Gratuit · Sans engagement · Dès 18 ans</p>
      </section>

      {/* Ce que c'est */}
      <section className="flex flex-col gap-3 p-6 bg-[#171717] border border-[#292929] rounded-2xl">
        <h2 className="text-xl font-bold text-white">C’est quoi, concrètement ?</h2>
        <p className="text-sm text-[#c7c7c7] leading-relaxed">
          ScanAvis aide les commerces (restaurants, coiffeurs, garages…) à récolter plus d’avis
          Google grâce à un simple QR code. Ton job : aller les voir, leur montrer l’intérêt, et les
          convaincre de se lancer.
        </p>
        <p className="text-sm text-[#c7c7c7] leading-relaxed">
          Tu démarches les commerces <span className="text-white font-medium">près de chez toi</span> et
          tu es <span className="text-white font-medium">payé sur chaque vente</span>. Simple.
        </p>
      </section>

      {/* Rémunération */}
      <section className="flex flex-col items-center text-center gap-2 p-8 bg-[#171717] border border-[#292929] rounded-2xl">
        <span className="text-xs uppercase tracking-[2px] text-[#8c8c8c]">Ta rémunération</span>
        <p className="text-5xl font-bold text-gold">35 €</p>
        <p className="text-sm text-[#c7c7c7]">par commerce signé. À chaque fois.</p>
      </section>

      {/* Comment ça marche */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white text-center">Comment ça marche</h2>
        <div className="flex flex-col gap-3">
          {ETAPES.map((e) => (
            <div key={e.n} className="flex items-start gap-4 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
              <span className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#221c10] text-gold font-bold">
                {e.n}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-white">{e.titre}</span>
                <span className="text-sm text-[#c7c7c7] leading-relaxed">{e.texte}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ce que ça t'apporte */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white text-center">Ce que ça t’apporte</h2>
        <div className="flex flex-col gap-3">
          {ATOUTS.map((a) => (
            <div key={a.titre} className="flex flex-col gap-1 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
              <span className="font-semibold text-gold">{a.titre}</span>
              <span className="text-sm text-[#c7c7c7] leading-relaxed">{a.texte}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final + rappel 18 ans */}
      <section className="flex flex-col items-center text-center gap-4 pb-6">
        <h2 className="text-2xl font-bold text-white">Prêt à te lancer ?</h2>
        <PrimaryCta className="w-full" />
        <p className="text-xs text-[#8c8c8c]">
          Réservé aux personnes de 18 ans ou plus.
        </p>
      </section>
    </div>
  )
}
