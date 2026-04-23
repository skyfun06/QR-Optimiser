import Link from "next/link";

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
      <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 md:py-6 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#292929]">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-row justify-between items-center">
              <a href="/" className="font-bold text-gold text-sm transition-colors duration-200 hover:text-white">ScanAvis</a>
              <nav className="hidden sm:flex flex-row gap-6 pl-6 lg:pl-16">
                <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Problèmes</a>
                <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Résolutions</a>
                <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Tarifs</a>
              </nav>
              <div className="flex flex-row items-center gap-2">
                  <a href="/signup" className="text-black p-1 bg-gold text-xs font-medium rounded-xl cursor-pointer px-3 md:px-4 py-2 transition-colors duration-200 hover:opacity-90">Essayer</a>
                  <a href="/demo" className="text-gold text-xs font-medium rounded-xl cursor-pointer px-3 py-1 border border-gold transition-colors duration-200 hover:bg-gold hover:text-[#12100e]">
                      <p className="px-2 py-1">Voir démo</p>
                  </a>
              </div>
          </div>
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 pt-32 pb-20 flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-[#C9973A] font-bold">Légal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mentions légales</h1>
          <p className="text-sm text-[#8c8c8c]">Dernière mise à jour : avril 2026</p>
        </div>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">1. Éditeur du site</h2>
          <div className="flex flex-col gap-2 text-[#8c8c8c] text-sm leading-relaxed">
            <p>Le site <strong className="text-white">qr-optimiser.vercel.app</strong> est édité par :</p>
            <ul className="flex flex-col gap-1 mt-2 ml-4">
              <li><span className="text-white">Nom :</span> À COMPLÉTER (Prénom Nom)</li>
              <li><span className="text-white">Statut :</span> Particulier / Micro-entrepreneur en cours d&apos;immatriculation</li>
              <li><span className="text-white">SIRET :</span> Non attribué (démarches en cours)</li>
              <li><span className="text-white">Email :</span> <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] hover:underline">lborrelli248@gmail.com</a></li>
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">2. Hébergement</h2>
          <div className="flex flex-col gap-2 text-[#8c8c8c] text-sm leading-relaxed">
            <p>Ce site est hébergé par :</p>
            <ul className="flex flex-col gap-1 mt-2 ml-4">
              <li><span className="text-white">Société :</span> Vercel Inc.</li>
              <li><span className="text-white">Adresse :</span> 340 Pine Street Suite 701, San Francisco, CA 94104, États-Unis</li>
              <li><span className="text-white">Site web :</span> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#C9973A] hover:underline">vercel.com</a></li>
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">3. Propriété intellectuelle</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            L&apos;ensemble du contenu de ce site (textes, images, logos, code source, design) est protégé par le droit d&apos;auteur. 
            Toute reproduction, distribution, modification ou utilisation à des fins commerciales sans autorisation 
            écrite préalable de l&apos;éditeur est strictement interdite.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            La marque <strong className="text-white">ScanAvis</strong> et le nom de domaine associé sont la propriété exclusive de l&apos;éditeur.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">4. Cookies</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Ce site utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service 
            (session d&apos;authentification Supabase). Aucun cookie de tracking, de publicité ou d&apos;analyse tiers n&apos;est déposé 
            sans votre consentement.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            En continuant à naviguer sur ce site, vous acceptez l&apos;utilisation de ces cookies techniques indispensables.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">5. Limitation de responsabilité</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            L&apos;éditeur s&apos;efforce de maintenir les informations de ce site à jour et exactes, mais ne peut garantir 
            l&apos;exactitude, l&apos;exhaustivité ou l&apos;actualité des informations publiées. L&apos;éditeur décline toute responsabilité 
            pour tout dommage direct ou indirect résultant de l&apos;utilisation de ce site ou des informations qu&apos;il contient.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            L&apos;éditeur ne peut être tenu responsable des contenus des sites tiers vers lesquels ce site pourrait renvoyer.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            En cas de litige, le droit français est applicable et les tribunaux français sont seuls compétents.
          </p>
        </section>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col justify-start items-start gap-8 border-t border-t-[#292929]">
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-start items-start gap-10">
                <div className="flex flex-col justify-start items-start gap-4">
                    <p className="text-sm text-gold font-bold uppercase tracking-[1px]">NavBar</p>
                    <div className="flex flex-col justify-start items-start gap-3">
                        <a href="/" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Problèmes</a>
                        <a href="/" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résolutions</a>
                        <a href="/" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résultats</a>
                        <a href="/" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Tarifs</a>
                    </div>
                </div>
                <div className="flex flex-col justify-start items-start gap-4">
                    <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Entreprise</p>
                    <div className="flex flex-col justify-start items-start gap-3">
                        <Link href="/a-propos" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">À propos</Link>
                        <Link href="/contact" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Contact</Link>
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
    </div>
  );
}
