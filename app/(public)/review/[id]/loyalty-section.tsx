'use client'

/**
 * Carte de fidélité affichée AU-DESSUS du parcours d'avis existant.
 *
 * RÈGLE ABSOLUE : le tampon récompense la VISITE, jamais l'avis. Ce composant
 * n'a aucun lien logique ni textuel avec les étoiles / l'avis Google. Il se
 * termine par un séparateur « et aussi » qui introduit le parcours d'avis rendu
 * juste en dessous (composant ReviewClientPage, non modifié).
 *
 * La carte + le tampon du jour sont créés par la Server Action recordVisitAction
 * appelée APRÈS l'affichage (jamais au rendu SSR), pour que les aperçus de lien
 * (WhatsApp/iMessage/robots) ne faussent pas les statistiques.
 */
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  recordVisitAction,
  validateRewardAction,
  saveContactAction,
  recoverCardAction,
} from './actions'
import type { LoyaltyState, LoyaltyReward } from '@/lib/loyalty'

const STYLES = `
  .loy-screen { background: radial-gradient(ellipse 560px 420px at center top, rgba(201,151,58,0.07) 0%, transparent 62%), #0d0d0d; }
  @keyframes loyStampPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.22); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes loyStampGlow { 0%,100% { box-shadow: 0 6px 16px -8px rgba(201,151,58,.8), inset 0 1px 0 rgba(255,255,255,.4); } 50% { box-shadow: 0 0 22px 2px rgba(201,151,58,.75), inset 0 1px 0 rgba(255,255,255,.4); } }
  .loy-just-added { animation: loyStampPop .5s cubic-bezier(.22,1,.36,1) both, loyStampGlow 1.8s ease-in-out 1; }
  @keyframes loySpin { to { transform: rotate(360deg); } }
  .loy-spin { animation: loySpin 2s linear infinite; transform-origin: center; }
  @keyframes loyBlink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
  .loy-blink { animation: loyBlink 1.4s ease-in-out infinite; }
  @keyframes loyRise { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
  .loy-rise { animation: loyRise .45s cubic-bezier(.22,1,.36,1) both; }
  .loy-tap { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  @media (prefers-reduced-motion: reduce) {
    .loy-just-added, .loy-spin, .loy-blink, .loy-rise { animation: none !important; }
    /* NB : l'horloge "en direct" continue de défiler (JS) — c'est fonctionnel. */
  }
`

