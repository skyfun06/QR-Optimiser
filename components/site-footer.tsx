import Link from 'next/link'

// Footer du site, partagé (landing + page recrutement). Les ancres de la landing
// sont en /#… pour rester cliquables depuis n'importe quelle page.
export function SiteFooter() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col justify-start items-start gap-8 border-t border-t-[#292929]">
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-start items-start gap-10">
        <div className="flex flex-col justify-start items-start gap-4">
          <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Navigation</p>
          <div className="flex flex-col justify-start items-start gap-3">
            <Link href="/#problemes" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Problèmes</Link>
            <Link href="/#resolutions" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résolutions</Link>
            <Link href="/#resultats" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résultats</Link>
            <Link href="/#tarifs" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Tarifs</Link>
          </div>
        </div>
        <div className="flex flex-col justify-start items-start gap-4">
          <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Entreprise</p>
          <div className="flex flex-col justify-start items-start gap-3">
            <Link href="/a-propos" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">À propos</Link>
            <Link href="/contact" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Contact</Link>
            <Link href="/rejoindre" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Devenir vendeur</Link>
          </div>
        </div>
        <div className="flex flex-col justify-start items-start gap-4">
          <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Légal</p>
          <div className="flex flex-col justify-start items-start gap-3">
            <Link href="/mentions-legales" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Mentions légales</Link>
            <Link href="/cgu" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">CGU</Link>
            <Link href="/confidentialite" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </div>
      <hr className="h-[1px] w-full text-[#262626]" />
      <p className="text-xs text-[#8c8c8c] text-left">© 2026 ScanAvis · Fait en France</p>
    </footer>
  )
}
