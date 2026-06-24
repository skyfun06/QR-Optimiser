'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'

type Biz = { id: string; name: string | null }

function navLinkClass(active: boolean) {
  return [
    'text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl min-h-[44px] transition-all duration-200 whitespace-nowrap',
    'active:scale-[0.97]',
    active
      ? 'bg-gold text-[#0d0d0d] hover:bg-gold/90'
      : 'text-[#8c8c8c] hover:text-[#e5e5e5] hover:bg-white/5',
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
    if (!businessId) return [] as { href: string; label: string }[]
    const base = `/business/${businessId}`
    return [
      { href: base, label: 'Dashboard' },
      { href: `${base}/qrcode`, label: 'QR Code' },
      { href: `${base}/settings`, label: 'Paramètres' },
      { href: `${base}/feedbacks`, label: 'Tous les feedbacks' },
    ]
  }, [businessId])

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
    <header className="w-full flex flex-col justify-start items-start border-b border-b-[#222222]">
      <div className="w-full flex flex-col md:flex-row justify-between md:items-center p-4 gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gold font-bold text-lg md:text-xl">ScanAvis</Link>

          {/* Sélecteur de commerce (seulement sur une page commerce) */}
          {businessId && (
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                className="inline-flex items-center gap-2 text-xs md:text-sm text-[#e5e5e5] bg-[#171717] border border-[#292929] rounded-xl px-3 py-2 min-h-[40px] cursor-pointer transition-colors duration-200 hover:border-[#3a3a3a] max-w-[200px]"
              >
                <span className="truncate">{currentBiz?.name?.trim() || 'Commerce'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {switcherOpen && (
                <div className="absolute left-0 mt-1.5 z-40 w-60 max-h-[60vh] overflow-y-auto bg-[#171717] border border-[#292929] rounded-xl p-1 shadow-xl">
                  {businesses.map((b) => {
                    const active = b.id === businessId
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSwitcherOpen(false); router.push(`/business/${b.id}`) }}
                        className={[
                          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm cursor-pointer transition-colors duration-150',
                          active ? 'bg-[#292929] text-white' : 'text-[#cfcfcf] hover:bg-white/5',
                        ].join(' ')}
                      >
                        <span className="truncate">{b.name?.trim() || 'Commerce sans nom'}</span>
                        {active && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                  <div className="h-px bg-[#222222] my-1" />
                  <Link href="/businesses" onClick={() => setSwitcherOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-[#8c8c8c] hover:bg-white/5 transition-colors">
                    Mes commerces
                  </Link>
                  <Link href="/businesses/new" onClick={() => setSwitcherOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gold hover:bg-white/5 transition-colors">
                    + Ajouter un commerce
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
      {(navItems.length > 0 || isAdmin) && (
        <>
          <hr className="h-px w-full border-0 bg-[#222222]" />
          <div className="w-full overflow-x-auto">
            <nav className="flex flex-row justify-start items-center p-3 md:p-4 gap-2 md:gap-4 min-w-max">
              {!businessId && (
                <Link href="/businesses" className={navLinkClass(pathname === '/businesses')}>Mes commerces</Link>
              )}
              {navItems.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass(pathname === href)}>
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin/clients" className={navLinkClass(pathname === '/admin/clients')}>Admin</Link>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
