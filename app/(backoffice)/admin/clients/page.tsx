'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'
import { effectiveStatus, trialDaysLeft, type SubscriptionStatus } from '@/lib/access'

type AdminKpis = {
  clients: number
  commerces: number
  comptesActifs: number
  revenuMensuel: number
  scansThisMonth: number
}

type BusinessItem = {
  id: string
  userId: string
  name: string
  email: string
  accountCreatedAt: string | null
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string | null
  createdAt: string | null
  totalScans: number
  lastScanAt: string | null
}

type AccountWithoutBusiness = {
  email: string
  accountCreatedAt: string | null
}

type AccountGroup = {
  userId: string
  email: string
  accountCreatedAt: string | null
  businesses: BusinessItem[]
  totalScans: number
}

type PendingAction = {
  business: BusinessItem
  action: 'extend' | 'suspend' | 'reactivate'
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Nombre de jours écoulés depuis une date ISO (0 si aujourd'hui ou futur). */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  const diff = Date.now() - then.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

function daysAgoLabel(iso: string | null): string {
  const d = daysSince(iso)
  if (d === null) return '—'
  if (d === 0) return "aujourd'hui"
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const FR_STATUS: Record<SubscriptionStatus, string> = {
  trial: 'essai',
  active: 'actif',
  expired: 'expiré',
  suspended: 'suspendu',
}

function statusBadgeClass(status: SubscriptionStatus) {
  if (status === 'active') return 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
  if (status === 'trial') return 'bg-[#3a2f1d] border border-[#C9973A]/40 text-gold'
  if (status === 'suspended') return 'bg-red-500/20 border border-red-500/40 text-red-300'
  return 'bg-[#2a2a2a] border border-[#3a3a3a] text-[#b5b5b5]' // expired
}

/** Statut effectif d'un commerce (un essai dépassé compte comme expiré). */
function effectiveOf(b: BusinessItem): SubscriptionStatus {
  return effectiveStatus({ subscription_status: b.subscriptionStatus, trial_ends_at: b.trialEndsAt })
}

/** Libellé "essai / fin d'accès" par commerce. */
function trialInfo(b: BusinessItem): string {
  const eff = effectiveOf(b)
  if (eff === 'trial') {
    const left = trialDaysLeft({ subscription_status: b.subscriptionStatus, trial_ends_at: b.trialEndsAt })
    const dateTxt = formatDateFr(b.trialEndsAt)
    if (left === null) return dateTxt
    return `${dateTxt} · ${left} j restant${left > 1 ? 's' : ''}`
  }
  if (eff === 'expired') return b.trialEndsAt ? `terminé le ${formatDateFr(b.trialEndsAt)}` : 'terminé'
  if (eff === 'suspended') return 'accès suspendu'
  return 'actif à vie'
}

function accountStatusSummary(items: BusinessItem[]) {
  const counts: Record<SubscriptionStatus, number> = { trial: 0, active: 0, expired: 0, suspended: 0 }
  for (const b of items) counts[effectiveOf(b)] += 1
  const order: SubscriptionStatus[] = ['active', 'trial', 'expired', 'suspended']
  const parts = order.filter((s) => counts[s] > 0).map((s) => `${counts[s]} ${FR_STATUS[s]}`)
  return parts.join(' · ') || '—'
}

function AdminTabs() {
  return (
    <div className="inline-flex items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
      <Link href="/admin/clients" className="text-sm px-3 py-2 rounded-lg bg-[#292929] text-white">Clients</Link>
      <Link href="/admin/stats" className="text-sm px-3 py-2 rounded-lg text-[#8c8c8c] hover:text-white hover:bg-white/5 transition-colors duration-200">Statistiques</Link>
    </div>
  )
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<AdminKpis | null>(null)
  const [businesses, setBusinesses] = useState<BusinessItem[]>([])
  const [accountsWithoutBusiness, setAccountsWithoutBusiness] = useState<AccountWithoutBusiness[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deletingBusinessId, setDeletingBusinessId] = useState<string | null>(null)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)

  // Modale de confirmation pour les actions d'accès.
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [extendDays, setExtendDays] = useState<7 | 15 | 30>(15)
  const [submitting, setSubmitting] = useState(false)

  const anyBusy = !!(submitting || deletingBusinessId || deletingAccountId)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Impossible de charger les données admin.')
      setKpis(payload.kpis)
      setBusinesses(payload.businesses ?? [])
      setAccountsWithoutBusiness(payload.accountsWithoutBusiness ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const accounts = useMemo<AccountGroup[]>(() => {
    const map = new Map<string, AccountGroup>()
    for (const b of businesses) {
      let g = map.get(b.userId)
      if (!g) {
        g = { userId: b.userId, email: b.email, accountCreatedAt: b.accountCreatedAt, businesses: [], totalScans: 0 }
        map.set(b.userId, g)
      }
      g.businesses.push(b)
      g.totalScans += b.totalScans
    }
    return [...map.values()].sort((a, b) => (b.accountCreatedAt ?? '').localeCompare(a.accountCreatedAt ?? ''))
  }, [businesses])

  const cards = useMemo(() => {
    if (!kpis) return []
    return [
      { label: 'Clients inscrits', value: kpis.clients.toString(), gold: false },
      { label: 'Commerces', value: kpis.commerces.toString(), gold: true },
      { label: 'Comptes actifs payants', value: kpis.comptesActifs.toString(), gold: false },
      { label: 'Revenus mensuels estimés', value: formatEuro(kpis.revenuMensuel), gold: false },
      { label: 'Total scans ce mois', value: kpis.scansThisMonth.toString(), gold: false },
    ]
  }, [kpis])

  function toggleExpand(userId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function openAction(business: BusinessItem, action: PendingAction['action']) {
    if (anyBusy) return
    setError(null)
    setExtendDays(15)
    setPending({ business, action })
  }

  async function confirmAction() {
    if (!pending) return
    setSubmitting(true)
    setError(null)
    try {
      const body: { businessId: string; action: string; days?: number } = {
        businessId: pending.business.id,
        action: pending.action,
      }
      if (pending.action === 'extend') body.days = extendDays

      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Échec de la mise à jour.')

      const nextStatus = (payload.subscription_status ?? pending.business.subscriptionStatus) as SubscriptionStatus
      const nextEnd = 'trial_ends_at' in payload ? payload.trial_ends_at : pending.business.trialEndsAt
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === pending.business.id
            ? { ...b, subscriptionStatus: nextStatus, trialEndsAt: nextEnd }
            : b
        )
      )
      setPending(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteBusiness(business: BusinessItem) {
    if (anyBusy) return
    if (!window.confirm(`Supprimer le commerce « ${business.name} » et toutes ses données (avis, scans, feedbacks) ? Action irréversible. Le compte ${business.email} et ses autres commerces ne sont pas touchés.`)) return
    setDeletingBusinessId(business.id)
    setError(null)
    try {
      const response = await fetch('/api/admin/delete-business', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Échec de la suppression du commerce.')
      setBusinesses((prev) => prev.filter((b) => b.id !== business.id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setDeletingBusinessId(null)
    }
  }

  async function handleDeleteAccount(account: AccountGroup) {
    if (anyBusy) return
    if (!window.confirm(`Supprimer DÉFINITIVEMENT le compte ${account.email} avec ses ${account.businesses.length} commerce(s) et toutes leurs données ? Action irréversible.`)) return
    setDeletingAccountId(account.userId)
    setError(null)
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.userId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error ?? 'Échec de la suppression du compte.')
      setBusinesses((prev) => prev.filter((b) => b.userId !== account.userId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setDeletingAccountId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(message) => setError(message)} />

      <div className="p-4 flex flex-col gap-4">
        <AdminTabs />

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement du backoffice…</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {cards.map((card) => (
                <article key={card.label} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{card.label}</p>
                  <p className={`text-2xl md:text-3xl font-bold ${card.gold ? 'text-gold' : 'text-white'}`}>{card.value}</p>
                </article>
              ))}
            </section>

            <section className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#292929]">
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Compte (email)</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Inscription</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Commerces</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Statut global</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Scans cumulés</th>
                      <th className="text-right p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const isOpen = expanded.has(account.userId)
                      return (
                        <FragmentRow
                          key={account.userId}
                          account={account}
                          isOpen={isOpen}
                          onToggle={() => toggleExpand(account.userId)}
                          onDeleteAccount={() => handleDeleteAccount(account)}
                          deletingAccount={deletingAccountId === account.userId}
                          anyBusy={anyBusy}
                          onAction={openAction}
                          onDeleteBusiness={handleDeleteBusiness}
                          deletingBusinessId={deletingBusinessId}
                        />
                      )
                    })}
                    {accounts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-[#8c8c8c]">Aucun compte trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {accountsWithoutBusiness.length > 0 && (
              <section className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-[#292929]">
                  <h2 className="text-sm font-semibold text-white">Inscrits sans commerce configuré</h2>
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#3a2f1d] border border-[#C9973A]/40 text-gold">
                    {accountsWithoutBusiness.length}
                  </span>
                  <p className="text-xs text-[#8c8c8c]">Comptes créés à l&apos;activation, jamais configurés — prospects à relancer.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Compte (email)</th>
                        <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Inscription</th>
                        <th className="text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]">Ancienneté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsWithoutBusiness.map((a) => (
                        <tr key={a.email} className="border-b border-[#292929] last:border-b-0">
                          <td className="p-4 text-white">{a.email}</td>
                          <td className="p-4 text-[#c7c7c7]">{formatDateFr(a.accountCreatedAt)}</td>
                          <td className="p-4 text-[#c7c7c7]">{daysAgoLabel(a.accountCreatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {pending && (
        <ConfirmModal
          pending={pending}
          extendDays={extendDays}
          setExtendDays={setExtendDays}
          submitting={submitting}
          error={error}
          onCancel={() => { if (!submitting) setPending(null) }}
          onConfirm={confirmAction}
        />
      )}
    </div>
  )
}

/* ─── Modale de confirmation ──────────────────────────────── */
function ConfirmModal({
  pending, extendDays, setExtendDays, submitting, error, onCancel, onConfirm,
}: {
  pending: PendingAction
  extendDays: 7 | 15 | 30
  setExtendDays: (d: 7 | 15 | 30) => void
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const { business, action } = pending

  const title =
    action === 'extend' ? "Prolonger l'essai"
    : action === 'suspend' ? "Suspendre l'accès"
    : "Réactiver l'accès"

  const confirmLabel =
    action === 'extend' ? `Prolonger de ${extendDays} jours`
    : action === 'suspend' ? 'Suspendre maintenant'
    : 'Réactiver'

  const confirmClass =
    action === 'suspend'
      ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
      : 'bg-gold text-[#12100e] hover:brightness-110'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-[#8c8c8c]">Commerce : <span className="text-[#e5e5e5]">{business.name}</span></p>
        </div>

        {action === 'extend' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#8c8c8c]">Durée à ajouter</p>
            <div className="flex gap-2">
              {([7, 15, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDays(d)}
                  className={[
                    'flex-1 min-h-[44px] rounded-xl text-sm font-medium border transition-colors',
                    extendDays === d
                      ? 'bg-gold text-[#12100e] border-gold'
                      : 'bg-[#292929] text-[#c7c7c7] border-[#3a3a3a] hover:bg-[#333]',
                  ].join(' ')}
                >
                  +{d} j
                </button>
              ))}
            </div>
          </div>
        )}

        {action === 'suspend' && (
          <p className="text-sm text-[#c7c7c7] leading-relaxed">
            Le commerçant sera immédiatement déconnecté de son tableau de bord.
            Sa page publique redirigera directement vers Google (ses clients ne
            voient aucune coupure).
          </p>
        )}

        {action === 'reactivate' && (
          <p className="text-sm text-[#c7c7c7] leading-relaxed">
            L&apos;accès au tableau de bord est rétabli immédiatement.
          </p>
        )}

        {error && (
          <div className="rounded-xl bg-[#181010] border border-[#2e1515] p-3">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[44px] px-4 rounded-xl text-sm text-[#c7c7c7] border border-[#3a3a3a] hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all ${confirmClass}`}
          >
            {submitting ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Ligne compte + détail des commerces (accordéon) ─────── */
function FragmentRow({
  account, isOpen, onToggle, onDeleteAccount, deletingAccount, anyBusy,
  onAction, onDeleteBusiness, deletingBusinessId,
}: {
  account: AccountGroup
  isOpen: boolean
  onToggle: () => void
  onDeleteAccount: () => void
  deletingAccount: boolean
  anyBusy: boolean
  onAction: (b: BusinessItem, action: PendingAction['action']) => void
  onDeleteBusiness: (b: BusinessItem) => void
  deletingBusinessId: string | null
}) {
  return (
    <>
      <tr
        className="border-b border-[#292929] last:border-b-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <td className="p-4">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-white">{account.email}</span>
          </div>
        </td>
        <td className="p-4 text-[#c7c7c7]">{formatDateFr(account.accountCreatedAt)}</td>
        <td className="p-4 text-white">{account.businesses.length}</td>
        <td className="p-4 text-[#c7c7c7]">{accountStatusSummary(account.businesses)}</td>
        <td className="p-4 text-white">{account.totalScans}</td>
        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={anyBusy}
            className="px-2.5 py-1.5 text-xs rounded-lg font-medium border border-[#9c3232] text-[#ef4343] hover:bg-[#2e1515] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deletingAccount ? 'Suppression…' : 'Supprimer le compte'}
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-[#101010] border-b border-[#292929]">
          <td colSpan={6} className="px-4 py-3">
            <div className="overflow-x-auto rounded-xl border border-[#222222]">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-[#222222]">
                    <th className="text-left p-3 text-[11px] uppercase tracking-widest text-[#6f6f6f]">Commerce</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-widest text-[#6f6f6f]">Statut</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-widest text-[#6f6f6f]">Essai / accès</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-widest text-[#6f6f6f]">Scans</th>
                    <th className="text-right p-3 text-[11px] uppercase tracking-widest text-[#6f6f6f]">Actions (commerce)</th>
                  </tr>
                </thead>
                <tbody>
                  {account.businesses.map((b) => {
                    const eff = effectiveOf(b)
                    return (
                      <tr key={b.id} className="border-b border-[#1c1c1c] last:border-b-0">
                        <td className="p-3 text-white">{b.name}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(eff)}`}>
                            {FR_STATUS[eff]}
                          </span>
                        </td>
                        <td className="p-3 text-[#c7c7c7] text-xs">{trialInfo(b)}</td>
                        <td className="p-3 text-white">{b.totalScans}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 justify-end">
                            <button type="button" onClick={() => onAction(b, 'extend')} disabled={anyBusy} className="px-2 py-1 text-xs rounded-full font-medium bg-[#292929] text-gold border border-[#C9973A]/40 hover:bg-[#33291a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Prolonger</button>
                            <button type="button" onClick={() => onAction(b, 'reactivate')} disabled={anyBusy || eff === 'active' || eff === 'trial'} className="px-2 py-1 text-xs rounded-full font-medium bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Réactiver</button>
                            <button type="button" onClick={() => onAction(b, 'suspend')} disabled={anyBusy || eff === 'suspended'} className="px-2 py-1 text-xs rounded-full font-medium bg-[#d97706] text-white hover:bg-[#b45309] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Suspendre</button>
                            <button type="button" onClick={() => onDeleteBusiness(b)} disabled={anyBusy} className="px-2 py-1 text-xs rounded-full font-medium bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                              {deletingBusinessId === b.id ? 'Suppr.…' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
