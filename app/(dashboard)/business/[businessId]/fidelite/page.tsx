'use client'

/**
 * Dashboard commerçant — onglet « Fidélité ».
 *
 * Trois écrans (cf. design/loyalty/mockups.html #merchant) :
 *   A — Activation : aucun programme encore → explication + « Créer ma carte ».
 *   B — Configuration : paliers (nb passages → récompense) éditables + aperçu
 *       client en direct + interrupteur actif/pause.
 *   C — Vue d'ensemble : 3 KPIs + dernières récompenses distribuées.
 *
 * La RLS (migration 0016) autorise l'owner à lire/écrire SON programme et SES
 * paliers, et à lire SES cartes / tampons / récompenses. On reste donc 100%
 * côté client via le client supabase authentifié (même pattern que /parrainage).
 * Aucune écriture sur cards/stamps/redemptions ici (service role uniquement).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

/* ─── Types ──────────────────────────────────────────────── */
type ProgramRow = { id: string; is_active: boolean }
type RewardRow = { id: string; threshold: number; label: string }
type RedemptionRow = { id: string; reward_label: string; threshold: number; validated_at: string | null }
type Tier = { key: string; id: string | null; threshold: string; label: string }
type Stats = { clients: number; passages: number; distributed: number }

/* ─── Helpers date (Europe/Paris, cohérent avec le serveur) ─ */
function parisYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}
function parisFirstOfMonth(): string {
  return parisYmd().slice(0, 8) + '01'
}
function formatRedemptionWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000)
  if (diff === 0) return `Aujourd'hui · ${time}`
  if (diff === 1) return `Hier · ${time}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${time}`
}

/* ─── useCountUp (copie locale du pattern dashboard) ─────── */
function useCountUp(target: number, duration = 1000): string {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const startTime = performance.now()
    let rafId = 0
    function tick(now: number) {
      const t = reduce ? 1 : Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) rafId = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return String(Math.round(display))
}

