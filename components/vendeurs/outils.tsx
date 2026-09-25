'use client'

import { useEffect, useState } from 'react'

// Zone "Mes outils" : téléchargement du kit à imprimer (chevalet + cartes de
// visite). Les PDF sont des fichiers statiques déposés dans public/kit-vendeur/.
// La disponibilité est détectée À L'EXÉCUTION (requête HEAD) : dès qu'un fichier
// existe, son bouton s'active tout seul — aucun changement de code nécessaire.

type Tool = {
  key: string
  label: string
  description: string
  /** Chemin public + nom de fichier attendu (à déposer dans public/kit-vendeur/). */
  file: string
  /** Nom du fichier téléchargé côté patron/vendeur. */
  downloadName: string
  icon: React.ReactNode
}

const IconStand = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="3" width="14" height="12" rx="1.5" />
    <path d="M12 15v3M8 21h8l-2-3h-4z" />
  </svg>
)
const IconCard = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 15h4M15 9h2M15 13h2M7 9h4" />
  </svg>
)

const TOOLS: Tool[] = [
  {
    key: 'chevalet',
    label: 'Chevalet comptoir',
    description: 'À imprimer et poser sur le comptoir pour ta démo chez le commerçant.',
    file: '/kit-vendeur/chevalet.pdf',
    downloadName: 'ScanAvis-chevalet.pdf',
    icon: IconStand,
  },
  {
    key: 'cartes',
    label: 'Cartes de visite',
    description: 'À imprimer et laisser au patron avant de repartir.',
    file: '/kit-vendeur/cartes-visite.pdf',
    downloadName: 'ScanAvis-cartes-visite.pdf',
    icon: IconCard,
  },
]

export function VendeurOutils() {
  const [available, setAvailable] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function check() {
      const entries = await Promise.all(
        TOOLS.map(async (t) => {
          try {
            const res = await fetch(t.file, { method: 'HEAD', cache: 'no-store' })
            return [t.key, res.ok] as const
          } catch {
            return [t.key, false] as const
          }
        })
      )
      if (!cancelled) setAvailable(Object.fromEntries(entries))
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-[#8c8c8c]">Mes outils</h2>

      <div className="flex flex-col gap-4 p-4 md:p-5 bg-[#171717] border border-[#292929] rounded-2xl">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-[#c7c7c7] leading-relaxed">
            Imprime le <span className="text-white font-medium">chevalet</span> et pose-le sur le
            comptoir pour faire ta démo, puis laisse une{' '}
            <span className="text-white font-medium">carte de visite</span> au patron avant de repartir.
          </p>
          <p className="text-sm text-gold leading-relaxed">
            Après ta première vente, tu recevras le kit officiel imprimé par ScanAvis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TOOLS.map((t) => {
            const ready = available[t.key] === true
            return (
              <div
                key={t.key}
                className="flex flex-col gap-3 p-4 bg-[#0f0f0f] border border-[#242424] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-[#221c10] text-gold">
                    {t.icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white">{t.label}</span>
                    <span className="text-xs text-[#8c8c8c]">PDF à imprimer</span>
                  </div>
                </div>

                <p className="text-sm text-[#b6b6b6] leading-relaxed">{t.description}</p>

                {ready ? (
                  <a
                    href={t.file}
                    download={t.downloadName}
                    className="mt-auto inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 15V3" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                    Télécharger
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className="mt-auto inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-[#6a6a6a] text-sm font-medium cursor-not-allowed"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    Bientôt disponible
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
