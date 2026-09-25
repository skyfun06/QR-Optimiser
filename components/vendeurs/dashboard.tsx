'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VendeurStatusCard } from '@/components/vendeurs/status-card'
import { CHAPITRES } from '@/lib/vendeur-formation'

type Vendeur = {
  prenom: string | null
  code: string | null
  statut: string | null
  date_inscription: string | null
}
type Vente = {
  id: string
  business_nom: string | null
  formule: string
  date_signature: string
  statut_commerce: 'essai' | 'abonne' | 'resilie'
}
type Commission = {
  vente_id: string
  montant: number
  part: 1 | 2
  statut: 'en_attente' | 'a_payer' | 'payee'
  date_paiement: string | null
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function formuleLabel(f: string): string {
  return f === 'qr_nfc' ? 'QR + NFC' : 'QR'
}

// Libellés commerce grand public.
const COMMERCE_STATUT: Record<Vente['statut_commerce'], { label: string; cls: string }> = {
  essai: { label: "À l'essai", cls: 'text-[#8c8c8c] border-[#3a3a3a]' },
  abonne: { label: 'Abonné', cls: 'text-gold border-[#4a3a1a]' },
  resilie: { label: 'Résilié', cls: 'text-[#e07a7a] border-[#4a2a2a]' },
}

// État d'un versement, en langage non technique (jamais "part 1/2").
function versementEtat(
  c: Commission | undefined,
  statutCommerce: Vente['statut_commerce']
): { label: string; cls: string } {
  if (c?.statut === 'payee') {
    const quand = c.date_paiement ? ` le ${dateFmt.format(new Date(c.date_paiement))}` : ''
    return { label: `Versé${quand}`, cls: 'text-gold' }
  }
  if (c?.statut === 'a_payer') return { label: 'À verser', cls: 'text-[#5fbf7f]' }
  // en_attente : soit encore à débloquer, soit annulé si le commerce a résilié.
  if (statutCommerce === 'resilie') return { label: 'Annulé', cls: 'text-[#6a6a6a]' }
  return { label: 'En attente', cls: 'text-[#8c8c8c]' }
}

// Carte KPI — même langage visuel que le dashboard commerce (label capitale
// tracké, grand chiffre, sous-ligne discrète).
function Kpi({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className="w-full flex flex-col gap-2 md:gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6">
      <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{label}</p>
      <p className={`text-2xl md:text-4xl font-bold leading-tight ${gold ? 'text-gold' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-sm text-[#8c8c8c]">{sub}</p>}
    </div>
  )
}

function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Presse-papier indisponible : on ne casse rien, le code reste lisible.
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
      <span className="text-xs text-[#8c8c8c]">Ton code à partager</span>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-2xl font-bold tracking-[0.18em] text-gold">{code}</span>
        <button
          type="button"
          onClick={copy}
          className="min-h-[44px] px-4 rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
    </div>
  )
}

function VenteCard({ vente, part1, part2 }: { vente: Vente; part1?: Commission; part2?: Commission }) {
  const statut = COMMERCE_STATUT[vente.statut_commerce]
  const e1 = versementEtat(part1, vente.statut_commerce)
  const e2 = versementEtat(part2, vente.statut_commerce)

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-white truncate">{vente.business_nom || 'Commerce'}</span>
          <span className="text-xs text-[#8c8c8c]">
            Signé le {dateFmt.format(new Date(vente.date_signature))} · {formuleLabel(vente.formule)}
          </span>
        </div>
        <span className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${statut.cls}`}>
          {statut.label}
        </span>
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-[#292929]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-[#e5e5e5]">Premier versement</span>
            <span className="text-[11px] text-[#6a6a6a]">au premier paiement du commerce</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-sm font-medium ${e1.cls}`}>{e1.label}</span>
            {part1 && <span className="text-[11px] text-[#8c8c8c]">{eur.format(Number(part1.montant))}</span>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-[#e5e5e5]">Second versement</span>
            <span className="text-[11px] text-[#6a6a6a]">au 3ᵉ mois d&apos;abonnement</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-sm font-medium ${e2.cls}`}>{e2.label}</span>
            {part2 && <span className="text-[11px] text-[#8c8c8c]">{eur.format(Number(part2.montant))}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Bloc d'action — premier élément vu par le vendeur actif. Son message change
// selon sa situation (démarrage, aucune vente, élan récent, relance).
// Ton toujours direct et motivant, jamais culpabilisant.
// -------------------------------------------------------------------------
const DAY_MS = 86_400_000

// Chapitre "objections" de la formation, réutilisé en révision inline (le
// vendeur actif n'a plus accès au parcours de formation lui-même).
const OBJECTIONS = CHAPITRES.find((c) => c.id === 'objections')

type ActionState = 'start' | 'push' | 'win' | 'keep' | 'comeback'

/** Détermine le message d'action à partir de l'ancienneté et des ventes. */
function computeActionState(daysSinceInscription: number, daysSinceLastSale: number, signedCount: number): ActionState {
  if (signedCount === 0) {
    return daysSinceInscription < 7 ? 'start' : 'push'
  }
  if (daysSinceLastSale < 7) return 'win'
  if (daysSinceLastSale > 10) return 'comeback'
  return 'keep'
}

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

// Icône par état (traits sur fond doré), pour ancrer visuellement le message.
function ActionIcon({ state }: { state: ActionState }) {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (state) {
    case 'start':
      return (<svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></svg>)
    case 'push':
      return (<svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>)
    case 'win':
      return (<svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>)
    case 'comeback':
    case 'keep':
      return (<svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>)
  }
}

function ActionBlock({ state, signedCount, onRevoir }: { state: ActionState; signedCount: number; onRevoir: () => void }) {
  const s = signedCount > 1 ? 's' : ''

  let eyebrow: string
  let title: string
  let sub: string
  let cta: string | null = null

  switch (state) {
    case 'start':
      eyebrow = 'Cette semaine'
      title = 'Ton premier objectif : entrer dans 5 commerces cette semaine.'
      sub = "Le plus dur, c'est la première porte. Une fois passée, le reste s'enchaîne tout seul."
      break
    case 'push':
      eyebrow = 'Garde le cap'
      title = "Pas encore de signature ? C'est normal au début."
      sub = "Les premières ventes sont les plus dures — tout le monde passe par là. Relis la partie objections de la formation : c'est souvent là que ça se joue."
      cta = 'Revoir les objections'
      break
    case 'win':
      eyebrow = 'Bien joué'
      title = signedCount === 1 ? 'Bravo, ta première signature est là !' : `Bravo, déjà ${signedCount} commerces signés !`
      sub = "Tu as trouvé ta méthode. Enchaîne tant que c'est chaud : vise le prochain commerce dès cette semaine."
      break
    case 'keep':
      eyebrow = 'Garde le rythme'
      title = `${signedCount} commerce${s} signé${s} — tu es lancé.`
      sub = 'Ça fait quelques jours sans nouvelle signature. Un ou deux commerces cette semaine et tu relances la machine.'
      break
    case 'comeback':
      eyebrow = 'On repart'
      title = "Ça fait un moment — il est temps de repartir démarcher."
      sub = `Tu as déjà signé ${signedCount} commerce${s}, tu sais faire. Rechausse les baskets : quelques portes cette semaine suffisent à tout relancer.`
      break
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#3a2f18] bg-gradient-to-br from-[#1e1809] via-[#171310] to-[#141414] p-5 sm:p-6 md:p-8">
      <span aria-hidden className="absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.18), transparent 65%)' }} />
      <span aria-hidden className="absolute inset-0 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.05), transparent)' }} />
      <div className="relative flex flex-col gap-3 max-w-3xl">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-gold text-[#12100e]">
            <ActionIcon state={state} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[2px] text-gold">{eyebrow}</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug">{title}</h2>
        <p className="text-sm md:text-base text-[#d6cbb6] leading-relaxed">{sub}</p>

        {state === 'start' && (
          <div className="flex items-center gap-2 pt-1 max-w-sm" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2 flex-1 rounded-full bg-[#3a2f18]" />
            ))}
          </div>
        )}

        {cta && (
          <button
            type="button"
            onClick={onRevoir}
            className="mt-1 self-start inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-2xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            {cta} <ArrowIcon />
          </button>
        )}
      </div>
    </section>
  )
}

/** Révision inline du chapitre "objections" (accessible au vendeur actif). */
function ObjectionsReview({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 md:gap-6 animate-fade-up">
      <button
        type="button"
        onClick={onBack}
        className="self-start min-h-[44px] inline-flex items-center gap-1.5 text-sm text-[#8c8c8c] hover:text-white transition-colors"
      >
        ← Retour au tableau de bord
      </button>

      {OBJECTIONS ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-gold">
              Formation · Module {OBJECTIONS.moduleIndex} · {OBJECTIONS.moduleTitre}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{OBJECTIONS.titre}</h1>
            <p className="text-sm md:text-base text-[#c7c7c7] leading-relaxed max-w-2xl">{OBJECTIONS.accroche}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {OBJECTIONS.points.map((pt) => (
              <div key={pt.titre} className="flex flex-col gap-1 p-4 md:p-5 bg-[#171717] border border-[#292929] rounded-2xl">
                <span className="text-sm md:text-base font-semibold text-white">{pt.titre}</span>
                <span className="text-sm text-[#b6b6b6] leading-relaxed">{pt.texte}</span>
              </div>
            ))}
          </div>

          {OBJECTIONS.astuce && (
            <div className="flex flex-col gap-2 p-4 md:p-5 bg-gradient-to-b from-[#1c1710] to-[#141414] border border-[#3a2f18] rounded-2xl">
              <span className="text-xs font-semibold uppercase tracking-[2px] text-gold">Astuce terrain</span>
              <p className="text-sm md:text-[15px] text-[#e5d9c2] leading-relaxed">{OBJECTIONS.astuce}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[#8c8c8c]">Contenu de formation indisponible pour le moment.</p>
      )}
    </div>
  )
}

export function VendeurDashboard({ onOpenFormation }: { onOpenFormation?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendeur, setVendeur] = useState<Vendeur | null>(null)
  const [ventes, setVentes] = useState<Vente[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [revoirObjections, setRevoirObjections] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()
        if (userErr) throw userErr
        if (!user) {
          if (!cancelled) setError('Session expirée. Reconnecte-toi.')
          return
        }

        const { data: v, error: vErr } = await supabase
          .from('vendeurs')
          .select('prenom,code,statut,date_inscription')
          .eq('user_id', user.id)
          .maybeSingle<Vendeur>()
        if (vErr) throw vErr

        // RLS filtre automatiquement : on ne reçoit que SES ventes.
        const { data: vt, error: vtErr } = await supabase
          .from('ventes')
          .select('id,business_nom,formule,date_signature,statut_commerce')
          .order('date_signature', { ascending: false })
        if (vtErr) throw vtErr

        const venteRows = (vt ?? []) as Vente[]
        let commissionRows: Commission[] = []
        if (venteRows.length > 0) {
          const { data: cm, error: cmErr } = await supabase
            .from('commissions')
            .select('vente_id,montant,part,statut,date_paiement')
            .in('vente_id', venteRows.map((r) => r.id))
          if (cmErr) throw cmErr
          commissionRows = (cm ?? []) as Commission[]
        }

        if (!cancelled) {
          setVendeur(v ?? null)
          setVentes(venteRows)
          setCommissions(commissionRows)
        }
      } catch {
        if (!cancelled) setError("Impossible de charger ton espace pour l'instant.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-[#8c8c8c]">Chargement…</p>
  }

  if (error) {
    return <VendeurStatusCard title="Oups" message={error} />
  }

  const prenom = vendeur?.prenom?.trim()

  // Vendeur pas encore actif (statut "formation") : le tableau de bord n'a pas
  // encore de contenu (ni commissions ni code). On l'invite à la formation, qui
  // reste accessible en permanence via l'onglet dédié.
  if (vendeur?.statut !== 'actif') {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 animate-fade-up">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {prenom ? `Bonjour ${prenom}` : 'Ton espace'}
          </h1>
          <p className="text-sm text-[#8c8c8c]">
            Ton tableau de bord se débloque une fois ton compte activé.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#221c10] text-gold">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <p className="font-semibold text-white">Bientôt disponible</p>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              Dès que ton compte est validé, tu retrouves ici tes commissions, ton code à partager
              et tes commerces signés. En attendant, avance sur ta formation.
            </p>
          </div>
          {onOpenFormation && (
            <button
              type="button"
              onClick={onOpenFormation}
              className="min-h-[48px] px-5 rounded-2xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              Aller à la formation
            </button>
          )}
        </div>
      </div>
    )
  }

  // Totaux : "gagné" = acquis (à verser + déjà versé) ; les commissions encore
  // en attente ne comptent pas (elles peuvent être annulées si résiliation).
  let gagne = 0
  let aVerser = 0
  let paye = 0
  for (const c of commissions) {
    const m = Number(c.montant)
    if (c.statut === 'a_payer') {
      aVerser += m
      gagne += m
    } else if (c.statut === 'payee') {
      paye += m
      gagne += m
    }
  }

  const commByVente = new Map<string, { p1?: Commission; p2?: Commission }>()
  for (const c of commissions) {
    const entry = commByVente.get(c.vente_id) ?? {}
    if (c.part === 1) entry.p1 = c
    else if (c.part === 2) entry.p2 = c
    commByVente.set(c.vente_id, entry)
  }

  // Écran de révision des objections (ouvert depuis le bloc d'action).
  if (revoirObjections) {
    return <ObjectionsReview onBack={() => setRevoirObjections(false)} />
  }

  // Situation du vendeur → message d'action affiché en tête.
  const now = Date.now()
  const daysSinceInscription = vendeur?.date_inscription
    ? (now - new Date(vendeur.date_inscription).getTime()) / DAY_MS
    : 0
  // ventes est trié par date de signature décroissante : ventes[0] = la plus récente.
  const daysSinceLastSale = ventes.length > 0
    ? (now - new Date(ventes[0].date_signature).getTime()) / DAY_MS
    : Infinity
  const actionState = computeActionState(daysSinceInscription, daysSinceLastSale, ventes.length)

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 md:gap-6 animate-fade-up">
      {/* En-tête */}
      <div className="w-full flex flex-row items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {prenom ? `Bonjour ${prenom}` : 'Ton espace'}
          </h1>
          <p className="text-sm text-[#8c8c8c]">Voici où en sont tes commissions.</p>
        </div>
      </div>

      <ActionBlock
        state={actionState}
        signedCount={ventes.length}
        onRevoir={() => setRevoirObjections(true)}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6">
        <Kpi label="Total gagné" value={eur.format(gagne)} sub="commissions acquises" gold />
        <Kpi label="En attente" value={eur.format(aVerser)} sub="à verser prochainement" />
        <Kpi label="Déjà payé" value={eur.format(paye)} sub="déjà versé" />
      </div>

      {/* Code + commerces : deux colonnes sur desktop */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-3 lg:gap-6">
        {vendeur?.code && (
          <div className="w-full lg:w-[340px] lg:shrink-0">
            <CodeCard code={vendeur.code} />
          </div>
        )}

        <div className="w-full flex-1 min-w-0">
          {ventes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#221c10]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                  <path d="M16 3h5v5" />
                  <path d="M21 3l-9 9" />
                </svg>
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <p className="font-semibold text-white">Aucun commerce signé pour l&apos;instant</p>
                <p className="text-sm text-[#8c8c8c] leading-relaxed">
                  Partage ton code à un commerçant. Dès qu&apos;il s&apos;inscrit avec, sa signature
                  apparaît ici et tes commissions commencent à courir.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                Tes commerces ({ventes.length})
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
                {ventes.map((v) => {
                  const c = commByVente.get(v.id)
                  return <VenteCard key={v.id} vente={v} part1={c?.p1} part2={c?.p2} />
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
