'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CHAPITRES,
  TEST_QUESTIONS,
  TEST_CONFIG,
  type Chapitre,
} from '@/lib/vendeur-formation'

// Formation vendeur : premier plan de l'espace tant que le vendeur est en
// "formation". Parcours guidé pas-à-pas (chapitres + mini-vérifications), puis
// test de validation bloquant, corrigé côté serveur (/api/vendeur/test).
// La réussite du test ne suffit pas à activer : l'admin valide ensuite.
//
// Design : reprend le langage visuel de la page /rejoindre (fonts display/body,
// accents dorés, fonds ambiants, panneaux premium) et vise le desktop autant
// que le mobile — layouts larges en grille, plus de colonne étroite figée.

// État du test renvoyé par l'API (GET/POST /api/vendeur/test).
type TestEtat = {
  reussi: boolean
  // Formation terminée, suivi CÔTÉ SERVEUR (source de vérité, infalsifiable).
  formationTerminee: boolean
  tentatives: number
  maxTentatives: number
  meilleurScore: number | null
  total: number
  scoreRequis: number
  cooldownRestantMs: number
}

const BODY_FONT = 'var(--font-body), var(--font-space-grotesk), sans-serif'
const DISPLAY_FONT = 'var(--font-display), Georgia, serif'
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// -------------------------------------------------------------------------
// Décor & primitives visuelles
// -------------------------------------------------------------------------

/** Fond ambiant plein écran (fixe) : orbes dorés flottants + grille pointillée. */
function Ambient() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.13), transparent 60%)' }} />
      <div className="absolute top-1/4 -right-52 w-[620px] h-[620px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.09), transparent 62%)', animationDelay: '1.5s' }} />
      <div className="absolute -bottom-48 left-1/3 w-[600px] h-[600px] rounded-full blur-3xl animate-float" style={{ background: 'radial-gradient(circle, rgba(96,72,168,0.06), transparent 62%)', animationDelay: '2.6s' }} />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '30px 30px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 78%)' }} />
    </div>
  )
}

