'use client'

import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Carte de statut de l'espace vendeur (candidature en attente, accès suspendu,
 * page d'accueil). Présentation neutre au design ScanAvis. Un lien discret de
 * déconnexion évite d'enfermer le vendeur (rechargement complet pour que le
 * routing du sous-domaine réévalue la session).
 */
export function VendeurStatusCard({
  title,
  message,
  children,
}: {
  title: string
  message?: ReactNode
  children?: ReactNode
}) {
  async function logout() {
    await supabase.auth.signOut()
    window.location.assign('/rejoindre/connexion')
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center animate-scale-in">
      <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
      {message && (
        <p className="text-sm md:text-base text-[#8c8c8c] leading-relaxed">{message}</p>
      )}
      {children}
      <button
        type="button"
        onClick={logout}
        className="min-h-[44px] text-sm text-[#8c8c8c] hover:text-white transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  )
}
