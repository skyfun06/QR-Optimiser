"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import heroBackground from "@/public/images/background.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const heroWords = ["Plus ", "d'avis ", "Google. ", "Des ", "clients ", "qui "];

/* Fil d'activité du hero : ce que déclenche chaque scan (illustratif, pas de faux clients). */
const FEED = [
  { icon: "scan", title: "QR code scanné", sub: "Table 4 · carte de fidélité ouverte", tag: "+1 tampon" },
  { icon: "star", title: "Avis 5★ publié sur Google", sub: "« Service au top, on reviendra ! »", tag: "Google" },
  { icon: "lock", title: "Retour 2★ reçu en privé", sub: "Vous pouvez répondre avant qu'il publie", tag: "Privé" },
  { icon: "gift", title: "Récompense débloquée", sub: "5e passage · café offert", tag: "Fidélité" },
] as const;

/* Particules de poussière dorée (positions fixes → rendu serveur/client identique). */
const DUST = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 2 + ((i * 7) % 4),
  d: `${10 + ((i * 5) % 9)}s`,
  delay: `${-((i * 1.7) % 14)}s`,
  dx: `${((i * 13) % 50) - 25}px`,
  o: 0.25 + ((i * 3) % 5) / 10,
}));

function FeedIcon({ name }: { name: (typeof FEED)[number]["icon"] }) {
  const paths = {
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></>,
    star: <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></>,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">{paths[name]}</svg>
  );
}

const STYLES = `
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 80px;
  }
  @keyframes wordReveal {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .word-reveal {
    display: inline-block;
    white-space: pre;
    opacity: 0;
    animation: wordReveal 0.55s ease forwards;
  }
  [data-animate] {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.5s ease, border-color 0.3s ease;
  }
  [data-animate].visible {
    opacity: 1;
    transform: translateY(0);
  }
  .card-hover {
    transition: border-color 0.3s ease, transform 0.3s ease;
  }
  .card-hover:hover {
    border-color: #C9973A !important;
    transform: translateY(-2px);
  }
  [data-animate].card-hover:hover {
    transform: translateY(-2px);
  }
  @keyframes bounceY {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(9px); }
  }
  .bounce-arrow {
    animation: bounceY 1.6s ease-in-out infinite;
  }
  .btn-cta {
    transition: box-shadow 0.3s ease, opacity 0.2s ease;
  }
  .btn-cta:hover {
    box-shadow: 0 0 30px rgba(201,151,58,0.55);
    opacity: 0.95;
  }
  .pro-card {
    border-color: #C9973A !important;
    box-shadow: 0 0 30px rgba(201,151,58,0.15);
    transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
  }
  .pro-card:hover {
    box-shadow: 0 0 42px rgba(201,151,58,0.32);
    transform: translateY(-2px);
  }
  .anim-bar {
    width: 0%;
    transition: width 1.3s ease;
  }
  /* ── Carte de fidélité : tampons qui « tombent » à l'apparition ── */
  @keyframes stampIn {
    0%   { opacity: 0; transform: scale(0.4) rotate(-14deg); }
    70%  { opacity: 1; transform: scale(1.12) rotate(3deg); }
    100% { opacity: 1; transform: scale(1) rotate(0); }
  }
  .stamp { opacity: 0; }
  [data-animate].visible .stamp { animation: stampIn 0.45s ease forwards; }
  /* ── FAQ ── */
  .faq-item summary { list-style: none; }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-chevron { transition: transform 0.25s ease; }
  .faq-item[open] .faq-chevron { transform: rotate(45deg); }
  .faq-item[open] { border-color: rgba(201,151,58,0.45) !important; }
  /* ──────────────────────────────────────────────────────────────
     HERO PLEIN ÉCRAN — /public/images/background.jpg
     Scène de bar sombre (~2.4:1) : espace négatif à gauche (texte),
     plaque QR or à droite. L'image couvre TOUT le premier écran
     (cover), ancrée à droite pour garder la plaque visible ; le voile
     assombrit la gauche pour la lisibilité.
     ────────────────────────────────────────────────────────────── */
  .hero {
    min-height: 100vh;
    min-height: 100svh;
  }
  @keyframes heroZoom {
    from { transform: scale(1.06); }
    to   { transform: scale(1); }
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: #08080a;
    animation: heroZoom 2.4s cubic-bezier(.22,1,.36,1) both;
  }
  .hero-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to right, rgba(8,8,9,0.86) 0%, rgba(8,8,9,0.55) 32%, rgba(8,8,9,0) 62%),
      linear-gradient(to bottom, rgba(8,8,9,0.55) 0%, transparent 18%, transparent 80%, rgba(10,10,11,0.92) 100%);
  }
  @media (max-width: 767px) {
    /* Mobile portrait : on recadre sur la plaque, voile global pour le contraste. */
    .hero-bg::after {
      background: linear-gradient(to bottom, rgba(8,8,9,0.78) 0%, rgba(8,8,9,0.55) 45%, rgba(8,8,9,0.80) 88%, rgba(10,10,11,0.95) 100%);
    }
  }
  /* ──────────────────────────────────────────────────────────────
     VIE & MOUVEMENT
     ────────────────────────────────────────────────────────────── */
  /* Barre de progression de lecture */
  .scroll-progress {
    position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 60;
    transform-origin: left; transform: scaleX(var(--progress, 0));
    background: linear-gradient(90deg, #8a6420, #C9973A, #f2d79a);
    box-shadow: 0 0 12px rgba(201,151,58,0.6);
    pointer-events: none;
  }
  /* Parallaxe du hero (souris + défilement) */
  .hero-parallax {
    position: absolute; inset: -4%;
    transform: translate3d(calc(var(--px, 0) * -14px), calc(var(--py, 0) * -10px + var(--sy, 0) * 1px), 0);
    transition: transform 0.25s ease-out;
    will-change: transform;
  }
  /* Poussière dorée dans la lumière du bar */
  @keyframes dustRise {
    0%   { transform: translate3d(0, 0, 0); opacity: 0; }
    15%  { opacity: var(--o, 0.6); }
    85%  { opacity: var(--o, 0.6); }
    100% { transform: translate3d(var(--dx, 20px), -46vh, 0); opacity: 0; }
  }
  .dust {
    position: absolute; bottom: -10px; border-radius: 9999px;
    background: radial-gradient(circle, #f2d79a, rgba(201,151,58,0.2) 60%, transparent 70%);
    animation: dustRise var(--d, 12s) linear infinite;
    pointer-events: none;
  }
  /* Fil d'activité : ce qui se passe à chaque scan */
  @keyframes feedIn {
    0%   { opacity: 0; transform: translateY(10px) scale(0.98); }
    12%  { opacity: 1; transform: translateY(0) scale(1); }
    88%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
  }
  .feed-item { animation: feedIn 3.2s cubic-bezier(.22,1,.36,1) both; }
  .glass {
    background: rgba(18,18,20,0.55);
    border: 1px solid rgba(255,255,255,0.09);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    backdrop-filter: blur(14px) saturate(140%);
    box-shadow: 0 18px 40px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  /* Cartes translucides : le fond du site transparaît, projecteur qui suit la souris */
  .landing [class*="bg-[#171717]"] {
    background-color: rgba(20,20,22,0.72);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
  }
  .landing .card-hover[class*="bg-[#171717]"] {
    background-image:
      radial-gradient(520px circle at var(--mx, 50%) var(--my, -30%), rgba(201,151,58,0.11), transparent 42%),
      linear-gradient(160deg, rgba(255,255,255,0.030), rgba(255,255,255,0) 46%);
  }
  .card-hover:hover { box-shadow: 0 30px 60px -30px rgba(0,0,0,0.95), 0 0 0 1px rgba(201,151,58,0.18); }
  /* Histogramme : barres qui poussent */
  .bar-grow { transform: scaleY(0); transform-origin: bottom; }
  [data-animate].visible .bar-grow { animation: barGrow 0.7s cubic-bezier(.22,1,.36,1) forwards; }
  @keyframes barGrow { to { transform: scaleY(1); } }
  @keyframes barPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,151,58,0); }
    50%      { box-shadow: 0 0 18px 0 rgba(201,151,58,0.55); }
  }
  [data-animate].visible .bar-grow.bar-live {
    animation: barGrow 0.7s cubic-bezier(.22,1,.36,1) forwards, barPulse 2.2s ease-in-out infinite;
  }
  /* Point « en ligne » */
  @keyframes livePing { 75%, 100% { transform: scale(2.4); opacity: 0; } }
  .live-dot { position: relative; display: inline-flex; width: 7px; height: 7px; border-radius: 9999px; background: #22c55e; }
  .live-dot::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: #22c55e; animation: livePing 1.6s cubic-bezier(0,0,.2,1) infinite; }
  /* Étape 01 : faisceau de scan sur le QR */
  @keyframes scanBeam {
    0%, 100% { top: 6%; opacity: 0; }
    10%      { opacity: 1; }
    50%      { top: 88%; opacity: 1; }
    60%      { opacity: 0; }
  }
  .scan-beam {
    position: absolute; left: 8%; right: 8%; height: 2px; border-radius: 2px;
    background: linear-gradient(90deg, transparent, #f2d79a, transparent);
    box-shadow: 0 0 10px #C9973A;
    animation: scanBeam 2.4s ease-in-out infinite;
  }
  /* Étape 02 : un nouveau tampon qui arrive en boucle */
  @keyframes stampLoop {
    0%, 18%   { opacity: 0; transform: scale(0.3) rotate(-18deg); }
    28%       { opacity: 1; transform: scale(1.25) rotate(4deg); }
    36%, 82%  { opacity: 1; transform: scale(1) rotate(0); }
    92%, 100% { opacity: 0; transform: scale(0.8); }
  }
  .stamp-loop { animation: stampLoop 3.6s ease-in-out infinite; }
  @keyframes slotGlow {
    0%, 20%, 90%, 100% { border-color: #333; background: transparent; }
    30%, 80%           { border-color: rgba(201,151,58,0.7); background: rgba(201,151,58,0.14); }
  }
  .slot-loop { animation: slotGlow 3.6s ease-in-out infinite; }
  /* Étape 03 : étoiles qui se remplissent l'une après l'autre */
  @keyframes starFill {
    0%, 8%    { color: #292929; transform: scale(1); }
    14%       { color: #C9973A; transform: scale(1.35); }
    20%, 80%  { color: #C9973A; transform: scale(1); }
    90%, 100% { color: #292929; }
  }
  .star-fill { display: inline-block; color: #292929; animation: starFill 4s ease-in-out infinite; }
  /* Étape 04 : flèches qui avancent */
  @keyframes nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
  .nudge { animation: nudge 1.4s ease-in-out infinite; }
  /* Curseur clignotant de la barre de recherche */
  @keyframes caretBlink { 50% { opacity: 0; } }
  .typing-caret { display: inline-block; width: 1px; height: 11px; margin-left: 2px; vertical-align: -1px; background: #C9973A; animation: caretBlink 1s steps(1) infinite; }
  /* Carte fidélité : inclinaison 3D au survol */
  .tilt { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform 0.2s ease-out; will-change: transform; }
  /* Formule recommandée : reflet qui balaie */
  .pro-card { position: relative; overflow: hidden; }
  /* CTA : étoiles flottantes */
  @keyframes ctaFloat { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-12px) rotate(12deg); } }
  .cta-star { position: absolute; color: #C9973A; animation: ctaFloat 5s ease-in-out infinite; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) {
    .hero-parallax, .tilt { transform: none !important; transition: none !important; }
    .dust, .cta-star { display: none !important; }
    .feed-item, .typing-caret, .live-dot::before, .scan-beam, .stamp-loop, .slot-loop, .star-fill, .nudge { animation: none !important; }
    .bar-grow { transform: none !important; animation: none !important; }
    .stamp-loop { display: none !important; }
    .star-fill { color: #C9973A !important; }
    .scan-beam { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .word-reveal {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    [data-animate] {
      opacity: 1 !important;
      transform: none !important;
      transition: border-color 0.3s ease !important;
    }
    .bounce-arrow { animation: none !important; }
    .hero-bg      { animation: none !important; }
    .anim-bar     { transition: none !important; }
    .btn-cta      { transition: opacity 0.2s ease !important; }
    .stamp        { opacity: 1 !important; animation: none !important; }
  }
`;