/* ─── Icônes ─────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function GiftIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

/* ─── Grille de tampons ──────────────────────────────────── */
function StampGrid({
  rewards, stampCount, maxThreshold, justStamped,
}: {
  rewards: LoyaltyReward[]
  stampCount: number
  maxThreshold: number
  justStamped: boolean
}) {
  if (maxThreshold <= 0) return null
  const rewardAt = new Map(rewards.map((r) => [r.threshold, r.label]))
  const cells = Array.from({ length: maxThreshold }, (_, i) => i + 1)
  const hasFlags = rewards.length > 0

  return (
    <div
      className="grid grid-cols-5 gap-3"
      style={{ margin: hasFlags ? '16px 0 26px' : '16px 0 6px' }}
    >
      {cells.map((pos) => {
        const filled = pos <= stampCount
        const isMilestone = rewardAt.has(pos)
        const isJust = justStamped && pos === stampCount
        const label = rewardAt.get(pos)
        return (
          <div key={pos} className="relative" style={{ aspectRatio: '1 / 1' }}>
            <div
              className={[
                'w-full h-full rounded-full grid place-items-center',
                filled ? 'text-[#2a1e08]' : 'text-[#4a4a4a]',
                isJust ? 'loy-just-added' : '',
              ].join(' ')}
              style={
                filled
                  ? {
                      background: 'radial-gradient(circle at 32% 28%, #e7bd62, #C9973A 62%, #9a6e22)',
                      boxShadow: '0 6px 16px -8px rgba(201,151,58,.8), inset 0 1px 0 rgba(255,255,255,.4)',
                    }
                  : { border: '1.6px dashed #3a3a3a' }
              }
            >
              {filled ? <CheckIcon /> : <span className="text-[13px] font-semibold">{pos}</span>}
            </div>
            {isMilestone && (
              <>
                <span
                  aria-hidden
                  className="absolute rounded-full pointer-events-none"
                  style={{ inset: '-5px', border: '1.5px solid rgba(201,151,58,.55)' }}
                />
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-gold font-semibold"
                  style={{ bottom: '-20px', fontSize: '9px' }}
                >
                  {label}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Barre de progression vers le prochain palier ───────── */
function Progress({ state }: { state: LoyaltyState }) {
  const { nextReward, stampCount } = state
  if (!nextReward) return null
  const pct = Math.min(100, Math.round((stampCount / nextReward.threshold) * 100))
  const remaining = nextReward.remaining
  return (
    <div className="mt-1">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[13px] font-semibold text-white">
          Plus que <b className="text-gold">{remaining} passage{remaining > 1 ? 's' : ''}</b> pour {nextReward.label}
        </span>
        <span className="text-[11.5px] text-[#8c8c8c]">{stampCount} / {nextReward.threshold}</span>
      </div>
      <div className="h-[9px] rounded-full bg-[#0f0f0f] border border-[#222222] overflow-hidden">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#C9973A,#e6b84a)', transition: 'width .5s cubic-bezier(.22,1,.36,1)' }}
        />
      </div>
    </div>
  )
}

/* ─── Encart « Ne perdez pas vos tampons » (dès le 2e passage) ─ */
function SaveContactCard({
  businessId, onSaved,
}: {
  businessId: string
  onSaved: (s: LoyaltyState) => void
}) {
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [pending, start] = useTransition()

  if (dismissed) return null

  function submit() {
    setError(null)
    const input = mode === 'email' ? { email: value } : { phone: value }
    start(async () => {
      const res = await saveContactAction(businessId, input)
      if (res.ok && res.state) onSaved(res.state)
      else setError(
        res.error === 'email' ? 'E-mail invalide.'
        : res.error === 'phone' ? 'Numéro invalide.'
        : 'Vérifiez votre saisie.'
      )
    })
  }

  return (
    <div
      className="w-full rounded-[20px] p-[18px]"
      style={{ background: 'linear-gradient(160deg,#1a160d,#141414)', border: '1px solid rgba(201,151,58,.26)' }}
    >
      <div className="flex items-center gap-2 text-[14px] font-semibold">
        <svg className="text-gold" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
        Ne perdez pas vos tampons
      </div>
      <p className="text-[12px] text-[#8c8c8c] mt-[7px] mb-[13px] leading-relaxed">
        Rattachez votre carte à un contact pour la retrouver même en changeant de téléphone.
      </p>
      <div className="flex bg-[#0f0f0f] border border-[#292929] rounded-xl p-1 gap-1 mb-[10px]">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setValue(''); setError(null) }}
            className={[
              'loy-tap flex-1 text-[12.5px] py-2 rounded-[9px] transition-colors',
              mode === m ? 'bg-gold text-[#12100e] font-semibold' : 'text-[#8c8c8c]',
            ].join(' ')}
          >
            {m === 'email' ? 'E-mail' : 'Téléphone'}
          </button>
        ))}
      </div>
      <input
        type={mode === 'email' ? 'email' : 'tel'}
        inputMode={mode === 'email' ? 'email' : 'tel'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === 'email' ? 'vous@exemple.com' : '06 12 34 56 78'}
        className="w-full bg-[#0f0f0f] border border-[#292929] rounded-xl px-[13px] py-3 text-white text-[14px] outline-none focus:border-[rgba(201,151,58,.5)]"
      />
      {error && <p className="text-[12px] text-[#ef5a5a] mt-2">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || value.trim() === ''}
        className="loy-tap w-full mt-[11px] min-h-[50px] rounded-[14px] text-[14px] font-semibold text-[#12100e] disabled:opacity-40 active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg,#e2ad4d,#C9973A)', boxShadow: '0 8px 22px -10px rgba(201,151,58,.55)' }}
      >
        {pending ? 'Enregistrement…' : 'Sauvegarder'}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="loy-tap block w-full text-center text-[12px] text-[#666] mt-[11px] hover:text-[#8c8c8c]"
      >
        Plus tard
      </button>
    </div>
  )
}

/* ─── Lien « Vous aviez déjà une carte ? » (récupération) ─── */
function RecoverCard({
  businessId, onRecovered,
}: {
  businessId: string
  onRecovered: (s: LoyaltyState) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setMsg(null)
    const input = mode === 'email' ? { email: value } : { phone: value }
    start(async () => {
      const res = await recoverCardAction(businessId, input)
      if (res.recovered && res.state) onRecovered(res.state)
      else setMsg('Aucune carte trouvée pour ce contact.')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="loy-tap block w-full text-center text-[12px] text-[#666] hover:text-[#8c8c8c] underline underline-offset-2"
      >
        Vous aviez déjà une carte ?
      </button>
    )
  }

  return (
    <div className="w-full bg-[#171717] border border-[#222222] rounded-[18px] p-[18px]">
      <p className="text-[13px] font-semibold mb-1">Retrouver ma carte</p>
      <p className="text-[12px] text-[#8c8c8c] mb-3 leading-relaxed">
        Entrez l&apos;e-mail ou le téléphone utilisé pour la sauvegarder.
      </p>
      <div className="flex bg-[#0f0f0f] border border-[#292929] rounded-xl p-1 gap-1 mb-[10px]">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setValue(''); setMsg(null) }}
            className={[
              'loy-tap flex-1 text-[12.5px] py-2 rounded-[9px] transition-colors',
              mode === m ? 'bg-gold text-[#12100e] font-semibold' : 'text-[#8c8c8c]',
            ].join(' ')}
          >
            {m === 'email' ? 'E-mail' : 'Téléphone'}
          </button>
        ))}
      </div>
      <input
        type={mode === 'email' ? 'email' : 'tel'}
        inputMode={mode === 'email' ? 'email' : 'tel'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === 'email' ? 'vous@exemple.com' : '06 12 34 56 78'}
        className="w-full bg-[#0f0f0f] border border-[#292929] rounded-xl px-[13px] py-3 text-white text-[14px] outline-none focus:border-[rgba(201,151,58,.5)]"
      />
      {msg && <p className="text-[12px] text-[#ef5a5a] mt-2">{msg}</p>}
      <div className="flex gap-[10px] mt-3">
        <button
          type="button"
          onClick={() => { setOpen(false); setMsg(null); setValue('') }}
          className="loy-tap flex-1 min-h-[46px] rounded-[14px] text-[14px] text-[#8c8c8c] border border-[#292929]"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || value.trim() === ''}
          className="loy-tap flex-1 min-h-[46px] rounded-[14px] text-[14px] font-semibold text-[#12100e] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#e2ad4d,#C9973A)' }}
        >
          {pending ? '…' : 'Retrouver'}
        </button>
      </div>
    </div>
  )
}

