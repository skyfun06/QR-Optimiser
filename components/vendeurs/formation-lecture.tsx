'use client'

import { useState } from 'react'
import { MODULES, NB_MODULES, CHAPITRES, type Chapitre } from '@/lib/vendeur-formation'

// Lecture libre de la formation : reprend le contenu de lib/vendeur-formation
// sous forme de chapitres dépliables (accordéons). Pensée pour la relecture à la
// volée (avant d'entrer dans un commerce, le soir après un refus). Aucun test,
// aucun verrou : accessible autant de fois qu'on veut, notamment au vendeur actif.

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChapitreAccordion({ chapitre, index }: { chapitre: Chapitre; index: number }) {
  const [open, setOpen] = useState(false)
  const panelId = `chapitre-${chapitre.id}`

  return (
    <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 p-4 md:p-5 text-left min-h-[60px]"
      >
        <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#221c10] text-gold text-sm font-bold">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="font-semibold text-white">{chapitre.titre}</span>
          <span className="text-xs text-[#8c8c8c]">{chapitre.sousTitre}</span>
        </div>
        <span className={open ? 'text-gold' : 'text-[#8c8c8c]'}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="px-4 md:px-5 pb-5 pt-4 flex flex-col gap-4 border-t border-[#292929]">
          <p className="text-sm md:text-[15px] text-[#c7c7c7] leading-relaxed">{chapitre.accroche}</p>

          <div className="flex flex-col gap-2">
            {chapitre.points.map((pt) => (
              <div key={pt.titre} className="flex flex-col gap-1 p-3 md:p-4 bg-[#0f0f0f] border border-[#242424] rounded-xl">
                <span className="text-sm font-semibold text-white">{pt.titre}</span>
                <span className="text-sm text-[#b6b6b6] leading-relaxed">{pt.texte}</span>
              </div>
            ))}
          </div>

          {chapitre.astuce && (
            <div className="flex flex-col gap-1.5 p-3 md:p-4 bg-gradient-to-b from-[#1c1710] to-[#141414] border border-[#3a2f18] rounded-xl">
              <span className="text-[11px] font-semibold uppercase tracking-[2px] text-gold">Astuce terrain</span>
              <p className="text-sm text-[#e5d9c2] leading-relaxed">{chapitre.astuce}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function VendeurFormationLecture({ prenom }: { prenom?: string | null }) {
  // Numéro de chapitre global (continu à travers les modules), aligné sur l'ordre
  // de CHAPITRES.
  const indexOf = (chapitreId: string) => CHAPITRES.findIndex((c) => c.id === chapitreId)

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 animate-fade-up">
      <header className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-gold">
          Formation vendeur · {NB_MODULES} modules
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          {prenom ? `Ta formation, ${prenom}` : 'Ta formation'}
        </h1>
        <p className="text-sm md:text-base text-[#8c8c8c] leading-relaxed max-w-2xl">
          Relis une partie quand tu en as besoin — avant d&apos;entrer dans un commerce, ou le soir
          après un refus. Déplie un chapitre pour le revoir.
        </p>
      </header>

      {MODULES.map((mod, mi) => (
        <section key={mod.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-bold text-white">
              Module {mi + 1} — {mod.titre}
            </h2>
            <span className="text-xs text-[#8c8c8c]">{mod.sousTitre}</span>
          </div>

          <div className="flex flex-col gap-2">
            {mod.chapitres.map((ch) => (
              <ChapitreAccordion key={ch.id} chapitre={ch} index={indexOf(ch.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
