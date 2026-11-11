import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "À propos" };

export default function AProposPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
      <SiteHeader />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-32 pb-20 flex flex-col gap-20">

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[#C9973A] font-bold">Notre mission</p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Les bons commerçants méritent d&apos;être{" "}
            <span className="text-[#C9973A]">reconnus.</span>
          </h1>
          <p className="text-[#8c8c8c] text-base sm:text-lg leading-relaxed max-w-2xl">
            Des milliers de commerçants offrent une expérience client exceptionnelle chaque jour. 
            Pourtant, leurs clients satisfaits ne pensent jamais à laisser un avis. ScanAvis change ça.
          </p>
          <p className="text-[#8c8c8c] text-base sm:text-lg leading-relaxed max-w-2xl">
            Un simple QR code posé sur le comptoir, et vos meilleurs clients deviennent vos meilleurs ambassadeurs. À chaque passage, leur carte de fidélité se remplit : ils reviennent.
          </p>
        </section>

        {/* Comment ça marche */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-[#C9973A] font-bold">Le processus</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Comment ça marche</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/20 flex items-center justify-center">
                <span className="text-[#C9973A] font-bold text-sm">01</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-semibold">Le client scanne</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Votre client scanne le QR code avec son téléphone, sans application à télécharger. 
                  Une page s&apos;ouvre instantanément.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/20 flex items-center justify-center">
                <span className="text-[#C9973A] font-bold text-sm">02</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-semibold">Il note son expérience</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Il choisit une note de 1 à 5 étoiles. Simple, rapide, en 10 secondes.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/20 flex items-center justify-center">
                <span className="text-[#C9973A] font-bold text-sm">03</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-semibold">Avis ou feedback</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Les clients satisfaits (4-5 ★) sont redirigés vers Google. Les autres laissent un message 
                  privé que seul vous voyez.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pourquoi ScanAvis */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-[#C9973A] font-bold">Nos avantages</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Pourquoi ScanAvis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-row gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[#C9973A]/10 flex items-center justify-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-semibold text-sm">Mise en place en 2 minutes</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Créez votre compte, entrez l&apos;URL de votre fiche Google, téléchargez votre QR code. 
                  Posez-le sur votre comptoir. C&apos;est tout.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[#C9973A]/10 flex items-center justify-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-semibold text-sm">Protégez votre réputation</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Les clients mécontents vous parlent d&apos;abord en privé. Vous pouvez corriger le problème
                  rapidement, le client restant libre de publier son avis publiquement.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[#C9973A]/10 flex items-center justify-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-semibold text-sm">Résultats mesurables</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Suivez l&apos;évolution de vos avis Google et de votre satisfaction client en temps réel 
                  depuis votre tableau de bord.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[#C9973A]/10 flex items-center justify-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-semibold text-sm">Abordable pour tous</h3>
                <p className="text-[#8c8c8c] text-sm leading-relaxed">
                  Avis Google dès 35 €/mois, carte de fidélité avec le Premium à 40 €/mois. 30 jours d&apos;essai, tout inclus, sans engagement
                  ni frais cachés. Résiliable à tout moment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-2xl border border-[#292929] bg-[#171717]">
            <div
                className="relative w-full overflow-hidden rounded-2xl border border-[#292929]"
                style={{
                    background:
                        "radial-gradient(ellipse at center, #2a1f00 0%, #1a1200 40%, #0d0d0d 100%)",
                }}
            >
                <svg
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <defs>
                        <pattern
                            id="cta-diamond-grid"
                            width="60"
                            height="60"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 20 0 L 40 20 L 20 40 L 0 20 Z"
                                fill="none"
                                stroke="rgba(201, 151, 58, 0.15)"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cta-diamond-grid)" />
                </svg>
                <div className="relative z-10 flex w-full flex-col items-center justify-center py-16 px-8 text-center">
                    <p className="text-xs uppercase tracking-widest text-gold">COMMENCER</p>
                    <h2 className="mt-4 text-2xl md:text-4xl lg:text-5xl font-bold text-white">Prêt à obtenir plus d&apos;avis ?</h2>
                    <p className="mt-4 text-sm md:text-base lg:text-lg font-light text-[#8c8c8c]">Installez votre QR code en 2 minutes. 30 jours offerts.</p>
                    <Link href="/signup" className="mt-8 min-h-[44px] rounded-xl border border-gold px-6 md:px-8 py-3 md:py-4 font-semibold text-gold transition-colors duration-200 hover:bg-gold hover:text-black hover:border-gold">Démarrer l&apos;essai de 30 jours</Link>
                    <p className="mt-4 text-xs text-[#555]">Aucun prélèvement pendant l&apos;essai · Sans engagement</p>
                </div>
            </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
