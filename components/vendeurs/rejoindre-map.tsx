// Visuel hero — V3 : écran d'appli "carte locale" du quartier avec les commerces
// à démarcher autour du vendeur. Fond de carte riche (eau, parcs, immeubles,
// routes + rond-point), UI d'appli (recherche, recentrer), itinéraire animé vers
// le prochain commerce, marqueur "toi" à radar. Même encombrement que la V2.

type Pin = { top: string; left: string; signed: boolean; next?: boolean }

const PINS: Pin[] = [
  { top: '27%', left: '27%', signed: true },
  { top: '31%', left: '69%', signed: true },
  { top: '58%', left: '23%', signed: false, next: true },
  { top: '52%', left: '78%', signed: true },
  { top: '71%', left: '57%', signed: false },
]

function MapPin({ signed }: { signed: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={signed ? '#C9973A' : '#12100e'} stroke="#C9973A" strokeWidth="1.7" aria-hidden style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.55))' }}>
      <path d="M12 22s7-5.6 7-11.5a7 7 0 1 0-14 0C5 16.4 12 22 12 22z" />
      {signed ? (
        <path d="M9 10l2 2 4-4" stroke="#12100e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx="12" cy="10.3" r="2" fill="#C9973A" stroke="none" />
      )}
    </svg>
  )
}

