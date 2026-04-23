import Link from "next/link";

export default function CguPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold text-white">Conditions Générales d&apos;Utilisation</h1>
          <p className="text-sm text-[#8c8c8c]">Dernière mise à jour : avril 2026</p>
        </div>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">1. Objet</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation du service 
            <strong className="text-white"> ScanAvis</strong>, accessible à l&apos;adresse <strong className="text-white">qr-optimiser.vercel.app</strong>.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            ScanAvis est un service SaaS permettant aux commerçants de collecter des avis Google via des QR codes intelligents. 
            Le système oriente les clients satisfaits (note ≥ 4/5) vers la fiche Google du commerce, et recueille 
            les retours négatifs en feedback privé pour permettre au commerçant de s&apos;améliorer.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            En accédant au service, vous acceptez sans réserve les présentes CGU. Si vous n&apos;acceptez pas ces conditions, 
            vous devez cesser d&apos;utiliser le service.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">2. Description du service</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">ScanAvis propose les fonctionnalités suivantes :</p>
          <ul className="text-[#8c8c8c] text-sm leading-relaxed flex flex-col gap-1 ml-4 list-disc">
            <li>Génération de QR codes personnalisés liés à la fiche Google du commerçant</li>
            <li>Filtrage intelligent des avis : redirection vers Google (notes 4-5) ou formulaire de feedback privé (notes 1-3)</li>
            <li>Tableau de bord pour consulter les avis et feedbacks collectés</li>
            <li>Personnalisation de la page de collecte (logo, couleurs)</li>
            <li>Historique des feedbacks et statistiques</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">3. Abonnement et tarification</h2>
          <div className="flex flex-col gap-3 text-[#8c8c8c] text-sm leading-relaxed">
            <p>
              L&apos;accès complet au service est soumis à un abonnement mensuel au tarif de 
              <strong className="text-white"> 19,99 € TTC par mois</strong>.
            </p>
            <p>
              L&apos;abonnement est sans engagement et résiliable à tout moment. La résiliation prend effet à la fin 
              de la période d&apos;abonnement en cours.
            </p>
            <p>
              Le paiement est traité de manière sécurisée par <strong className="text-white">Stripe</strong>. 
              ScanAvis ne stocke aucune donnée bancaire sur ses serveurs.
            </p>
            <p>
              En cas de défaut de paiement, l&apos;accès au service peut être suspendu après une période de grâce de 
              7 jours suivant l&apos;échec du prélèvement.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">4. Droit de rétractation</h2>
          <div className="flex flex-col gap-3 text-[#8c8c8c] text-sm leading-relaxed">
            <p>
              Conformément à l&apos;article L221-18 du Code de la consommation, vous disposez d&apos;un délai de 
              <strong className="text-white"> 14 jours</strong> à compter de la souscription pour exercer votre droit de rétractation, 
              sans avoir à justifier de motifs.
            </p>
            <p>
              <strong className="text-white">Exception :</strong> Conformément à l&apos;article L221-28 du Code de la consommation, 
              le droit de rétractation ne peut être exercé si vous avez expressément demandé l&apos;exécution du service 
              avant l&apos;expiration du délai de rétractation et que ce service a déjà été pleinement exécuté 
              (QR code généré et utilisé, avis collectés).
            </p>
            <p>
              Pour exercer ce droit, contactez-nous à <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] hover:underline">lborrelli248@gmail.com</a>.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">5. Données collectées</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">Dans le cadre du service, les données suivantes sont collectées :</p>
          <ul className="text-[#8c8c8c] text-sm leading-relaxed flex flex-col gap-1 ml-4 list-disc">
            <li><strong className="text-white">Compte utilisateur :</strong> adresse email, mot de passe chiffré</li>
            <li><strong className="text-white">Informations commerce :</strong> nom du commerce, URL Google My Business, logo</li>
            <li><strong className="text-white">Avis clients :</strong> note (1 à 5 étoiles), anonymes, sans données personnelles</li>
            <li><strong className="text-white">Feedbacks privés :</strong> note et message textuel, anonymes</li>
            <li><strong className="text-white">Données de paiement :</strong> gérées exclusivement par Stripe (non stockées chez ScanAvis)</li>
          </ul>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Pour plus de détails, consultez notre <Link href="/confidentialite" className="text-[#C9973A] hover:underline">Politique de confidentialité</Link>.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">6. Obligations de l&apos;utilisateur</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">En utilisant ScanAvis, vous vous engagez à :</p>
          <ul className="text-[#8c8c8c] text-sm leading-relaxed flex flex-col gap-1 ml-4 list-disc">
            <li>Fournir des informations exactes lors de l&apos;inscription</li>
            <li>Ne pas utiliser le service à des fins frauduleuses ou illicites</li>
            <li>Ne pas tenter de compromettre la sécurité ou le fonctionnement du service</li>
            <li>Respecter les conditions d&apos;utilisation de Google Maps Platform</li>
            <li>Informer vos clients de la collecte de données conformément au RGPD</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">7. Disponibilité du service</h2>
          <div className="flex flex-col gap-3 text-[#8c8c8c] text-sm leading-relaxed">
            <p>
              ScanAvis s&apos;efforce de maintenir le service disponible 24h/24 et 7j/7, mais ne peut garantir 
              une disponibilité continue. Des interruptions pour maintenance ou mise à jour peuvent intervenir.
            </p>
            <p>
              En cas d&apos;interruption prolongée non programmée, l&apos;éditeur s&apos;engage à en informer les utilisateurs 
              dans les meilleurs délais.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">8. Résiliation</h2>
          <div className="flex flex-col gap-3 text-[#8c8c8c] text-sm leading-relaxed">
            <p>
              Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte ou 
              en contactant notre support.
            </p>
            <p>
              ScanAvis se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, 
              sans préavis ni remboursement.
            </p>
            <p>
              À la résiliation, vos données sont conservées pendant 30 jours puis supprimées définitivement, 
              sauf obligation légale contraire.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">9. Informations légales de l&apos;éditeur</h2>
          <ul className="text-[#8c8c8c] text-sm leading-relaxed flex flex-col gap-1 ml-4">
            <li><span className="text-white">Nom :</span> À COMPLÉTER (Prénom Nom)</li>
            <li><span className="text-white">SIRET :</span> À COMPLÉTER (en cours d&apos;immatriculation)</li>
            <li><span className="text-white">Adresse :</span> À COMPLÉTER</li>
            <li><span className="text-white">Email :</span> <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] hover:underline">lborrelli248@gmail.com</a></li>
          </ul>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">10. Droit applicable et juridiction</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Les présentes CGU sont soumises au droit français. En cas de litige, et après tentative de résolution amiable, 
            les tribunaux français seront seuls compétents.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Pour tout litige de consommation, vous pouvez recourir à la médiation de la consommation via 
            la plateforme européenne de règlement en ligne des litiges : 
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#C9973A] hover:underline ml-1">ec.europa.eu/consumers/odr</a>.
          </p>
        </section>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col justify-start items-start gap-8 border-t border-t-[#292929]">
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-start items-start gap-10">
                <div className="flex flex-col justify-start items-start gap-4">
                    <p className="text-sm text-gold font-bold uppercase tracking-[1px]">NavBar</p>
                    <div className="flex flex-col justify-start items-start gap-3">
                        <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Problèmes</a>
                        <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résolutions</a>
                        <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résultats</a>
                        <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Tarifs</a>
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
