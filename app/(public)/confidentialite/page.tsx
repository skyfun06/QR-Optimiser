import Link from "next/link";

export default function ConfidentialitePage() {
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
          <h1 className="text-3xl md:text-4xl font-bold text-white">Politique de confidentialité</h1>
          <p className="text-sm text-[#8c8c8c]">Dernière mise à jour : avril 2026 · Conforme au RGPD</p>
        </div>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">1. Responsable du traitement</h2>
          <div className="flex flex-col gap-2 text-[#8c8c8c] text-sm leading-relaxed">
            <p>Le responsable du traitement des données personnelles collectées via ScanAvis est :</p>
            <ul className="flex flex-col gap-1 mt-2 ml-4">
              <li><span className="text-white">Nom :</span> À COMPLÉTER (Prénom Nom)</li>
              <li><span className="text-white">Email :</span> <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] hover:underline">lborrelli248@gmail.com</a></li>
              <li><span className="text-white">DPO :</span> Non désigné (structure individuelle — non soumis à l&apos;obligation)</li>
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">2. Données collectées et finalités</h2>
          <div className="flex flex-col gap-4 text-[#8c8c8c] text-sm leading-relaxed">
            <div className="flex flex-col gap-2">
              <p className="text-white font-medium">2.1 Données de compte (Supabase Auth)</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc">
                <li><span className="text-white">Données :</span> adresse email, mot de passe (hashé avec bcrypt)</li>
                <li><span className="text-white">Finalité :</span> authentification et gestion du compte</li>
                <li><span className="text-white">Base légale :</span> exécution du contrat (Art. 6.1.b RGPD)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-medium">2.2 Informations commerce (table businesses)</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc">
                <li><span className="text-white">Données :</span> nom du commerce, URL Google My Business, logo</li>
                <li><span className="text-white">Finalité :</span> génération des QR codes personnalisés</li>
                <li><span className="text-white">Base légale :</span> exécution du contrat (Art. 6.1.b RGPD)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-medium">2.3 Avis clients (table reviews)</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc">
                <li><span className="text-white">Données :</span> note de 1 à 5, anonymes (aucune donnée personnelle du client)</li>
                <li><span className="text-white">Finalité :</span> statistiques de satisfaction pour le commerçant</li>
                <li><span className="text-white">Base légale :</span> intérêt légitime du commerçant (Art. 6.1.f RGPD)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-medium">2.4 Feedbacks privés (table feedback)</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc">
                <li><span className="text-white">Données :</span> note et message textuel, anonymes</li>
                <li><span className="text-white">Finalité :</span> amélioration de l&apos;expérience client pour le commerçant</li>
                <li><span className="text-white">Base légale :</span> intérêt légitime (Art. 6.1.f RGPD)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-medium">2.5 Données de paiement</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc">
                <li><span className="text-white">Données :</span> gérées exclusivement par Stripe — ScanAvis ne stocke aucune donnée bancaire</li>
                <li><span className="text-white">Finalité :</span> traitement des paiements d&apos;abonnement</li>
                <li><span className="text-white">Base légale :</span> exécution du contrat (Art. 6.1.b RGPD)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">3. Sous-traitants et transferts hors UE</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed mb-2">
            ScanAvis fait appel aux sous-traitants suivants. Ces transferts sont encadrés par des garanties 
            appropriées (clauses contractuelles types de la Commission européenne ou décision d&apos;adéquation) :
          </p>
          <div className="flex flex-col gap-3">
            {[
              {
                name: "Supabase",
                role: "Base de données et authentification",
                location: "États-Unis",
                note: "Hébergement des données utilisateurs et commerces",
                link: "https://supabase.com/privacy",
              },
              {
                name: "Stripe",
                role: "Traitement des paiements",
                location: "États-Unis",
                note: "Gestion des abonnements et facturation",
                link: "https://stripe.com/fr/privacy",
              },
              {
                name: "Resend",
                role: "Envoi d'emails transactionnels",
                location: "États-Unis",
                note: "Notifications par email (confirmations, alertes)",
                link: "https://resend.com/privacy",
              },
              {
                name: "Vercel",
                role: "Hébergement de l'application",
                location: "États-Unis",
                note: "Infrastructure et déploiement",
                link: "https://vercel.com/legal/privacy-policy",
              },
            ].map((provider) => (
              <div key={provider.name} className="flex flex-col gap-1 p-4 bg-[#1e1e1e] rounded-xl border border-[#333]">
                <div className="flex flex-row items-center justify-between">
                  <p className="text-white font-medium text-sm">{provider.name}</p>
                  <p className="text-xs text-[#8c8c8c]">{provider.location}</p>
                </div>
                <p className="text-[#8c8c8c] text-xs">{provider.role} — {provider.note}</p>
                <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-[#C9973A] text-xs hover:underline w-fit">
                  Politique de confidentialité →
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">4. Durée de conservation</h2>
          <ul className="text-[#8c8c8c] text-sm leading-relaxed flex flex-col gap-2 ml-4 list-disc">
            <li><span className="text-white">Données de compte :</span> jusqu&apos;à la suppression du compte + 30 jours de rétention</li>
            <li><span className="text-white">Données commerces et QR codes :</span> pendant toute la durée de l&apos;abonnement + 30 jours</li>
            <li><span className="text-white">Avis et feedbacks :</span> pendant toute la durée de l&apos;abonnement</li>
            <li><span className="text-white">Données de facturation :</span> 10 ans (obligation légale comptable)</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">5. Cookies</h2>
          <div className="flex flex-col gap-3 text-[#8c8c8c] text-sm leading-relaxed">
            <p>
              ScanAvis n&apos;utilise <strong className="text-white">aucun cookie de tracking ou publicitaire</strong>.
            </p>
            <p>
              Le seul cookie déposé est un cookie de session technique géré par Supabase Auth, nécessaire 
              au maintien de votre connexion. Ce cookie est strictement nécessaire au fonctionnement du service 
              et ne requiert pas de consentement (Art. 82 de la loi Informatique et Libertés).
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">6. Vos droits RGPD</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed mb-2">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { right: "Droit d'accès", desc: "Obtenir une copie de vos données personnelles" },
              { right: "Droit de rectification", desc: "Corriger des données inexactes ou incomplètes" },
              { right: "Droit à l'effacement", desc: "Demander la suppression de vos données" },
              { right: "Droit à la portabilité", desc: "Recevoir vos données dans un format lisible" },
              { right: "Droit d'opposition", desc: "S'opposer à un traitement basé sur l'intérêt légitime" },
              { right: "Droit de limitation", desc: "Restreindre temporairement un traitement" },
            ].map((item) => (
              <div key={item.right} className="flex flex-col gap-1 p-3 bg-[#1e1e1e] rounded-xl border border-[#333]">
                <p className="text-white font-medium text-xs">{item.right}</p>
                <p className="text-[#8c8c8c] text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[#8c8c8c] text-sm leading-relaxed mt-2">
            Pour exercer ces droits, contactez-nous à{" "}
            <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] hover:underline">lborrelli248@gmail.com</a>.
            Nous répondons sous 30 jours.
          </p>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#C9973A] hover:underline">CNIL</a>.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">7. Sécurité</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            ScanAvis met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : 
            chiffrement en transit (HTTPS/TLS), mots de passe hashés, accès aux données restreint, 
            hébergement chez des prestataires certifiés SOC 2.
          </p>
        </section>

        <section className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
          <h2 className="text-[#C9973A] font-semibold text-lg">8. Modifications</h2>
          <p className="text-[#8c8c8c] text-sm leading-relaxed">
            Cette politique de confidentialité peut être mise à jour. En cas de modification substantielle, 
            nous vous en informerons par email. La date de dernière mise à jour est indiquée en haut de cette page.
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