/* ─── Horloge « en direct » (preuve anti-capture) ────────── */
function useLiveClock(): string {
  const [t, setT] = useState('')
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, '0')
    const tick = () => {
      const d = new Date()
      setT(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

/* ─── Popup récompense plein écran (écran 4) ─────────────── */
function RewardPopup({
  businessId, pending, onValidated,
}: {
  businessId: string
  pending: NonNullable<LoyaltyState['pendingReward']>
  onValidated: (s: LoyaltyState) => void
}) {
  const [view, setView] = useState<'reward' | 'confirm'>('reward')
  const [saving, start] = useTransition()
  const clock = useLiveClock()

  // Empêche le scroll de la page derrière la popup.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function confirmReceived() {
    start(async () => {
      const s = await validateRewardAction(businessId, pending.redemptionId)
      onValidated(s)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Récompense : ${pending.label}`}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'rgba(6,6,7,.86)', backdropFilter: 'blur(6px)' }}
      /* Non fermable au clic extérieur : aucun onClick de fermeture sur le fond. */
    >
      {view === 'reward' ? (
        <div
          className="loy-rise w-full max-w-sm rounded-[26px] p-7"
          style={{ background: 'linear-gradient(170deg,#1c1710,#121212)', border: '1px solid rgba(201,151,58,.4)', boxShadow: '0 0 60px -20px rgba(201,151,58,.5)' }}
        >
          <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold">Récompense débloquée</p>
          <div
            className="w-[74px] h-[74px] mx-auto my-3 rounded-full grid place-items-center text-[#2a1e08]"
            style={{ background: 'radial-gradient(circle at 34% 30%,#e9c069,#C9973A 64%,#9a6e22)', boxShadow: '0 0 34px -4px rgba(201,151,58,.7)' }}
          >
            <GiftIcon />
          </div>
          <h2 className="text-[25px] font-bold leading-tight">{pending.label}</h2>
          <p className="text-[13px] text-[#d9d9d9] mt-[10px] leading-relaxed">Montrez cet écran au commerçant.</p>

          <div className="inline-flex items-center gap-3 mx-auto mt-5 mb-[6px] bg-[#0f0f0f] border border-[#292929] rounded-[14px] px-4 py-[11px]">
            <span className="w-[30px] h-[30px] block">
              <svg className="loy-spin" viewBox="0 0 36 36" fill="none" stroke="#C9973A" strokeWidth="3" strokeLinecap="round">
                <circle cx="18" cy="18" r="15" stroke="#2a2a2a" />
                <path d="M18 3 a15 15 0 0 1 10.6 4.4" />
              </svg>
            </span>
            <span className="text-left">
              <span className="block text-[9.5px] tracking-[0.14em] uppercase text-[#8c8c8c]">
                <span className="loy-blink inline-block w-[7px] h-[7px] rounded-full bg-[#49d17a] mr-[5px] align-middle" />
                en direct
              </span>
              <span className="block text-[22px] font-bold tracking-wide text-white tabular-nums">{clock || '—'}</span>
            </span>
          </div>
          <p className="text-[10.5px] text-[#666] mt-3 leading-snug">
            L&apos;heure défile en continu : preuve que cet écran n&apos;est pas une capture.
          </p>

          <button
            type="button"
            onClick={() => setView('confirm')}
            className="loy-tap w-full mt-[18px] min-h-[52px] rounded-[14px] text-[14px] font-semibold text-[#12100e] active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#e2ad4d,#C9973A)', boxShadow: '0 8px 22px -10px rgba(201,151,58,.55)' }}
          >
            J&apos;ai reçu ma récompense
          </button>
        </div>
      ) : (
        <div className="loy-rise w-full max-w-sm bg-[#171717] border border-[#292929] rounded-[20px] p-[22px]">
          <h3 className="text-[17px] font-bold">Confirmer ?</h3>
          <p className="text-[12.5px] text-[#8c8c8c] mt-2 leading-relaxed">
            Avez-vous bien montré cet écran au commerçant ?<br />
            <b className="text-[#e9d7b4]">Cette récompense disparaîtra.</b>
          </p>
          <div className="flex gap-[10px] mt-[18px]">
            <button
              type="button"
              onClick={() => setView('reward')}
              disabled={saving}
              className="loy-tap flex-1 min-h-[46px] rounded-[14px] text-[14px] text-[#8c8c8c] border border-[#292929]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmReceived}
              disabled={saving}
              className="loy-tap flex-1 min-h-[46px] rounded-[14px] text-[14px] font-semibold text-[#12100e] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#e2ad4d,#C9973A)' }}
            >
              {saving ? '…' : 'Oui'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Section principale ─────────────────────────────────── */
export default function LoyaltySection({
  businessId, businessName, rewards,
}: {
  businessId: string
  businessName: string
  rewards: LoyaltyReward[]
}) {
  const [state, setState] = useState<LoyaltyState | null>(null)
  const started = useRef(false)

  // Enregistre la visite UNE fois, après l'affichage (jamais au rendu SSR).
  useEffect(() => {
    if (started.current) return
    started.current = true
    recordVisitAction(businessId).then(setState).catch(() => setState(null))
  }, [businessId])

  const maxThreshold = state?.maxThreshold ?? (rewards.length ? Math.max(...rewards.map((r) => r.threshold)) : 0)
  const stampCount = state?.stampCount ?? 0
  const loaded = state !== null
  // Programme désactivé entre le SSR et le montage : on n'affiche rien.
  if (loaded && !state.active) return null

  const name = businessName.trim() || 'Votre carte de fidélité'
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'SA'

  const showSaveCard = loaded && state.hasCard && stampCount >= 2 && !state.contactSaved
  const showRecover = loaded && !state.contactSaved

  return (
    <>
      <style>{STYLES}</style>
      <div className="loy-screen w-full flex flex-col items-center px-4 pt-10 pb-6">
        <div className="w-[90%] sm:w-full max-w-md flex flex-col items-center gap-5">
          {/* En-tête commerce */}
          <div className="flex flex-col items-center gap-[10px] text-center">
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center text-gold font-bold text-xl"
              style={{ background: 'linear-gradient(145deg,#232323,#141414)', border: '1px solid #2f2f2f', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)' }}
            >
              {initials}
            </div>
            <h1 className="text-[19px] font-bold">{name}</h1>
          </div>

          {/* Carte */}
          <div className="w-full bg-[#171717] border border-[#222222] rounded-[22px] p-5">
            {!loaded ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="skeleton w-40 h-4" />
                <div className="skeleton w-full h-24" />
              </div>
            ) : state.alreadyStampedToday && !state.justStamped ? (
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-[62px] h-[62px] rounded-[18px] grid place-items-center text-gold mb-1" style={{ background: '#201a0e', border: '1px solid rgba(201,151,58,.3)' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                </div>
                <h2 className="text-[18px] font-bold">Vous avez déjà votre tampon du jour 👋</h2>
                <p className="text-[13px] text-[#8c8c8c] leading-relaxed max-w-[260px]">
                  À demain ! Un seul tampon par jour — revenez nous voir pour le prochain.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-1">
                <p className="text-[11px] tracking-[0.18em] uppercase text-[#8c8c8c]">
                  {state.justStamped && stampCount === 1 ? 'Bienvenue' : 'Passage enregistré'}
                </p>
                <p className="text-[17px] font-semibold">
                  {state.justStamped && stampCount === 1
                    ? 'Votre carte de fidélité est créée 🎉'
                    : state.justStamped
                    ? `+1 tampon, et de ${stampCount} !`
                    : 'Votre carte de fidélité'}
                </p>
              </div>
            )}

            {loaded && maxThreshold > 0 && (
              <StampGrid rewards={state.rewards} stampCount={stampCount} maxThreshold={maxThreshold} justStamped={state.justStamped} />
            )}
            {loaded && <Progress state={state} />}
          </div>

          {/* Sauvegarde (dès le 2e passage) */}
          {showSaveCard && <SaveContactCard businessId={businessId} onSaved={setState} />}

          {/* Récupération d'une carte existante */}
          {showRecover && <RecoverCard businessId={businessId} onRecovered={setState} />}

          {/* Séparateur vers le parcours d'avis (rendu juste en dessous) */}
          <div className="flex items-center gap-3 w-full my-1">
            <span className="h-px flex-1 bg-[#292929]" />
            <span className="text-[10.5px] tracking-[0.14em] uppercase text-[#666]">et aussi</span>
            <span className="h-px flex-1 bg-[#292929]" />
          </div>
        </div>
      </div>

      {/* Popup récompense : au-dessus de tout, non fermable au clic extérieur */}
      {loaded && state.pendingReward && (
        <RewardPopup businessId={businessId} pending={state.pendingReward} onValidated={setState} />
      )}
    </>
  )
}
