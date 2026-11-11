// Fond ambiant dynamique partagé par tout le site (landing, pages publiques,
// dashboards) : aurore dorée qui respire en haut, halos flottants, anneaux
// pointillés en rotation lente, quelques étoiles qui dérivent (clin d'œil aux
// avis), reflet lumineux qui balaie lentement, texture pointillée et vignette.
// Rendu UNE SEULE FOIS dans le layout racine, derrière le contenu (-z-10). Les
// racines de page plein écran (min-h-screen bg-[#0d0d0d]) sont rendues
// transparentes dans globals.css pour le laisser transparaître. Les animations
// (animate-*) sont définies dans globals.css et se figent en
// prefers-reduced-motion.

const STARS = [
  { top: '14%', left: '6%', size: 12, delay: '0s', o: 0.14 },
  { top: '26%', left: '91%', size: 16, delay: '1.2s', o: 0.12 },
  { top: '52%', left: '3%', size: 10, delay: '2.1s', o: 0.1 },
  { top: '64%', left: '95%', size: 11, delay: '.6s', o: 0.12 },
  { top: '84%', left: '11%', size: 14, delay: '2.8s', o: 0.1 },
  { top: '90%', left: '78%', size: 9, delay: '1.7s', o: 0.1 },
]

export function SiteAmbient() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Aurore dorée en haut de page */}
      <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[1200px] max-w-[170vw] h-[560px]">
        <div
          className="w-full h-full rounded-[50%] blur-3xl animate-breathe"
          style={{ background: 'radial-gradient(closest-side, rgba(201,151,58,0.16), rgba(201,151,58,0.04) 55%, transparent)' }}
        />
      </div>
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
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.08), transparent 62%)', animationDelay: '2.6s' }}
      />
      {/* Contre-point froid très léger : donne de la profondeur au noir */}
      <div
        className="absolute top-[55%] left-[45%] w-[700px] h-[500px] rounded-full blur-3xl animate-breathe"
        style={{ background: 'radial-gradient(closest-side, rgba(120,130,160,0.05), transparent)', animationDelay: '3s' }}
      />
      <svg
        className="absolute top-[18%] -left-44 w-[400px] h-[400px] animate-spin-slow hidden md:block"
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.08" strokeWidth="0.5" strokeDasharray="2 8"
      >
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="32" strokeDasharray="1 6" />
      </svg>
      <svg
        className="absolute bottom-[8%] -right-44 w-[460px] h-[460px] animate-spin-slow hidden md:block"
        style={{ animationDirection: 'reverse' }}
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.07" strokeWidth="0.5" strokeDasharray="3 9"
      >
        <circle cx="50" cy="50" r="48" />
      </svg>
      {/* Étoiles qui dérivent */}
      {STARS.map((s, i) => (
        <svg
          key={i}
          className="absolute animate-float hidden sm:block"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, opacity: s.o }}
          viewBox="0 0 24 24" fill="#C9973A"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {/* Reflet lumineux qui balaie l'écran, très lentement */}
      <span
        className="absolute top-0 left-0 h-full w-1/3 animate-sheen"
        style={{ background: 'linear-gradient(100deg, transparent, rgba(201,151,58,0.035), transparent)', animationDuration: '18s' }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
        }}
      />
      {/* Vignette : bords plus sombres, le contenu ressort */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />
    </div>
  )
}
