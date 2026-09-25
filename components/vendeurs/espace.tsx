'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { VendeurStatusCard } from '@/components/vendeurs/status-card'
import { VendeurDashboard } from '@/components/vendeurs/dashboard'
import { VendeurFormation } from '@/components/vendeurs/formation'
import { VendeurFormationLecture } from '@/components/vendeurs/formation-lecture'
import { VendeurQrCode } from '@/components/vendeurs/qr-code'

// Coquille de l'espace vendeur : navigation par onglets (barre basse, atteignable
// au pouce sur mobile) + contenu de l'onglet actif. Les onglets sont déclarés
// dans TAB_DEFS ci-dessous : en ajouter un plus tard = une entrée + un cas de rendu.
//
// - "Tableau de bord" : commissions, code, commerces (vendeur actif).
// - "Mon QR" : QR code personnel à faire scanner (vendeur actif uniquement).
// - "Formation" : accessible en permanence. Pour un vendeur actif, lecture libre
//   (chapitres dépliables) ; pour un vendeur au statut "formation", le parcours
//   complet avec le test — et c'est l'onglet ouvert par défaut.

type Vendeur = { prenom: string | null; statut: string | null; code: string | null }

type TabId = 'dashboard' | 'qr' | 'formation'

type TabDef = { id: TabId; label: string; icon: ReactNode }

const IconGrid = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
)

const IconQr = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM21 14v7M17 21h4M17 17v4" />
  </svg>
)

const IconBook = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const TAB_DASHBOARD: TabDef = { id: 'dashboard', label: 'Tableau de bord', icon: IconGrid }
const TAB_QR: TabDef = { id: 'qr', label: 'Mon QR', icon: IconQr }
const TAB_FORMATION: TabDef = { id: 'formation', label: 'Formation', icon: IconBook }

function VendeurTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[]
  active: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <nav
      aria-label="Navigation de l'espace vendeur"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
    >
      <div
        className="pointer-events-auto w-full md:w-auto md:mb-4 flex items-stretch gap-1 px-2 py-2 md:px-2
                   bg-[#111111]/95 backdrop-blur border-t border-[#292929]
                   md:border md:rounded-2xl md:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]
                   pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2"
      >
        {tabs.map((t) => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2',
                'min-h-[54px] md:min-h-[46px] px-3 md:px-6 rounded-xl text-xs md:text-sm font-medium',
                'transition-colors duration-200 active:scale-[0.97]',
                isActive ? 'bg-gold text-[#0d0d0d]' : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function VendeurEspace() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendeur, setVendeur] = useState<Vendeur | null>(null)
  // null tant que le statut n'est pas connu : on choisit l'onglet par défaut
  // (formation pour un vendeur en formation, tableau de bord sinon) une fois chargé.
  const [tab, setTab] = useState<TabId | null>(null)

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
          .select('prenom,statut,code')
          .eq('user_id', user.id)
          .maybeSingle<Vendeur>()
        if (vErr) throw vErr
        if (!cancelled) setVendeur(v ?? null)
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

  const isActif = vendeur?.statut === 'actif'

  // Onglets disponibles : le QR n'est proposé qu'au vendeur actif (il a un code
  // qui attribue réellement une vente).
  const tabs = useMemo<TabDef[]>(() => {
    return isActif ? [TAB_DASHBOARD, TAB_QR, TAB_FORMATION] : [TAB_DASHBOARD, TAB_FORMATION]
  }, [isActif])

  // Onglet par défaut dès que le chargement est terminé (sans écraser un choix
  // manuel). Formation par défaut pour un vendeur en formation, tableau de bord sinon.
  useEffect(() => {
    if (tab === null && !loading && !error) {
      setTab(vendeur?.statut === 'formation' ? 'formation' : 'dashboard')
    }
  }, [loading, error, vendeur, tab])

  if (loading || (tab === null && !error)) {
    return <p className="text-sm text-[#8c8c8c]">Chargement…</p>
  }

  if (error) {
    return <VendeurStatusCard title="Oups" message={error} />
  }

  const prenom = vendeur?.prenom?.trim()
  // Sécurité d'affichage : si l'onglet courant n'est plus proposé, on retombe sur le 1er.
  const active: TabId = tabs.some((t) => t.id === tab) ? (tab as TabId) : tabs[0].id

  return (
    <>
      <div className="w-full pb-28 md:pb-32">
        {active === 'dashboard' ? (
          <VendeurDashboard onOpenFormation={() => setTab('formation')} />
        ) : active === 'qr' && vendeur?.code ? (
          <VendeurQrCode code={vendeur.code} prenom={prenom} />
        ) : active === 'formation' && vendeur?.statut === 'formation' ? (
          // Candidat encore en formation : parcours complet + test (voie d'activation).
          <VendeurFormation prenom={prenom} />
        ) : (
          // Vendeur actif : lecture libre, autant de fois qu'il veut.
          <VendeurFormationLecture prenom={prenom} />
        )}
      </div>

      <VendeurTabBar tabs={tabs} active={active} onChange={setTab} />
    </>
  )
}