export function HeroVisualMap() {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px] lg:w-[356px] animate-float">
      <style>{`
        @keyframes sa-radar { 0% { transform: scale(.5); opacity: .5 } 100% { transform: scale(2.6); opacity: 0 } }
        .sa-radar { animation: sa-radar 2.6s ease-out infinite }
        @keyframes sa-ping { 0% { transform: scale(.7); opacity: .7 } 80%,100% { transform: scale(2.1); opacity: 0 } }
        .sa-ping { animation: sa-ping 1.8s ease-out infinite }
        @keyframes sa-pindrop { 0% { opacity: 0; transform: translateY(-8px) scale(.6) } 100% { opacity: 1; transform: none } }
        .sa-pindrop { animation: sa-pindrop .5s cubic-bezier(.22,1,.36,1) both }
        @keyframes sa-route { to { stroke-dashoffset: -12 } }
        .sa-route { stroke-dasharray: 3 3; animation: sa-route 1s linear infinite }
        @keyframes sa-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        .sa-bob { animation: sa-bob 1.6s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .sa-radar, .sa-ping, .sa-route, .sa-bob { animation: none !important }
          .sa-radar, .sa-ping { opacity: 0 !important }
          .sa-pindrop { animation: none !important; opacity: 1 !important; transform: none !important }
        }
      `}</style>

      {/* halo + ombre au sol */}
      <div aria-hidden className="absolute -inset-14 -z-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.26), transparent 65%)' }} />
      <div aria-hidden className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 rounded-[50%] bg-black/70 blur-2xl -z-10" />

      {/* carte (écran d'appli) */}
      <div className="relative overflow-hidden rounded-3xl border border-[#292929] bg-[#0f0f0f] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] aspect-[4/5]">
        {/* ── fond de carte ── */}
        <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full" fill="none" aria-hidden>
          <defs>
            <radialGradient id="mapbg" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#191919" />
              <stop offset="100%" stopColor="#0d0d0d" />
            </radialGradient>
            <pattern id="bld" width="13" height="15" patternUnits="userSpaceOnUse">
              <rect x="1" y="1.5" width="5" height="4.6" rx="0.8" fill="#ffffff" fillOpacity="0.045" />
              <rect x="7.6" y="2.2" width="4" height="6" rx="0.8" fill="#ffffff" fillOpacity="0.03" />
              <rect x="2" y="8.4" width="6.6" height="5" rx="0.8" fill="#ffffff" fillOpacity="0.038" />
            </pattern>
          </defs>

          <rect width="100" height="125" fill="url(#mapbg)" />
          {/* immeubles (motif sur toute la surface) */}
          <rect width="100" height="125" fill="url(#bld)" />

          {/* parcs */}
          <path d="M2 90 C 8 84, 25 86, 30 95 C 34 105, 22 118, 9 116 C -2 114, -4 96, 2 90 Z" fill="#16241699" />
          <g fill="#6f9c6f" fillOpacity="0.18">
            <circle cx="9" cy="98" r="1.6" /><circle cx="15" cy="95" r="1.4" /><circle cx="13" cy="104" r="1.5" /><circle cx="20" cy="101" r="1.3" />
          </g>
          <rect x="60" y="16" width="14" height="12" rx="2" fill="#16241699" />

          {/* eau qui serpente (haut-droite → bas-droite) */}
          <path d="M72 -6 C 82 18, 106 26, 99 52 C 94 78, 112 104, 104 131 L134 131 L134 -6 Z" fill="#13202b" />
          <path d="M72 -6 C 82 18, 106 26, 99 52 C 94 78, 112 104, 104 131" stroke="#3a5f80" strokeOpacity="0.35" strokeWidth="0.9" />
          <path d="M76 -6 C 85 18, 108 27, 101 52 C 96 78, 114 104, 106 131" stroke="#5a7fa0" strokeOpacity="0.10" strokeWidth="0.5" />

          {/* routes — liseré sombre puis surface claire (effet carte) */}
          <g fill="none" strokeLinecap="round">
            <g stroke="#000000" strokeOpacity="0.4">
              <path d="M-6 34 C 25 30, 55 40, 104 26" strokeWidth="3.6" />
              <path d="M30 -6 C 27 45, 33 92, 29 131" strokeWidth="3.2" />
              <path d="M-6 86 C 30 84, 62 92, 106 84" strokeWidth="3.0" />
              <path d="M55 -6 C 52 40, 58 82, 54 131" strokeWidth="2.6" />
            </g>
            <g stroke="#d3ccbb">
              <path d="M-6 34 C 25 30, 55 40, 104 26" strokeOpacity="0.18" strokeWidth="2.3" />
              <path d="M30 -6 C 27 45, 33 92, 29 131" strokeOpacity="0.16" strokeWidth="2.0" />
              <path d="M-6 86 C 30 84, 62 92, 106 84" strokeOpacity="0.15" strokeWidth="1.9" />
              <path d="M55 -6 C 52 40, 58 82, 54 131" strokeOpacity="0.13" strokeWidth="1.6" />
            </g>
            {/* rond-point */}
            <circle cx="45" cy="59" r="6.5" stroke="#000000" strokeOpacity="0.4" strokeWidth="2.6" />
            <circle cx="45" cy="59" r="6.5" stroke="#d3ccbb" strokeOpacity="0.16" strokeWidth="1.6" />
            {/* rues secondaires */}
            <g stroke="#d3ccbb" strokeOpacity="0.06" strokeWidth="0.9">
              <path d="M-6 56 C 18 55, 40 59, 66 55" />
              <path d="M-6 108 H78" />
              <path d="M13 -6 V88" />
              <path d="M70 30 C 68 55, 72 74, 70 96" />
              <path d="M40 20 L52 40" /><path d="M18 68 L34 78" />
            </g>
          </g>

          {/* spot doré autour de "toi" */}
          <circle cx="50" cy="62" r="34" fill="#C9973A" fillOpacity="0.06" />
        </svg>

        {/* vignette */}
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 70px 14px rgba(0,0,0,0.65)' }} />

        {/* ── itinéraire animé (toi → prochain commerce) ── */}
        <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full" fill="none" aria-hidden>
          <path className="sa-route" d="M50 62 C 44 66, 33 69, 24 72" stroke="#C9973A" strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* ── UI appli : barre de recherche ── */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center gap-2 h-9 px-3 rounded-xl bg-[#171717]/85 border border-[#333] backdrop-blur">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span className="text-[12px] text-[#c7c7c7] flex-1">Autour de toi</span>
          <span className="text-[10px] font-semibold text-gold px-1.5 py-0.5 rounded bg-[#1a150c] border border-[#3a2f18]">2 km</span>
        </div>

        {/* ── pins commerces ── */}
        {PINS.map((p, i) => (
          <div key={i} className="absolute z-10 -translate-x-1/2 -translate-y-full" style={{ top: p.top, left: p.left }}>
            {p.next && (
              <span aria-hidden className="sa-ping absolute left-1/2 -bottom-1 -translate-x-1/2 w-6 h-6 rounded-full bg-gold/30" />
            )}
            <div className={`sa-pindrop ${p.next ? 'sa-bob' : ''}`} style={{ animationDelay: p.next ? '0s' : `${0.25 + i * 0.12}s` }}>
              <MapPin signed={p.signed} />
            </div>
          </div>
        ))}

        {/* ── marqueur "toi" + radar ── */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <span aria-hidden className="sa-radar absolute w-11 h-11 rounded-full border-2 border-gold" />
            <span aria-hidden className="sa-radar absolute w-11 h-11 rounded-full border-2 border-gold" style={{ animationDelay: '1.3s' }} />
            <div className="relative w-10 h-10 rounded-full bg-gold text-[#12100e] flex items-center justify-center ring-2 ring-[#0f0f0f] shadow-[0_0_22px_rgba(201,151,58,0.75)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12100e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
          </div>
          <span className="mt-1 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-[#12100e]/80 border border-[#3a2f18]">Toi</span>
        </div>

        {/* ── bouton recentrer ── */}
        <div className="absolute bottom-16 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-[#171717]/85 border border-[#333] backdrop-blur">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </div>

        {/* ── barre résultat ── */}
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#171717]/90 border border-[#333] backdrop-blur">
          <span className="flex items-center gap-2 text-sm text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-gold" />
            6 commerces à démarcher
          </span>
          <span className="text-[11px] text-[#8c8c8c]">≤ 2 km</span>
        </div>
      </div>
    </div>
  )
}
