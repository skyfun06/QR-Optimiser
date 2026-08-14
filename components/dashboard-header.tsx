'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BrandLogo } from '@/components/brand-logo'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

type Biz = { id: string; name: string | null }
type NavLink = { href: string; label: string }

type PillGeom = { left: number; top: number; width: number; height: number }

// Dernière position connue de la pastille — conservée AU NIVEAU MODULE (survit
// au remontage du header à chaque navigation). Elle sert d'état INITIAL au
// prochain montage : la pastille apparaît donc sur l'ancien onglet, puis glisse
// vers le nouveau. Robuste au double-effet de React StrictMode (dev).
let lastPillGeom: PillGeom | null = null

function tabGeom(el: HTMLElement): PillGeom {
  return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
}
function findTab(nav: HTMLElement, href: string): HTMLElement | null {
  return Array.from(nav.querySelectorAll<HTMLElement>('[data-href]')).find((el) => el.dataset.href === href) ?? null
}

function navLinkClass(active: boolean) {
  return [
    'relative z-10 inline-flex items-center text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl min-h-[44px]',
    'whitespace-nowrap transition-colors duration-300 active:scale-[0.97]',
    active ? 'text-[#0d0d0d] font-semibold' : 'text-[#8c8c8c] hover:text-[#e5e5e5]',
  ].join(' ')
}

const signOutClass =
  'cursor-pointer text-xs text-[#8c8c8c] px-3 py-2 min-h-[44px] border border-[#222222] rounded-xl w-full md:w-auto ' +
  'transition-all duration-200 hover:bg-red-500 hover:text-white hover:border-red-500 ' +
  'hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100'

export type DashboardHeaderProps = {
  subtitle?: string | null
  onSignOutError?: (message: string) => void
}

