'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'

type Referrer = {
  id: string
  name: string
  code: string
  contact: string | null
  commissionPaidUntil: string | null
  createdAt: string | null
  totalBusinesses: number
  activeBusinesses: number
  monthlyCommission: number
  commissionDue: boolean
  businessId: string | null
  businessName: string | null
}

type Config = {
  monthlyPriceEur: number
  commissionRate: number
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

function AdminTabs({ active }: { active: 'clients' | 'stats' | 'referrals' }) {
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
    </div>
  )
}

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/referrals', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Impossible de charger les parrainages.')
      setReferrers(payload.referrers ?? [])
      setConfig(payload.config ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleMarkPaid(referrer: Referrer) {
    if (payingId) return
    if (!window.confirm(`Marquer la commission de « ${referrer.name} » comme payée jusqu'à aujourd'hui ?`)) return
    setPayingId(referrer.id)
    setError(null)
    try {
      const response = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrerId: referrer.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Échec de la mise à jour.')
      setReferrers((prev) =>
        prev.map((r) =>
          r.id === referrer.id
            ? { ...r, commissionPaidUntil: payload.commissionPaidUntil ?? r.commissionPaidUntil, commissionDue: false }
            : r
        )
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setPayingId(null)
    }
  }

  const cards = useMemo(() => {
    const totalReferrers = referrers.length
    const totalActive = referrers.reduce((sum, r) => sum + r.activeBusinesses, 0)
    const totalMonthly = referrers.reduce((sum, r) => sum + r.monthlyCommission, 0)
    const dueCount = referrers.filter((r) => r.commissionDue).length
    return [
      { label: 'Parrains', value: totalReferrers.toString(), gold: false },
      { label: 'Commerces payants apportés', value: totalActive.toString(), gold: true },
      { label: 'Commission mensuelle totale', value: formatEuro(totalMonthly), gold: false },
      { label: 'Parrains avec commission due', value: dueCount.toString(), gold: false },
    ]
  }, [referrers])

  const ratePct = config ? Math.round(config.commissionRate * 100) : 20

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(message) => setError(message)} />

      <div className="p-4 flex flex-col gap-4">
        <AdminTabs active="referrals" />

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement des parrainages…</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cards.map((card) => (
                <article key={card.label} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{card.label}</p>
                  <p className={`text-2xl md:text-3xl font-bold ${card.gold ? 'text-gold' : 'text-white'}`}>{card.value}</p>
                </article>
              ))}
            </section>

            {config && (
              <p className="text-xs text-[#8c8c8c]">
                Commission estimée : {ratePct}% de {formatEuro(config.monthlyPriceEur)} / mois par commerce actif apporté.
              </p>
            )}

            <section className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#292929]">
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Parrain</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Code</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Commerces apportés</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Payants (actifs)</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Commission / mois</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Payé jusqu&apos;au</th>
                      <th className="text-right p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map((r) => (
                      <tr key={r.id} className="border-b border-[#292929] last:border-b-0">
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-white">{r.name}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {r.businessId ? (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                                  Commerce client
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#292929] border border-[#3a3a3a] text-[#b5b5b5]">
                                  Parrain externe
                                </span>
                              )}
                              {r.businessId && r.businessName && (
                                <span className="text-xs text-[#8c8c8c]">{r.businessName}</span>
                              )}
                            </div>
                            {r.contact && <span className="text-xs text-[#8c8c8c]">{r.contact}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#292929] border border-[#3a3a3a] text-[#c7c7c7] font-mono">
                            {r.code}
                          </span>
                        </td>
                        <td className="p-4 text-white">{r.totalBusinesses}</td>
                        <td className="p-4">
                          <span className={r.activeBusinesses > 0 ? 'text-emerald-300 font-semibold' : 'text-[#8c8c8c]'}>
                            {r.activeBusinesses}
                          </span>
                        </td>
                        <td className="p-4 text-gold font-semibold">{formatEuro(r.monthlyCommission)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[#c7c7c7] text-sm">{formatDateFr(r.commissionPaidUntil)}</span>
                            {r.commissionDue && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-300">
                                Commission due
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(r)}
                            disabled={!!payingId}
                            className="px-2.5 py-1.5 text-xs rounded-lg font-medium bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {payingId === r.id ? 'En cours…' : "Marquer payé aujourd'hui"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {referrers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-sm text-[#8c8c8c]">
                          Aucun parrain enregistré. Ajoutez-en depuis le dashboard Supabase (table <span className="font-mono">referrers</span>).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
