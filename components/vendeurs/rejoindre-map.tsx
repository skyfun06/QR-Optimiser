// Visuel hero — V3 (aperçu) : carte locale du quartier avec des pins de
// commerces + un marqueur "toi" à radar. Même encombrement que la V2.
// Utilisé sur la page d'aperçu /rejoindre/apercu-v3 (la V2 reste sur /rejoindre).

const PINS = [
  { top: '16%', left: '24%', signed: true },
  { top: '26%', left: '72%', signed: true },
  { top: '60%', left: '28%', signed: false },
  { top: '48%', left: '82%', signed: true },
  { top: '74%', left: '58%', signed: false },
]

function MapPin({ signed }: { signed: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={signed ? '#C9973A' : '#171717'} stroke="#C9973A" strokeWidth="1.7" aria-hidden>
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
        @keyframes sa-radar { 0% { transform: scale(.5); opacity: .55 } 100% { transform: scale(2.6); opacity: 0 } }
        .sa-radar { animation: sa-radar 2.6s ease-out infinite }
        @keyframes sa-pin { 0% { opacity: 0; transform: translateY(-6px) scale(.6) } 100% { opacity: 1; transform: none } }
        .sa-pin { animation: sa-pin .5s cubic-bezier(.22,1,.36,1) both }
        @media (prefers-reduced-motion: reduce) {
          .sa-radar { animation: none !important; opacity: 0 !important }
          .sa-pin { animation: none !important; opacity: 1 !important; transform: none !important }
        }
      `}</style>

      {/* halo + ombre au sol */}
      <div aria-hidden className="absolute -inset-14 -z-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.26), transparent 65%)' }} />
      <div aria-hidden className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 rounded-[50%] bg-black/70 blur-2xl -z-10" />

      {/* carte */}
      <div className="relative overflow-hidden rounded-3xl border border-[#292929] bg-[#121212] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] aspect-[4/5]">
        {/* fond de carte virtuelle (eau, parc, pâtés, routes courbes) */}
        <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full" fill="none" aria-hidden>
          <rect width="100" height="125" fill="#0f0f0f" />

          {/* plan d'eau (haut-droite) */}
          <path d="M62 -5 C 70 18, 100 25, 96 55 C 93 80, 108 100, 100 130 L130 130 L130 -5 Z" fill="#16232f" />
          <path d="M62 -5 C 70 18, 100 25, 96 55 C 93 80, 108 100, 100 130" stroke="#39597a" strokeOpacity="0.35" strokeWidth="0.8" />

          {/* parc (bas-gauche) */}
          <path d="M4 92 C 10 86, 26 88, 30 96 C 34 106, 22 118, 10 116 C 0 114, -2 98, 4 92 Z" fill="#1a271a" />

          {/* pâtés d'immeubles, discrets */}
          <g fill="#ffffff" fillOpacity="0.035">
            <rect x="8" y="12" width="15" height="13" rx="2" />
            <rect x="27" y="10" width="18" height="12" rx="2" />
            <rect x="10" y="34" width="13" height="16" rx="2" />
            <rect x="30" y="34" width="15" height="14" rx="2" />
            <rect x="52" y="30" width="14" height="12" rx="2" />
            <rect x="34" y="60" width="14" height="14" rx="2" />
            <rect x="54" y="58" width="13" height="16" rx="2" />
            <rect x="36" y="88" width="16" height="12" rx="2" />
            <rect x="58" y="90" width="12" height="14" rx="2" />
          </g>

          {/* routes principales (courbes) */}
          <g stroke="#d0c8b6" strokeLinecap="round" fill="none">
            <path d="M-5 28 C 25 26, 55 34, 100 24" strokeOpacity="0.14" strokeWidth="2.4" />
            <path d="M-5 82 C 30 80, 60 88, 105 80" strokeOpacity="0.12" strokeWidth="1.8" />
            <path d="M26 -5 C 24 45, 30 90, 26 130" strokeOpacity="0.12" strokeWidth="1.8" />
            <path d="M50 -5 C 48 40, 54 80, 50 130" strokeOpacity="0.10" strokeWidth="1.4" />
          </g>
          {/* routes secondaires */}
          <g stroke="#d0c8b6" strokeOpacity="0.055" strokeLinecap="round" fill="none" strokeWidth="0.9">
            <path d="M-5 55 C 20 54, 45 58, 70 54" />
            <path d="M-5 108 H80" />
            <path d="M12 -5 V95" />
            <path d="M68 -5 C 66 30, 70 60, 68 92" />
          </g>
        </svg>

        {/* vignette + halo doré haut */}
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(201,151,58,0.14), transparent 60%)' }} />
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px 10px rgba(0,0,0,0.6)' }} />

        {/* pins commerces */}
        {PINS.map((p, i) => (
          <div key={i} className="sa-pin absolute -translate-x-1/2 -translate-y-full" style={{ top: p.top, left: p.left, animationDelay: `${0.2 + i * 0.12}s` }}>
            <MapPin signed={p.signed} />
          </div>
        ))}

        {/* marqueur "toi" + radar au centre */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <span aria-hidden className="sa-radar absolute w-11 h-11 rounded-full border-2 border-gold" />
          <span aria-hidden className="sa-radar absolute w-11 h-11 rounded-full border-2 border-gold" style={{ animationDelay: '1.3s' }} />
          <div className="relative w-11 h-11 rounded-full bg-gold text-[#12100e] flex items-center justify-center shadow-[0_0_22px_rgba(201,151,58,0.75)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12100e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
        </div>

        {/* étiquette bas */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#171717]/90 border border-[#292929] backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-gold" />
            <span className="text-sm text-white font-medium">6 commerces autour de toi</span>
          </div>
        </div>
      </div>
    </div>
  )
}
