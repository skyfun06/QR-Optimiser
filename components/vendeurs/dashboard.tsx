'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VendeurStatusCard } from '@/components/vendeurs/status-card'

type Vendeur = { prenom: string | null; code: string | null; statut: string | null }
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-[#171717] border border-[#292929] rounded-2xl text-center">
      <span className="text-base sm:text-lg font-bold text-white leading-tight">{value}</span>
      <span className="text-[11px] text-[#8c8c8c] leading-tight">{label}</span>
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

export function VendeurDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendeur, setVendeur] = useState<Vendeur | null>(null)
  const [ventes, setVentes] = useState<Vente[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])

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
          .select('prenom,code,statut')
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

  // Vendeur en formation (routé ici comme l'actif) : pas encore de dashboard.
  if (vendeur?.statut !== 'actif') {
    return (
      <VendeurStatusCard
        title={prenom ? `Bienvenue ${prenom}` : 'Bienvenue'}
        message="Ta formation est en cours. Ton espace de suivi des commissions s'ouvrira dès que tu seras validé comme vendeur actif."
      />
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

  return (
    <div className="w-full max-w-md flex flex-col gap-5 animate-fade-up">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-bold text-white">
          {prenom ? `Bonjour ${prenom}` : 'Ton espace'}
        </h1>
        <p className="text-sm text-[#8c8c8c]">Voici où en sont tes commissions.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Total gagné" value={eur.format(gagne)} />
        <Kpi label="En attente" value={eur.format(aVerser)} />
        <Kpi label="Déjà payé" value={eur.format(paye)} />
      </div>

      {vendeur?.code && <CodeCard code={vendeur.code} />}

      {ventes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#221c10]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
              <path d="M16 3h5v5" />
              <path d="M21 3l-9 9" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-white">Aucun commerce signé pour l&apos;instant</p>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              Partage ton code ci-dessus à un commerçant. Dès qu&apos;il s&apos;inscrit avec, sa signature
              apparaît ici et tes commissions commencent à courir.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#8c8c8c]">
            Tes commerces ({ventes.length})
          </h2>
          {ventes.map((v) => {
            const c = commByVente.get(v.id)
            return <VenteCard key={v.id} vente={v} part1={c?.p1} part2={c?.p2} />
          })}
        </div>
      )}
    </div>
  )
}
