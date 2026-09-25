'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// Zone "Mon QR code" : le vendeur le fait scanner à un patron qui préfère
// s'inscrire lui-même. Le QR pointe vers l'inscription commerçant (/activation)
// avec le code du vendeur pré-rempli (?ref=CODE). En dessous : le code en toutes
// lettres + le lien, chacun copiable.

function appOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

function CopyRow({
  label,
  value,
  display,
  emphasize,
}: {
  label: string
  value: string
  display: string
  emphasize?: boolean
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Presse-papier indisponible : le texte reste lisible et sélectionnable.
    }
  }
  return (
    <div className="flex flex-col gap-2 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
      <span className="text-xs text-[#8c8c8c]">{label}</span>
      <div className="flex items-center gap-3">
        <span
          className={
            emphasize
              ? 'flex-1 min-w-0 truncate text-2xl font-bold tracking-[0.18em] text-gold'
              : 'flex-1 min-w-0 truncate text-sm text-[#c7c7c7]'
          }
        >
          {display}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 min-h-[44px] px-4 rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
    </div>
  )
}

export function VendeurQrCode({ code, prenom }: { code: string; prenom?: string | null }) {
  const link = `${appOrigin()}/activation?ref=${encodeURIComponent(code)}`

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 animate-fade-up">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Mon QR code</h1>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Fais-le scanner à un commerçant qui préfère s’inscrire lui-même : il arrive sur
          l’inscription avec ton code déjà rempli, rien à taper.
        </p>
      </header>

      {/* QR en grand, sur fond blanc pour un contraste maximal à l'écran. */}
      <div className="flex flex-col items-center gap-3 p-6 bg-[#171717] border border-[#292929] rounded-2xl">
        <div className="rounded-2xl bg-white p-4">
          <QRCodeSVG value={link} size={248} bgColor="#ffffff" fgColor="#0d0d0d" level="H" />
        </div>
        <p className="text-xs text-[#8c8c8c] text-center">
          {prenom ? `${prenom}, mets` : 'Mets'} l’écran bien lumineux et laisse le patron scanner
          avec l’appareil photo de son téléphone.
        </p>
      </div>

      <CopyRow label="Ton code" value={code} display={code} emphasize />
      <CopyRow label="Ton lien à partager" value={link} display={link} />
    </div>
  )
}
