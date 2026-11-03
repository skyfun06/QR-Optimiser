// Surcouche d'ambiance propre au segment /rejoindre, rendue dans son layout
// (donc sur toutes ses pages) PAR-DESSUS le fond global <SiteAmbient> : aurore
// dorée pulsante en haut, halos plus marqués, anneaux pointillés, étoiles
// flottantes (clin d'œil aux avis) et reflet lumineux qui balaie lentement.
// Fixe, derrière le contenu (-z-10), sans interaction. Les animations se
// figent en prefers-reduced-motion (cf. globals.css).

const STARS = [
  { top: '12%', left: '8%', size: 18, delay: '0s', o: 0.22 },
  { top: '22%', left: '88%', size: 24, delay: '.8s', o: 0.2 },
  { top: '48%', left: '4%', size: 14, delay: '1.6s', o: 0.16 },
  { top: '58%', left: '93%', size: 16, delay: '2.2s', o: 0.18 },
  { top: '78%', left: '14%', size: 20, delay: '1.1s', o: 0.15 },
  { top: '86%', left: '80%', size: 13, delay: '2.9s', o: 0.16 },
  { top: '34%', left: '52%', size: 11, delay: '3.4s', o: 0.1 },
]

export function RejoindreAmbient() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Aurore dorée en haut de page, qui respire */}
      <div className="absolute -top-56 left-1/2 -translate-x-1/2 w-[1100px] max-w-[160vw] h-[560px]">
        <div
          className="w-full h-full rounded-[50%] blur-3xl animate-breathe"
          style={{ background: 'radial-gradient(closest-side, rgba(201,151,58,0.22), rgba(201,151,58,0.06) 55%, transparent)' }}
        />
      </div>
      {/* Halos latéraux plus marqués que le fond global */}
      <div
        className="absolute top-[38%] -left-48 w-[520px] h-[520px] rounded-full blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.14), transparent 62%)', animationDelay: '.6s' }}
      />
      <div
        className="absolute top-[62%] -right-40 w-[480px] h-[480px] rounded-full blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(231,189,98,0.12), transparent 62%)', animationDelay: '2s' }}
      />
      {/* Anneaux pointillés en rotation lente */}
      <svg
        className="absolute -top-28 -right-28 w-[340px] h-[340px] animate-spin-slow"
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.14" strokeWidth="0.5" strokeDasharray="2 7"
      >
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="34" strokeDasharray="1 5" />
      </svg>
      <svg
        className="absolute -bottom-32 -left-32 w-[380px] h-[380px] animate-spin-slow"
        style={{ animationDirection: 'reverse' }}
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.11" strokeWidth="0.5" strokeDasharray="3 8"
      >
        <circle cx="50" cy="50" r="48" />
      </svg>
      {/* Étoiles flottantes */}
      {STARS.map((s, i) => (
        <svg
          key={i}
          className="absolute animate-float"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, opacity: s.o }}
          viewBox="0 0 24 24" fill="#C9973A"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {/* Reflet lumineux qui balaie l'écran en boucle */}
      <span
        className="absolute top-0 left-0 h-full w-1/3 animate-sheen"
        style={{ background: 'linear-gradient(100deg, transparent, rgba(201,151,58,0.05), transparent)', animationDuration: '14s' }}
      />
    </div>
  )
}
