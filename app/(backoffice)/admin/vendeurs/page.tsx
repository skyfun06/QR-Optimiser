'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'
import { VENDEUR_QUESTIONS } from '@/lib/vendeur-questions'

type Candidature = {
  id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  ville: string | null
  codePostal: string | null
  dateNaissance: string | null
  dateInscription: string | null
  reponses: Record<string, string> | null
}
type VendeurStatut = 'en_attente' | 'formation' | 'actif' | 'suspendu'
type Vendeur = {
  id: string
  nomComplet: string
  email: string | null
  statut: VendeurStatut
  code: string | null
  ventesCount: number
  totalGagne: number
}
type CommissionAPayer = {
  id: string
  montant: number
  part: number
  vendeurNom: string
  businessNom: string
}
type Vente = {
  id: string
  vendeurId: string
  vendeurNom: string
  businessNom: string
  formule: string
  dateSignature: string
  statutCommerce: 'essai' | 'abonne' | 'resilie'
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formuleLabel(f: string) {
  return f === 'qr_nfc' ? 'QR + NFC' : 'QR'
}
function versementLabel(part: number) {
  return part === 1 ? 'Premier versement' : part === 2 ? 'Second versement' : `Versement ${part}`
}

const VENDEUR_STATUT: Record<VendeurStatut, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-[#292929] border border-[#3a3a3a] text-[#b5b5b5]' },
  formation: { label: 'Formation', cls: 'bg-amber-500/15 border border-amber-500/40 text-amber-300' },
  actif: { label: 'Actif', cls: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' },
  suspendu: { label: 'Suspendu', cls: 'bg-red-500/20 border border-red-500/40 text-red-300' },
}
const COMMERCE_STATUT: Record<Vente['statutCommerce'], string> = {
  essai: "à l'essai",
  abonne: 'abonné',
  resilie: 'résilié',
}

function AdminTabs({ active }: { active: 'clients' | 'stats' | 'referrals' | 'vendeurs' }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={[
        'text-sm px-3 py-2 rounded-lg transition-colors duration-200',
        on ? 'bg-[#292929] text-white' : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
      ].join(' ')}
    >
      {label}
    </Link>
  )
  return (
    <div className="inline-flex items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
      {tab('/admin/clients', 'Clients', active === 'clients')}
      {tab('/admin/stats', 'Statistiques', active === 'stats')}
      {tab('/admin/referrals', 'Parrainages', active === 'referrals')}
      {tab('/admin/vendeurs', 'Vendeurs', active === 'vendeurs')}
    </div>
  )
}

const TH = 'text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]'

export default function AdminVendeursPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([])
  const [commissions, setCommissions] = useState<CommissionAPayer[]>([])
  const [totalAPayer, setTotalAPayer] = useState(0)
  const [ventes, setVentes] = useState<Vente[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [venteFiltre, setVenteFiltre] = useState<string>('all')
  const [reponsesOuvertes, setReponsesOuvertes] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/vendeurs', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Impossible de charger les vendeurs.')
      setCandidatures(payload.candidatures ?? [])
      setVendeurs(payload.vendeurs ?? [])
      setCommissions(payload.commissions?.items ?? [])
      setTotalAPayer(payload.commissions?.total ?? 0)
      setVentes(payload.ventes ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function act(body: Record<string, unknown>, rowId: string, confirmMsg?: string) {
    if (busyId) return
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusyId(rowId)
    setError(null)
    try {
      const res = await fetch('/api/admin/vendeurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Action impossible.')
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusyId(null)
    }
  }

  const ventesFiltrees = useMemo(
    () => (venteFiltre === 'all' ? ventes : ventes.filter((v) => v.vendeurId === venteFiltre)),
    [ventes, venteFiltre]
  )
  const vendeursActifs = vendeurs.filter((v) => v.statut === 'actif').length

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(m) => setError(m)} />

      <div className="p-4 flex flex-col gap-6">
        <AdminTabs active="vendeurs" />

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement du réseau vendeur…</p>
          </div>
        ) : (
          <>
            {/* Résumé */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Candidatures en attente', value: candidatures.length.toString(), gold: candidatures.length > 0 },
                { label: 'Vendeurs actifs', value: vendeursActifs.toString(), gold: false },
                { label: 'Commissions à verser', value: commissions.length.toString(), gold: false },
                { label: 'Total à verser', value: formatEuro(totalAPayer), gold: totalAPayer > 0 },
              ].map((c) => (
                <article key={c.label} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{c.label}</p>
                  <p className={`text-2xl md:text-3xl font-bold ${c.gold ? 'text-gold' : 'text-white'}`}>{c.value}</p>
                </article>
              ))}
            </section>

            {/* 1. Candidatures */}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-white">Candidatures en attente</h2>
              <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className={TH}>Candidat</th>
                        <th className={TH}>Contact</th>
                        <th className={TH}>Ville</th>
                        <th className={TH}>Naissance</th>
                        <th className={TH}>Inscrit le</th>
                        <th className={`${TH} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatures.map((c) => {
                        const ouverte = reponsesOuvertes === c.id
                        return (
                          <Fragment key={c.id}>
                            <tr className="border-b border-[#292929] last:border-b-0">
                              <td className="p-4 text-white">{[c.prenom, c.nom].filter(Boolean).join(' ') || '—'}</td>
                              <td className="p-4">
                                <div className="flex flex-col gap-0.5 text-sm">
                                  <span className="text-[#e5e5e5]">{c.email ?? '—'}</span>
                                  <span className="text-[#8c8c8c]">{c.telephone ?? '—'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-[#c7c7c7] text-sm">
                                {c.ville ?? '—'}{c.codePostal ? ` (${c.codePostal})` : ''}
                              </td>
                              <td className="p-4 text-[#c7c7c7] text-sm">{formatDateFr(c.dateNaissance)}</td>
                              <td className="p-4 text-[#c7c7c7] text-sm">{formatDateFr(c.dateInscription)}</td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReponsesOuvertes(ouverte ? null : c.id)}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#1f1f1f] border border-[#3a3a3a] text-[#c7c7c7] hover:text-white transition-colors"
                                  >
                                    {ouverte ? 'Masquer' : 'Réponses'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => act({ action: 'valider', vendeurId: c.id }, c.id)}
                                    disabled={!!busyId}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {busyId === c.id ? '…' : 'Valider'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => act({ action: 'refuser', vendeurId: c.id }, c.id, `Refuser la candidature de « ${[c.prenom, c.nom].filter(Boolean).join(' ')} » ?`)}
                                    disabled={!!busyId}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#292929] border border-[#3a3a3a] text-[#e5e5e5] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Refuser
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {ouverte && (
                              <tr className="border-b border-[#292929] last:border-b-0 bg-[#141414]">
                                <td colSpan={6} className="p-4">
                                  <div className="flex flex-col gap-3">
                                    {VENDEUR_QUESTIONS.map((q) => (
                                      <div key={q.key} className="flex flex-col gap-0.5">
                                        <span className="text-xs uppercase tracking-widest text-[#8c8c8c]">{q.label}</span>
                                        <span className="text-sm text-[#e5e5e5] whitespace-pre-wrap">
                                          {c.reponses?.[q.key]?.trim() || '—'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                      {candidatures.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-sm text-[#8c8c8c]">
                            Aucune candidature en attente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 2. Vendeurs */}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-white">Vendeurs</h2>
              <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className={TH}>Vendeur</th>
                        <th className={TH}>Code</th>
                        <th className={TH}>Statut</th>
                        <th className={TH}>Ventes</th>
                        <th className={TH}>Total gagné</th>
                        <th className={`${TH} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendeurs.map((v) => {
                        const st = VENDEUR_STATUT[v.statut]
                        const suspendu = v.statut === 'suspendu'
                        return (
                          <tr key={v.id} className="border-b border-[#292929] last:border-b-0">
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-white">{v.nomComplet}</span>
                                <span className="text-xs text-[#8c8c8c]">{v.email ?? '—'}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#292929] border border-[#3a3a3a] text-[#c7c7c7] font-mono">
                                {v.code ?? '—'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="p-4 text-white">{v.ventesCount}</td>
                            <td className="p-4 text-gold font-semibold">{formatEuro(v.totalGagne)}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                {v.statut === 'formation' && (
                                  <button
                                    type="button"
                                    onClick={() => act({ action: 'activer', vendeurId: v.id }, v.id, `Activer « ${v.nomComplet} » comme vendeur ? Il obtiendra son code et accès au dashboard.`)}
                                    disabled={!!busyId}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gold text-[#12100e] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                  >
                                    {busyId === v.id ? '…' : 'Activer'}
                                  </button>
                                )}
                                {suspendu ? (
                                  <button
                                    type="button"
                                    onClick={() => act({ action: 'reactiver', vendeurId: v.id }, v.id)}
                                    disabled={!!busyId}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {busyId === v.id ? '…' : 'Réactiver'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => act({ action: 'suspendre', vendeurId: v.id }, v.id, `Suspendre « ${v.nomComplet} » ? Il n'aura plus accès à son espace.`)}
                                    disabled={!!busyId}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#292929] border border-[#3a3a3a] text-[#e5e5e5] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {busyId === v.id ? '…' : 'Suspendre'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {vendeurs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-sm text-[#8c8c8c]">
                            Aucun vendeur pour l&apos;instant.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 3. Commissions à verser */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-white">Commissions à verser</h2>
                <span className="text-sm text-[#8c8c8c]">
                  Total : <span className="text-gold font-semibold">{formatEuro(totalAPayer)}</span>
                </span>
              </div>
              <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className={TH}>Vendeur</th>
                        <th className={TH}>Commerce</th>
                        <th className={TH}>Versement</th>
                        <th className={TH}>Montant</th>
                        <th className={`${TH} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.id} className="border-b border-[#292929] last:border-b-0">
                          <td className="p-4 text-white">{c.vendeurNom}</td>
                          <td className="p-4 text-[#c7c7c7]">{c.businessNom}</td>
                          <td className="p-4 text-[#c7c7c7] text-sm">{versementLabel(c.part)}</td>
                          <td className="p-4 text-gold font-semibold">{formatEuro(c.montant)}</td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => act({ action: 'payer', commissionId: c.id }, c.id, `Marquer ${formatEuro(c.montant)} comme versé à « ${c.vendeurNom} » ?`)}
                              disabled={!!busyId}
                              className="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {busyId === c.id ? 'En cours…' : 'Marquer comme payée'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {commissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sm text-[#8c8c8c]">
                            Aucune commission à verser.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 4. Toutes les ventes (filtrable par vendeur) */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-white">Toutes les ventes</h2>
                <select
                  value={venteFiltre}
                  onChange={(e) => setVenteFiltre(e.target.value)}
                  className="min-h-[40px] bg-[#171717] border border-[#292929] rounded-xl px-3 text-sm text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="all">Tous les vendeurs</option>
                  {vendeurs.map((v) => (
                    <option key={v.id} value={v.id}>{v.nomComplet}</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className={TH}>Vendeur</th>
                        <th className={TH}>Commerce</th>
                        <th className={TH}>Formule</th>
                        <th className={TH}>Signé le</th>
                        <th className={TH}>Statut commerce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventesFiltrees.map((v) => (
                        <tr key={v.id} className="border-b border-[#292929] last:border-b-0">
                          <td className="p-4 text-white">{v.vendeurNom}</td>
                          <td className="p-4 text-[#c7c7c7]">{v.businessNom}</td>
                          <td className="p-4 text-[#c7c7c7] text-sm">{formuleLabel(v.formule)}</td>
                          <td className="p-4 text-[#c7c7c7] text-sm">{formatDateFr(v.dateSignature)}</td>
                          <td className="p-4 text-[#c7c7c7] text-sm">{COMMERCE_STATUT[v.statutCommerce]}</td>
                        </tr>
                      ))}
                      {ventesFiltrees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sm text-[#8c8c8c]">
                            Aucune vente à afficher.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