export function DashboardHeader({ subtitle, onSignOutError }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ businessId?: string }>()
  const businessId = params?.businessId

  const [signingOut, setSigningOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [businesses, setBusinesses] = useState<Biz[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement | null>(null)

  // Indicateur coulissant sous l'onglet actif.
  const navRef = useRef<HTMLElement | null>(null)
  // Y avait-il déjà une pastille positionnée avant ce montage ? (→ on anime le
  // glissement) Capturé une seule fois, avant que l'effet ne modifie le module.
  const hadPrevOnMount = useRef<boolean | null>(null)
  if (hadPrevOnMount.current === null) hadPrevOnMount.current = lastPillGeom !== null
  // État initial = position de l'ancien onglet (si connue) → point de départ du glissement.
  const [pill, setPill] = useState(() =>
    lastPillGeom
      ? { ...lastPillGeom, ready: true, animate: false }
      : { left: 0, top: 0, width: 0, height: 0, ready: false, animate: false }
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      setIsAdmin(user?.email === ADMIN_EMAIL)
      if (user) {
        const { data } = await supabase
          .from('businesses')
          .select('id,name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        if (!cancelled) setBusinesses((data as Biz[] | null) ?? [])
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!switcherOpen) return
    function onDoc(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [switcherOpen])

  const navItems = useMemo(() => {
    if (!businessId) return [] as NavLink[]
    const base = `/business/${businessId}`
    return [
      { href: base, label: 'Dashboard' },
      { href: `${base}/qrcode`, label: 'QR Code' },
      { href: `${base}/widget`, label: 'Widget' },
      { href: `${base}/feedbacks`, label: 'Tous les feedbacks' },
      { href: `${base}/parrainage`, label: 'Parrainage' },
      { href: `${base}/settings`, label: 'Paramètres' },
    ]
  }, [businessId])

  // Liste unifiée des onglets réellement rendus (dans l'ordre d'affichage).
  const navLinks = useMemo<NavLink[]>(() => {
    const links: NavLink[] = []
    if (!businessId) links.push({ href: '/businesses', label: 'Mes commerces' })
    links.push(...navItems)
    if (isAdmin) links.push({ href: '/admin/clients', label: 'Admin' })
    return links
  }, [businessId, navItems, isAdmin])

  // Déplace la pastille vers l'onglet actif. La position INITIALE (état ci-dessus)
  // étant celle de l'ancien onglet, la transition CSS produit le glissement.
  useEffect(() => {
    function reposition(animate: boolean) {
      const nav = navRef.current
      if (!nav) return
      const el = findTab(nav, pathname)
      if (!el) {
        setPill((p) => ({ ...p, ready: false }))
        return
      }
      const g = tabGeom(el)
      lastPillGeom = g
      setPill({ ...g, ready: true, animate })
    }

    // Glisse seulement s'il y avait un onglet précédent (sinon placement direct).
    reposition(hadPrevOnMount.current === true)
    hadPrevOnMount.current = true

    function onResize() { reposition(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pathname, navLinks])

  const currentBiz = useMemo(
    () => businesses.find((b) => b.id === businessId) ?? null,
    [businesses, businessId]
  )

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.push('/login')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      onSignOutError?.(message)
    } finally {
      setSigningOut(false)
    }
  }

  const line = subtitle?.trim() ? subtitle.trim() : 'Suivi de vos performances'

  return (
    <header className="relative z-50 w-full flex flex-col justify-start items-start border-b border-b-[#222222] animate-fade-in">
      <div className="w-full flex flex-col md:flex-row justify-between md:items-center p-4 gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo href="/" iconSize={32} />

          {/* Sélecteur de commerce (seulement sur une page commerce) */}
          {businessId && (
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                aria-expanded={switcherOpen}
                className="group inline-flex items-center gap-2 text-xs md:text-sm text-white bg-gradient-to-b from-[#242424] to-[#181818] border border-[#333333] rounded-xl pl-3 pr-2.5 py-2 min-h-[42px] cursor-pointer transition-all duration-200 hover:border-[#C9973A]/60 hover:from-[#2b2b2b] hover:to-[#1e1e1e] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.7)] max-w-[230px]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-gold">
                  <path d="M3 9l1.5-5h15L21 9" />
                  <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                  <path d="M9 22V12h6v10" />
                </svg>
                <span className="truncate font-medium">{currentBiz?.name?.trim() || 'Commerce'}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`shrink-0 text-[#8c8c8c] transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {switcherOpen && (
                <div className="absolute left-0 mt-2 z-40 w-64 max-h-[60vh] overflow-y-auto bg-[#181818] border border-[#2f2f2f] rounded-xl p-1.5 shadow-2xl animate-scale-in origin-top-left">
                  {businesses.map((b) => {
                    const active = b.id === businessId
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSwitcherOpen(false); router.push(`/business/${b.id}`) }}
                        className={[
                          'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer transition-colors duration-150',
                          active ? 'bg-[#2a2a2a] text-white' : 'text-[#cfcfcf] hover:bg-white/[0.06]',
                        ].join(' ')}
                      >
                        <span className="truncate">{b.name?.trim() || 'Commerce sans nom'}</span>
                        {active && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                  <div className="h-px bg-[#2a2a2a] my-1.5" />
                  <Link
                    href="/businesses"
                    onClick={() => setSwitcherOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#c7c7c7] hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[#8c8c8c]">
                      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                    Mes commerces
                  </Link>
                  <Link
                    href="/businesses/new"
                    onClick={() => setSwitcherOpen(false)}
                    className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-gold text-[#12100e] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 5v14" /><path d="M5 12h14" />
                    </svg>
                    Ajouter un commerce
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row md:justify-center md:items-center gap-2 md:gap-4">
          <p className="text-xs text-[#8c8c8c]">{line}</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className={signOutClass}
          >
            {signingOut ? 'Déconnexion...' : 'Déconnexion'}
          </button>
        </div>
      </div>

      {/* Barre de navigation : uniquement sur une page commerce */}
      {navLinks.length > 0 && (
        <>
          <hr className="h-px w-full border-0 bg-[#222222]" />
          <div className="w-full overflow-x-auto">
            <nav ref={navRef} className="relative flex flex-row justify-start items-center p-3 md:p-4 gap-2 md:gap-4 min-w-max">
              {/* Pastille coulissante sous l'onglet actif */}
              <span
                aria-hidden
                className="absolute rounded-xl bg-gold pointer-events-none"
                style={{
                  left: 0,
                  top: pill.top,
                  width: pill.width,
                  height: pill.height,
                  transform: `translateX(${pill.left}px)`,
                  opacity: pill.ready ? 1 : 0,
                  transition: pill.animate
                    ? 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), width 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease'
                    : 'opacity 0.2s ease',
                }}
              />
              {navLinks.map(({ href, label }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href} data-href={href} className={navLinkClass(active)}>
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