export default function Home() {
  const [feedIndex, setFeedIndex] = useState(0);

  /* ── Fil d'activité : un événement toutes les 3,2 s ── */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFeedIndex((i) => (i + 1) % FEED.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  /* ── Progression de lecture, parallaxe du hero, projecteur des cartes, inclinaison ── */
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const hero = document.querySelector<HTMLElement>(".hero");
    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = root.scrollHeight - window.innerHeight;
        root.style.setProperty("--progress", String(max > 0 ? window.scrollY / max : 0));
        if (hero && !prefersReduced && window.scrollY < window.innerHeight * 1.2) {
          hero.style.setProperty("--sy", String(window.scrollY * 0.18));
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (prefersReduced) {
      return () => {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(raf);
      };
    }

    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const onHeroMove = (e: PointerEvent) => {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(".card-hover");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]");
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        if (el !== tilt) {
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        }
      });
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
      }
    };

    if (finePointer) {
      hero?.addEventListener("pointermove", onHeroMove);
      document.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      hero?.removeEventListener("pointermove", onHeroMove);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── Scroll reveal ── */
    const animEls = document.querySelectorAll("[data-animate]");
    const animObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          const el = target as HTMLElement;
          if (!prefersReduced) {
            const delay = el.dataset.delay || "0";
            el.style.transitionDelay = `${delay}ms`;
          }
          el.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    animEls.forEach((el) => animObs.observe(el));

    /* ── Animated counters ── */
    if (!prefersReduced) {
      const counterEls = document.querySelectorAll("[data-counter]");
      const counterObs = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            const el = target as HTMLElement;
            const targetVal = parseFloat(el.dataset.counter || "0");
            const decimals = parseInt(el.dataset.decimals || "0");
            const duration = 1500;
            const startTime = performance.now();
            const tick = (now: number) => {
              const t = Math.min((now - startTime) / duration, 1);
              const eased = 1 - Math.pow(1 - t, 3);
              const val = eased * targetVal;
              el.textContent =
                decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
              if (t < 1) requestAnimationFrame(tick);
              else
                el.textContent =
                  decimals > 0 ? targetVal.toFixed(decimals) : String(Math.round(targetVal));
            };
            requestAnimationFrame(tick);
            counterObs.unobserve(el);
          });
        },
        { threshold: 0.5 }
      );
      counterEls.forEach((el) => counterObs.observe(el));
    }

    /* ── Progress bars ── */
    const barEls = document.querySelectorAll("[data-bar]");
    const barObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          const el = target as HTMLElement;
          const targetW = el.dataset.bar || "0%";
          if (prefersReduced) {
            el.style.width = targetW;
          } else {
            requestAnimationFrame(() => {
              el.style.width = targetW;
            });
          }
          barObs.unobserve(el);
        });
      },
      { threshold: 0.2 }
    );
    barEls.forEach((el) => barObs.observe(el));

    return () => {
      animObs.disconnect();
      barObs.disconnect();
    };
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div aria-hidden className="scroll-progress" />
      <div className="landing relative min-h-screen flex flex-col">

        <SiteHeader />

        {/* ══════════════ HERO — plein écran ══════════════ */}
        <section className="hero relative isolate w-full flex flex-col overflow-hidden">
          {/* Image : /public/images/background.jpg (cf. .hero-bg), servie en AVIF/WebP. */}
          <div aria-hidden className="hero-bg">
            <div className="hero-parallax">
              <Image
                src={heroBackground}
                alt=""
                fill
                preload
                quality={90}
                sizes="100vw"
                placeholder="blur"
                className="object-cover object-[85%_center] max-md:object-[90%_center]"
              />
            </div>
          </div>
          {/* Poussière dorée qui flotte dans la lumière */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {DUST.map((p, i) => (
              <span
                key={i}
                className="dust"
                style={{
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  ["--d" as string]: p.d,
                  ["--dx" as string]: p.dx,
                  ["--o" as string]: p.o,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>

          <div className="relative flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-start justify-center pt-28 md:pt-32 pb-10 gap-8 md:gap-10">
            <h1 className="max-w-[1000px] text-white text-2xl sm:text-4xl lg:text-7xl font-bold tracking-[0.1px]">
              {heroWords.map((word, i) => (
                <span key={i} className="word-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                  {word}{""}
                </span>
              ))}
              <span className="word-reveal text-gold" style={{ animationDelay: `${heroWords.length * 0.1}s` }}>
                <span className="animate-gradient-text">reviennent.</span>
              </span>
            </h1>

            <p className="max-w-[640px] text-[#8c8c8c] text-sm sm:text-base lg:text-xl font-sm tracking-[0.1px]">
              Un seul QR code sur votre comptoir. Vos clients satisfaits publient sur <span className="text-white">Google</span>, les déçus vous parlent <span className="text-white">en privé</span>, et chaque passage remplit leur <span className="text-gold">carte de fidélité</span>. Sans appli, sans carte papier.
            </p>

            <div className="flex flex-col items-start gap-3">
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <a
                  href="/signup"
                  className="btn-cta w-full sm:w-auto min-h-[52px] flex flex-row items-center justify-center gap-2 text-black bg-gold font-semibold rounded-xl cursor-pointer px-7 py-3 text-sm"
                >
                  <span>Essayer gratuitement</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </a>
                <a href="/demo" className="w-full sm:w-auto min-h-[44px] flex flex-row items-center justify-center gap-1 text-gold text-xs font-medium rounded-xl cursor-pointer px-4 py-2 border border-gold transition-colors duration-200 hover:bg-gold hover:text-[#12100e]">
                  <p className="px-2 py-1">Voir la démo en direct →</p>
                </a>
              </div>
              <p className="text-sm text-[#a3a3a3]">30 jours offerts · Sans engagement · Prêt en 2 min</p>
            </div>

            {/* Fil d'activité : ce que déclenche chaque scan */}
            <div className="w-full max-w-[400px] flex flex-col gap-2" aria-live="off">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[1.5px] text-[#a3a3a3]">
                <span className="live-dot" aria-hidden />
                Ce qui se passe à chaque scan
              </p>
              <div className="relative h-[68px]">
                <div key={feedIndex} className="feed-item glass absolute inset-0 flex items-center gap-3 rounded-2xl px-4">
                  <div className="w-[38px] h-[38px] shrink-0 flex items-center justify-center rounded-xl bg-[#C9973A1f] border border-[#C9973A55]">
                    <FeedIcon name={FEED[feedIndex].icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{FEED[feedIndex].title}</p>
                    <p className="text-xs text-[#a3a3a3] truncate">{FEED[feedIndex].sub}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-gold bg-[#C9973A1a] border border-[#C9973A40] rounded-full px-2 py-0.5">{FEED[feedIndex].tag}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pb-6 md:pb-8 flex flex-col gap-6">
            {/* Bandeau de réassurance */}
            <div className="w-full flex flex-wrap items-center justify-start gap-x-6 gap-y-2 text-sm text-[#bdbdbd]">
              {[
                "Aucune appli à télécharger",
                "QR code + plaque NFC",
                "Conforme aux règles Google",
                "Sans engagement",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M20 6 9 17l-5-5"/></svg>
                  {t}
                </span>
              ))}
            </div>

            {/* Bounce scroll arrow */}
            <a href="#apercu" aria-label="Défiler vers la suite" className="self-center bounce-arrow text-[#8c8c8c] transition-colors duration-200 hover:text-gold">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14"/>
                <path d="M5 12l7 7 7-7"/>
              </svg>
            </a>
          </div>
        </section>

        {/* ══════════════ APERÇU (stats) ══════════════ */}
        <section id="apercu" className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-4">
          {/* Stats cards — structure commune : en-tête, chiffre, phrase lisible, visuel en pied */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-4 md:gap-5">
            {/* Card 1: Avis collectés */}
            <div data-animate data-delay="0" className="card-hover w-full flex flex-col bg-[#171717] p-6 md:p-7 rounded-2xl border border-[#292929]">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] flex justify-center items-center bg-[#292929] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                  </div>
                  <p className="text-[#bdbdbd] text-sm font-semibold">Avis Google</p>
                </div>
                <p className="text-gold text-xs bg-[#C9973A1a] border border-[#C9973A33] rounded-full px-2.5 py-1 font-bold">+47 % ce mois</p>
              </div>
              <p className="mt-6 text-5xl md:text-6xl font-bold leading-none" data-counter="87">87</p>
              <p className="mt-3 text-sm md:text-[15px] text-[#c7c7c7] leading-snug">nouveaux avis <span className="text-gold font-medium">publiés sur Google</span> ce mois-ci</p>
              <div className="mt-auto pt-7 w-full flex items-end gap-1.5 h-[148px]">
                {[22, 26, 22, 32, 26, 38, 32, 30, 42, 74, 92, 112].map((h, i, arr) => (
                  <div
                    key={i}
                    style={{ height: `${h}px`, backgroundColor: i >= arr.length - 3 ? "#C9973A" : "#3a3020", animationDelay: `${200 + i * 60}ms` }}
                    className={`bar-grow rounded-md flex-1${i === arr.length - 1 ? " bar-live" : ""}`}
                  />
                ))}
              </div>
            </div>

            {/* Card 2: Note */}
            <div data-animate data-delay="100" className="card-hover w-full flex flex-col bg-[#171717] p-6 md:p-7 rounded-2xl border border-[#292929]">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] flex justify-center items-center bg-[#292929] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
                  </div>
                  <p className="text-[#bdbdbd] text-sm font-semibold">Note moyenne</p>
                </div>
                <p className="text-gold text-xs bg-[#C9973A1a] border border-[#C9973A33] rounded-full px-2.5 py-1 font-bold">+0,8 en 3 mois</p>
              </div>
              <p className="mt-6 text-5xl md:text-6xl font-bold leading-none">
                <span data-counter="4.6" data-decimals="1">4.6</span>
                <span className="text-gold text-3xl md:text-4xl ml-1">★</span>
              </p>
              <p className="mt-3 text-sm md:text-[15px] text-[#c7c7c7] leading-snug">sur Google, contre <span className="text-gold font-medium">3.8 il y a 3 mois</span></p>
              <div className="mt-auto pt-7 w-full flex flex-col gap-2">
                {[
                  { star: 5, w: 80 },
                  { star: 4, w: 45 },
                  { star: 3, w: 7 },
                  { star: 2, w: 5 },
                  { star: 1, w: 3 },
                ].map(({ star, w }) => (
                  <div key={star} className="w-full flex items-center gap-2.5">
                    <p className="text-[#a3a3a3] text-xs w-5 shrink-0">{star}★</p>
                    <div className="flex-1 h-[7px] bg-[#262626] rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full anim-bar" data-bar={`${w}%`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Fidélité */}
            <div data-animate data-delay="200" className="card-hover w-full flex flex-col bg-[#171717] p-6 md:p-7 rounded-2xl border border-[#292929]">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] flex justify-center items-center bg-[#292929] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                  </div>
                  <p className="text-[#bdbdbd] text-sm font-semibold">Fidélité</p>
                </div>
                <p className="text-gold text-xs bg-[#C9973A1a] border border-[#C9973A33] rounded-full px-2.5 py-1 font-bold">Nouveau</p>
              </div>
              <p className="mt-6 text-5xl md:text-6xl font-bold leading-none" data-counter="132">132</p>
              <p className="mt-3 text-sm md:text-[15px] text-[#c7c7c7] leading-snug">clients <span className="text-gold font-medium">reviennent</span> pour remplir leur carte</p>
              <div className="mt-auto pt-7 w-full grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center ${i < 7 ? "bg-[#C9973A1f] border border-[#C9973A66]" : "border border-dashed border-[#3a3a3a]"}`}
                  >
                    {i < 7 && (
                      <span className="stamp text-gold text-sm" style={{ animationDelay: `${300 + i * 90}ms` }}>★</span>
                    )}
                    {i === 9 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8c8c8c]"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ PROBLÈMES ══════════════ */}
        <section id="problemes" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Les problèmes</p>
          <div className="w-full flex flex-col justify-start items-start gap-2">
            <div className="w-full flex flex-col lg:flex-row justify-center items-stretch gap-2">
              <div data-animate data-delay="0" className="card-hover w-full lg:max-w-[780px] min-h-[332px] flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="flex flex-row justify-center items-center gap-2">
                  <div className="w-[32px] h-[32px] flex justify-center items-center bg-[#2c1b1a] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#eb4141]"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  </div>
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Constat</p>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold">Vos meilleurs clients sont <span className="text-gold">silencieux.</span></h2>
                <p className="text-[#8c8c8c] text-sm font-light max-w-md">Votre fiche Google ne reflète pas la qualité de votre service. Vous perdez des clients au profit de concurrents <span className="text-[#eb4141]">avec plus d&apos;avis.</span></p>

                {/* Mini résultat de recherche Google : ce que voit un client qui hésite */}
                <div className="mt-auto w-full max-w-[560px] flex flex-col gap-2 rounded-2xl bg-[#0f0f10cc] border border-[#262626] p-3">
                  <div className="flex items-center gap-2 rounded-full bg-[#1c1c1e] border border-[#2c2c2c] px-3 py-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#8c8c8c]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <p className="text-xs text-[#c7c7c7]">restaurant près de moi<span className="typing-caret" aria-hidden /></p>
                  </div>
                  {[
                    { name: "Le concurrent d'en face", note: "4.7", avis: 214, w: "94%", win: true },
                    { name: "Votre commerce", note: "3.8", avis: 12, w: "76%", win: false },
                  ].map((r, i) => (
                    <div key={r.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.win ? "bg-[#C9973A12] border border-[#C9973A40]" : "border border-transparent"}`}>
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${r.win ? "bg-[#C9973A26] text-gold" : "bg-[#262626] text-[#8c8c8c]"}`}>{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${r.win ? "text-white font-semibold" : "text-[#a3a3a3]"}`}>{r.name}</p>
                          {r.win && <span className="shrink-0 text-[10px] font-bold text-[#0d0d0d] bg-gold rounded-full px-2 py-0.5">Choisi</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className={`text-xs font-semibold ${r.win ? "text-gold" : "text-[#8c8c8c]"}`}>{r.note} ★</p>
                          <div className="flex-1 h-[5px] rounded-full bg-[#262626] overflow-hidden">
                            <div className={`h-full rounded-full anim-bar ${r.win ? "bg-gold" : "bg-[#5a5a5a]"}`} data-bar={r.w} />
                          </div>
                          <p className="text-[11px] text-[#8c8c8c] w-[60px] text-right"><span data-counter={r.avis}>{r.avis}</span> avis</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div data-animate data-delay="100" className="card-hover w-full lg:max-w-[412px] min-h-[320px] flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Clients Silencieux</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="m2 2 20 20"/><path d="M4.93 4.929a10 10 0 0 0-1.938 11.412 2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 0 0 11.302-1.989"/><path d="M8.35 2.69A10 10 0 0 1 21.3 15.65"/></svg>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-3">
                  <p className="text-gold text-6xl font-bold">
                    <span data-counter="93">93</span>%
                  </p>
                  <p className="text-xs text-[#8c8c8c]">de vos clients satisfaits <span className="text-gold">ne laisseront jamais d&apos;avis</span> sans être sollicités.</p>
                  <div className="w-full flex flex-col justify-start items-center gap-1">
                    <div className="w-full h-[10px] rounded-full bg-[#8c8c8c] overflow-hidden">
                      <div className="h-[10px] rounded-full bg-gold anim-bar" data-bar="93%" />
                    </div>
                    <div className="w-full flex flex-row justify-between items-center">
                      <p className="text-gold text-xs">93% silencieux</p>
                      <p className="text-[#8c8c8c] text-xs">7% s&apos;expriment</p>
                    </div>
                  </div>
                </div>
                <hr className="h-[1px] w-full text-[#262626]" />
                <p className="text-[#8c8c8c] text-xs">Résultat : votre note stagne et ne reflète pas votre <span className="text-white">vraie qualité de service.</span></p>
              </div>
            </div>
            <div className="w-full flex flex-col lg:flex-row justify-center items-stretch gap-2">
              <div data-animate data-delay="0" className="card-hover w-full lg:max-w-[412px] min-h-[330px] flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Influence</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-4">
                  <p className="text-sm text-[#8c8c8c]"><span className="text-white font-bold">93&nbsp;%</span> des consommateurs lisent les avis avant de choisir un commerce local.</p>
                  <div className="w-full flex flex-col justify-start items-start gap-1">
                    <div className="w-full h-[10px] rounded-full bg-[#262626] overflow-hidden">
                      <div className="h-[10px] rounded-full bg-gold anim-bar" data-bar="93%" />
                    </div>
                    <p className="text-xs text-[#8c8c8c]"><span className="text-gold">93</span> sur 100 personnes</p>
                  </div>
                  <hr className="h-[1px] w-full text-[#262626]" />
                  <p className="max-w-[80%] text-[#8c8c8c] text-xs">Sans avis récents, vous êtes <span className="text-white">invisible</span> face à la concurrence.</p>
                </div>
              </div>
              <div data-animate data-delay="100" className="card-hover w-full lg:max-w-[780px] min-h-[320px] flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-5">
                <div className="w-full flex flex-row justify-between items-center">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Déséquilibre</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#eb4141]"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>
                </div>
                <div className="w-full flex flex-wrap sm:flex-nowrap justify-between items-end px-0 sm:px-6 gap-4">
                  {[
                    { label: "Avis négatifs", mult: "×3", h: 110, chips: ["★☆☆☆☆", "★★☆☆☆", "★☆☆☆☆"], tone: "neg" },
                    { label: "Avis positifs", mult: "×1", h: 40, chips: ["★★★★★"], tone: "pos" },
                  ].map((b) => (
                    <div key={b.label} className="flex flex-col justify-center items-center gap-2">
                      <p className={`text-sm font-bold ${b.tone === "neg" ? "text-[#eb4141]" : "text-gold"}`}>{b.mult}</p>
                      <div className="relative w-[92px] flex flex-col justify-end items-center" style={{ height: 190 }}>
                        {/* Mini-avis qui tombent sur la pile */}
                        <div className="absolute inset-x-0 flex flex-col items-center gap-1" style={{ bottom: b.h + 6 }}>
                          {b.chips.map((c, i) => (
                            <span
                              key={i}
                              className={`stamp text-[9px] tracking-[1px] rounded-md px-1.5 py-0.5 ${b.tone === "neg" ? "text-[#ff8a8a] bg-[#3a1a1a] border border-[#652626]" : "text-gold bg-[#2a2416] border border-[#5a4720]"}`}
                              style={{ animationDelay: `${700 + i * 220}ms` }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <div
                          className={`bar-grow w-full rounded-t-xl border ${b.tone === "neg" ? "border-[#7a2b2b]" : "border-[#5a4720]"}`}
                          style={{
                            height: b.h,
                            background: b.tone === "neg"
                              ? "linear-gradient(180deg, #7a2b2b, #3a1a1a)"
                              : "linear-gradient(180deg, #8a6a2a, #3d341e)",
                            boxShadow: b.tone === "neg" ? "0 0 30px -8px rgba(235,65,65,0.45)" : "0 0 30px -8px rgba(201,151,58,0.45)",
                            animationDelay: "200ms",
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#8c8c8c]">{b.label}</p>
                    </div>
                  ))}
                  <div className="w-full sm:w-auto sm:max-w-[215px] flex flex-col justify-center items-center">
                    <p className="text-[#8c8c8c] text-sm">Les clients mécontents s&apos;expriment <span className="text-[#eb4141]">spontanément</span>. Les satisfaits passent à autre chose.</p>
                    <span className="text-xs text-[#8c8c8c]">Sans système de collecte, votre image en ligne est biaisée.</span>
                  </div>
                </div>
                <hr className="h-[1px] w-full text-[#262626]" />
                <div className="flex flex-row justify-center items-end gap-2">
                  <p className="text-4xl font-bold">3×</p>
                  <p className="text-xs text-[#8c8c8c]">plus d&apos;avis négatifs que positifs publiés en moyenne</p>
                </div>
              </div>
            </div>
            <div data-animate data-delay="0" className="card-hover w-full flex flex-col md:flex-row justify-between items-start md:items-center bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
              <div className="flex flex-col items-start gap-4 max-w-xl">
                <div className="flex flex-row justify-center items-center gap-2">
                  <div className="w-[32px] h-[32px] flex justify-center items-center bg-[#2c1b1a] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#eb4141]"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                  </div>
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Fidélité</p>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Ils ont aimé… <span className="text-gold">et ne sont jamais revenus.</span></h3>
                <p className="text-[#8c8c8c] text-sm font-light">Les cartes à tampons papier se perdent, s&apos;oublient au fond d&apos;un portefeuille et ne vous disent rien de vos habitués. Pendant ce temps, le concurrent d&apos;en face, lui, les fait revenir.</p>
              </div>
              <div className="flex flex-row md:flex-col items-end md:items-end gap-3 md:gap-1 shrink-0">
                <p className="text-5xl md:text-6xl font-bold text-gold">5×</p>
                <p className="text-xs text-[#8c8c8c] max-w-[200px] md:text-right">moins cher de faire revenir un client que d&apos;en conquérir un nouveau</p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ COMMENT ÇA MARCHE ══════════════ */}
        <section id="resolutions" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Comment ça marche</p>
          <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Quatre étapes. <span className="text-gold">Zéro friction.</span></h2>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 justify-center items-stretch gap-3 md:gap-4">
            <div data-animate data-delay="0" className="card-hover min-h-[231px] w-full flex flex-col justify-start items-start bg-[#171717] rounded-2xl border border-[#292929] gap-3 p-4 md:p-6">
              <div className="w-full flex flex-row justify-between items-center">
                <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M17 12v4a1 1 0 0 1-1 1h-4"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M17 8V7"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M7 17h.01"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="5" height="5" rx="1"/></svg>
                </div>
                <p className="text-2xl text-[#292929] font-bold">01</p>
              </div>
              <div className="flex flex-col items-start">
                <p className="text-2xl font-bold">Scan</p>
                <p className="text-[#8c8c8c] text-sm">Le client <span className="text-gold">scanne le QR</span> code depuis sa table, le comptoir ou le ticket.</p>
              </div>
              <div className="w-full flex flex-row justify-start items-center gap-2">
                <div className="relative overflow-hidden w-[48px] h-[48px] flex justify-center items-center rounded-xl border border-[#252424]">
                  <span aria-hidden className="scan-beam" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8c8c8c]"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                <div className="flex flex-col justify-start items-start">
                  <p className="text-[10px]">scanavi.co/resto</p>
                  <p className="text-[10px] text-[#8c8c8c]">Ouvre instantanément la page</p>
                </div>
              </div>
            </div>
            <div data-animate data-delay="100" className="card-hover min-h-[231px] w-full flex flex-col justify-start items-start bg-[#171717] rounded-2xl border border-[#292929] gap-3 p-4 md:p-6">
              <div className="w-full flex flex-row justify-between items-center">
                <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"/></svg>
                </div>
                <p className="text-2xl text-[#292929] font-bold">02</p>
              </div>
              <div className="flex flex-col items-start">
                <p className="text-2xl font-bold">Tampon</p>
                <p className="text-[#8c8c8c] text-sm">Sa <span className="text-gold">carte de fidélité</span> s&apos;ouvre et se tamponne toute seule. Un passage = un tampon, qu&apos;il laisse un avis ou non.</p>
              </div>
              <div className="w-full flex flex-row justify-start items-center gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-xs ${i < 4 ? "bg-[#C9973A1f] border border-[#C9973A66] text-gold" : i === 4 ? "slot-loop border border-dashed text-gold" : "border border-dashed border-[#333]"}`}
                  >
                    {i < 4 ? "★" : i === 4 ? <span className="stamp-loop">★</span> : ""}
                  </div>
                ))}
                <p className="text-[10px] text-[#8c8c8c] ml-1">+1 à chaque visite</p>
              </div>
            </div>
            <div data-animate data-delay="200" className="card-hover min-h-[231px] w-full flex flex-col justify-start items-start bg-[#171717] rounded-2xl border border-[#292929] gap-3 p-4 md:p-6">
              <div className="w-full flex flex-row justify-between items-center">
                <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
                </div>
                <p className="text-2xl text-[#292929] font-bold">03</p>
              </div>
              <div className="flex flex-col items-start">
                <p className="text-2xl font-bold">Note</p>
                <p className="text-[#8c8c8c] text-sm">Il donne une note de <span className="text-gold">1 à 5 étoiles.</span> Une seconde, pas plus.</p>
              </div>
              <div className="flex flex-row justify-start items-center gap-2">
                <p className="text-2xl flex gap-1.5" aria-label="5 étoiles sur 5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <span key={s} aria-hidden className="star-fill" style={{ animationDelay: `${s * 0.18}s` }}>★</span>
                  ))}
                </p>
              </div>
            </div>
            <div data-animate data-delay="300" className="card-hover min-h-[231px] w-full flex flex-col justify-start items-start bg-[#171717] rounded-2xl border border-[#292929] gap-3 p-4 md:p-6">
              <div className="w-full flex flex-row justify-between items-center">
                <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/></svg>
                </div>
                <p className="text-2xl text-[#292929] font-bold">04</p>
              </div>
              <div className="flex flex-col items-start">
                <p className="text-2xl font-bold">Oriente</p>
                <p className="text-[#8c8c8c] text-sm"><span className="text-gold">4-5★</span> → avis Google. <span className="text-gold">1-3★</span> → retour privé, puis libre choix de publier. Vous traitez l&apos;insatisfaction en amont.</p>
              </div>
              <div className="flex flex-col justify-start items-start gap-2">
                <div className="flex flex-row justify-start items-center gap-2">
                  <p className="text-[10px] text-gold bg-[#2a251a] px-1 py-0.5 rounded-sm">4-5★</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nudge text-gold"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  <p className="text-[10px]">Google</p>
                </div>
                <div className="flex flex-row justify-start items-center gap-2">
                  <p className="text-[10px] text-[#8b8b8b] bg-[#212121] px-[5px] py-0.5 rounded-sm">1-3★</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nudge text-[#8c8c8c]" style={{ animationDelay: "0.7s" }}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  <p className="text-[10px] text-[#ceccc7]">Privé</p>
                </div>
              </div>
            </div>
          </div>
          <p className="w-full text-xs text-[#8c8c8c] text-center">Installation en 2 minutes · Aucune compétence technique nécessaire</p>
        </section>

        {/* ══════════════ FIDÉLITÉ ══════════════ */}
        <section id="fidelite" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Programme de fidélité</p>
          <div className="flex flex-col gap-3 max-w-3xl">
            <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Le même QR code. <span className="text-gold">Une carte de fidélité en plus.</span></h2>
            <p className="text-[#8c8c8c] text-sm md:text-base">À chaque passage, le client scanne votre QR code et sa carte se tamponne toute seule, directement sur son téléphone. Vous choisissez les récompenses, il revient les chercher.</p>
          </div>

          <div className="w-full flex flex-col lg:flex-row items-stretch gap-2">
            {/* Maquette de la carte client */}
            <div
              data-animate
              data-delay="0"
              className="card-hover w-full lg:max-w-[460px] flex flex-col items-center justify-center rounded-2xl border border-[#292929] p-6 md:p-10"
              style={{ background: "radial-gradient(120% 120% at 80% 0%, rgba(201,151,58,0.16) 0%, transparent 55%), rgba(20,20,22,0.72)", backdropFilter: "blur(10px)" }}
            >
              <div data-tilt className="tilt relative overflow-hidden w-full max-w-[320px] flex flex-col gap-5 rounded-3xl border border-[#C9973A55] bg-[#0f0f0f] p-5 shadow-[0_20px_60px_-20px_rgba(201,151,58,0.35)]">
                <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-full w-1/3 animate-sheen" style={{ background: "linear-gradient(100deg, transparent, rgba(242,215,154,0.10), transparent)", animationDuration: "6s" }} />
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#8c8c8c]">Ma carte de fidélité</p>
                    <p className="text-base font-bold">Café des Halles</p>
                  </div>
                  <p className="text-xs text-gold bg-[#C9973A1a] rounded-full px-2.5 py-1 font-bold">7 / 10</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-xl flex items-center justify-center ${i < 7 ? "bg-[#C9973A24] border border-[#C9973A80]" : i === 7 ? "slot-loop border border-dashed" : "border border-dashed border-[#333]"}`}
                    >
                      {i < 7 && <span className="stamp text-gold text-base" style={{ animationDelay: `${200 + i * 110}ms` }}>★</span>}
                      {i === 7 && <span aria-hidden className="stamp-loop text-gold text-base">★</span>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl bg-[#171717] border border-[#292929] px-3 py-2">
                    <p className="text-xs"><span className="text-gold font-bold">5 passages</span> · Café offert</p>
                    <span className="text-[10px] text-[#22c55e]">Obtenu ✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#171717] border border-[#292929] px-3 py-2">
                    <p className="text-xs"><span className="text-gold font-bold">10 passages</span> · Petit-déj offert</p>
                    <span className="text-[10px] text-[#8c8c8c]">Encore 3</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-[11px] text-[#616161] text-center">Aperçu de la carte vue par votre client</p>
            </div>

            {/* Arguments */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  title: "Zéro appli, zéro papier",
                  desc: "La carte vit dans le navigateur du client. Rien à télécharger, rien à perdre.",
                  icon: <><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>,
                },
                {
                  title: "Vos récompenses, vos règles",
                  desc: "Café offert au 5e passage, -20 % au 10e… Vous créez autant de paliers que vous voulez.",
                  icon: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></>,
                },
                {
                  title: "Anti-triche intégré",
                  desc: "Un seul tampon par jour et par client, même s'il scanne dix fois. Vos récompenses restent méritées.",
                  icon: <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></>,
                },
                {
                  title: "Carte jamais perdue",
                  desc: "Nouveau téléphone ? Le client retrouve ses tampons avec son email ou son numéro.",
                  icon: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></>,
                },
                {
                  title: "Vos habitués en chiffres",
                  desc: "Clients fidélisés, passages du mois, récompenses distribuées : tout est dans votre tableau de bord.",
                  icon: <><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
                },
                {
                  title: "100 % conforme Google",
                  desc: "Le tampon récompense la visite, jamais l'avis. Aucun risque pour votre fiche.",
                  icon: <><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></>,
                },
              ].map((f, i) => (
                <div
                  key={f.title}
                  data-animate
                  data-delay={String((i % 2) * 100)}
                  className="card-hover w-full flex flex-col items-start bg-[#171717] rounded-2xl border border-[#292929] gap-3 p-4 md:p-6"
                >
                  <div className="w-[36px] h-[36px] flex justify-center items-center bg-[#292929] rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">{f.icon}</svg>
                  </div>
                  <p className="text-base font-bold">{f.title}</p>
                  <p className="text-[#8c8c8c] text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="w-full text-xs text-[#8c8c8c] text-center">Inclus dans toutes les formules · Activable en 1 clic depuis votre tableau de bord · Mise en pause quand vous voulez</p>
        </section>

        {/* ══════════════ TOUT-EN-UN ══════════════ */}
        <section id="outils" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Tout est inclus</p>
          <div className="flex flex-col gap-3 max-w-3xl">
            <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Une seule plateforme. <span className="text-gold">Tout ce qu&apos;il faut pour briller.</span></h2>
            <p className="text-[#8c8c8c] text-sm md:text-base">Au-delà des avis et de la fidélité, ScanAvis vous donne les outils pour être vu, rassurer et garder la main.</p>
          </div>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                tag: "Widget site web",
                title: "Votre note Google affichée sur votre site",
                desc: "Un visiteur qui voit 4.6★ et 87 avis réserve plus facilement. Vous collez une ligne de code, c'est tout.",
                points: ["4 formats : barre, carte, badge, bannière", "Note et nombre d'avis mis à jour tout seuls", "Bouton « Laisser un avis » intégré"],
                visual: (
                  <div className="w-full flex items-center justify-between gap-3 rounded-xl bg-[#0f0f0f] border border-[#292929] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold">4.6</p>
                      <div className="flex flex-col">
                        <p className="text-gold text-sm leading-none">★★★★★</p>
                        <p className="text-[11px] text-[#a3a3a3] mt-1">87 avis Google</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0d0d0d] bg-gold rounded-lg px-3 py-1.5 whitespace-nowrap">Laisser un avis</span>
                  </div>
                ),
              },
              {
                tag: "Affiche & plaque NFC",
                title: "Prêt à poser dès votre inscription",
                desc: "Pas de graphiste, pas d'imprimeur à chercher : votre support est généré pour vous, à votre nom.",
                points: ["Affiche premium avec votre QR code, à imprimer", "Plaque NFC : le client approche son téléphone, c'est ouvert", "Avis et tampon de fidélité depuis le même support"],
                visual: (
                  <div className="w-full flex items-center gap-3 rounded-xl bg-[#0f0f0f] border border-[#292929] px-4 py-3">
                    <div className="w-[44px] h-[44px] shrink-0 flex justify-center items-center rounded-lg border border-[#C9973A55] bg-[#C9973A14]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                    </div>
                    <p className="text-xs text-[#8c8c8c]">ou</p>
                    <div className="w-[44px] h-[44px] shrink-0 flex justify-center items-center rounded-lg border border-[#C9973A55] bg-[#C9973A14]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
                    </div>
                    <p className="text-xs text-[#c7c7c7] leading-snug">Scan ou sans contact : <span className="text-gold">1 seconde</span> pour votre client</p>
                  </div>
                ),
              },
              {
                tag: "Retours privés",
                title: "Les critiques arrivent chez vous d'abord",
                desc: "Un client déçu vous explique pourquoi, en privé. Vous pouvez réagir et corriger avant que ça se répète.",
                points: ["Tous les retours centralisés dans votre espace", "Vous comprenez ce qui coince, concrètement", "Le client reste libre de publier ensuite"],
                visual: (
                  <div className="w-full flex flex-col gap-1.5 rounded-xl bg-[#0f0f0f] border border-[#292929] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gold">★★<span className="text-[#333]">★★★</span></p>
                      <p className="text-[10px] text-[#8c8c8c]">Retour privé · il y a 2 h</p>
                    </div>
                    <p className="text-xs text-[#c7c7c7] italic">« Très bon repas mais 25 min d&apos;attente pour être servis ce midi… »</p>
                  </div>
                ),
              },
              {
                tag: "Tableau de bord",
                title: "Toute votre activité sur un seul écran",
                desc: "Avis, note, retours, clients fidèles : vous voyez ce qui marche, mois après mois.",
                points: ["Statistiques avis, retours et fidélité", "Export PDF et bilan mensuel de votre activité", "Plusieurs établissements, un seul compte"],
                visual: (
                  <div className="w-full grid grid-cols-3 gap-2">
                    {[
                      { v: "87", l: "avis" },
                      { v: "4.6★", l: "note" },
                      { v: "132", l: "fidèles" },
                    ].map((k) => (
                      <div key={k.l} className="flex flex-col items-start rounded-xl bg-[#0f0f0f] border border-[#292929] px-3 py-2.5">
                        <p className="text-lg font-bold leading-none">{k.v}</p>
                        <p className="text-[11px] text-[#a3a3a3] mt-1">{k.l}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map((f, i) => (
              <div
                key={f.tag}
                data-animate
                data-delay={String((i % 2) * 100)}
                className="card-hover w-full flex flex-col items-start bg-[#171717] rounded-2xl border border-[#292929] gap-5 p-6 md:p-8"
              >
                <p className="text-[11px] uppercase tracking-[1px] text-gold font-bold">{f.tag}</p>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl md:text-2xl font-bold leading-tight">{f.title}</h3>
                  <p className="text-[#a3a3a3] text-sm leading-relaxed">{f.desc}</p>
                </div>
                {f.visual}
                <ul className="w-full flex flex-col gap-2">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-[#d4d4d4]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold mt-[3px] shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════ RÉSULTATS ══════════════ */}
        <section id="resultats" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Les Résultats</p>
          <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Rentable dès le <span className="text-gold">2e client.</span></h2>
          <div className="w-full flex flex-col justify-start items-start gap-2">
            <div className="w-full flex flex-col lg:flex-row justify-start items-start gap-2">
              <div data-animate data-delay="0" className="card-hover w-full flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">ROI</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                  <div className="w-full flex flex-row justify-between items-center">
                    <p className="text-[#8c8c8c] text-[10px]">Coût</p>
                    <p className="text-xs">dès 35€/mois</p>
                  </div>
                  <div className="w-full h-[8px] bg-[#202121] rounded-full overflow-hidden">
                    <div className="h-[8px] bg-[#873232] rounded-full anim-bar" data-bar="15%" />
                  </div>
                  <div className="w-full flex flex-row justify-between items-center">
                    <p className="text-[#8c8c8c] text-[10px]">Revenu généré</p>
                    <p className="text-xs">min 200€/mois</p>
                  </div>
                  <div className="w-full h-[8px] bg-[#202121] rounded-full overflow-hidden">
                    <div className="h-[8px] bg-gold rounded-full anim-bar" data-bar="90%" />
                  </div>
                </div>
                <h2 className="max-w-[500px] text-4xl font-bold">Un nouveau client = ~40€. <br /><span className="text-gold">2 clients = abonnement remboursé.</span></h2>
                <p className="text-xs text-[#8c8c8c]">* La plupart de nos utilisateurs gagnent bien plus que 2 clients/mois.</p>
              </div>
              <div data-animate data-delay="100" className="card-hover w-full lg:max-w-[450px] min-h-[361px] flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Visites</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div className="w-full flex flex-col gap-2">
                  {[
                    { day: "Lun", w: 55 },
                    { day: "Mar", w: 45 },
                    { day: "Mer", w: 50 },
                    { day: "Jeu", w: 60 },
                    { day: "Ven", w: 65 },
                    { day: "Sam", w: 80 },
                    { day: "Dim", w: 70 },
                  ].map(({ day, w }) => (
                    <div key={day} className="flex items-center gap-3">
                      <p className="text-[#8c8c8c] text-xs w-6">{day}</p>
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: "#212121" }}>
                        <div className="rounded-full anim-bar" data-bar={`${w}%`} style={{ height: "6px", backgroundColor: "#C9973A" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-1">
                  <p className="text-4xl font-bold">+34%</p>
                  <p className="text-[#8c8c8c] text-xs"><span className="text-gold">visites</span> sur votre fiche Google</p>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="w-full flex flex-col lg:flex-row justify-start items-start gap-2">
              <div data-animate data-delay="0" className="card-hover w-full flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex items-center justify-between"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg><p className="text-gold text-sm tracking-[2px]" aria-label="5 étoiles sur 5">★★★★★</p></div>
                <h3 className="text-xl">&quot;On est passé de 12 à 87 avis en 3 mois. Notre note est montée de 3.8 à 4.6. Les clients nous trouvent plus facilement sur Google.&quot;</h3>
                <div className="flex flex-row justify-start items-start gap-3">
                  <div
                    className="flex justify-center items-center bg-[#C9973A] rounded-full flex-shrink-0"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <p className="text-white font-bold text-sm">ML</p>
                  </div>
                  <div className="flex flex-col justify-start items-start gap-1">
                    <p className="text-xs">Marie L.</p>
                    <p className="text-[10px] text-[#8c8c8c]">Restaurant Le Comptoir, Lyon</p>
                  </div>
                </div>
              </div>
              <div data-animate data-delay="100" className="card-hover w-full flex flex-col items-start justify-start bg-[#171717] p-4 md:p-8 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex items-center justify-between"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg><p className="text-gold text-sm tracking-[2px]" aria-label="5 étoiles sur 5">★★★★★</p></div>
                <h3 className="text-xl">&quot;Installé en 5 minutes. Les avis tombent tout seuls maintenant. On a doublé notre nombre d&apos;avis en un mois.&quot;</h3>
                <div className="flex flex-row justify-start items-start gap-3">
                  <div
                    className="flex justify-center items-center bg-[#C9973A] rounded-full flex-shrink-0"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <p className="text-white font-bold text-sm">TR</p>
                  </div>
                  <div className="flex flex-col justify-start items-start gap-1">
                    <p className="text-xs">Thomas R.</p>
                    <p className="text-[10px] text-[#8c8c8c]">Salon Figaro, Paris 11e</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ TARIFS ══════════════ */}
        <section id="tarifs" className="w-full max-w-7xl mx-auto flex flex-col justify-start items-center py-12 md:py-16 px-4 sm:px-8 lg:px-12 gap-6 md:gap-8">
          <div className="w-full flex flex-col justify-start items-start gap-2">
            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Nos Tarifs</p>
            <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Simple. <span className="text-gold">Transparent.</span></h2>
            <p className="text-[#8c8c8c] text-sm">Avis Google, fidélité, widget, parrainage : tout est inclus. Essayez gratuitement, puis choisissez votre formule. Sans engagement.</p>
          </div>
          <div className="w-full grid grid-cols-1 md:grid-cols-3 justify-center items-stretch gap-3 md:gap-4">
            {/* Plan Gratuit */}
            <div data-animate data-delay="0" className="card-hover w-full flex flex-col justify-between items-start p-4 md:p-8 bg-[#171717] rounded-2xl border border-[#292929] gap-8">
              <div className="w-full flex flex-col items-start gap-8">
                <div className="flex flex-col items-start gap-1">
                  <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Essai gratuit</p>
                  <p className="text-[#616161] text-[11px]">Pour tester sans risque</p>
                </div>
                <div className="flex flex-col justify-start items-start gap-2">
                  <h3 className="text-4xl font-bold">0€</h3>
                  <p className="text-[#8c8c8c] text-xs">30 jours · aucun prélèvement</p>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                  {["Votre QR code ScanAvis", "Collecte d'avis illimitée", "Feedback privé des insatisfaits", "Carte de fidélité digitale", "Widget avis pour votre site", "Tableau de bord de suivi"].map((f) => (
                    <div key={f} className="flex flex-row justify-start items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a5a5a]"><path d="M20 6 9 17l-5-5"/></svg>
                      <p className="text-[#8c8c8c] text-sm">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
              <a href="/signup" className="w-full min-h-[44px] flex flex-row justify-center items-center text-sm gap-2 font-medium py-2 border border-[#292929] rounded-xl transition-colors duration-200 hover:bg-gold hover:text-black hover:border-gold">
                Commencer gratuitement
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>

            {/* Plan QR */}
            <div data-animate data-delay="100" className="card-hover w-full flex flex-col justify-between items-start p-4 md:p-8 bg-[#171717] rounded-2xl border border-[#292929] gap-8">
              <div className="w-full flex flex-col items-start gap-8">
                <div className="flex flex-col items-start gap-1">
                  <p className="text-[#e5e5e5] uppercase text-xs font-bold tracking-[1px]">QR code</p>
                  <p className="text-[#616161] text-[11px]">La formule essentielle</p>
                </div>
                <div className="flex flex-col justify-start items-start gap-2">
                  <h3 className="text-4xl font-bold">35€<span className="text-sm text-[#8c8c8c] font-light">/mois</span></h3>
                  <p className="text-[#8c8c8c] text-xs">Annulez quand vous voulez</p>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                  {[
                    "Votre QR code + affiche prête à poser",
                    "Avis Google, automatiquement",
                    "Avis négatifs captés en privé",
                    "Programme de fidélité illimité",
                    "Widget avis (4 formats)",
                    "Tableau de bord, export PDF & bilan mensuel",
                    "Parrainage : -20 % par filleul abonné",
                  ].map((f) => (
                    <div key={f} className="flex flex-row justify-start items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M20 6 9 17l-5-5"/></svg>
                      <p className="text-sm">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
              <a href="/signup" className="w-full min-h-[44px] flex flex-row justify-center items-center text-sm gap-2 font-medium py-2 border border-[#292929] rounded-xl transition-colors duration-200 hover:bg-gold hover:text-black hover:border-gold">
                Choisir cette formule
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>

            {/* Plan QR + plaque NFC */}
            <div data-animate data-delay="200" className="pro-card w-full flex flex-col justify-between items-start p-4 md:p-8 bg-[#171717] rounded-2xl border gap-8">
              <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-full w-1/3 animate-sheen" style={{ background: "linear-gradient(100deg, transparent, rgba(201,151,58,0.10), transparent)", animationDuration: "7s" }} />
              <div className="relative w-full flex flex-col items-start gap-8">
                <div className="w-full flex flex-row justify-between items-start">
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-gold uppercase text-xs font-bold tracking-[1px]">QR + plaque NFC</p>
                    <p className="text-[#8c8c8c] text-[11px]">Le comptoir qui collecte tout seul</p>
                  </div>
                  <span className="text-[#0d0d0d] py-0.5 px-2 bg-gold rounded-full text-[10px] whitespace-nowrap">Recommandé</span>
                </div>
                <div className="flex flex-col justify-start items-start gap-2">
                  <h3 className="text-4xl font-bold">40€<span className="text-sm text-[#8c8c8c] font-light">/mois</span></h3>
                  <p className="text-[#8c8c8c] text-xs">Annulez quand vous voulez</p>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                  {[
                    { t: "Tout de la formule QR code", strong: false },
                    { t: "Plaque NFC « Avis Google » incluse", strong: true },
                    { t: "Un geste sans contact : avis + tampon en 1 s", strong: false },
                    { t: "Posée sur le comptoir, prête à l'emploi", strong: false },
                    { t: "Plus de scans, plus d'avis, plus de retours", strong: false },
                    { t: "Support prioritaire", strong: false },
                  ].map((f) => (
                    <div key={f.t} className="flex flex-row justify-start items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M20 6 9 17l-5-5"/></svg>
                      <p className={`text-sm ${f.strong ? "text-gold font-medium" : ""}`}>{f.t}</p>
                    </div>
                  ))}
                </div>
              </div>
              <a href="/signup" className="btn-cta w-full min-h-[44px] flex flex-row justify-center items-center text-sm text-[#0d0d0d] font-medium gap-2 bg-gold py-2 border border-gold rounded-xl transition-colors duration-200 hover:opacity-90">
                Démarrer l&apos;essai gratuit
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          </div>
          <p className="w-full text-xs text-[#8c8c8c] text-center flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Paiement sécurisé Stripe · SSL
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
              Sans engagement
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              Support réactif sous 24 h
            </span>
          </p>
        </section>

        {/* ══════════════ PARRAINAGE ══════════════ */}
        <section id="parrainage" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Parrainage</p>
          <div className="w-full flex flex-col lg:flex-row items-stretch gap-2">
            <div
              data-animate
              data-delay="0"
              className="card-hover relative overflow-hidden w-full flex flex-col items-start justify-between rounded-2xl border border-[#292929] p-6 md:p-10 gap-8"
              style={{ background: "radial-gradient(120% 140% at 90% -10%, rgba(201,151,58,0.16) 0%, transparent 55%), linear-gradient(160deg, rgba(24,24,24,0.78), rgba(17,17,17,0.78))", backdropFilter: "blur(10px)" }}
            >
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium bg-[#C9973A1a] border border-[#C9973A4d] text-gold">
                  Remise automatique sur votre facture
                </span>
                <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold max-w-2xl">Recommandez ScanAvis. <span className="text-gold">Votre abonnement se paie tout seul.</span></h2>
                <p className="text-[#8c8c8c] text-sm md:text-base max-w-xl">Vous connaissez d&apos;autres commerçants ? Partagez votre lien personnel. Pour chaque commerce qui s&apos;abonne grâce à vous, <span className="text-white font-semibold">20&nbsp;% de son abonnement sont déduits de votre facture, chaque mois</span>, tant qu&apos;il reste client. Automatiquement, sans limite de filleuls.</p>
              </div>
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { n: "1", t: "Partagez votre lien", d: "Par SMS, email ou de vive voix, depuis votre tableau de bord." },
                  { n: "2", t: "Il s'inscrit", d: "Le commerçant crée son compte depuis votre lien et profite de l'essai." },
                  { n: "3", t: "Votre facture baisse", d: "Dès qu'il paie son abonnement, votre remise s'applique toute seule à votre prochaine facture." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid place-items-center h-7 w-7 shrink-0 rounded-full text-[13px] font-bold text-[#0d0d0d]"
                      style={{ background: "linear-gradient(135deg, #C9973A, #e6b84a)", boxShadow: "0 4px 12px -4px rgba(201,151,58,0.6)" }}
                    >
                      {s.n}
                    </span>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-[#e5e5e5]">{s.t}</p>
                      <p className="text-xs text-[#8c8c8c] leading-snug">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation de gains */}
            <div data-animate data-delay="100" className="card-hover w-full lg:max-w-[420px] flex flex-col items-start justify-between bg-[#171717] p-6 md:p-8 rounded-2xl border border-[#292929] gap-6">
              <div className="w-full flex flex-row justify-between items-center">
                <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Votre remise</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>
              </div>
              <div className="w-full flex flex-col gap-3">
                {[
                  { f: 1, gain: 7, w: "20%" },
                  { f: 2, gain: 14, w: "40%" },
                  { f: 3, gain: 21, w: "60%" },
                  { f: 5, gain: 35, w: "100%", highlight: true },
                ].map((r) => (
                  <div key={r.f} className="w-full flex flex-col gap-1.5">
                    <div className="w-full flex justify-between items-baseline">
                      <p className="text-xs text-[#8c8c8c]">{r.f} filleul{r.f > 1 ? "s" : ""}</p>
                      <p className={`text-sm font-bold ${r.highlight ? "text-gold" : ""}`}>−{r.gain}€<span className="text-[10px] text-[#8c8c8c] font-normal">/mois</span></p>
                    </div>
                    <div className="w-full h-[6px] bg-[#212121] rounded-full overflow-hidden">
                      <div className="h-[6px] bg-gold rounded-full anim-bar" data-bar={r.w} />
                    </div>
                  </div>
                ))}
              </div>
              <hr className="h-[1px] w-full text-[#262626]" />
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-bold">5 filleuls <span className="text-gold">= 0€</span></p>
                <p className="text-sm text-[#a3a3a3]">votre formule QR code devient gratuite, tous les mois. Au-delà, le surplus reste en crédit sur vos factures suivantes.</p>
              </div>
              <p className="text-xs text-[#8c8c8c]">Simulation avec des filleuls abonnés à la formule QR code (35€/mois).</p>
            </div>
          </div>
        </section>

        {/* ══════════════ FAQ ══════════════ */}
        <section id="faq" className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-start py-12 md:py-16 gap-6 md:gap-8">
          <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Questions fréquentes</p>
          <h2 className="text-xl md:text-2xl lg:text-4xl font-bold">Vous vous demandez <span className="text-gold">peut-être…</span></h2>
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
            {[
              {
                q: "Est-ce conforme aux règles de Google ?",
                a: "Oui. Tous vos clients peuvent publier sur Google : ceux qui ont eu une moins bonne expérience vous écrivent d'abord en privé, puis restent libres de publier. Et la carte de fidélité récompense la visite, jamais l'avis.",
              },
              {
                q: "Mes clients doivent-ils télécharger une application ?",
                a: "Non. Ils scannent le QR code (ou approchent leur téléphone de la plaque NFC) et tout s'ouvre dans leur navigateur : avis et carte de fidélité.",
              },
              {
                q: "Comment fonctionne la carte de fidélité ?",
                a: "Vous définissez vos paliers (ex. café offert au 5e passage). À chaque visite, le client scanne et reçoit un tampon, un seul par jour. Quand il atteint un palier, il vous montre sa récompense au comptoir.",
              },
              {
                q: "Comment fonctionne le parrainage ?",
                a: "Pour chaque commerçant parrainé et abonné, 20 % de son abonnement sont déduits automatiquement de votre facture, chaque mois, tant qu'il reste client. 5 filleuls suffisent à rendre votre formule QR code gratuite.",
              },
              {
                q: "Combien de temps pour être opérationnel ?",
                a: "Environ 2 minutes : vous créez votre compte, renseignez votre fiche Google et imprimez votre affiche. Vos premiers avis peuvent arriver le jour même.",
              },
              {
                q: "Puis-je arrêter quand je veux ?",
                a: "Oui, sans engagement. L'essai de 30 jours est gratuit : aucun prélèvement pendant l'essai, et l'abonnement ne démarre que si vous l'activez. Ensuite, vous résiliez quand vous voulez, depuis vos paramètres.",
              },
            ].map((f) => (
              <details key={f.q} className="faq-item w-full bg-[#171717] rounded-2xl border border-[#292929] transition-colors duration-300">
                <summary className="w-full flex flex-row justify-between items-center gap-4 cursor-pointer p-4 md:p-6">
                  <span className="text-sm md:text-base font-medium">{f.q}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="faq-chevron shrink-0 text-gold"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </summary>
                <p className="px-4 md:px-6 pb-4 md:pb-6 -mt-1 text-sm text-[#8c8c8c] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ══════════════ CTA ══════════════ */}
        <section className="relative w-full max-w-7xl mx-auto px-4 md:px-8 flex justify-center items-center py-12 md:py-16">
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-[#292929]"
            style={{ background: "radial-gradient(ellipse at center, #2a1f00 0%, #1a1200cc 40%, #0d0d0dcc 100%)", backdropFilter: "blur(8px)" }}
          >
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <defs>
                <pattern id="cta-diamond-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 40 20 L 20 40 L 0 20 Z" fill="none" stroke="rgba(201, 151, 58, 0.15)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-diamond-grid)" />
            </svg>
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[120%] h-[320px]">
              <div className="w-full h-full rounded-[50%] blur-3xl animate-breathe" style={{ background: "radial-gradient(closest-side, rgba(201,151,58,0.22), transparent)" }} />
            </div>
            {[
              { top: "16%", left: "8%", size: 18, delay: "0s" },
              { top: "70%", left: "14%", size: 12, delay: "1.2s" },
              { top: "22%", left: "88%", size: 22, delay: "0.6s" },
              { top: "74%", left: "84%", size: 14, delay: "2s" },
            ].map((s, i) => (
              <span key={i} aria-hidden className="cta-star" style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay, opacity: 0.35 }}>★</span>
            ))}
            <div className="relative z-10 flex w-full flex-col items-center justify-center py-16 px-8 text-center">
              <p className="text-xs uppercase tracking-widest text-gold">COMMENCER</p>
              <h2 className="mt-4 text-2xl md:text-4xl lg:text-5xl font-bold text-white">Plus d&apos;avis. Plus d&apos;habitués. <span className="text-gold">Un seul QR code.</span></h2>
              <p className="mt-4 text-sm md:text-base lg:text-lg font-light text-[#8c8c8c]">Installez ScanAvis en 2 minutes et activez votre carte de fidélité dans la foulée. Gratuit pendant 30 jours.</p>
              <a href="/signup" className="btn-cta mt-8 min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-8 md:px-10 py-3.5 md:py-4 text-sm md:text-base font-semibold text-black">
                Commencer gratuitement
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
              <p className="mt-4 text-xs text-[#555]">Aucun prélèvement pendant l&apos;essai · Sans engagement</p>
            </div>
          </div>
        </section>

        {/* ══════════════ FOOTER ══════════════ */}
        <SiteFooter />
      </div>
    </>
  );
}
