'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'

type SubscriptionStatus = 'free' | 'active' | 'canceling' | 'canceled'

type AdminKpis = {
  totalClients: number
  activeClients: number
  estimatedMonthlyRevenue: number
  scansThisMonth: number
}

type AdminClient = {
  id: string
  userId: string
  name: string
  email: string
  subscriptionStatus: SubscriptionStatus
  createdAt: string | null
  totalScans: number
  lastScanAt: string | null
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusLabel(status: SubscriptionStatus) {
  if (status === 'active') return 'active'
  if (status === 'canceling') return 'canceling'
  if (status === 'canceled') return 'canceled'
  return 'free'
}

function statusBadgeClass(status: SubscriptionStatus) {
  if (status === 'active') {
    return 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
  }
  if (status === 'canceling') {
    return 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
  }
  if (status === 'canceled') {
    return 'bg-red-500/20 border border-red-500/40 text-red-300'
  }
  return 'bg-[#2a2a2a] border border-[#3a3a3a] text-[#b5b5b5]'
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [kpis, setKpis] = useState<AdminKpis | null>(null)
  const [clients, setClients] = useState<AdminClient[]>([])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Impossible de charger les données admin.')
      }

      setKpis(payload.kpis)
      setClients(payload.clients ?? [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleStatusUpdate(client: AdminClient, nextStatus: SubscriptionStatus) {
    if (client.subscriptionStatus === nextStatus) return
    if (updatingId || deletingId) return

    setUpdatingId(client.id)
    setError(null)

    try {
      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: client.id, nextStatus }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Échec de la mise à jour du statut.')
      }

      setClients((prev) =>
        prev.map((row) =>
          row.id === client.id ? { ...row, subscriptionStatus: nextStatus } : row
        )
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteUser(client: AdminClient) {
    if (updatingId || deletingId) return

    const confirmed = window.confirm(
      `Supprimer définitivement ${client.name} et toutes ses données ? Cette action est irréversible.`
    )
    if (!confirmed) return

    setDeletingId(client.id)
    setError(null)

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.userId }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Échec de la suppression du compte.')
      }

      setClients((prev) => prev.filter((row) => row.id !== client.id))
      window.alert('Compte supprimé avec succès')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  const cards = useMemo(() => {
    if (!kpis) return []
    return [
      { label: 'Total clients inscrits', value: kpis.totalClients.toString() },
      { label: 'Clients actifs payants', value: kpis.activeClients.toString() },
      { label: 'Revenus mensuels estimés', value: formatEuro(kpis.estimatedMonthlyRevenue) },
      { label: 'Total scans ce mois', value: kpis.scansThisMonth.toString() },
    ]
  }, [kpis])

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(message) => setError(message)} />

      <div className="p-4 flex flex-col gap-4">
        {error && (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement du backoffice...</p>
          </div>
        )}

        {!loading && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {cards.map((card) => (
                <article
                  key={card.label}
                  className="bg-[#171717] border border-[#292929] rounded-2xl p-6 flex flex-col gap-3"
                >
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{card.label}</p>
                  <p className="text-4xl font-bold text-white">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-[#292929]">
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Nom du commerce</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Email</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Statut</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Date d&apos;inscription</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Nb de scans total</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Dernier scan</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c] min-w-[200px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b border-[#292929] last:border-b-0">
                        <td className="p-4 text-white">{client.name}</td>
                        <td className="p-4 text-[#c7c7c7]">{client.email}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(client.subscriptionStatus)}`}
                          >
                            {statusLabel(client.subscriptionStatus)}
                          </span>
                        </td>
                        <td className="p-4 text-[#c7c7c7]">{formatDateFr(client.createdAt)}</td>
                        <td className="p-4 text-white">{client.totalScans}</td>
                        <td className="p-4 text-[#c7c7c7]">{formatDateFr(client.lastScanAt)}</td>
                        <td className="p-4 min-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(client, 'active')}
                              disabled={
                                updatingId === client.id ||
                                deletingId === client.id ||
                                client.subscriptionStatus === 'active'
                              }
                              className="px-2 py-1 text-xs rounded-full font-medium bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Activer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(client, 'free')}
                              disabled={
                                updatingId === client.id ||
                                deletingId === client.id ||
                                client.subscriptionStatus === 'free'
                              }
                              className="px-2 py-1 text-xs rounded-full font-medium bg-[#292929] text-[#8c8c8c] border border-[#444] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Freemium
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(client, 'canceled')}
                              disabled={
                                updatingId === client.id ||
                                deletingId === client.id ||
                                client.subscriptionStatus === 'canceled'
                              }
                              className="px-2 py-1 text-xs rounded-full font-medium bg-[#d97706] text-white hover:bg-[#b45309] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(client)}
                              disabled={updatingId === client.id || deletingId === client.id}
                              className="px-2 py-1 text-xs rounded-full font-medium bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {deletingId === client.id ? 'Suppression…' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-sm text-[#8c8c8c]">
                          Aucun client trouvé.
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