/* ─── Icônes ─────────────────────────────────────────────── */
function IconGift({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
function IconUsers({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  )
}
function IconTrash({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  )
}
function IconEdit({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

/* ─── Aperçu client (lecture seule, reflète les paliers édités) ─ */
function CardPreview({ name, rewards }: { name: string; rewards: RewardRow[] }) {
  const initials = (name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()) || 'SA'
  const maxThreshold = rewards.length ? Math.max(...rewards.map((r) => r.threshold)) : 0
  const rewardAt = new Map(rewards.map((r) => [r.threshold, r.label]))
  // 2 tampons d'exemple pour que l'aperçu paraisse « vivant ».
  const filled = Math.min(2, maxThreshold)
  const first = [...rewards].sort((a, b) => a.threshold - b.threshold)[0] ?? null
  const remaining = first ? Math.max(0, first.threshold - filled) : 0
  const pct = first ? Math.min(100, Math.round((filled / first.threshold) * 100)) : 0

  return (
    <div className="w-full bg-[#0d0d0d] border border-[#222222] rounded-[22px] p-5 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-12 h-12 rounded-2xl grid place-items-center text-gold font-bold" style={{ background: 'linear-gradient(145deg,#232323,#141414)', border: '1px solid #2f2f2f' }}>
          {initials}
        </div>
        <h3 className="text-[16px] font-bold text-white">{name.trim() || 'Votre commerce'}</h3>
      </div>

      <div className="w-full bg-[#171717] border border-[#222222] rounded-[20px] p-4">
        <p className="text-center text-[11px] tracking-[0.16em] uppercase text-[#8c8c8c] mb-3">Votre carte de fidélité</p>
        {maxThreshold > 0 ? (
          <>
            <div className="grid grid-cols-5 gap-2.5" style={{ margin: rewardAt.size ? '4px 0 24px' : '4px 0' }}>
              {Array.from({ length: maxThreshold }, (_, i) => i + 1).map((pos) => {
                const isFilled = pos <= filled
                const label = rewardAt.get(pos)
                return (
                  <div key={pos} className="relative" style={{ aspectRatio: '1 / 1' }}>
                    <div
                      className={['w-full h-full rounded-full grid place-items-center', isFilled ? 'text-[#2a1e08]' : 'text-[#4a4a4a]'].join(' ')}
                      style={isFilled
                        ? { background: 'radial-gradient(circle at 32% 28%, #e7bd62, #C9973A 62%, #9a6e22)' }
                        : { border: '1.6px dashed #3a3a3a' }}
                    >
                      {isFilled ? <IconCheck size={16} /> : <span className="text-[12px] font-semibold">{pos}</span>}
                    </div>
                    {label && (
                      <>
                        <span aria-hidden className="absolute rounded-full pointer-events-none" style={{ inset: '-4px', border: '1.5px solid rgba(201,151,58,.55)' }} />
                        <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-gold font-semibold" style={{ bottom: '-18px', fontSize: '9px' }}>
                          {label}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {first && (
              <div className="mt-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[12px] font-semibold text-white">
                    Plus que <b className="text-gold">{remaining} passage{remaining > 1 ? 's' : ''}</b> pour {first.label}
                  </span>
                  <span className="text-[11px] text-[#8c8c8c]">{filled} / {first.threshold}</span>
                </div>
                <div className="h-[8px] rounded-full bg-[#0f0f0f] border border-[#222222] overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#C9973A,#e6b84a)' }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-[12px] text-[#666] py-6">
            Ajoutez une récompense pour voir la carte prendre forme.
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function FidelitePage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)

  const [program, setProgram] = useState<ProgramRow | null>(null)
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [stats, setStats] = useState<Stats>({ clients: 0, passages: 0, distributed: 0 })
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([])

  const [view, setView] = useState<'overview' | 'config'>('overview')
  const [tiers, setTiers] = useState<Tier[]>([])

  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [toggling, setToggling] = useState(false)

  const blankTier = (): Tier => ({ key: crypto.randomUUID(), id: null, threshold: '', label: '' })
  const tiersFromRewards = (rs: RewardRow[]): Tier[] =>
    rs.map((r) => ({ key: r.id, id: r.id, threshold: String(r.threshold), label: r.label }))

  /* --- Chargement initial --- */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) { if (!cancelled) setError('Vous devez être connecté.'); return }

        const [{ data: biz }, { data: prog }] = await Promise.all([
          supabase.from('businesses').select('name').eq('id', businessId).maybeSingle<{ name: string | null }>(),
          supabase.from('loyalty_programs').select('id, is_active').eq('business_id', businessId).maybeSingle<ProgramRow>(),
        ])
        if (cancelled) return
        setBusinessName(biz?.name ?? null)

        if (!prog) { setProgram(null); return }
        setProgram(prog)

        const { data: rws } = await supabase
          .from('loyalty_rewards')
          .select('id, threshold, label')
          .eq('program_id', prog.id)
          .order('threshold', { ascending: true })
        if (cancelled) return
        const rewardRows = (rws as RewardRow[] | null) ?? []
        setRewards(rewardRows)
        setTiers(rewardRows.length ? tiersFromRewards(rewardRows) : [blankTier()])
        setView(prog.is_active ? 'overview' : 'config')

        const s = await loadStats(prog.id)
        if (cancelled) return
        setStats(s.stats)
        setRedemptions(s.redemptions)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [businessId])

  /* --- Stats : clients fidélisés, passages ce mois, récompenses distribuées --- */
  async function loadStats(programId: string): Promise<{ stats: Stats; redemptions: RedemptionRow[] }> {
    const { data: cards } = await supabase.from('loyalty_cards').select('id').eq('program_id', programId)
    const cardIds = ((cards as { id: string }[] | null) ?? []).map((c) => c.id)
    if (cardIds.length === 0) {
      return { stats: { clients: 0, passages: 0, distributed: 0 }, redemptions: [] }
    }
    const [{ count: passages }, { count: distributed }, { data: reds }] = await Promise.all([
      supabase.from('loyalty_stamps').select('id', { count: 'exact', head: true })
        .in('card_id', cardIds).gte('stamped_on', parisFirstOfMonth()),
      supabase.from('loyalty_redemptions').select('id', { count: 'exact', head: true })
        .in('card_id', cardIds).not('validated_at', 'is', null),
      supabase.from('loyalty_redemptions').select('id, reward_label, threshold, validated_at')
        .in('card_id', cardIds).not('validated_at', 'is', null)
        .order('validated_at', { ascending: false }).limit(8),
    ])
    return {
      stats: { clients: cardIds.length, passages: passages ?? 0, distributed: distributed ?? 0 },
      redemptions: (reds as RedemptionRow[] | null) ?? [],
    }
  }

  /* --- Écran A : créer le programme (is_active=false par défaut) --- */
  async function handleCreate() {
    setCreating(true)
    setError(null)
    const { data, error: insErr } = await supabase
      .from('loyalty_programs')
      .insert({ business_id: businessId })
      .select('id, is_active')
      .single<ProgramRow>()
    if (insErr || !data) {
      setError(insErr?.message ?? 'Impossible de créer le programme.')
      setCreating(false)
      return
    }
    setProgram(data)
    setRewards([])
    setTiers([blankTier()])
    setView('config')
    setCreating(false)
  }

  /* --- Écran B : enregistrer les paliers --- */
  async function handleSaveRewards() {
    if (!program) return
    setSaveError(null)

    // Validation
    const parsed: { id: string | null; threshold: number; label: string }[] = []
    for (const t of tiers) {
      const label = t.label.trim()
      const threshold = Number.parseInt(t.threshold, 10)
      if (!label) { setSaveError('Chaque récompense doit avoir un nom.'); return }
      if (!Number.isInteger(threshold) || threshold <= 0) {
        setSaveError('Le nombre de passages doit être un entier supérieur à 0.'); return
      }
      parsed.push({ id: t.id, threshold, label })
    }
    const thresholds = parsed.map((p) => p.threshold)
    if (new Set(thresholds).size !== thresholds.length) {
      setSaveError('Deux récompenses ne peuvent pas avoir le même nombre de passages.'); return
    }

    setSaving(true)
    try {
      // Diff vs base. On préserve les id existants (les redemptions en attente
      // référencent reward_id ; recréer les paliers casserait l'idempotence).
      // Ordre : suppressions → mises à jour → insertions. (Un échange de seuils
      // entre deux paliers existants peut heurter la contrainte UNIQUE : cas rare,
      // l'utilisateur ré-enregistre.)
      const keptIds = parsed.filter((p) => p.id).map((p) => p.id as string)
      const toDelete = rewards.map((r) => r.id).filter((id) => !keptIds.includes(id))
      if (toDelete.length) {
        const { error: delErr } = await supabase.from('loyalty_rewards').delete().in('id', toDelete)
        if (delErr) throw delErr
      }
      for (const p of parsed.filter((x) => x.id)) {
        const { error: upErr } = await supabase
          .from('loyalty_rewards')
          .update({ threshold: p.threshold, label: p.label })
          .eq('id', p.id as string)
        if (upErr) throw upErr
      }
      const toInsert = parsed.filter((p) => !p.id).map((p) => ({ program_id: program.id, threshold: p.threshold, label: p.label }))
      if (toInsert.length) {
        const { error: insErr } = await supabase.from('loyalty_rewards').insert(toInsert)
        if (insErr) throw insErr
      }

      // Relecture pour récupérer les nouveaux id et resynchroniser.
      const { data: rws } = await supabase
        .from('loyalty_rewards')
        .select('id, threshold, label')
        .eq('program_id', program.id)
        .order('threshold', { ascending: true })
      const rewardRows = (rws as RewardRow[] | null) ?? []
      setRewards(rewardRows)
      setTiers(rewardRows.length ? tiersFromRewards(rewardRows) : [blankTier()])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Enregistrement impossible. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  /* --- Interrupteur actif / pause --- */
  async function handleToggleActive() {
    if (!program || toggling) return
    const next = !program.is_active
    if (next && rewards.length === 0) {
      setSaveError('Ajoutez au moins une récompense avant d’activer le programme.')
      return
    }
    setToggling(true)
    setSaveError(null)
    const { error: upErr } = await supabase
      .from('loyalty_programs')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', program.id)
    if (upErr) setSaveError(upErr.message)
    else setProgram({ ...program, is_active: next })
    setToggling(false)
  }

  /* --- Édition locale des paliers --- */
  function updateTier(key: string, patch: Partial<Tier>) {
    setTiers((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)))
  }
  function removeTier(key: string) {
    setTiers((ts) => ts.filter((t) => t.key !== key))
  }
  function addTier() {
    setTiers((ts) => [...ts, blankTier()])
  }

  // Paliers valides (pour l'aperçu live).
  const previewRewards = useMemo<RewardRow[]>(() => {
    return tiers
      .map((t) => ({ id: t.key, threshold: Number.parseInt(t.threshold, 10), label: t.label.trim() }))
      .filter((r) => Number.isInteger(r.threshold) && r.threshold > 0 && r.label.length > 0)
      .sort((a, b) => a.threshold - b.threshold)
  }, [tiers])

  const name = businessName?.trim() || 'Votre commerce'

  /* ─── Rendu ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle={businessName ?? null} onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col gap-4 md:gap-6 py-6 md:py-8">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : !program ? (
          /* ───────── Écran A — Activation ───────── */
          <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-12 animate-fade-in">
            <div className="max-w-md mx-auto flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl grid place-items-center text-gold" style={{ background: '#201a0e', border: '1px solid rgba(201,151,58,.3)' }}>
                <IconGift size={32} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Faites revenir vos clients</h1>
              <p className="text-sm text-[#8c8c8c] leading-relaxed">
                Offrez un tampon à chaque visite et une petite récompense après quelques passages.
                C&apos;est le moyen le plus simple de transformer un client de passage en habitué.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 min-h-[50px] px-6 rounded-[14px] text-sm font-semibold text-[#12100e] bg-gold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <IconPlus /> {creating ? 'Création…' : 'Créer ma carte de fidélité'}
              </button>
            </div>
          </div>
        ) : view === 'config' ? (
          /* ───────── Écran B — Configuration ───────── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,380px)] gap-5 md:gap-6 animate-fade-in">
            {/* Colonne édition */}
            <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-7 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-white">Vos récompenses</h1>
                  <p className="text-sm text-[#8c8c8c] mt-1">Définissez combien de passages donnent droit à quoi.</p>
                </div>
                {program.is_active && (
                  <button
                    type="button"
                    onClick={() => setView('overview')}
                    className="shrink-0 inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl text-xs font-medium text-[#d7d7d7] border border-[#292929] hover:bg-white/[0.04] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    Vue d&apos;ensemble
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {tiers.map((t) => (
                  <div key={t.key} className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={t.threshold}
                        onChange={(e) => updateTier(t.key, { threshold: e.target.value })}
                        placeholder="5"
                        className="w-[64px] bg-[#0f0f0f] border border-[#292929] rounded-xl px-3 py-2.5 text-white text-sm text-center outline-none focus:border-[rgba(201,151,58,.5)]"
                      />
                      <span className="text-xs text-[#8c8c8c]">passages</span>
                    </div>
                    <span className="text-[#666] shrink-0">→</span>
                    <input
                      type="text"
                      value={t.label}
                      onChange={(e) => updateTier(t.key, { label: e.target.value })}
                      placeholder="Un café offert"
                      className="flex-1 min-w-0 bg-[#0f0f0f] border border-[#292929] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[rgba(201,151,58,.5)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeTier(t.key)}
                      title="Supprimer"
                      aria-label="Supprimer cette récompense"
                      className="shrink-0 w-10 h-10 grid place-items-center rounded-xl text-[#8c8c8c] border border-[#292929] hover:text-[#ef4343] hover:border-[#2e1515] active:scale-95 transition-all cursor-pointer"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl text-sm text-[#c7c7c7] border border-dashed border-[#2f2f2f] hover:border-[#C9973A]/50 hover:text-white active:scale-[0.99] transition-all cursor-pointer"
                >
                  <IconPlus /> Ajouter une récompense
                </button>
              </div>

              {/* Interrupteur actif / pause */}
              <div className="flex items-center justify-between gap-4 bg-[#0f0f0f] border border-[#292929] rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Programme actif</p>
                  <p className="text-xs text-[#8c8c8c] mt-0.5 leading-relaxed">
                    Vos clients voient leur carte au scan. Mettez en pause à tout moment.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={program.is_active}
                  aria-label="Activer le programme de fidélité"
                  onClick={handleToggleActive}
                  disabled={toggling}
                  className={[
                    'shrink-0 relative w-[52px] h-[30px] rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60',
                    program.is_active ? 'bg-gold' : 'bg-[#333333]',
                  ].join(' ')}
                >
                  <span
                    className="absolute top-[3px] left-[3px] w-6 h-6 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: program.is_active ? 'translateX(22px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {saveError && <p className="text-sm text-[#ef4343]">{saveError}</p>}

              <button
                type="button"
                onClick={handleSaveRewards}
                disabled={saving}
                className={[
                  'inline-flex items-center justify-center gap-2 min-h-[50px] rounded-[14px] text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50',
                  saved ? 'bg-[#22c55e] text-white' : 'bg-gold text-[#12100e] hover:brightness-110',
                ].join(' ')}
              >
                {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer les récompenses'}
              </button>
            </div>

            {/* Colonne aperçu */}
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-[#8c8c8c] px-1">Aperçu client</p>
              <CardPreview name={name} rewards={previewRewards} />
            </div>
          </div>
        ) : (
          /* ───────── Écran C — Vue d'ensemble ───────── */
          <div className="flex flex-col gap-5 md:gap-6 animate-fade-in">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold">Fidélité</p>
                <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Votre programme en un coup d&apos;œil</h1>
              </div>
              <button
                type="button"
                onClick={() => setView('config')}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-medium text-[#d7d7d7] border border-[#292929] hover:bg-white/[0.04] active:scale-[0.97] transition-all cursor-pointer"
              >
                <IconEdit /> Modifier les récompenses
              </button>
            </div>

            {!program.is_active && (
              <div className="w-full rounded-2xl bg-[#1a160d] border border-[#C9973A]/30 p-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-[#e9d7b4]">
                  Programme <b>en pause</b> — vos clients ne voient pas leur carte au scan.
                </p>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={toggling}
                  className="shrink-0 inline-flex items-center min-h-[40px] px-4 rounded-xl text-sm font-semibold text-[#12100e] bg-gold hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
                >
                  Réactiver
                </button>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard icon={<IconUsers />} value={stats.clients} label="Clients fidélisés" />
              <KpiCard icon={<IconCheck />} value={stats.passages} label="Passages ce mois-ci" />
              <KpiCard icon={<IconGift size={20} />} value={stats.distributed} label="Récompenses distribuées" />
            </div>

            {/* Dernières récompenses */}
            <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Dernières récompenses distribuées</h2>
              {redemptions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#292929] p-6 text-center">
                  <p className="text-sm text-[#8c8c8c]">
                    Aucune récompense distribuée pour le moment. Elles apparaîtront ici dès qu&apos;un client en valide une.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#222222]">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-gold" style={{ background: '#201a0e', border: '1px solid rgba(201,151,58,.25)' }}>
                        <IconGift size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.reward_label}</p>
                        <p className="text-xs text-[#8c8c8c]">{r.threshold} passages atteints</p>
                      </div>
                      <p className="shrink-0 text-xs text-[#8c8c8c]">{formatRedemptionWhen(r.validated_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── KPI card ───────────────────────────────────────────── */
function KpiCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  const animated = useCountUp(value)
  return (
    <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 flex flex-col gap-2">
      <div className="w-10 h-10 rounded-xl grid place-items-center text-gold" style={{ background: '#201a0e', border: '1px solid rgba(201,151,58,.25)' }}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white tabular-nums mt-1">{animated}</p>
      <p className="text-xs text-[#8c8c8c]">{label}</p>
    </div>
  )
}
