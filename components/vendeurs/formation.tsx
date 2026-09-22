'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

// -------------------------------------------------------------------------
// Primitives visuelles
// -------------------------------------------------------------------------
function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-[#8c8c8c]">
        <span>
          Étape {Math.min(value, total)} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#292929] overflow-hidden">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function LogoutLink() {
  async function logout() {
    await supabase.auth.signOut()
    window.location.assign('/rejoindre/connexion')
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="min-h-[44px] text-sm text-[#8c8c8c] hover:text-white transition-colors"
    >
      Se déconnecter
    </button>
  )
}

// -------------------------------------------------------------------------
// Parcours guidé — un chapitre à la fois
// -------------------------------------------------------------------------
function ChapitreScreen({
  chapitre,
  onPrev,
  onNext,
  isLast,
}: {
  chapitre: Chapitre
  onPrev: (() => void) | null
  onNext: () => void
  isLast: boolean
}) {
  // Réponse à la mini-vérification. `null` tant que rien n'est choisi.
  // Le composant est remonté (key) à chaque chapitre : l'état se réinitialise seul.
  const [choix, setChoix] = useState<number | null>(null)
  const repondu = choix !== null
  const correct = choix === chapitre.check.correct

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-up">
      <div className="flex flex-col gap-2">
        <span className="self-start text-[11px] uppercase tracking-widest text-gold">
          {chapitre.sousTitre}
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{chapitre.titre}</h1>
        <p className="text-sm text-[#c7c7c7] leading-relaxed">{chapitre.accroche}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {chapitre.points.map((p) => (
          <div key={p.titre} className="flex flex-col gap-1 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
            <span className="text-sm font-semibold text-white">{p.titre}</span>
            <span className="text-sm text-[#c7c7c7] leading-relaxed">{p.texte}</span>
          </div>
        ))}
      </div>

      {/* Mini-vérification : il faut répondre juste pour continuer. */}
      <div className="flex flex-col gap-3 p-4 bg-[#141414] border border-[#292929] rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#221c10] text-gold text-xs font-bold">
            ?
          </span>
          <span className="text-sm font-semibold text-white">{chapitre.check.question}</span>
        </div>
        <div className="flex flex-col gap-2">
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
                  'text-left text-sm px-4 py-3 rounded-xl border transition-colors',
                  showAsRight
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                    : showAsWrong
                      ? 'border-red-500/50 bg-red-500/10 text-red-200'
                      : selected
                        ? 'border-gold bg-[#221c10] text-white'
                        : 'border-[#292929] bg-[#171717] text-[#c7c7c7] hover:border-[#3a3a3a]',
                ].join(' ')}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {repondu && (
          <p className={`text-sm leading-relaxed ${correct ? 'text-emerald-300' : 'text-[#c7c7c7]'}`}>
            {correct ? '✓ Exact. ' : 'Pas tout à fait. '}
            {chapitre.check.explication}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="min-h-[46px] px-4 rounded-xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
          >
            Précédent
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!correct}
          className="flex-1 min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {!repondu
            ? 'Réponds pour continuer'
            : !correct
              ? 'Corrige ta réponse'
              : isLast
                ? 'Terminer la formation'
                : 'Continuer'}
        </button>
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
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onQuit}
          className="text-sm text-[#8c8c8c] hover:text-white transition-colors"
        >
          ← Menu
        </button>
      </div>
      <ProgressBar value={i + 1} total={CHAPITRES.length} />
      <ChapitreScreen
        key={chapitre.id}
        chapitre={chapitre}
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
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onQuit}
          className="text-sm text-[#8c8c8c] hover:text-white transition-colors"
        >
          ← Quitter le test
        </button>
        <span className="text-xs text-[#8c8c8c]">
          {Object.keys(reponses).length} / {TEST_QUESTIONS.length} répondues
        </span>
      </div>

      <ProgressBar value={i + 1} total={TEST_QUESTIONS.length} />

      <div className="flex flex-col gap-4 animate-fade-up">
        <div className="flex flex-col gap-2">
          <span className="self-start text-[11px] uppercase tracking-widest text-gold">
            Question {i + 1}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-white leading-tight">{q.question}</h2>
        </div>

        <div className="flex flex-col gap-2">
          {q.options.map((opt, idx) => {
            const selected = choix === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setReponses((r) => ({ ...r, [q.id]: idx }))}
                className={[
                  'text-left text-sm px-4 py-3 rounded-xl border transition-colors',
                  selected
                    ? 'border-gold bg-[#221c10] text-white'
                    : 'border-[#292929] bg-[#171717] text-[#c7c7c7] hover:border-[#3a3a3a]',
                ].join(' ')}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI((n) => Math.max(n - 1, 0))}
              className="min-h-[46px] px-4 rounded-xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              Précédent
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={!toutesRepondues || submitting}
              className="flex-1 min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {submitting
                ? 'Correction…'
                : toutesRepondues
                  ? 'Valider mes réponses'
                  : 'Réponds à toutes les questions'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setI((n) => Math.min(n + 1, TEST_QUESTIONS.length - 1))}
              disabled={!repondu}
              className="flex-1 min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {repondu ? 'Question suivante' : 'Choisis une réponse'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Compteur de cooldown vivant (met à jour l'affichage chaque minute).
// -------------------------------------------------------------------------
// Compte à rebours autonome : monté à l'affichage du cooldown, il initialise son
// état une seule fois (aucune synchro de prop dans un effet). Prévient le parent
// une fois écoulé pour qu'il rafraîchisse l'état serveur.
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
  return <p className="text-2xl font-bold text-gold">{formatDuree(restant)}</p>
}

