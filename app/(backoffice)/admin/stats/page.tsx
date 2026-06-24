'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'

type StatsKpis = {
  comptes: number
  commerces: number
  avis: number
  scans: number
  feedbacks: number
}

type SignupBucket = { key: string; label: string; count: number }

function AdminTabs({ active }: { active: 'clients' | 'stats' }) {
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
    </div>
  )
}

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<StatsKpis | null>(null)
  const [signups, setSignups] = useState<SignupBucket[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload?.error ?? 'Impossible de charger les statistiques.')
        if (!cancelled) {
          setKpis(payload.kpis)
          setSignups(payload.signups ?? [])
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const cards = useMemo(() => {
    if (!kpis) return []
    return [
      { label: 'Comptes (patrons)', value: kpis.comptes, gold: false },
      { label: 'Commerces inscrits', value: kpis.commerces, gold: true },
      { label: 'Avis collectés', value: kpis.avis, gold: false },
      { label: 'Scans (total)', value: kpis.scans, gold: false },
      { label: 'Feedbacks (total)', value: kpis.feedbacks, gold: false },
    ]
  }, [kpis])

  const maxSignup = useMemo(() => Math.max(1, ...signups.map((s) => s.count)), [signups])

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(m) => setError(m)} />

      <div className="p-4 flex flex-col gap-4">
        <AdminTabs active="stats" />

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement des statistiques…</p>
          </div>
        ) : (
          <>
            {/* KPIs plateforme */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {cards.map((card) => (
                <article key={card.label} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{card.label}</p>
                  <p className={`text-3xl md:text-4xl font-bold ${card.gold ? 'text-gold' : 'text-white'}`}>{card.value}</p>
                </article>
              ))}
            </section>

            {/* Commerces créés par mois */}
            <section className="bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-5">
              <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Commerces créés — 6 derniers mois</p>
              <div className="w-full flex items-end gap-3 md:gap-5" style={{ height: 180 }}>
                {signups.map((s) => {
                  const h = Math.round((s.count / maxSignup) * 140)
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                      <span className="text-sm font-semibold text-white">{s.count}</span>
                      <div
                        className="w-full max-w-[56px] rounded-t-md"
                        style={{
                          height: `${Math.max(4, h)}px`,
                          background: s.count > 0 ? 'linear-gradient(180deg, #C9973A, #a87e30)' : '#1f1f1f',
                        }}
                      />
                      <span className="text-xs text-[#8c8c8c]">{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
