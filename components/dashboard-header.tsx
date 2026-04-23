'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BASE_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/qrcode', label: 'QR Code' },
  { href: '/settings', label: 'Paramètres' },
  { href: '/feedback-history', label: 'Tous les feedbacks' },
] as const

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
  const [signingOut, setSigningOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolveAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!cancelled) {
        setIsAdmin(user?.email === 'lborrelli248@gmail.com')
      }
    }

    resolveAdminAccess()

    return () => {
      cancelled = true
    }
  }, [])

  const navItems = useMemo(() => {
    if (!isAdmin) return BASE_NAV
    return [...BASE_NAV, { href: '/admin/clients', label: 'Admin' }] as const
  }, [isAdmin])

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
        <a href="/" className="text-gold font-bold text-lg md:text-xl">ScanAvis</a>
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
      <hr className="h-px w-full border-0 bg-[#222222]" />
      <div className="w-full overflow-x-auto">
        <nav className="flex flex-row justify-start items-center p-3 md:p-4 gap-2 md:gap-4 min-w-max">
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href} className={navLinkClass(pathname === href)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