/** Accent "luxe" doré animé (police serif), pour un mot dans un titre. */
function Lux({ children }: { children: ReactNode }) {
  return (
    <span
      className="animate-gradient-text"
      style={{ fontFamily: DISPLAY_FONT, filter: 'drop-shadow(0 0 16px rgba(201,151,58,0.25))' }}
    >
      {children}
    </span>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[2.5px] text-gold border border-[#3a2f18] bg-[#1a150c] rounded-full px-4 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-glow" />
      {children}
    </span>
  )
}

/* ─── Icônes (traits or) ─── */
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const IconBook = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>)
const IconTarget = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></svg>)
const IconCheck = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><path d="M20 6 9 17l-5-5" /></svg>)
const IconLock = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>)
const IconClock = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>)
const IconTrophy = (p: { size?: number }) => (<svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" {...ic} aria-hidden><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>)
const IconArrow = (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" {...ic} aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>)

/** Barre de progression segmentée (une pastille par étape). */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            'h-1.5 rounded-full transition-all duration-500',
            i < current ? 'w-7 bg-gold' : i === current ? 'w-7 bg-gold/60' : 'w-4 bg-[#2e2e2e]',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function LogoutLink({ center }: { center?: boolean }) {
  async function logout() {
    await supabase.auth.signOut()
    window.location.assign('/rejoindre/connexion')
  }
  return (
    <div className={center ? 'flex justify-center' : ''}>
      <button
        type="button"
        onClick={logout}
        className="min-h-[44px] text-sm text-[#7a7a7a] hover:text-white transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  )
}

// -------------------------------------------------------------------------
// Parcours guidé — un chapitre à la fois (desktop : 2 colonnes)
// -------------------------------------------------------------------------
function ChapitreScreen({
  chapitre,
  index,
  total,
  onPrev,
  onNext,
  isLast,
}: {
  chapitre: Chapitre
  index: number
  total: number
  onPrev: (() => void) | null
  onNext: () => void
  isLast: boolean
}) {
  // Réponse à la mini-vérification. Le composant est remonté (key) à chaque
  // chapitre : l'état se réinitialise seul.
  const [choix, setChoix] = useState<number | null>(null)
  const repondu = choix !== null
  const correct = choix === chapitre.check.correct

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-10 items-start animate-fade-up">
      {/* Colonne contenu */}
      <div className="relative flex flex-col gap-6">
        <span aria-hidden className="pointer-events-none absolute -top-10 -left-3 text-[130px] leading-none font-bold text-white/[0.035] select-none">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="relative flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-gold">
            Chapitre {index + 1} · {chapitre.sousTitre}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-[1.1]" style={{ fontFamily: DISPLAY_FONT }}>
            {chapitre.titre}
          </h1>
          <p className="text-base md:text-lg text-[#c7c7c7] leading-relaxed max-w-xl">{chapitre.accroche}</p>
        </div>

        <div className="flex flex-col gap-3">
          {chapitre.points.map((p, i) => (
            <div
              key={p.titre}
              className="group flex items-start gap-4 p-4 md:p-5 bg-[#171717] border border-[#292929] rounded-2xl hover-lift"
            >
              <span className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#221c10] text-gold text-sm font-bold">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm md:text-base font-semibold text-white">{p.titre}</span>
                <span className="text-sm md:text-[15px] text-[#b6b6b6] leading-relaxed">{p.texte}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne vérification (collante sur desktop) */}
      <div className="lg:sticky lg:top-6 flex flex-col gap-5">
        <div className="relative overflow-hidden flex flex-col gap-4 p-5 md:p-6 bg-gradient-to-b from-[#1c1710] to-[#141414] border border-[#3a2f18] rounded-3xl">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          <div className="relative flex items-center gap-2.5">
            <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gold text-[#12100e]">
              <IconTarget size={18} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[2px] text-gold">Vérifions</span>
          </div>
          <p className="relative text-base font-semibold text-white leading-snug">{chapitre.check.question}</p>
          <div className="relative flex flex-col gap-2.5">
            {chapitre.check.options.map((opt, i) => {
              const selected = choix === i
              const showAsRight = repondu && i === chapitre.check.correct
              const showAsWrong = selected && !correct
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChoix(i)}
                  className={[
                    'flex items-center gap-3 text-left text-sm px-4 py-3 rounded-xl border transition-all',
                    showAsRight
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                      : showAsWrong
                        ? 'border-red-500/60 bg-red-500/10 text-red-100'
                        : selected
                          ? 'border-gold bg-[#221c10] text-white'
                          : 'border-[#33322e] bg-[#141414]/70 text-[#c7c7c7] hover:border-[#4a4033]',
                  ].join(' ')}
                >
                  <span className={[
                    'shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-bold',
                    showAsRight ? 'bg-emerald-500/20 text-emerald-200' : showAsWrong ? 'bg-red-500/20 text-red-200' : selected ? 'bg-gold text-[#12100e]' : 'bg-[#242424] text-[#8c8c8c]',
                  ].join(' ')}>
                    {showAsRight ? <IconCheck size={14} /> : LETTERS[i]}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>
          {repondu && (
            <p className={`relative text-sm leading-relaxed ${correct ? 'text-emerald-300' : 'text-[#c7c7c7]'}`}>
              {correct ? '✓ Exact. ' : 'Pas tout à fait — '}
              {chapitre.check.explication}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="min-h-[52px] px-5 rounded-2xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              ← Précédent
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!correct}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {!repondu
              ? 'Réponds pour continuer'
              : !correct
                ? 'Corrige ta réponse'
                : isLast
                  ? 'Terminer la formation'
                  : 'Chapitre suivant'}
            {correct && <IconArrow />}
          </button>
        </div>
        <p className="text-center text-xs text-[#6a6a6a]">Chapitre {index + 1} sur {total}</p>
      </div>
    </div>
  )
}

function CoursGuide({ onDone, onQuit }: { onDone: () => void; onQuit: () => void }) {
  const [i, setI] = useState(0)
  const chapitre = CHAPITRES[i]
  const isLast = i === CHAPITRES.length - 1

  function next() {
    if (isLast) {
      onDone()
      return
    }
    setI((n) => Math.min(n + 1, CHAPITRES.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function prev() {
    setI((n) => Math.max(n - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-7" style={{ fontFamily: BODY_FONT }}>
      <Ambient />
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onQuit}
          className="inline-flex items-center gap-1.5 text-sm text-[#8c8c8c] hover:text-white transition-colors"
        >
          ← Menu
        </button>
        <StepDots current={i} total={CHAPITRES.length} />
        <span className="text-sm text-[#8c8c8c] tabular-nums">{i + 1}/{CHAPITRES.length}</span>
      </div>
      <ChapitreScreen
        key={chapitre.id}
        chapitre={chapitre}
        index={i}
        total={CHAPITRES.length}
        onPrev={i > 0 ? prev : null}
        onNext={next}
        isLast={isLast}
      />
    </div>
  )
}

// -------------------------------------------------------------------------
// Test de validation — une question à la fois, corrigé côté serveur
// -------------------------------------------------------------------------
function Test({
  onQuit,
  onResult,
}: {
  onQuit: () => void
  onResult: (etat: TestEtat, res: { passed: boolean; scorePct: number }) => void
}) {
  const [i, setI] = useState(0)
  const [reponses, setReponses] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = TEST_QUESTIONS[i]
  const isLast = i === TEST_QUESTIONS.length - 1
  const choix = reponses[q.id]
  const repondu = choix !== undefined
  const nbRepondues = Object.keys(reponses).length
  const toutesRepondues = TEST_QUESTIONS.every((qq) => reponses[qq.id] !== undefined)

  async function submit() {
    if (!toutesRepondues || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vendeur/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reponses }),
      })
      const payload = await res.json()
      if (!res.ok && res.status !== 429) {
        throw new Error(payload?.error ?? 'Impossible d’envoyer le test.')
      }
      onResult(
        {
          reussi: !!payload.reussi,
          formationTerminee: !!payload.formationTerminee,
          tentatives: payload.tentatives,
          maxTentatives: payload.maxTentatives,
          meilleurScore: payload.meilleurScore ?? null,
          total: payload.total,
          scoreRequis: payload.scoreRequis,
          cooldownRestantMs: payload.cooldownRestantMs ?? 0,
        },
        { passed: !!payload.passed, scorePct: payload.scorePct ?? 0 }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-7" style={{ fontFamily: BODY_FONT }}>
      <Ambient />
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onQuit}
          className="inline-flex items-center gap-1.5 text-sm text-[#8c8c8c] hover:text-white transition-colors"
        >
          ← Quitter le test
        </button>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-gold">
          <IconTrophy size={15} /> Test de validation
        </span>
      </div>

      {/* En-tête : question courante + progression */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-[#8c8c8c]">
          <span className="tabular-nums">Question {i + 1} / {TEST_QUESTIONS.length}</span>
          <span className="tabular-nums">{nbRepondues} répondue{nbRepondues > 1 ? 's' : ''}</span>
        </div>
        <StepDots current={i} total={TEST_QUESTIONS.length} />
      </div>

      <div key={q.id} className="relative overflow-hidden flex flex-col gap-6 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-3xl animate-fade-up">
        <span aria-hidden className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.10), transparent 65%)' }} />
        <h2 className="relative text-xl md:text-2xl font-bold text-white leading-snug">{q.question}</h2>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, idx) => {
            const selected = choix === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setReponses((r) => ({ ...r, [q.id]: idx }))}
                className={[
                  'flex items-center gap-3 text-left text-sm md:text-[15px] px-4 py-4 rounded-2xl border transition-all',
                  selected
                    ? 'border-gold bg-[#221c10] text-white shadow-[0_8px_24px_-14px_rgba(201,151,58,0.6)]'
                    : 'border-[#292929] bg-[#141414] text-[#c7c7c7] hover:border-[#4a4033] hover-lift',
                ].join(' ')}
              >
                <span className={[
                  'shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold',
                  selected ? 'bg-gold text-[#12100e]' : 'bg-[#242424] text-[#8c8c8c]',
                ].join(' ')}>
                  {LETTERS[idx]}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {i > 0 && (
          <button
            type="button"
            onClick={() => setI((n) => Math.max(n - 1, 0))}
            className="min-h-[52px] px-5 rounded-2xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
          >
            ← Précédent
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!toutesRepondues || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {submitting ? 'Correction…' : toutesRepondues ? 'Valider mes réponses' : 'Réponds à toutes les questions'}
            {toutesRepondues && !submitting && <IconCheck size={18} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setI((n) => Math.min(n + 1, TEST_QUESTIONS.length - 1))}
            disabled={!repondu}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {repondu ? 'Question suivante' : 'Choisis une réponse'}
            {repondu && <IconArrow />}
          </button>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Compte à rebours autonome (cooldown)
// -------------------------------------------------------------------------
function Countdown({ ms, onExpire }: { ms: number; onExpire: () => void }) {
  const [restant, setRestant] = useState(ms)
  useEffect(() => {
    if (ms <= 0) return
    const t = setInterval(() => setRestant((v) => Math.max(0, v - 1000)), 1000)
    return () => clearInterval(t)
  }, [ms])
  useEffect(() => {
    if (restant <= 0) onExpire()
  }, [restant, onExpire])

  const totalMin = Math.ceil(restant / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor((restant % 60000) / 1000)
  return (
    <div className="flex items-end justify-center gap-3 font-bold text-gold tabular-nums" style={{ fontFamily: DISPLAY_FONT }}>
      {h > 0 && (
        <span className="flex flex-col items-center">
          <span className="text-4xl md:text-5xl leading-none">{String(h).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase tracking-widest text-[#8c8c8c] font-sans mt-1">heures</span>
        </span>
      )}
      <span className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl leading-none">{String(m).padStart(2, '0')}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#8c8c8c] font-sans mt-1">min</span>
      </span>
      {h === 0 && (
        <span className="flex flex-col items-center">
          <span className="text-4xl md:text-5xl leading-none">{String(s).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase tracking-widest text-[#8c8c8c] font-sans mt-1">sec</span>
        </span>
      )}
    </div>
  )
}

/** Panneau plein écran centré (états succès / cooldown / erreur). */
function CenterPanel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6" style={{ fontFamily: BODY_FONT }}>
      <Ambient />
      {children}
    </div>
  )
}

// -------------------------------------------------------------------------
// Composant principal
// -------------------------------------------------------------------------
type Mode = 'accueil' | 'cours' | 'test'

export function VendeurFormation({ prenom }: { prenom?: string | null }) {
  const [etat, setEtat] = useState<TestEtat | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('accueil')
  // Résultat du dernier passage (affiché après un échec).
  const [dernierEchec, setDernierEchec] = useState<{ scorePct: number } | null>(null)

  // Source de vérité : le serveur (pas de localStorage contournable).
  const coursFait = !!etat?.formationTerminee

  const chargerEtat = useCallback(async () => {
    try {
      const res = await fetch('/api/vendeur/test', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Chargement impossible.')
      setEtat(payload as TestEtat)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    chargerEtat()
  }, [chargerEtat])

  // Marque la formation comme terminée CÔTÉ SERVEUR (débloque le test).
  async function terminerCours() {
    try {
      const res = await fetch('/api/vendeur/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminer_formation' }),
      })
      const payload = await res.json()
      if (res.ok) setEtat(payload as TestEtat)
    } catch {
      // Silencieux : à défaut, le test reste verrouillé (coursFait piloté serveur).
    }
    setMode('accueil')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onTestResult(nouvelEtat: TestEtat, res: { passed: boolean; scorePct: number }) {
    setEtat(nouvelEtat)
    setDernierEchec(res.passed ? null : { scorePct: res.scorePct })
    setMode('accueil')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tentativesRestantes = useMemo(() => {
    if (!etat) return 0
    return Math.max(0, etat.maxTentatives - etat.tentatives)
  }, [etat])

  // --- États plein écran ---------------------------------------------------

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        <div className="h-8 w-52 skeleton rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 skeleton rounded-3xl" />
          <div className="h-64 skeleton rounded-3xl" />
        </div>
      </div>
    )
  }

  if (erreur || !etat) {
    return (
      <CenterPanel>
        <div className="flex flex-col items-center gap-5 p-8 bg-[#171717] border border-[#292929] rounded-3xl text-center">
          <h1 className="text-xl font-bold text-white">Oups</h1>
          <p className="text-sm text-[#8c8c8c]">{erreur ?? 'Impossible de charger ta formation.'}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setErreur(null)
              chargerEtat()
            }}
            className="min-h-[50px] px-6 rounded-2xl bg-gold text-[#12100e] text-sm font-bold active:scale-[0.98]"
          >
            Réessayer
          </button>
        </div>
        <LogoutLink center />
      </CenterPanel>
    )
  }

  // Test réussi → en attente de validation par l'équipe.
  if (etat.reussi) {
    return (
      <CenterPanel>
        <div className="relative overflow-hidden flex flex-col items-center gap-6 px-6 py-12 md:py-16 bg-gradient-to-b from-[#12190f] to-[#141414] border border-emerald-500/25 rounded-[28px] text-center animate-scale-in">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(95,191,127,0.10), transparent)' }} />
          <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 animate-pulse-glow">
            <IconTrophy size={38} />
          </div>
          <div className="relative flex flex-col gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Test réussi, <Lux>bravo{prenom ? ` ${prenom}` : ''}</Lux> !
            </h1>
            <p className="text-base text-[#c7c7c7] leading-relaxed max-w-md mx-auto">
              Tu maîtrises l’essentiel pour présenter et vendre ScanAvis. Ton dossier passe en
              validation finale : dès que l’équipe active ton compte, ton code et ton tableau de bord
              se débloquent ici même.
            </p>
            {etat.meilleurScore != null && (
              <div className="inline-flex items-center gap-2 self-center mt-1 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-sm font-semibold">
                <IconCheck size={16} /> Score : {etat.meilleurScore}%
              </div>
            )}
          </div>
        </div>
        <LogoutLink center />
      </CenterPanel>
    )
  }

  // Cooldown actif : tentatives épuisées, il faut patienter.
  if (etat.cooldownRestantMs > 0) {
    if (mode === 'cours') {
      return <CoursGuide onDone={terminerCours} onQuit={() => setMode('accueil')} />
    }
    return (
      <CenterPanel>
        <div className="relative overflow-hidden flex flex-col items-center gap-6 px-6 py-12 bg-gradient-to-b from-[#1c1710] to-[#141414] border border-[#3a2f18] rounded-[28px] text-center animate-scale-in">
          <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-[#221c10] text-gold">
            <IconClock size={36} />
          </div>
          <div className="relative flex flex-col gap-3 items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Fais une pause</h1>
            <p className="text-base text-[#c7c7c7] leading-relaxed max-w-md">
              Tu as utilisé tes {etat.maxTentatives} tentatives. Reprends la formation tranquillement —
              tu pourras retenter le test dans :
            </p>
            <div className="mt-2">
              <Countdown ms={etat.cooldownRestantMs} onExpire={chargerEtat} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMode('cours')}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
        >
          <IconBook size={17} /> Revoir la formation en attendant
        </button>
        <LogoutLink center />
      </CenterPanel>
    )
  }

  // --- Mode cours / test ---------------------------------------------------
  if (mode === 'cours') {
    return <CoursGuide onDone={terminerCours} onQuit={() => setMode('accueil')} />
  }
  if (mode === 'test') {
    return <Test onQuit={() => setMode('accueil')} onResult={onTestResult} />
  }

  // --- Accueil (hub) -------------------------------------------------------
  const seuilPct = Math.round((etat.scoreRequis / etat.total) * 100)

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 md:gap-12 animate-fade-up" style={{ fontFamily: BODY_FONT }}>
      <Ambient />

      {/* Hero */}
      <header className="flex flex-col items-center text-center gap-5 pt-2">
        <Eyebrow>Formation vendeur ScanAvis</Eyebrow>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] max-w-3xl">
          {prenom ? `Bienvenue ${prenom}, ` : 'Bienvenue, '}
          <Lux>prépare ton terrain</Lux>
        </h1>
        <p className="text-base md:text-lg text-[#c7c7c7] leading-relaxed max-w-2xl">
          Ta candidature est validée. Avant de te lancer, suis la formation : elle te donne tout pour
          présenter et vendre ScanAvis avec assurance. Un court test la valide à la fin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${coursFait ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-[#292929] bg-[#171717] text-[#8c8c8c]'}`}>
            {coursFait ? <IconCheck size={14} /> : <IconBook size={14} />} {CHAPITRES.length} chapitres
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#292929] bg-[#171717] text-[#8c8c8c]">
            <IconTrophy size={14} /> Test · {seuilPct}% requis
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#292929] bg-[#171717] text-[#8c8c8c]">
            <IconTarget size={14} /> {tentativesRestantes}/{etat.maxTentatives} tentatives
          </span>
        </div>
      </header>

      {dernierEchec && (
        <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center gap-3 md:gap-5 p-5 md:p-6 bg-[#181010] border border-[#2e1515] rounded-2xl">
          <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-red-500/10 text-[#e07a7a] text-xl font-bold">!</div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-[#e79a9a]">Test non réussi cette fois</p>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              Ton score : <span className="text-white font-semibold">{dernierEchec.scorePct}%</span> (il faut {seuilPct}%).
              Revois les chapitres concernés, puis retente. Il te reste{' '}
              <span className="text-white font-semibold">{tentativesRestantes}</span>{' '}
              tentative{tentativesRestantes > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Corps : programme (gauche) + étapes (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-8 items-start">
        {/* Programme */}
        <section className="flex flex-col gap-5 p-6 md:p-7 bg-[#171717] border border-[#292929] rounded-3xl">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#221c10] text-gold">
              <IconBook size={20} />
            </span>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-white">Au programme</h2>
              <span className="text-xs text-[#8c8c8c]">Tout ce que tu dois maîtriser sur le terrain</span>
            </div>
          </div>
          <ol className="flex flex-col">
            {CHAPITRES.map((c, idx) => (
              <li
                key={c.id}
                className="flex items-start gap-4 py-3.5 border-b border-[#242424] last:border-b-0"
              >
                <span className={`shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${coursFait ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#221c10] text-gold'}`}>
                  {coursFait ? <IconCheck size={16} /> : idx + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm md:text-[15px] font-semibold text-white leading-snug">{c.titre}</span>
                  <span className="text-xs md:text-sm text-[#8c8c8c] leading-snug">{c.sousTitre}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Étapes d'action */}
        <div className="flex flex-col gap-6">
          {/* Étape 1 : formation */}
          <div className="relative overflow-hidden flex flex-col gap-4 p-6 md:p-7 bg-gradient-to-b from-[#1c1710] to-[#171717] border border-[#3a2f18] rounded-3xl">
            <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
            <div className="relative flex items-center gap-3">
              <span className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gold text-[#12100e] font-bold text-lg">1</span>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white">La formation</h3>
                {coursFait && <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><IconCheck size={13} /> Parcourue</span>}
              </div>
            </div>
            <p className="relative text-sm md:text-[15px] text-[#c7c7c7] leading-relaxed">
              {CHAPITRES.length} chapitres courts et interactifs : le pitch, le problème, la démo,
              l’offre, les cibles, les objections et la conclusion. Une mini-question valide chaque étape.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('cours')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="relative inline-flex items-center justify-center gap-2 min-h-[54px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold active:scale-[0.98] transition-transform"
            >
              {coursFait ? 'Revoir la formation' : 'Commencer la formation'}
              <IconArrow />
            </button>
          </div>

          {/* Étape 2 : test */}
          <div className={`relative overflow-hidden flex flex-col gap-4 p-6 md:p-7 rounded-3xl border ${coursFait ? 'bg-[#171717] border-[#292929]' : 'bg-[#141414] border-[#242424]'}`}>
            <div className="relative flex items-center gap-3">
              <span className={`w-11 h-11 flex items-center justify-center rounded-2xl font-bold text-lg ${coursFait ? 'bg-gold text-[#12100e]' : 'bg-[#242424] text-[#6a6a6a]'}`}>
                {coursFait ? '2' : <IconLock size={20} />}
              </span>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white">Le test de validation</h3>
                <span className="text-xs text-[#8c8c8c]">{tentativesRestantes}/{etat.maxTentatives} tentatives restantes</span>
              </div>
            </div>
            <p className="relative text-sm md:text-[15px] text-[#c7c7c7] leading-relaxed">
              {etat.total} questions · {seuilPct}% de bonnes réponses requis. {etat.maxTentatives} tentatives,
              puis une pause de {TEST_CONFIG.cooldownHeures}h. La réussite envoie ton dossier en validation finale.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('test')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              disabled={!coursFait}
              className="relative inline-flex items-center justify-center gap-2 min-h-[54px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold disabled:bg-[#242424] disabled:text-[#6a6a6a] disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {coursFait ? (
                <>Passer le test <IconArrow /></>
              ) : (
                <><IconLock size={17} /> Termine d’abord la formation</>
              )}
            </button>
          </div>
        </div>
      </div>

      <LogoutLink center />
    </div>
  )
}
