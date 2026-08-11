'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { translations, type Lang, type Translations } from '@/lib/i18n/translations'

// -----------------------------------------------------------------------------
// Gestion de la langue active des pages publiques (client final).
//
// Hook minimal, sans contexte ni provider : l'état est synchronisé entre toutes
// les instances du hook (ex. le toggle et le contenu de la page) via un event
// window custom, et persisté en localStorage pour rester d'une page à l'autre
// (/review <-> /feedback) et d'une visite à l'autre dans la session.
//
// Français par défaut. Pas de détection automatique de la langue du navigateur.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'scanavis_lang'
const CHANGE_EVENT = 'scanavis-lang-change'

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr'
}

/** Abonnement au store externe : synchro entre onglets ('storage') et intra-page (CHANGE_EVENT). */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
  }
}

export function useLanguage(): { lang: Lang; setLang: (next: Lang) => void } {
  // useSyncExternalStore : lecture du localStorage sans setState-en-effet.
  // Snapshot serveur = 'fr' (rendu serveur stable), snapshot client = valeur stockée.
  const lang = useSyncExternalStore(subscribe, readStoredLang, () => 'fr' as Lang)

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { lang, setLang }
}

/** Comme useLanguage, mais renvoie aussi le dictionnaire actif `t`. */
export function useTranslations(): {
  lang: Lang
  setLang: (next: Lang) => void
  t: Translations
} {
  const { lang, setLang } = useLanguage()
  return { lang, setLang, t: translations[lang] }
}
