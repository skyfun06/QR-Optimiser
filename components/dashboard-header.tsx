'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/qrcode', label: 'QR Code' },
  { href: '/settings', label: 'Paramètres' },
  { href: '/feedback-history', label: 'Tous les feedbacks' },
] as const

function navLinkClass(active: boolean) {
  return [
    'text-sm px-4 py-2 rounded-xl transition-all duration-200',
    'active:scale-[0.97]',
    active
      ? 'bg-gold text-[#0d0d0d] hover:bg-gold/90'
      : 'text-[#8c8c8c] hover:text-[#e5e5e5] hover:bg-white/5',
  ].join(' ')
}

const signOutClass =
  'cursor-pointer text-xs text-[#8c8c8c] px-2.5 py-1.5 border border-[#222222] rounded-xl ' +
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
      <div className="w-full flex flex-row justify-between items-center p-4">
        <p className="text-gold font-bold text-xl">ScanAvis</p>
        <div className="flex flex-row justify-center items-center gap-4">
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
      <nav className="flex flex-row flex-wrap justify-start items-center p-4 gap-4">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className={navLinkClass(pathname === href)}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
