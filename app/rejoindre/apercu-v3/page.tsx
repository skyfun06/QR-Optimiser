import Link from 'next/link'
import { HeroVisualMap } from '@/components/vendeurs/rejoindre-map'

// Page d'aperçu de la V3 du visuel hero (carte locale + pins). Non liée, noindex
// (hérité du layout). /rejoindre garde la V2 tant que ce n'est pas validé.
export default function ApercuV3Page() {
  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6 py-8 text-center">
      <span className="text-xs font-semibold uppercase tracking-[2px] text-gold">Aperçu · V3</span>
      <h1 className="text-2xl font-bold text-white">Carte locale + pins</h1>
      <HeroVisualMap />
      <p className="text-sm text-[#8c8c8c] leading-relaxed">
        Ceci n’est qu’un aperçu. La page <span className="text-white">/rejoindre</span> garde la V2
        (« tes gains »).
      </p>
      <Link href="/rejoindre" className="text-sm text-gold hover:underline">
        ← Retour à /rejoindre
      </Link>
    </div>
  )
}
