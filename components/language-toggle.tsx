'use client'

import { useLanguage } from '@/lib/i18n/use-language'
import { translations, type Lang } from '@/lib/i18n/translations'

const LANGS: Lang[] = ['fr', 'en']

/**
 * Pastille "FR / EN" fixée en haut à droite, pensée mobile-first (pages
 * consultées au téléphone par le client final). Discrète mais visible, langue
 * active en gold. Le clic bascule instantanément la langue (pas de rechargement).
 */
export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div
      role="group"
      aria-label={translations[lang].common.toggleAria}
      className="fixed top-3 right-3 z-50 inline-flex items-center gap-0.5 rounded-full border border-[#292929] bg-[#171717] p-0.5 shadow-lg"
    >
      {LANGS.map((l) => {
        const active = lang === l
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={[
              'min-w-[38px] min-h-[36px] px-2.5 rounded-full text-xs font-semibold cursor-pointer transition-colors duration-150',
              active ? 'bg-[#28231a] text-gold' : 'text-[#8c8c8c] hover:text-white',
            ].join(' ')}
          >
            {l.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
