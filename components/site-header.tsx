"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

// Header du site public, partagé (landing, à propos, contact, pages légales).
// Sur la landing, les liens sont des ancres locales et la section affichée est
// soulignée ; ailleurs, ils renvoient vers /#… . Styles : globals.css (.nav-*).
const NAV_LINKS = [
  { hash: "#resolutions", label: "Avis" },
  { hash: "#fidelite", label: "Fidélité" },
  { hash: "#tarifs", label: "Tarifs" },
  { hash: "#parrainage", label: "Parrainage" },
];

export function SiteHeader() {
  const isHome = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Section active (landing uniquement) ── */
  useEffect(() => {
    if (!isHome) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (isIntersecting) setActiveSection(target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("section[id]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isHome]);

  /* ── Menu mobile : fermeture via Échap ou passage en desktop ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  const hrefOf = (hash: string) => (isHome ? hash : `/${hash}`);

  return (
    <header id="main-header" className={`nav-enter fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4${scrolled ? " nav-scrolled" : ""}`}>
      <div className={`nav-shell mx-auto w-full max-w-6xl rounded-2xl${menuOpen ? " is-open" : ""}`}>
        <div className="flex items-center justify-between gap-3 py-2 pl-4 pr-2 md:pl-5">
          <BrandLogo href="/" iconSize={28} textClassName="text-base" />

          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ hash, label }) => (
              <Link key={hash} href={hrefOf(hash)} className="nav-link" aria-current={isHome && activeSection === hash.slice(1) ? "true" : undefined}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link href="/login" className="hidden lg:inline-flex text-sm text-[#a3a3a3] px-3 py-2 rounded-xl transition-colors duration-200 hover:text-white">
              Connexion
            </Link>
            <Link href="/demo" className="hidden sm:inline-flex items-center gap-2 text-sm text-[#e5e5e5] rounded-xl px-3.5 py-2 border border-white/10 transition-colors duration-200 hover:border-[#C9973A99] hover:text-white">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#C9973A] opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#C9973A]" />
              </span>
              Démo live
            </Link>
            <Link href="/signup" className="bg-gold inline-flex items-center gap-1.5 text-black text-sm font-semibold rounded-xl px-4 py-2">
              Essayer<span className="hidden sm:inline"> gratuitement</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              className="md:hidden ml-0.5 w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#d4d4d4] border border-white/10 transition-colors duration-200 hover:text-white hover:border-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {menuOpen ? (
                  <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>
                ) : (
                  <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="md:hidden animate-fade-in border-t border-white/[0.06] px-2 pt-2 pb-2">
            <nav aria-label="Navigation mobile" className="flex flex-col">
              {NAV_LINKS.map(({ hash, label }) => (
                <Link
                  key={hash}
                  href={hrefOf(hash)}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] text-[#d4d4d4] transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
                >
                  {label}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a5a5a]"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              ))}
            </nav>
            <div className="mt-2 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
              <Link href="/login" className="inline-flex justify-center rounded-xl px-3 py-2.5 text-sm text-[#d4d4d4] border border-white/10">Connexion</Link>
              <Link href="/demo" className="inline-flex justify-center rounded-xl px-3 py-2.5 text-sm text-gold border border-[#C9973A66]">Voir la démo</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
