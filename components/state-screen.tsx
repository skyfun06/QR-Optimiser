'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

// Écrans d'état réutilisables (chargement / succès / erreur / vide), partagés
// dans toute l'app pour garantir une expérience cohérente. Chaque écran occupe
// le viewport, centre une carte au design ScanAvis et affiche le footer de marque.
// À câbler dans les fichiers spéciaux Next (loading.tsx / error.tsx / not-found.tsx)
// ou à utiliser directement dans une page.

type Action = {
  label: string
  href?: string
  onClick?: () => void
}

const PRIMARY_CLS =
  'w-full min-h-[48px] flex justify-center items-center gap-2 bg-gold text-[#12100e] font-semibold rounded-2xl py-3 transition-all hover:brightness-110 active:scale-[0.98]'
const SECONDARY_CLS =
  'w-full min-h-[44px] flex justify-center items-center text-sm text-[#8c8c8c] hover:text-white transition-colors'

function ActionButton({ action, className }: { action: Action; className: string }) {
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  )
}

function Actions({ action, secondaryAction }: { action?: Action; secondaryAction?: Action }) {
  if (!action && !secondaryAction) return null
  return (
    <div className="w-full flex flex-col gap-3">
      {action && <ActionButton action={action} className={PRIMARY_CLS} />}
      {secondaryAction && <ActionButton action={secondaryAction} className={SECONDARY_CLS} />}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center gap-4 px-4 py-8">
      <div className="w-full max-w-md flex flex-col justify-center items-center gap-6 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center animate-scale-in">
        {children}
      </div>
      <p className="text-xs text-[#8c8c8c]">
        Propulsé par <span className="text-gold">ScanAvis</span>
      </p>
    </div>
  )
}

function Heading({ title, message }: { title: string; message?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
      {message && <p className="text-sm md:text-base text-[#8c8c8c] leading-relaxed">{message}</p>}
    </div>
  )
}

type ScreenProps = {
  title?: string
  message?: ReactNode
  action?: Action
  secondaryAction?: Action
  children?: ReactNode
}

/** Écran de chargement — spinner or + message. */
export function LoadingScreen({
  title = 'Chargement…',
  message = 'Merci de patienter un instant.',
  children,
}: Pick<ScreenProps, 'title' | 'message' | 'children'>) {
  return (
    <Shell>
      <svg className="animate-spin" width="56" height="56" viewBox="0 0 50 50" fill="none" aria-hidden>
        <circle cx="25" cy="25" r="20" stroke="#292929" strokeWidth="4" />
        <path d="M25 5 a20 20 0 0 1 20 20" stroke="#C9973A" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <Heading title={title} message={message} />
      {children}
      <span className="sr-only" role="status">
        Chargement en cours
      </span>
    </Shell>
  )
}

/** Écran de succès — coche or animée + message + actions optionnelles. */
export function SuccessScreen({
  title = 'C’est validé !',
  message,
  action,
  secondaryAction,
  children,
}: ScreenProps) {
  return (
    <Shell>
      <style>{'@keyframes sa-draw{to{stroke-dashoffset:0}}'}</style>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="#C9973A"
          strokeWidth="3"
          strokeDasharray="226"
          strokeDashoffset="226"
          style={{ animation: 'sa-draw 0.8s ease-out forwards' }}
        />
        <path
          d="M25 42 L35 52 L55 30"
          stroke="#C9973A"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="50"
          strokeDashoffset="50"
          style={{ animation: 'sa-draw 0.5s ease-out 0.6s forwards' }}
        />
      </svg>
      <Heading title={title} message={message} />
      {children}
      <Actions action={action} secondaryAction={secondaryAction} />
    </Shell>
  )
}

/** Écran d'erreur — icône rouge + message + bouton « Réessayer » optionnel. */
export function ErrorScreen({
  title = 'Une erreur est survenue',
  message = 'Quelque chose s’est mal passé de notre côté. Réessayez dans un instant.',
  onRetry,
  retryLabel = 'Réessayer',
  action,
  secondaryAction,
  children,
}: ScreenProps & { onRetry?: () => void; retryLabel?: string }) {
  const primary = action ?? (onRetry ? { label: retryLabel, onClick: onRetry } : undefined)
  return (
    <Shell>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
        <circle cx="40" cy="40" r="36" stroke="#ef4343" strokeWidth="3" />
        <path d="M40 24 V44" stroke="#ef4343" strokeWidth="4" strokeLinecap="round" />
        <circle cx="40" cy="55" r="2.5" fill="#ef4343" />
      </svg>
      <Heading title={title} message={message} />
      {children}
      <Actions action={primary} secondaryAction={secondaryAction} />
    </Shell>
  )
}

/** Écran vide — état neutre quand il n'y a rien à afficher. */
export function EmptyScreen({
  title = 'Rien à afficher',
  message = 'Il n’y a rien ici pour le moment.',
  action,
  secondaryAction,
  children,
}: ScreenProps) {
  return (
    <Shell>
      <svg
        width="72"
        height="72"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4a4a4a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
      <Heading title={title} message={message} />
      {children}
      <Actions action={action} secondaryAction={secondaryAction} />
    </Shell>
  )
}
