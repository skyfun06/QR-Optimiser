'use client'

import { useMemo, useState } from 'react'
import { QUESTIONS_PATRONS, type QuestionPatron } from '@/lib/vendeur-formation'

// Banque de questions difficiles posées par les patrons : à relire avant
// d'entrer dans un commerce, ou à retrouver en quelques mots sur le terrain.
// Sans verrou, disponible pour tout vendeur qui a accès à son espace.

function sansAccents(texte: string) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function QuestionCard({ item, id }: { item: QuestionPatron; id: string }) {
  const [open, setOpen] = useState(false)
  const panelId = `question-${id}`

  return (
    <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left min-h-[60px]"
      >
        <span className="font-semibold text-white leading-snug">{item.question}</span>
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
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-gold' : 'text-[#8c8c8c]'}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="px-4 md:px-5 pb-5 pt-4 flex flex-col gap-3 border-t border-[#292929]">
          <p className="text-sm text-[#8c8c8c] leading-relaxed">{item.piege}</p>
          <div className="flex flex-col gap-1.5 p-3 md:p-4 bg-gradient-to-b from-[#1c1710] to-[#141414] border border-[#3a2f18] rounded-xl">
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-gold">Ta réponse</span>
            <p className="text-sm md:text-[15px] text-[#f0e6d2] leading-relaxed">{item.reponse}</p>
          </div>
          <p className="text-sm text-[#b6b6b6] leading-relaxed">
            <span className="font-semibold text-[#e07a7a]">À éviter : </span>
            {item.aEviter}
          </p>
        </div>
      )}
    </div>
  )
}

export function VendeurQuestionsPatrons() {
  const [recherche, setRecherche] = useState('')

  const categories = useMemo(() => {
    const termes = sansAccents(recherche).split(/\s+/).filter(Boolean)
    if (termes.length === 0) return QUESTIONS_PATRONS
    return QUESTIONS_PATRONS.map((cat) => ({
      ...cat,
      questions: cat.questions.filter((q) => {
        const texte = sansAccents(`${q.question} ${q.reponse}`)
        return termes.every((t) => texte.includes(t))
      }),
    })).filter((cat) => cat.questions.length > 0)
  }, [recherche])

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 animate-fade-up">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Questions des patrons</h1>
        <p className="text-sm md:text-base text-[#8c8c8c] leading-relaxed max-w-2xl">
          Les questions qui peuvent te mettre en difficulté, et quoi répondre sans jamais inventer.
          Prépare-toi avant d&apos;entrer dans un commerce.
        </p>
      </header>

      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Chercher : mauvais avis, tampon, prix…"
        aria-label="Chercher une question"
        className="w-full min-h-[48px] px-4 bg-[#141414] border border-[#292929] rounded-2xl text-base text-white placeholder:text-[#6a6a6a] focus:outline-none focus:border-gold transition-colors"
      />

      {categories.length === 0 ? (
        <p className="text-sm text-[#8c8c8c] text-center py-6">
          Aucune question trouvée. Si un patron te la pose : « Je vérifie et je reviens vers vous. »
        </p>
      ) : (
        categories.map((cat) => (
          <section key={cat.id} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-white">{cat.titre}</h2>
            <div className="flex flex-col gap-2">
              {cat.questions.map((q, i) => (
                <QuestionCard key={q.question} item={q} id={`${cat.id}-${i}`} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
