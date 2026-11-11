import Image from 'next/image'
import background from '@/public/images/background.jpg'

// Fond ambiant dynamique partagé par tout le site : la photo de fond
// (/public/images/background.jpg, scène de bar + plaque QR) assombrie et en
// très lent mouvement, puis halos dorés flottants + anneaux pointillés en
// rotation lente + texture pointillée masquée. Rendu UNE SEULE FOIS dans le
// layout racine, derrière le contenu (-z-10). Les racines de page plein écran
// (min-h-screen bg-[#0d0d0d]) sont rendues transparentes dans globals.css pour
// le laisser transparaître. Les animations (ambient-photo / animate-float /
// animate-spin-slow) sont définies dans globals.css et se figent en
// prefers-reduced-motion.
export function SiteAmbient() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="ambient-photo absolute inset-0">
        <Image
          src={background}
          alt=""
          fill
          quality={75}
          sizes="100vw"
          placeholder="blur"
          className="object-cover object-[85%_center] max-md:object-[90%_center]"
        />
      </div>
      {/* Voile : garde le contenu lisible partout, laisse deviner la scène */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(8,8,9,0.90) 0%, rgba(8,8,9,0.78) 45%, rgba(8,8,9,0.62) 100%), linear-gradient(to bottom, rgba(8,8,9,0.35), rgba(8,8,9,0.55))',
        }}
      />
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
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.07), transparent 62%)', animationDelay: '2.6s' }}
      />
      <svg
        className="absolute top-[18%] -left-44 w-[400px] h-[400px] animate-spin-slow hidden md:block"
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.07" strokeWidth="0.5" strokeDasharray="2 8"
      >
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="32" strokeDasharray="1 6" />
      </svg>
      <svg
        className="absolute bottom-[8%] -right-44 w-[460px] h-[460px] animate-spin-slow hidden md:block"
        style={{ animationDirection: 'reverse' }}
        viewBox="0 0 100 100" fill="none" stroke="#C9973A" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="3 9"
      >
        <circle cx="50" cy="50" r="48" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(ellipse 78% 62% at 50% 38%, black, transparent 76%)',
        }}
      />
    </div>
  )
}
