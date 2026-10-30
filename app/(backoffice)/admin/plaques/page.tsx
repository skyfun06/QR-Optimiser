'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'
import { plaqueUrl, type PlaqueRow } from '@/lib/plaques'
import type { BusinessOption } from '@/lib/plaques-admin'

function AdminTabs({ active }: { active: 'clients' | 'stats' | 'referrals' | 'vendeurs' | 'plaques' }) {
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
    <div className="inline-flex flex-wrap items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
      {tab('/admin/clients', 'Clients', active === 'clients')}
      {tab('/admin/stats', 'Statistiques', active === 'stats')}
      {tab('/admin/referrals', 'Parrainages', active === 'referrals')}
      {tab('/admin/vendeurs', 'Vendeurs', active === 'vendeurs')}
      {tab('/admin/plaques', 'Plaques', active === 'plaques')}
    </div>
  )
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Filter = 'all' | 'linked' | 'free'

const TH = 'text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]'

export default function AdminPlaquesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plaques, setPlaques] = useState<PlaqueRow[]>([])
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [choice, setChoice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/plaques', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Impossible de charger les plaques.')
      setPlaques(payload.plaques ?? [])
      setBusinesses(payload.businesses ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byId = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses])
  const linkedCount = plaques.filter((p) => p.business_id).length
  const visible = plaques.filter((p) => (filter === 'all' ? true : filter === 'linked' ? !!p.business_id : !p.business_id))

  async function assign(plaque: PlaqueRow, businessId: string | null) {
    const label = businessId ? byId.get(businessId)?.name ?? 'ce commerce' : null
    const question = businessId
      ? `Lier la plaque n°${plaque.numero} à « ${label} » ?`
      : `Libérer la plaque n°${plaque.numero} ? Elle n'affichera plus la page d'avis de son commerce.`
    if (!window.confirm(question)) return

    setSavingId(plaque.id)
    setError(null)
    try {
      const res = await fetch('/api/admin/plaques', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaqueId: plaque.id, businessId }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'La modification a échoué.')
      setEditingId(null)
      setChoice('')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setSavingId(null)
    }
  }

  const filterBtn = (value: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={[
        'text-sm px-3 py-2 rounded-lg transition-colors duration-200',
        filter === value ? 'bg-[#292929] text-white' : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(m) => setError(m)} />

      <div className="p-4 flex flex-col gap-4">
        <AdminTabs active="plaques" />

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement des plaques…</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4">
              {[
                { label: 'Plaques', value: plaques.length, gold: false },
                { label: 'Activées', value: linkedCount, gold: true },
                { label: 'Libres', value: plaques.length - linkedCount, gold: false },
              ].map((card) => (
                <article key={card.label} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{card.label}</p>
                  <p className={`text-3xl md:text-4xl font-bold ${card.gold ? 'text-gold' : 'text-white'}`}>{card.value}</p>
                </article>
              ))}
            </section>

            <p className="text-sm text-[#8c8c8c]">
              Pour activer une plaque : connectez-vous sur votre téléphone, scannez la plaque chez le commerçant et choisissez son commerce.
            </p>

            <div className="inline-flex items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
              {filterBtn('all', 'Toutes')}
              {filterBtn('linked', 'Activées')}
              {filterBtn('free', 'Libres')}
            </div>

            <section className="bg-[#171717] border border-[#292929] rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[#292929]">
                  <tr>
                    <th className={TH}>N°</th>
                    <th className={TH}>Code / lien</th>
                    <th className={TH}>Commerce</th>
                    <th className={TH}>Activée le</th>
                    <th className={TH}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const biz = p.business_id ? byId.get(p.business_id) : null
                    const busy = savingId === p.id
                    return (
                      <tr key={p.id} className="border-b border-[#1f1f1f] last:border-0 align-top">
                        <td className="p-4 text-white font-semibold">{p.numero}</td>
                        <td className="p-4">
                          <p className="text-white font-mono">{p.code}</p>
                          <a href={plaqueUrl(p.code)} target="_blank" rel="noreferrer" className="text-xs text-[#8c8c8c] hover:text-gold break-all">
                            {plaqueUrl(p.code)}
                          </a>
                        </td>
                        <td className="p-4">
                          {biz ? (
                            <>
                              <p className="text-white">{biz.name}</p>
                              <p className="text-xs text-[#8c8c8c] break-all">{biz.email}</p>
                            </>
                          ) : (
                            <span className="text-sm text-[#5c5c5c]">Libre</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-[#8c8c8c]">{formatDateFr(p.activated_at)}</td>
                        <td className="p-4">
                          {editingId === p.id ? (
                            <div className="flex flex-col gap-2 min-w-[220px]">
                              <select
                                value={choice}
                                onChange={(e) => setChoice(e.target.value)}
                                className="bg-[#0d0d0d] border border-[#292929] rounded-lg px-3 py-2 text-sm text-white"
                              >
                                <option value="">Choisir un commerce…</option>
                                {businesses.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}{b.email ? ` — ${b.email}` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={!choice || busy}
                                  onClick={() => assign(p, choice)}
                                  className="text-sm px-3 py-2 rounded-lg bg-gold text-[#12100e] font-semibold disabled:opacity-50"
                                >
                                  {busy ? '…' : 'Valider'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => { setEditingId(null); setChoice('') }}
                                  className="text-sm px-3 py-2 rounded-lg text-[#8c8c8c] hover:text-white"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!!savingId}
                                onClick={() => { setEditingId(p.id); setChoice(p.business_id ?? '') }}
                                className="text-sm px-3 py-2 rounded-lg border border-[#292929] text-white hover:border-gold disabled:opacity-50"
                              >
                                {p.business_id ? 'Réaffecter' : 'Lier'}
                              </button>
                              {p.business_id && (
                                <button
                                  type="button"
                                  disabled={!!savingId}
                                  onClick={() => assign(p, null)}
                                  className="text-sm px-3 py-2 rounded-lg border border-[#2e1515] text-[#ef4343] hover:bg-[#181010] disabled:opacity-50"
                                >
                                  {busy ? '…' : 'Libérer'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-sm text-[#8c8c8c] text-center">
                        {plaques.length === 0 ? 'Aucune plaque générée pour le moment.' : 'Aucune plaque dans ce filtre.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