function formatDuree(ms: number): string {
  const totalMin = Math.ceil(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`
  return `${m} min`
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
    if (res.passed) {
      setDernierEchec(null)
    } else {
      setDernierEchec({ scorePct: res.scorePct })
    }
    setMode('accueil')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tentativesRestantes = useMemo(() => {
    if (!etat) return 0
    return Math.max(0, etat.maxTentatives - etat.tentatives)
  }, [etat])

  // --- États plein écran ---------------------------------------------------

  if (loading) {
    return <p className="text-sm text-[#8c8c8c]">Chargement de ta formation…</p>
  }

  if (erreur || !etat) {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-5 p-6 bg-[#171717] border border-[#292929] rounded-2xl text-center">
        <h1 className="text-lg font-bold text-white">Oups</h1>
        <p className="text-sm text-[#8c8c8c]">{erreur ?? 'Impossible de charger ta formation.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setErreur(null)
            chargerEtat()
          }}
          className="min-h-[46px] px-5 rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98]"
        >
          Réessayer
        </button>
        <LogoutLink />
      </div>
    )
  }

  // Test réussi → en attente de validation par l'équipe.
  if (etat.reussi) {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-5 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center animate-scale-in">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-500/15">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5fbf7f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-white">Test réussi, bravo{prenom ? ` ${prenom}` : ''} !</h1>
          <p className="text-sm text-[#c7c7c7] leading-relaxed">
            Tu maîtrises l’essentiel pour présenter et vendre ScanAvis. Ton dossier passe maintenant
            en validation finale : dès que l’équipe active ton compte, ton code et ton tableau de bord
            se débloquent ici même.
          </p>
          {etat.meilleurScore != null && (
            <p className="text-sm text-[#8c8c8c]">
              Ton score : <span className="text-emerald-300 font-semibold">{etat.meilleurScore}%</span>
            </p>
          )}
        </div>
        <LogoutLink />
      </div>
    )
  }

  // Cooldown actif : tentatives épuisées, il faut patienter.
  if (etat.cooldownRestantMs > 0) {
    return (
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex flex-col items-center gap-5 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center animate-scale-in">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#221c10]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-white">Fais une pause</h1>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              Tu as utilisé tes {etat.maxTentatives} tentatives. Reprends la formation tranquillement,
              tu pourras retenter le test dans :
            </p>
            <Countdown ms={etat.cooldownRestantMs} onExpire={chargerEtat} />
          </div>
        </div>
        {mode === 'cours' ? (
          <CoursGuide onDone={terminerCours} onQuit={() => setMode('accueil')} />
        ) : (
          <button
            type="button"
            onClick={() => setMode('cours')}
            className="min-h-[46px] rounded-xl border border-[#292929] text-sm text-[#c7c7c7] hover:text-white hover:border-[#3a3a3a] transition-colors"
          >
            Revoir la formation en attendant
          </button>
        )}
        <div className="flex justify-center">
          <LogoutLink />
        </div>
      </div>
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
  return (
    <div className="w-full max-w-md flex flex-col gap-5 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white">
          {prenom ? `Bienvenue ${prenom}` : 'Bienvenue'}
        </h1>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Ta candidature est validée. Avant de te lancer, suis la formation : elle te donne tout pour
          présenter et vendre ScanAvis avec assurance. Un test la valide à la fin.
        </p>
      </div>

      {dernierEchec && (
        <div className="flex flex-col gap-1 p-4 bg-[#181010] border border-[#2e1515] rounded-2xl">
          <p className="text-sm font-semibold text-[#e07a7a]">Test non réussi cette fois</p>
          <p className="text-sm text-[#c7c7c7] leading-relaxed">
            Ton score : {dernierEchec.scorePct}% (il faut {Math.round((etat.scoreRequis / etat.total) * 100)}%).
            Revois les chapitres concernés, puis retente. Il te reste{' '}
            <span className="text-white font-semibold">{tentativesRestantes}</span>{' '}
            tentative{tentativesRestantes > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Étape 1 : la formation */}
      <div className="flex flex-col gap-3 p-5 bg-[#171717] border border-[#292929] rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#221c10] text-gold text-sm font-bold">
            1
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-white">La formation</h2>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              {CHAPITRES.length} chapitres courts et interactifs : le pitch, le problème, la démo,
              l’offre, les cibles, les objections et la conclusion.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('cours')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          {coursFait ? 'Revoir la formation' : 'Commencer la formation'}
        </button>
        {coursFait && <p className="text-xs text-emerald-300">✓ Formation parcourue</p>}
      </div>

      {/* Étape 2 : le test */}
      <div className="flex flex-col gap-3 p-5 bg-[#171717] border border-[#292929] rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#221c10] text-gold text-sm font-bold">
            2
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-white">Le test de validation</h2>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              {etat.total} questions. Il faut {Math.round((etat.scoreRequis / etat.total) * 100)}% de
              bonnes réponses. {etat.maxTentatives} tentatives, puis une pause de {TEST_CONFIG.cooldownHeures}h.
              La réussite envoie ton dossier en validation finale.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('test')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          disabled={!coursFait}
          className="min-h-[46px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold disabled:bg-[#292929] disabled:text-[#6a6a6a] disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {coursFait ? 'Passer le test' : 'Termine d’abord la formation'}
        </button>
        <p className="text-xs text-[#8c8c8c]">
          Tentatives restantes : <span className="text-white">{tentativesRestantes}</span> / {etat.maxTentatives}
        </p>
      </div>

      <div className="flex justify-center">
        <LogoutLink />
      </div>
    </div>
  )
}
